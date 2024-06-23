import styled from 'styled-components';

export const AppContainer = styled.div`
  height: 100%;
  overflow: auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.1);
`;

export const ChatContainer = styled.div`
  background-color: #fcfcfc;
  max-width: 100%;
  padding: 0 20px;
  text-align: left;
  border-radius: 16px;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
  padding: 16px 16px 8px;
`;

export const MessageList = styled.div`
  border-radius: 12px;
  border: 1px solid #dfe1e5;
  margin-top: 30px;
  margin-left: auto;
  margin-right: auto;
  max-width: 600px;
  background-color: #fff;
`;

export const MessageGroup = styled.div`
  padding: 16px;
  padding-bottom: 8px;
  margin-bottom: 8px;
`;

export const UserMessage = styled.div`
  padding: 8px;
  padding-left: 16px;
  padding-bottom: 4px;
  border-radius: 16px;
  background-color: #d0f0ff;
  color: #333;
  max-width: 70%;
  word-wrap: break-word;
  line-height: 1.5;
  font-size: 1rem;
  font-family: 'Lucida Grande', 'Lucida Sans Unicode', sans-serif;
  letter-spacing: -0.05em;
`;

export const AssistantMessage = styled.div<{ isEmpty?: boolean }>`
  padding: ${({ isEmpty }) => (isEmpty ? '32px' : '8px 16px 4px')};
  border-radius: 16px;
  background-color: #f5f5f5;
  color: #000;
  margin-left: auto;
  max-width: 70%;
  word-wrap: break-word;
  line-height: 1.5;
  font-size: 1rem;
  font-family: 'Lucida Grande', 'Lucida Sans Unicode', sans-serif;
  letter-spacing: -0.05em;
  min-height: 32px;
`;


export const InputContainer = styled.div`
  border-radius: 12px;
  border: 1px solid #dfe1e5;
  margin-top: 30px;
  margin-bottom: 30px;
  margin-left: auto;
  margin-right: auto;
  max-width: 600px;
  background-color: #fff;
  padding: 30px;
  line-height: 1.5em;
  letter-spacing: 0.1px;
`;

export const InputField = styled.input`
  flex: 1;
  margin-right: 60px;
  padding: 8px;
  padding-left: 50px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 1rem;
  background-repeat: no-repeat;
  background-position: 10px center;
  background-size: 10%;
  &:focus {
    outline: none;
    border-color: #0c2556;
  }
`;
