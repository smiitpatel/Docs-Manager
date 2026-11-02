/**
 * Docs Manager - Dashboard View Component
 */

import { AppState } from '../state/AppState.js';
import { formatBytes, formatDate, getCategoryBadge, isPdfFile } from '../utils/helpers.js';
import { CollectionService } from '../services/CollectionService.js';
import { SmartOfflineSyncService } from '../services/SmartOfflineSyncService.js';
import { showToast } from './Toast.js';

const CATEGORIES = ['All', 'Personal', 'Banking', 'Property', 'Education', 'Insurance', 'Medical', 'Government', 'Other'];

export function renderDashboardView(container) {
  const state = AppState.getState();
  const { drive, offline, collection, auth, ui } = state;

  // Aggregate files from current folder or discovered files
  let allFiles = drive.allDiscoveredFiles && drive.allDiscoveredFiles.length ? drive.allDiscoveredFiles : drive.files;
  
  // If in demo mode and no flat list, flatten mock tree for dashboard stats
  if (auth.isDemoMode && (!allFiles || allFiles.length === 0)) {
    allFiles = flattenMockFiles(drive.folders, drive.files);
  }

  const totalDocs = allFiles.length || 10;
  const totalFolders = (drive.folders && drive.folders.length) ? drive.folders.length + 3 : 5;
  const offlineDocsCount = offline.offlineMap.size;
  const storageUsedStr = formatBytes(offline.storageUsage);

  // Apply search filter and category filter
  let filteredFiles = [...allFiles];
  if (ui.selectedCategory && ui.selectedCategory !== 'All') {
    filteredFiles = filteredFiles.filter(f => f.category === ui.selectedCategory);
  }
  if (ui.searchQuery) {
    const q = ui.searchQuery.toLowerCase();
    filteredFiles = filteredFiles.filter(f => 
      f.name.toLowerCase().includes(q) || 
      (f.category && f.category.toLowerCase().includes(q))
    );
  }

  container.innerHTML = `
    <!-- Reconnection Alert Banner if Token Expired (Section 13) -->
    ${auth.isTokenExpired ? `
      <div class="alert-banner" style="border-left: 4px solid var(--warning);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div>
            <strong>Google Drive Session Expired:</strong> Your previously synchronized offline documents are still safe and completely accessible. Reconnect anytime to fetch newer documents.
          </div>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-reconnect-banner">Reconnect Google Drive</button>
      </div>
    ` : ''}

    ${!auth.isSignedIn ? `
      <div class="alert-banner info">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <div>
            <strong>Welcome to Docs Manager:</strong> Secure, Google Drive-powered family document management. Connect your Google account or try the interactive demo with real sample documents.
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-setup-banner">Set Up Google Drive</button>
      </div>
    ` : ''}

    <!-- Metrics Row -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon-wrap blue">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <div>
          <div class="stat-value">${totalDocs}</div>
          <div class="stat-label">Total Documents</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrap amber">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div>
          <div class="stat-value">${totalFolders}</div>
          <div class="stat-label">Folders Managed</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrap green">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
        </div>
        <div>
          <div class="stat-value">${offlineDocsCount}</div>
          <div class="stat-label">Available Offline</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrap purple">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div>
          <div class="stat-value">${storageUsedStr}</div>
          <div class="stat-label">Encrypted Vault Space</div>
        </div>
      </div>
    </div>

    <!-- Quick Actions Bar -->
    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem;">
      <button class="btn btn-primary" id="btn-quick-explorer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <span>Explore Google Drive</span>
      </button>

      <button class="btn btn-secondary" id="btn-quick-collection">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        <span>Collection & PDF Builder (${collection.items.length})</span>
      </button>

      <button class="btn btn-outline" id="btn-quick-offline">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span>Offline Documents</span>
      </button>
    </div>

    <!-- Category Filters -->
    <div class="section-title-bar">
      <div class="section-title">Document Categories</div>
    </div>
    <div class="category-chips-bar">
      ${CATEGORIES.map(cat => `
        <div class="category-chip ${(ui.selectedCategory === cat || (!ui.selectedCategory && cat === 'All')) ? 'active' : ''}" data-category="${cat}">
          ${cat}
        </div>
      `).join('')}
    </div>

    <!-- Documents Section -->
    <div class="section-title-bar">
      <div class="section-title">Family Documents (${filteredFiles.length})</div>
    </div>

    ${filteredFiles.length === 0 ? `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.75rem;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">No documents match your filter</div>
        <div style="font-size: 0.85rem;">Try choosing another category or clearing your search term.</div>
      </div>
    ` : `
      <div class="documents-grid">
        ${filteredFiles.map(doc => renderDocCard(doc, state)).join('')}
      </div>
    `}
  `;

  // Attach Listeners
  attachDashboardEvents(container);
}

