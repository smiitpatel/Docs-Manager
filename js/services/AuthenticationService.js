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
    const cachedToken = sessionStorage.getItem('docs_manager_access_token');
    const expiresAt = sessionStorage.getItem('docs_manager_token_expires_at');
    const profileJson = sessionStorage.getItem('docs_manager_user_profile');

    if (cachedToken && expiresAt) {
      const now = Date.now();
      const expTime = parseInt(expiresAt, 10);

      if (now < expTime) {
        let profile = null;
        try {
          profile = profileJson ? JSON.parse(profileJson) : null;
        } catch { /* ignore */ }

        AppState.setAuth({
          isSignedIn: true,
          accessToken: cachedToken,
          tokenExpiresAt: expTime,
          isTokenExpired: false,
          userProfile: profile
        });

        this.scheduleTokenExpiration(expTime - now);
      } else {
        // Token has expired
        AppState.setAuth({
          isSignedIn: true,
          accessToken: null,
          tokenExpiresAt: expTime,
          isTokenExpired: true,
          userProfile: profileJson ? JSON.parse(profileJson) : null
        });
      }
    }
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

          sessionStorage.setItem('docs_manager_access_token', accessToken);
          sessionStorage.setItem('docs_manager_token_expires_at', String(expiresAt));

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
              sessionStorage.setItem('docs_manager_user_profile', JSON.stringify(userProfile));
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
   * Token expiration never deletes or invalidates offline documents!
   */
  scheduleTokenExpiration(timeoutMs) {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }

    this.tokenExpirationTimer = setTimeout(() => {
      console.log('[Auth] Google Drive session access token has expired.');
      sessionStorage.removeItem('docs_manager_access_token');

      AppState.setAuth({
        accessToken: null,
        isTokenExpired: true
      });
      // The user receives a gentle reconnect banner, but offline documents remain 100% accessible!
    }, Math.max(1000, timeoutMs));
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

    sessionStorage.removeItem('docs_manager_access_token');
    sessionStorage.removeItem('docs_manager_token_expires_at');
    sessionStorage.removeItem('docs_manager_user_profile');

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
