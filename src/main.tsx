import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { getDarkMode } from "./store";
import { applyThemeChrome } from "./theme";

// Apply dark mode
const initialDark = getDarkMode();
if (initialDark) {
  document.documentElement.classList.add('dark');
}
applyThemeChrome(initialDark);

// Render app
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register service worker for PWA + OTA updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');

      // Check for updates every 60 seconds
      setInterval(() => { reg.update(); }, 60000);

      // OTA: when a new SW is waiting, activate it immediately
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — activate it
            newSW.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Reload page when new SW takes over
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    } catch {
      // SW registration failed — app works fine without it
    }
  });
}
