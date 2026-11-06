/**
 * Docs Manager - Sidebar Navigation Component
 */

import { AppState } from '../state/AppState.js';
import { formatBytes } from '../utils/helpers.js';
import { NavigationService } from '../services/NavigationService.js';

export function renderSidebar() {
  const state = AppState.getState();
  const { activeView, isSidebarOpen } = state.ui;
  const collectionCount = state.collection.items.length;
  const offlineCount = state.offline.offlineMap.size;
  const { storageUsage, storageQuota } = state.offline;

  const usedStr = formatBytes(storageUsage);
  const quotaStr = storageQuota > 0 ? formatBytes(storageQuota) : 'Available';
  const percent = storageQuota > 0 ? Math.min(100, Math.round((storageUsage / storageQuota) * 100)) : 2;

  const sidebarEl = document.getElementById('app-sidebar');
  if (!sidebarEl) return;

  sidebarEl.className = `sidebar ${isSidebarOpen ? 'open' : ''}`;
  sidebarEl.innerHTML = `
    <div class="sidebar-header">
      <a href="#dashboard" class="brand-badge" id="nav-brand-logo">
        <img src="./favicon.svg" alt="Docs Manager Logo" class="brand-icon"/>
        <div>
          <div class="brand-title">Docs Manager</div>
          <div class="brand-subtitle">Family Vault PWA</div>
        </div>
      </a>
      <button class="btn-icon mobile-only" id="btn-close-sidebar" style="display: none;" title="Close menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section-title">Workspace</div>

      <a class="nav-item ${activeView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span>Dashboard</span>
      </a>

      <a class="nav-item ${activeView === 'explorer' ? 'active' : ''}" data-view="explorer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <span>Google Drive</span>
      </a>

      <a class="nav-item ${activeView === 'collection' ? 'active' : ''}" data-view="collection">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        <span>Collection Cart</span>
        ${collectionCount > 0 ? `<span class="nav-badge accent">${collectionCount}</span>` : ''}
      </a>

      <a class="nav-item ${activeView === 'offline' ? 'active' : ''}" data-view="offline">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
        <span>Offline Vault</span>
        ${offlineCount > 0 ? `<span class="nav-badge">${offlineCount}</span>` : ''}
      </a>

      <div class="nav-section-title" style="margin-top: 1rem;">System</div>

      <a class="nav-item ${activeView === 'settings' ? 'active' : ''}" data-view="settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>Settings & Keys</span>
      </a>
    </nav>

    <div class="sidebar-footer">
      <div class="storage-status-card">
        <div class="storage-header">
          <span>Encrypted Storage</span>
          <span>${usedStr}</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${percent}%;"></div>
        </div>
        <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 0.4rem; display: flex; justify-content: space-between;">
          <span>AES-GCM 256</span>
          <span>${quotaStr}</span>
        </div>
      </div>
    </div>
  `;

  // Attach event handlers
  sidebarEl.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-view');
      if (targetView) {
        if (targetView !== AppState.getState().ui.activeView && targetView !== 'dashboard') {
          NavigationService.pushStep('view', { view: targetView });
        }
        AppState.setActiveView(targetView);
        AppState.setSidebarOpen(false);
      }
    });
  });

  const closeBtn = document.getElementById('btn-close-sidebar');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      AppState.setSidebarOpen(false);
      NavigationService.backIfStep('sidebar');
    });
  }
}
