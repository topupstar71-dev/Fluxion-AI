import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error listener for debugging white screens
if (typeof window !== 'undefined') {
  window.onerror = (msg, url, line, col, error) => {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.bottom = '0';
    div.style.left = '0';
    div.style.width = '100%';
    div.style.background = 'rgba(255, 0, 0, 0.9)';
    div.style.color = 'white';
    div.style.padding = '10px';
    div.style.fontSize = '12px';
    div.style.zIndex = '99999';
    div.style.fontFamily = 'monospace';
    div.innerText = `[JS ERROR] ${msg} (${line}:${col})`;
    document.body.appendChild(div);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
