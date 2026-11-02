/**
 * Docs Manager - PWA Lifecycle & Installation Service
 */

class PWAServiceClass {
  constructor() {
    this.deferredPrompt = null;
    this.swRegistration = null;
    this.init();
  }

  init() {
    // 1. Listen for PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      window.dispatchEvent(new CustomEvent('pwa-installable', { detail: true }));
    });

    // 2. Listen for App Installed
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      console.log('[PWA] Docs Manager installed successfully.');
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    });

    // 3. Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((registration) => {
            this.swRegistration = registration;
            console.log('[PWA] Service Worker registered with scope:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New update available.');
                    window.dispatchEvent(new CustomEvent('pwa-update-available'));
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed (normal on insecure origins):', err);
          });
      });
    }
  }

  /**
   * Trigger native browser PWA Install prompt
   */
  async promptInstall() {
    if (!this.deferredPrompt) {
      alert('Docs Manager is already installed or your browser does not support the install prompt. You can install it from your browser menu (Install app / Add to Home Screen).');
      return false;
    }
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    return outcome === 'accepted';
  }

  /**
   * Apply Service Worker update
   */
  applyUpdate() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }
}

export const PWAService = new PWAServiceClass();
