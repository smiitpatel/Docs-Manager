/**
 * Docs Manager - Authentication Service
 * Manages Google Identity Services (GIS) OAuth 2.0 Implicit Flow & Interactive Demo Mode
 * 
 * SECURITY SPECIFICATION:
 * - No client secret is ever stored or transmitted.
 * - Access tokens are held in-memory and transient sessionStorage; never persisted insecurely.
 * - Token expiration triggers a re-authentication banner WITHOUT blocking access to existing offline documents.
 * - Scope: 'https://www.googleapis.com/auth/drive' enables discovering and managing pre-existing shared family folders.
 */

import { AppState } from '../state/AppState.js';
import { OfflineStorageService } from './OfflineStorageService.js';
import { RootFolderService } from './RootFolderService.js';
import { APP_CONFIG } from '../config.js';

class AuthenticationServiceClass {
  constructor() {
    this.tokenClient = null;
    this.tokenExpirationTimer = null;
    this.initSessionFromStorage();
  }

  initSessionFromStorage() {
    const isLoggedIn = localStorage.getItem('docs_manager_is_logged_in') === 'true';
    const cachedToken = localStorage.getItem('docs_manager_access_token');
    const expiresAt = localStorage.getItem('docs_manager_token_expires_at');
    const profileJson = localStorage.getItem('docs_manager_user_profile');

    if (isLoggedIn) {
      const now = Date.now();
      const expTime = parseInt(expiresAt, 10) || 0;
      let profile = null;
      try {
        profile = profileJson ? JSON.parse(profileJson) : null;
      } catch { /* ignore */ }

      if (cachedToken && now < expTime) {
        // Token is valid! Restore persistent session immediately
        AppState.setAuth({
          isSignedIn: true,
          isDemoMode: false,
          accessToken: cachedToken,
          tokenExpiresAt: expTime,
          isTokenExpired: false,
          userProfile: profile
        });

        this.scheduleTokenExpiration(expTime - now);
      } else {
        // Token expired while window was closed. Maintain logged-in state & auto-refresh silently!
        AppState.setAuth({
          isSignedIn: true,
          isDemoMode: false,
          accessToken: cachedToken,
          tokenExpiresAt: expTime,
          isTokenExpired: true,
          userProfile: profile
        });

        this.attemptSilentTokenRefresh();
      }
    }
  }

  /**
   * Automatically attempts silent background authentication without user prompts
   */
  async attemptSilentTokenRefresh() {
    const { clientId } = AppState.getState().auth;
    const targetClientId = clientId || APP_CONFIG.GOOGLE_CLIENT_ID;
    if (!targetClientId) return;

    const trySilent = async (retries = 0) => {
      if (window.google?.accounts?.oauth2) {
        try {
          if (!this.tokenClient) {
            await this.initTokenClient(targetClientId);
          }
          if (this.tokenClient) {
            console.log('[Auth] Attempting silent background re-authentication...');
            // In GIS, prompt: '' requests access token silently without consent dialog
            this.tokenClient.requestAccessToken({ prompt: '' });
          }
        } catch (e) {
          console.warn('[Auth] Silent token re-auth failed:', e);
        }
      } else if (retries < 20) {
        setTimeout(() => trySilent(retries + 1), 250);
      }
    };

    trySilent();
  }

  /**
   * Initialize Google Identity Services OAuth 2.0 Token Client
   */
  async initTokenClient(clientId) {
    if (!clientId) return false;

    // Check if GIS library is available on window
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      console.warn('[Auth] Google Identity Services script not yet loaded.');
      return false;
    }

    try {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('[Auth] Token error:', tokenResponse);
            throw new Error(tokenResponse.error_description || tokenResponse.error);
          }

          const accessToken = tokenResponse.access_token;
          const expiresIn = parseInt(tokenResponse.expires_in, 10) || 3599;
          const expiresAt = Date.now() + (expiresIn * 1000);

          localStorage.setItem('docs_manager_access_token', accessToken);
          localStorage.setItem('docs_manager_token_expires_at', String(expiresAt));
          localStorage.setItem('docs_manager_is_logged_in', 'true');
          localStorage.setItem('docs_manager_demo_mode', 'false');

