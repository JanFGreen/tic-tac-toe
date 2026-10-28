import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/ui/App';
import { themeCss } from '@/ui/theme';
import './ui/base.css';

const theme = document.createElement('style');
theme.textContent = themeCss;
document.head.append(theme);

const root = document.getElementById('root');
if (root === null) throw new Error('index.html has no #root element');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
