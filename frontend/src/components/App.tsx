import React, { useState, useRef, useEffect, type ReactNode, type FC } from 'react';
import { Amplify, Auth } from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import useWebSocket from 'react-use-websocket';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';

import {
  ChatContainer,
  UserMessage,
  AssistantMessage,
  InputContainer,
  InputField,
  MessageList,
  MessageGroup,
  AppContainer,
  Button,
  ButtonGroup,
  AssistantMessageGroup
} from './ChatComponents';
import './App.css';
import lens from './assets/lens.png';
import spinner from './assets/spinner.gif';

const REGION = process.env.REGION || '';
const USER_POOL_ID = process.env.USER_POOL_ID || '';
const USER_POOL_WEB_CLIENT_ID = process.env.USER_POOL_WEB_CLIENT_ID || '';
const API_ENDPOINT = process.env.API_ENDPOINT || '';

Amplify.configure({
  Auth: {
    mandatorySignIn: true,
    region: REGION,
    userPoolId: USER_POOL_ID,
    userPoolWebClientId: USER_POOL_WEB_CLIENT_ID,
  },
});

interface Message {
  messageId: string;
  message: string;
  is_input: boolean;
  role: string;
  rating: string | null;
}
interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
}

export const ThumbsUp: FC<ButtonProps> = ({ children, onClick }) => <Button onClick={onClick}>{children}</Button>;
export const ThumbsDown: FC<ButtonProps> = ({ children, onClick }) => <Button onClick={onClick}>{children}</Button>;
export const TrashButton: FC<ButtonProps> = ({ children, onClick }) => <Button onClick={onClick}>{children}</Button>;


function App() {
  const { sendJsonMessage } = useWebSocket(API_ENDPOINT, {
    onOpen: () => {
      console.log('WebSocket connection established.');
    },
    onMessage(event) {
      const message = JSON.parse(event.data);
      if (!message.end) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { ...prev[prev.length - 1], message: prev[prev.length - 1].message + message.data },
        ]);
      } else if (message.end) {
        setLoading(false);
        saveHistoryEvent(messages);
      } else if (!message.error) {
        setLoading(false);
      }
    },
    share: true,
    filter: () => false,
    retryOnError: true,
    shouldReconnect: () => true,
  });

  const sendPrompt = async (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') {
      return;
    }
    setLoading(true);
    const currentPrompt = prompt;
    const id =  uuidv4();

    setMessages((prev) => [
      ...prev,
      { is_input: true, role: 'user', messageId: id, message: currentPrompt, rating: null },
      { is_input: false, role: 'assistant', messageId: id, message: '', rating: null },
    ]);

    sendJsonMessage({
      action: 'ask',
      data: currentPrompt,
      token: (await Auth.currentSession()).getIdToken().getJwtToken(),
    });

    updatePrompt('');
  };

  const handleRateClick = async (rating: string, messageId: string) => {
    sendJsonMessage({
      action: 'rate', 
      data: { rating: rating, messageId: messageId },
      token: (await Auth.currentSession()).getIdToken().getJwtToken(),
    });
    setMessages((prev) => [
      ...prev.slice(0, -1),
      { ...prev[prev.length - 1], rating: rating },
    ]);
  };
  
  const handleResetClick = async () => {
    sendJsonMessage({
      action: 'reset', 
      token: (await Auth.currentSession()).getIdToken().getJwtToken(),
    });
    setMessages([]);
  };
  
  const saveHistoryEvent = async (messages: Message[]) => {
    console.log('Saving history');
    const lastTwoMessages = messages.slice(-2);
    const messageId = lastTwoMessages[0].messageId
    sendJsonMessage({
      action: 'history', 
      data: { messageId: messageId, messages: lastTwoMessages },
      token: (await Auth.currentSession()).getIdToken().getJwtToken(),
    });
  };

  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [prompt, updatePrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  return (
    <AppContainer>
      <ChatContainer>
        <MessageList ref={messageListRef}>
          {messages.map((message, index) => (
            <MessageGroup key={`${message.is_input}_${index}`}>
              {message.is_input ? (
                <UserMessage>
                  <ReactMarkdown>{message.message}</ReactMarkdown>
                </UserMessage>
              ) : (
                <AssistantMessageGroup>
                  <AssistantMessage>
                    <ReactMarkdown>{message.message}</ReactMarkdown>
                    { message?.rating === 'up' ?  ("👍") : (message?.rating === 'down' ? ("👎") : (<></>)) }
                  </AssistantMessage>
                  {!loading && message.rating == null ? (
                  <ButtonGroup>
                    <ThumbsUp onClick={() => handleRateClick('up', message.messageId)}>👍</ThumbsUp>
                    <ThumbsDown onClick={() => handleRateClick('down', message.messageId)}>👎</ThumbsDown>
                  </ButtonGroup>
                  ) : (<></>)}
              </AssistantMessageGroup>
              )}
            </MessageGroup>
          ))}
        </MessageList>
        <InputContainer>
          <InputField
            id="input"
            ref={inputRef}
            placeholder="Type your message..."
            value={prompt}
            disabled={loading}
            onChange={(e) => updatePrompt(e.target.value)}
            onKeyDown={(e) => sendPrompt(e)}
            style={{
              backgroundImage: loading ? `url(${spinner})` : `url(${lens})`,
            }}
          />
        </InputContainer>
        {!loading ? (
        <ButtonGroup>
          <TrashButton onClick={handleResetClick}>🗑️</TrashButton>
        </ButtonGroup>
        ) : (<></>)}
      </ChatContainer>
    </AppContainer>
  );
}

export default withAuthenticator(App);
