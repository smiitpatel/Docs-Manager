/**
 * Docs Manager - Main Application Controller
 * High-performance PWA for Family Document Management
 */

import { AppState } from './state/AppState.js';
import { renderHeader } from './components/Header.js';
import { renderSidebar } from './components/Sidebar.js';
import { renderDashboardView } from './components/DashboardView.js';
import { renderDriveExplorerView } from './components/DriveExplorerView.js';
import { renderCollectionView } from './components/CollectionView.js';
import { renderOfflineVaultView } from './components/OfflineVaultView.js';
import { renderDocumentPreviewModal } from './components/DocumentPreviewModal.js';
import { renderPDFBuilderModal } from './components/PDFBuilderModal.js';
import { renderSetupModal } from './components/SetupModal.js';
import { renderSettingsModal } from './components/SettingsModal.js';
import { RootFolderService } from './services/RootFolderService.js';
import { SmartOfflineSyncService } from './services/SmartOfflineSyncService.js';
import { INITIAL_MOCK_TREE } from './utils/mockData.js';

class AppController {
  constructor() {
    this.contentContainer = null;
  }

  async init() {
    console.log('[Docs Manager] Bootstrapping Application Shell...');

    this.contentContainer = document.getElementById('main-content-view');

    // 1. Initialize theme from state
    document.documentElement.setAttribute('data-theme', AppState.getState().ui.theme);

    // 2. Handle URL Hash Navigation
    this.handleRouting();
    window.addEventListener('hashchange', () => this.handleRouting());

    // 3. Initialize offline service & IndexedDB
    await SmartOfflineSyncService.init();

    // 4. Handle session restoration, real Drive sync, and initial demo mode
    const { auth, drive } = AppState.getState();
    const isLoggedIn = localStorage.getItem('docs_manager_is_logged_in') === 'true';

    if (!auth.isSignedIn && !drive.rootFolderId && !isLoggedIn) {
      // First visit without cloud setup or previous login: Seed initial mock files for instant exploration
      AppState.setAuth({
        isDemoMode: true,
        isSignedIn: true,
        userProfile: { name: 'Demo Family Account', email: 'family@demo.local', picture: '' }
      });
      AppState.setRootFolder(INITIAL_MOCK_TREE.id, INITIAL_MOCK_TREE.name);
      await RootFolderService.refreshCurrentFolder();
    } else if (isLoggedIn || (auth.isSignedIn && !auth.isDemoMode)) {
      // Real Google Drive user session:
      if (!drive.rootFolderId || drive.rootFolderId.startsWith('mock_')) {
        RootFolderService.autoInitializeDocsManagerFolder().catch(err => {
          console.warn('[App] Auto initialize root folder on load error:', err);
        });
      } else {
        RootFolderService.refreshCurrentFolder().catch(err => {
          console.warn('[App] Initial folder refresh caught (offline fallback):', err);
        });
      }
    } else if (drive.rootFolderId) {
      // Refresh current folder
      RootFolderService.refreshCurrentFolder().catch(err => {
        console.warn('Initial folder refresh caught (offline fallback):', err);
      });
    }

    // 5. Subscribe to State changes for reactive DOM updates
    AppState.subscribe(() => this.render());

    // Initial render
    this.render();
  }

  handleRouting() {
    const hash = window.location.hash.replace('#', '') || 'explorer';
    const validViews = ['dashboard', 'explorer', 'collection', 'offline', 'settings'];
    if (validViews.includes(hash)) {
      if (hash === 'settings') {
        AppState.setSettingsOpen(true);
      } else {
        AppState.setActiveView(hash);
      }
    }
  }

  render() {
    // 1. Render Header & Sidebar
    renderHeader();
    renderSidebar();

    // 2. Render Active Main Content View
    const { activeView } = AppState.getState().ui;
    if (this.contentContainer) {
      if (activeView === 'dashboard') {
        renderDashboardView(this.contentContainer);
      } else if (activeView === 'explorer') {
        renderDriveExplorerView(this.contentContainer);
      } else if (activeView === 'collection') {
        renderCollectionView(this.contentContainer);
      } else if (activeView === 'offline') {
        renderOfflineVaultView(this.contentContainer);
      }
    }

    // 3. Render Modal Dialogs
    renderDocumentPreviewModal();
    renderPDFBuilderModal();
    renderSetupModal();
    renderSettingsModal();
  }
}

// Start Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.init();
});
