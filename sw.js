/**
 * Docs Manager - Service Worker
 * Secure PWA Application Shell Caching & Lifecycle Management
 * 
 * CRITICAL SECURITY ARCHITECTURE:
 * - Unrestricted CacheStorage is strictly restricted to static UI assets (HTML, CSS, JS, icons).
 * - Sensitive Google OAuth tokens and Google Drive API document payloads are NEVER cached in Service Worker CacheStorage.
 * - Private offline documents are strictly managed by IndexedDB with WebCrypto AES-GCM encryption.
 */

const CACHE_NAME = 'docs-manager-v1.1.0';

// Assets making up the PWA application shell
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './css/styles.css',
  './css/themes.css',
  './js/config.js',
  './js/libs/pdf-lib.min.js',
  './js/app.js',
  './js/state/AppState.js',
  './js/services/AuthenticationService.js',
  './js/services/GoogleDriveService.js',
  './js/services/RootFolderService.js',
  './js/services/NavigationService.js',
  './js/services/OfflineStorageService.js',
  './js/services/SmartOfflineSyncService.js',
  './js/services/DocumentPreviewService.js',
  './js/services/CollectionService.js',
  './js/services/SmartPDFBuilder.js',
  './js/services/PWAService.js',
  './js/components/Header.js',
  './js/components/Sidebar.js',
  './js/components/DashboardView.js',
  './js/components/DriveExplorerView.js',
  './js/components/CollectionView.js',
  './js/components/DocumentPreviewModal.js',
  './js/components/PDFBuilderModal.js',
  './js/components/SetupModal.js',
  './js/components/SettingsModal.js',
  './js/components/Toast.js',
  './js/utils/crypto.js',
  './js/utils/helpers.js',
  './js/utils/mockData.js'
];

// External CDN dependencies (pdf-lib fallback, fonts) that form part of the static app shell
const CDN_STATIC_ASSETS = [
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

self.addEventListener('install', (event) => {
  // Activate updated SW immediately when instructed
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Pre-caching application shell...');
      try {
        await cache.addAll(APP_SHELL);
      } catch (err) {
        console.warn('[SW] Some local shell assets could not be pre-cached yet:', err);
      }
      // Attempt CDN assets non-blockingly
      for (const url of CDN_STATIC_ASSETS) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn('[SW] Optional CDN pre-cache skipped:', url);
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. STRICT SECURITY BYPASS: Never intercept or cache sensitive Google OAuth or Drive content
  if (
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('googleusercontent.com') ||
    request.headers.get('Authorization')
  ) {
    // Pure network pass-through
    return;
  }

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Local app shell handling
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background for update (stale-while-revalidate for local static files)
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
            }
          })
          .catch(() => {
            // Offline - cachedResponse is already being returned
          });
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(request).then((networkResponse) => {
        // Only cache valid basic or cors static responses (CSS, JS, Fonts, Images)
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.svg') ||
           url.pathname.endsWith('.webmanifest') ||
           url.hostname.includes('fonts.gstatic.com') ||
           url.hostname.includes('cdn.jsdelivr.net'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for navigation requests when offline
        if (request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('./');
        }
      });
    })
  );
});