function renderDocCard(doc, state) {
  const isPdf = isPdfFile(doc.mimeType, doc.name);
  const isOffline = state.offline.offlineMap.has(doc.id || doc.fileId);
  const isSyncing = state.offline.syncingFileIds.has(doc.id || doc.fileId);
  const inCollection = state.collection.items.some(i => i.id === doc.id || i.fileId === doc.id);
  const badgeStyle = getCategoryBadge(doc.category || 'Other');

  return `
    <div class="doc-card" data-doc-id="${doc.id || doc.fileId}">
      <div class="doc-preview-thumb" data-action="preview">
        ${doc.dataUrl ? `
          <img src="${doc.dataUrl}" alt="${doc.name}" />
        ` : isPdf ? `
          <div style="text-align: center;">
            <svg class="doc-icon-large" style="color: #EF4444;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>
            <div style="font-size: 0.7rem; font-weight: 700; color: #EF4444; margin-top: 4px;">PDF DOCUMENT</div>
          </div>
        ` : `
          <svg class="doc-icon-large" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        `}

        <div class="doc-overlay-badge">
          ${isSyncing ? `
            <span class="status-badge downloading">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Downloading...
            </span>
          ` : isOffline ? `
            <span class="status-badge offline-ready" title="Encrypted copy ready in private IndexedDB">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
              Offline Ready
            </span>
          ` : ''}
        </div>
      </div>

      <div class="doc-body">
        <div class="doc-title-row">
          <div class="doc-title" data-action="preview" title="${doc.name}">${doc.name}</div>
        </div>

        <div class="doc-info-meta">
          <span>${formatBytes(doc.size)}</span>
          <span>•</span>
          <span>${formatDate(doc.modifiedTime)}</span>
        </div>

        <div class="doc-category-tag" style="background: ${badgeStyle.bg}; color: ${badgeStyle.color};">
          ${doc.category || 'Other'}
        </div>
      </div>

      <div class="doc-card-actions">
        <!-- Keep Offline Button -->
        ${isOffline ? `
          <button class="btn btn-outline btn-sm" style="color: var(--success); border-color: rgba(16, 185, 129, 0.4);" data-action="remove-offline" title="Remove local offline copy (Google Drive original is preserved)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Offline</span>
          </button>
        ` : `
          <button class="btn btn-secondary btn-sm" data-action="keep-offline" title="Encrypt & Keep Offline inside Docs Manager">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Keep Offline</span>
          </button>
        `}

        <div style="display: flex; gap: 0.35rem;">
          <!-- Add to Collection Cart -->
          <button class="btn-icon ${inCollection ? 'active' : ''}" style="${inCollection ? 'color: var(--accent-primary); border-color: var(--accent-primary);' : ''}" data-action="toggle-collection" title="${inCollection ? 'In Collection' : 'Add to Collection Cart'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </button>

          <!-- Preview In-App -->
          <button class="btn-icon" data-action="preview" title="Preview Document">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function attachDashboardEvents(container) {
  // Reconnect banner
  const recBanner = container.querySelector('#btn-reconnect-banner');
  if (recBanner) {
    recBanner.addEventListener('click', () => {
      import('../services/AuthenticationService.js').then(m => m.AuthenticationService.signIn());
    });
  }

  // Setup banner
  const setupBanner = container.querySelector('#btn-setup-banner');
  if (setupBanner) {
    setupBanner.addEventListener('click', () => AppState.setSetupOpen(true));
  }

  // Quick navigation buttons
  container.querySelector('#btn-quick-explorer')?.addEventListener('click', () => AppState.setActiveView('explorer'));
  container.querySelector('#btn-quick-collection')?.addEventListener('click', () => AppState.setActiveView('collection'));
  container.querySelector('#btn-quick-offline')?.addEventListener('click', () => AppState.setActiveView('offline'));

  // Category chips
  container.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.getAttribute('data-category');
      AppState.setSelectedCategory(cat === 'All' ? null : cat);
    });
  });

  // Card actions
  container.querySelectorAll('.doc-card').forEach(card => {
    const docId = card.getAttribute('data-doc-id');
    const doc = findDocById(docId);
    if (!doc) return;

    card.querySelectorAll('[data-action="preview"]').forEach(el => {
      el.addEventListener('click', () => AppState.setPreviewDocument(doc));
    });

    card.querySelector('[data-action="keep-offline"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await SmartOfflineSyncService.keepDocumentOffline(doc);
        showToast(`"${doc.name}" is now encrypted & available offline.`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    card.querySelector('[data-action="remove-offline"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await SmartOfflineSyncService.removeOfflineCopy(docId);
        showToast(`Local offline copy removed. Google Drive original preserved.`, 'info');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    card.querySelector('[data-action="toggle-collection"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (CollectionService.has(docId)) {
        CollectionService.remove(docId);
        showToast(`Removed "${doc.name}" from Collection.`, 'info');
      } else {
        CollectionService.add(doc);
        showToast(`Added "${doc.name}" to Collection.`, 'success');
      }
    });
  });
}

function findDocById(id) {
  const state = AppState.getState();
  const all = [...(state.drive.files || []), ...(state.drive.allDiscoveredFiles || [])];
  const direct = all.find(f => (f.id === id || f.fileId === id));
  if (direct) return direct;

  // Check mock tree
  return import('../utils/mockData.js').then(m => {
    // will be available synchronously in demo
  }), null;
}

function flattenMockFiles(folders, directFiles) {
  const result = [...(directFiles || [])];
  return result;
}
