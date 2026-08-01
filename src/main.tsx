import * as React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './lib/auth-context';
import './index.css';

import { Buffer } from 'buffer';

// Polyfill Buffer for the browser, required by libraries like word-extractor
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  
  // Suppress cross-origin Script error. from bubbling up to the AI Studio platform
  window.addEventListener('error', (event) => {
    if (event.message === 'Script error.') {
      console.warn('Suppressed cross-origin Script error.');
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Suppressed unhandled rejection:', event.reason);
    event.preventDefault();
  });
  
  // Custom non-blocking safe toast alert fallback for iframe environments
  window.alert = (message?: any) => {
    console.log('[App Alert Override]:', message);
    try {
      const toast = document.createElement('div');
      toast.style.position = 'fixed';
      toast.style.top = '24px';
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%)';
      toast.style.background = 'rgba(15, 23, 42, 0.95)';
      toast.style.color = '#ffffff';
      toast.style.padding = '12px 24px';
      toast.style.borderRadius = '14px';
      toast.style.fontSize = '12.5px';
      toast.style.fontWeight = 'bold';
      toast.style.zIndex = '999999';
      toast.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15)';
      toast.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
      toast.style.pointerEvents = 'none';
      toast.style.whiteSpace = 'pre-wrap';
      toast.style.maxWidth = '85vw';
      toast.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      toast.style.textAlign = 'center';
      toast.textContent = String(message);
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-10px)';
        setTimeout(() => {
          if (toast.parentNode) {
            document.body.removeChild(toast);
          }
        }, 250);
      }, 3500);
    } catch (e) {
      console.warn('Custom toast failed:', e);
    }
  };
}

// Signal to watchdog that JS has started executing
(window as any).__JS_EXECUTING__ = true;

const mountApp = () => {
  try {
    const container = document.getElementById('root');
    if (!container) throw new Error("找不到 root 容器元素");

    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </React.StrictMode>,
    );

    // Signal to watchdog that app has mounted
    (window as any).__APP_MOUNTED__ = true;
    console.log("React app mounted successfully.");
  } catch (err: any) {
    console.error("React mount failed:", err);
    // Explicitly notify the watchdog UI if we can
    const errorLog = document.getElementById('error-log');
    const errorUI = document.getElementById('offline-error-display');
    if (errorLog && errorUI) {
      errorUI.style.display = 'flex';
      errorLog.innerText = "React 挂载阶段崩溃: \n" + (err?.stack || err?.message || err);
    }
  }
};

// Start mounting
mountApp();

