/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from "./components/ui/tooltip";
import { LoginScreen } from './components/LoginScreen';
import { useAuth } from './lib/auth-context';
import MainApp from './components/MainApp';

export default function App() {
  const { authState } = useAuth();
  const [scale, setScale] = React.useState(100);

  React.useEffect(() => {
    // Initial load
    const updateScale = () => {
      try {
        const saved = localStorage.getItem('certMatch_ai_settings_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.uiScale) setScale(parsed.uiScale);
        }
      } catch (e) {}
    };

    updateScale();

    // Primary stability enhancer: Sync settings from server-side JSON database backup on boot
    const syncSettingsFromServer = async () => {
      try {
        const response = await fetch('/api/ai/config');
        if (response.ok) {
          let serverSettings;
          try {
            serverSettings = await response.json();
          } catch(e) {
            console.error('Invalid JSON from config sync', e);
            return;
          }
          if (serverSettings) {
             const saved = localStorage.getItem('certMatch_ai_settings_v2');
             if (!saved || JSON.stringify(serverSettings) !== saved) {
                console.log('[Sync] Discovered server-side config backup. Synchronizing...');
                localStorage.setItem('certMatch_ai_settings_v2', JSON.stringify(serverSettings));
                // Fire a storage event to force all active widgets / views to immediately consume the new settings
                window.dispatchEvent(new Event('storage'));
                updateScale();
             }
          }
        }
      } catch (e) {
        console.warn('[Sync] Offline or server-side config sync failed:', e);
      }
    };
    syncSettingsFromServer();

    // Listen for storage changes (when saved in AIConfig)
    window.addEventListener('storage', updateScale);
    
    // Also listen for local custom events if needed, but storage is fine for across components if they update localStorage
    // However, since we are in the same tab, we can use a simpler approach or just interval/event
    const interval = setInterval(updateScale, 1000);

    return () => {
      window.removeEventListener('storage', updateScale);
      clearInterval(interval);
    };
  }, []);

  const scaleStyle = React.useMemo(() => {
    const s = scale / 100;
    // zoom is widely supported in Chromium which will be used for EXE
    return {
      zoom: s,
      // Fallback for non-zoom browsers if needed, but might affect layout differently
      // transform: `scale(${s})`,
      // transformOrigin: 'top left',
      // width: `${100 / s}%`,
      // height: `${100 / s}%`,
    } as React.CSSProperties;
  }, [scale]);

  if (!authState.isAuthenticated) {
    return (
      <TooltipProvider>
        <div style={scaleStyle} className="min-h-screen">
          <LoginScreen onLoginSuccess={() => {}} />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div style={scaleStyle} className="min-h-screen">
        <MainApp />
      </div>
    </TooltipProvider>
  );
}


