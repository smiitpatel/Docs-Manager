/**
 * Docs Manager - Top Header Component
 */

import { AppState } from '../state/AppState.js';
import { PWAService } from '../services/PWAService.js';
import { AuthenticationService } from '../services/AuthenticationService.js';

let canInstallPWA = false;

window.addEventListener('pwa-installable', () => {
  canInstallPWA = true;
  renderHeader();
});

export function renderHeader() {
  const headerEl = document.getElementById('app-header');
  if (!headerEl) return;

  const state = AppState.getState();
  const { auth, ui } = state;
  const isDark = ui.theme === 'dark';

  let statusClass = 'offline';
  let statusText = 'Not Connected';

  if (auth.isDemoMode) {
    statusClass = 'connected';
    statusText = 'Demo Mode (Simulated Drive)';
  } else if (auth.isSignedIn) {
    if (auth.isTokenExpired) {
      statusClass = 'expired';
      statusText = 'Drive Token Expired (Click to Reconnect)';
    } else {
      statusClass = 'connected';
      statusText = 'Google Drive Connected';
    }
  }

  headerEl.className = 'top-header';
  headerEl.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <button class="btn-icon mobile-hamburger" id="btn-toggle-sidebar" title="Toggle menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      <div class="header-search-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input 
          type="text" 
          id="header-search-input" 
          class="search-input" 
          placeholder="Search documents, categories, IDs..." 
          value="${ui.searchQuery || ''}"
        />
      </div>
    </div>

    <div class="header-actions">
      <!-- Status Pill -->
      <!--<div class="connection-pill" id="btn-status-pill" title="Google Drive connection status">
        <span class="status-dot ${statusClass}"></span>
        <span>${statusText}</span>
      </div>-->

      ${canInstallPWA ? `
        <button class="btn btn-secondary btn-sm" id="btn-pwa-install" title="Install Docs Manager as a native desktop/mobile app">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span class="desktop-only">Install App</span>
        </button>
      ` : ''}

      <!-- Theme Switcher -->
      <button class="btn-icon" id="btn-toggle-theme" title="Switch Theme">
        ${isDark ? 
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>` : 
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`}
      </button>

      <!-- Account / Connect Action -->
      ${auth.isDemoMode ? `
        <button class="btn btn-primary btn-sm" id="btn-connect-google" style="background: linear-gradient(135deg, #2563EB, #10B981); border: none;" title="Connect your real Google Drive">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          <span>Connect Real Drive</span>
        </button>
      ` : auth.isSignedIn ? `
        <button class="btn btn-outline btn-sm" id="btn-open-settings" title="Settings and Storage">
          ${auth.userProfile && auth.userProfile.picture ? `
            <img src="${auth.userProfile.picture}" style="width: 20px; height: 20px; border-radius: 50%;" />
          ` : `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          `}
          <span class="desktop-only">${auth.userProfile ? auth.userProfile.name.split(' ')[0] : 'Account'}</span>
        </button>
      ` : `
        <button class="btn btn-primary btn-sm" id="btn-connect-google">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          <span>Connect Drive</span>
        </button>
      `}
    </div>
  `;

  // Attach Listeners
  const searchInput = document.getElementById('header-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.setSearchQuery(e.target.value);
    });
  }

  const toggleSidebarBtn = document.getElementById('btn-toggle-sidebar');
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      AppState.setSidebarOpen(!AppState.getState().ui.isSidebarOpen);
    });
  }

  const themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      AppState.setTheme(isDark ? 'light' : 'dark');
    });
  }

  const installBtn = document.getElementById('btn-pwa-install');
  if (installBtn) {
    installBtn.addEventListener('click', () => PWAService.promptInstall());
  }

  const connectBtn = document.getElementById('btn-connect-google');
  if (connectBtn) {
    connectBtn.addEventListener('click', () => {
      const { clientId } = AppState.getState().auth;
      if (clientId) {
        AuthenticationService.signIn().catch(err => {
          console.warn('[Header] Direct signIn failed, opening setup modal:', err);
          AppState.setSetupOpen(true);
        });
      } else {
        AppState.setSetupOpen(true);
      }
    });
  }

  const statusPill = document.getElementById('btn-status-pill');
  if (statusPill) {
    statusPill.addEventListener('click', () => {
      if (auth.isTokenExpired) {
        AuthenticationService.signIn().catch(err => alert(err.message));
      } else {
        AppState.setSettingsOpen(true);
      }
    });
  }

  const settingsBtn = document.getElementById('btn-open-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => AppState.setSettingsOpen(true));
  }
}
