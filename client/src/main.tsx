import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './apps/web/App';
import './apps/web/styles/main.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
