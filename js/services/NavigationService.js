/**
 * Docs Manager - Smart Mobile Navigation & History Management Service
 * 
 * Provides native mobile app gesture and hardware Back Button navigation:
 * 1. Closes open mobile sidebar navigation.
 * 2. Closes active modals (Preview, PDF Builder, Settings, Setup).
 * 3. Navigates up from subfolder to parent folder in Drive Explorer.
 * 4. Returns from secondary views (Explorer, Collection, Offline) to Dashboard.
 * 5. Prevents accidental app exits with double-back-to-exit protection on Android / PWA.
 */

import { AppState } from '../state/AppState.js';
import { RootFolderService } from './RootFolderService.js';
import { showToast } from '../components/Toast.js';

class NavigationServiceClass {
  constructor() {
    this.isHandlingPopstate = false;
    this.lastBackPressTime = 0;
  }

  init() {
    // Seed initial root state if not already present
    if (!history.state || !history.state.isDocsRoot) {
      history.replaceState({ isDocsRoot: true, step: 'root' }, '');
    }

    // Master back button and gesture listener
    window.addEventListener('popstate', (e) => this.handlePopState(e));

    // Reactive State Observer: Automatically syncs history when modals open or close
    let prevPreview = null;
    let prevPdf = false;
    let prevSettings = false;
    let prevSetup = false;
    let prevSidebar = false;
    let prevView = 'dashboard';

    AppState.subscribe((state) => {
      // If the state change was caused by a back button / popstate, don't re-push or re-pop
      if (this.isHandlingPopstate) {
        prevPreview = state.ui.previewDocument;
        prevPdf = state.ui.isPdfBuilderOpen;
        prevSettings = state.ui.isSettingsOpen;
        prevSetup = state.ui.isSetupOpen;
        prevSidebar = state.ui.isSidebarOpen;
        prevView = state.ui.activeView;
        return;
      }

      // 1. Modals Opened -> Push History Step
      if (!prevPreview && state.ui.previewDocument) {
        this.pushStep('preview');
      }
      if (!prevPdf && state.ui.isPdfBuilderOpen) {
        this.pushStep('pdf-builder');
      }
      if (!prevSettings && state.ui.isSettingsOpen) {
        this.pushStep('settings');
      }
      if (!prevSetup && state.ui.isSetupOpen) {
        this.pushStep('setup');
      }
      if (!prevSidebar && state.ui.isSidebarOpen) {
        this.pushStep('sidebar');
      }

      // 2. Modals Closed via UI button (like 'X' or backdrop) -> Pop History to keep stack synchronized
      if (prevPreview && !state.ui.previewDocument) {
        this.backIfStep('preview');
      }
      if (prevPdf && !state.ui.isPdfBuilderOpen) {
        this.backIfStep('pdf-builder');
      }
      if (prevSettings && !state.ui.isSettingsOpen) {
        this.backIfStep('settings');
      }
      if (prevSetup && !state.ui.isSetupOpen) {
        this.backIfStep('setup');
      }
      if (prevSidebar && !state.ui.isSidebarOpen) {
        this.backIfStep('sidebar');
      }

      // 3. View changed away from Dashboard -> Push History Step
      if (state.ui.activeView !== 'dashboard' && prevView === 'dashboard') {
        this.pushStep('view', { view: state.ui.activeView });
      }

      prevPreview = state.ui.previewDocument;
      prevPdf = state.ui.isPdfBuilderOpen;
      prevSettings = state.ui.isSettingsOpen;
      prevSetup = state.ui.isSetupOpen;
      prevSidebar = state.ui.isSidebarOpen;
      prevView = state.ui.activeView;
    });
  }

  /**
   * Push a history step when entering a subfolder or view
   */
  pushStep(step, data = {}) {
    if (this.isHandlingPopstate) return;
    history.pushState({ step, data, time: Date.now() }, '');
  }

  /**
   * If a modal or view was closed via UI button (like 'X' or backdrop), sync history
   */
  backIfStep(step) {
    if (!this.isHandlingPopstate && history.state && history.state.step === step) {
      history.back();
    }
  }

  /**
   * Master handler for hardware back button, Android swipe-to-back gesture, and browser back
   */
  handlePopState(e) {
    const state = AppState.getState();
    const { ui, drive } = state;

    this.isHandlingPopstate = true;

    try {
      // 1. If mobile sidebar is open -> close it
      if (ui.isSidebarOpen) {
        AppState.setSidebarOpen(false);
        return;
      }

      // 2. If Document Preview Modal is open -> close it
      if (ui.previewDocument) {
        AppState.setPreviewDocument(null);
        return;
      }

      // 3. If PDF Builder Modal is open -> close it
      if (ui.isPdfBuilderOpen) {
        AppState.setPdfBuilderOpen(false);
        return;
      }

      // 4. If Settings Modal is open -> close it
      if (ui.isSettingsOpen) {
        AppState.setSettingsOpen(false);
        return;
      }

      // 5. If Setup Modal is open -> close it
      if (ui.isSetupOpen) {
        AppState.setSetupOpen(false);
        return;
      }

      // 6. If currently navigated inside a subfolder -> go up 1 level to parent folder!
      if (drive.currentFolderPath && drive.currentFolderPath.length > 1) {
        const parentIdx = drive.currentFolderPath.length - 2;
        RootFolderService.navigateToBreadcrumb(parentIdx);
        return;
      }

      // 7. If on a secondary view (Explorer, Collection, Offline) -> return to Dashboard!
      if (ui.activeView !== 'dashboard') {
        AppState.setActiveView('dashboard');
        return;
      }

      // 8. On root Dashboard: Double back to exit protection
      const now = Date.now();
      if (now - this.lastBackPressTime < 2000) {
        // Tapped back twice within 2s -> Allow app to close / minimize
        history.back();
      } else {
        this.lastBackPressTime = now;
        // Re-push root state to prevent accidental closure
        history.pushState({ isDocsRoot: true, step: 'root' }, '');
        showToast('Press back again to exit', 'info', 2000);
      }
    } finally {
      setTimeout(() => {
        this.isHandlingPopstate = false;
      }, 50);
    }
  }
}

export const NavigationService = new NavigationServiceClass();
