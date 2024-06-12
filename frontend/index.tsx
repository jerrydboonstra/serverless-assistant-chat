import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/components/App.tsx';
import { StrictMode } from 'react';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} else {
  console.error("Could not find a root element with id 'root'");
}