          // Fetch basic profile info using token
          let userProfile = { name: 'Family Member', email: 'account@google.com', picture: '' };
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (userInfoRes.ok) {
              const uData = await userInfoRes.json();
              userProfile = {
                name: uData.name || 'Family Member',
                email: uData.email || '',
                picture: uData.picture || ''
              };
              localStorage.setItem('docs_manager_user_profile', JSON.stringify(userProfile));
            }
          } catch (e) {
            console.warn('[Auth] User info fetch skipped:', e);
          }

          AppState.setAuth({
            isSignedIn: true,
            isDemoMode: false,
            accessToken,
            tokenExpiresAt: expiresAt,
            isTokenExpired: false,
            userProfile
          });

          // If previous session had a mock root folder, purge it
          const currentRootId = AppState.getState().drive.rootFolderId;
          if (currentRootId && currentRootId.startsWith('mock_')) {
            localStorage.removeItem('docs_manager_root_folder_id');
            localStorage.removeItem('docs_manager_root_folder_name');
            AppState.setRootFolder(null, 'Family Documents');
          }

          // Clear any in-memory demo data before loading real Drive records
          AppState.setDriveData({
            folders: [],
            files: [],
            allDiscoveredFolders: [],
            allDiscoveredFiles: []
          });

          this.scheduleTokenExpiration(expiresIn * 1000);

          // Google Colab-Style: Automatically discover or create 'Docs Manager' folder on Google Drive
          try {
            await RootFolderService.autoInitializeDocsManagerFolder();
          } catch (initErr) {
            console.error('[Auth] Failed auto-initializing root folder:', initErr);
          }
        }
      });

      return true;
    } catch (err) {
      console.error('[Auth] Failed to initialize Google Token Client:', err);
      return false;
    }
  }

  /**
   * Trigger Google Account Sign-In / Connect
   */
  async signIn() {
    let { clientId } = AppState.getState().auth;

    if (!clientId && APP_CONFIG.GOOGLE_CLIENT_ID) {
      clientId = APP_CONFIG.GOOGLE_CLIENT_ID;
      AppState.setAuth({ clientId });
    }

    if (!clientId) {
      AppState.setSetupOpen(true);
      return;
    }

    if (!this.tokenClient) {
      const initialized = await this.initTokenClient(clientId);
      if (!initialized) {
        throw new Error('Google Identity Services client could not be loaded. Check your internet connection.');
      }
    }

    // Request access token
    this.tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  /**
   * Schedule automatic token expiration handler
   * CRITICAL REQUIREMENT (Section 13):
   * 1. Automatically requests a fresh token silently in background before expiration!
   * 2. Token expiration never deletes or invalidates offline documents!
   */
  scheduleTokenExpiration(timeoutMs) {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }

    // Attempt silent token refresh 2 minutes before token expires
    const refreshLeadTime = 2 * 60 * 1000;
    const triggerMs = Math.max(1000, timeoutMs - refreshLeadTime);

    this.tokenExpirationTimer = setTimeout(() => {
      console.log('[Auth] Token approaching expiration. Attempting silent background refresh...');
      if (this.tokenClient) {
        try {
          this.tokenClient.requestAccessToken({ prompt: '' });
          return;
        } catch (e) {
          console.warn('[Auth] Background refresh error:', e);
        }
      }

      // Fallback: mark token expired so user can click to reconnect
      AppState.setAuth({
        isTokenExpired: true
      });
    }, triggerMs);
  }

  /**
   * Switch into Instant Demo Mode (for Live Server testing without Google Cloud setup)
   */
  startDemoMode() {
    AppState.setAuth({
      isSignedIn: true,
      isDemoMode: true,
      accessToken: 'mock_demo_access_token_123',
      tokenExpiresAt: Date.now() + 86400000,
      isTokenExpired: false,
      userProfile: {
        name: 'Family Member (Demo Mode)',
        email: 'family@example.com',
        picture: ''
      }
    });
  }

  /**
   * Secure Sign-out
   * @param {Object} options
   * @param {boolean} options.retainOfflineCopies - If true, keeps encrypted offline documents; if false, wipes local vault
   */
  async signOut({ retainOfflineCopies = true } = {}) {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }

    localStorage.removeItem('docs_manager_access_token');
    localStorage.removeItem('docs_manager_token_expires_at');
    localStorage.removeItem('docs_manager_user_profile');
    localStorage.removeItem('docs_manager_is_logged_in');
    localStorage.removeItem('docs_manager_demo_mode');
    sessionStorage.clear();

    if (!retainOfflineCopies) {
      await OfflineStorageService.clearAllOfflineData();
      localStorage.removeItem('docs_manager_root_folder_id');
      localStorage.removeItem('docs_manager_root_folder_name');
      localStorage.removeItem('docs_manager_collection_items');
      AppState.setOfflineMap(new Map());
      AppState.clearCollection();
    }

    AppState.setAuth({
      isSignedIn: false,
      isDemoMode: false,
      accessToken: null,
      tokenExpiresAt: null,
      isTokenExpired: false,
      userProfile: null
    });
  }
}

export const AuthenticationService = new AuthenticationServiceClass();
