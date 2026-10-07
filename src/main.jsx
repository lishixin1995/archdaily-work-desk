import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { bootCloudSync } from './lib/cloudSync.js';
import { CLOUD_KEYS } from './lib/storage.js';
import './styles.css';

function hideBootSplash() {
  document.getElementById('bootSplash')?.classList.add('hide');
}

// Cloud data is merged into localStorage before the first render.
bootCloudSync({ app: 'archdaily-work-desk', keys: CLOUD_KEYS }).finally(() => {
  createRoot(document.getElementById('root')).render(<App />);
  window.setTimeout(hideBootSplash, 120);
});
