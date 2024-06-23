import React, { useState, useRef, useEffect } from 'react';
import { Amplify, Auth } from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import useWebSocket from 'react-use-websocket';
import ReactMarkdown from 'react-markdown';

import {
  ChatContainer,
  UserMessage,
  AssistantMessage,
  InputContainer,
  InputField,
  MessageList,
  MessageGroup,
  AppContainer,
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

export interface Message {
  message: string;
  is_input: boolean;
}

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

    setMessages((prev) => [
      ...prev,
      { is_input: true, message: currentPrompt },
      { is_input: false, message: '' },
    ]);

    sendJsonMessage({
      action: 'ask',
      data: currentPrompt,
      token: (await Auth.currentSession()).getIdToken().getJwtToken(),
    });

    updatePrompt('');
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
                <AssistantMessage isEmpty={message.message === ''}>
                  <ReactMarkdown>{message.message}</ReactMarkdown>
                </AssistantMessage>
              )}
            </MessageGroup>
          ))}
        </MessageList>
        <InputContainer>
          <InputField
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
      </ChatContainer>
    </AppContainer>
  );
}

export default withAuthenticator(App);
