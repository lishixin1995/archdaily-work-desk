import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { bootCloudSync } from './lib/cloudSync.js';
import { CLOUD_KEYS, promoteLegacyLists } from './lib/storage.js';
import './styles/theme.css';
import './styles/shell.css';
import './styles/dashboard.css';
import './styles/calendar.css';
import './styles/agenda.css';
import './styles/pages.css';

function hideBootSplash() {
  document.getElementById('bootSplash')?.classList.add('hide');
}

// Cloud data is merged into localStorage before the first render.
bootCloudSync({ app: 'archdaily-work-desk', keys: CLOUD_KEYS }).finally(() => {
  promoteLegacyLists();
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </React.StrictMode>
  );
  window.setTimeout(hideBootSplash, 120);
});
