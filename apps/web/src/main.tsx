import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import cache utilities for debugging (available in browser console)
import './utils/clearSongCache';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
