import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { loadSavedTheme } from './lib/theme.js';

loadSavedTheme();

if (import.meta.env.VITE_MAINTENANCE === 'true') {
  document.body.innerHTML = `
    <div style="
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #080809;
      color: #e8e8ee;
      font-family: 'Syne', sans-serif;
      gap: 12px;
    ">
      <h1 style="font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">NihilisticChat</h1>
      <p style="font-size: 12px; color: #444449; font-family: 'Azeret Mono', monospace; letter-spacing: 0.06em;">currently down — will be back soon</p>
    </div>
  `;
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}