/**
 * Docs Manager - Offline Vault View Component
 * 
 * Displays all documents securely encrypted & saved inside IndexedDB.
 * Works 100% offline without network connectivity or active Google OAuth session.
 */

import { AppState } from '../state/AppState.js';
import { SmartOfflineSyncService } from '../services/SmartOfflineSyncService.js';
import { CollectionService } from '../services/CollectionService.js';
import { formatBytes, formatDate, getCategoryBadge, isPdfFile, exportFileToDevice } from '../utils/helpers.js';
import { OfflineStorageService } from '../services/OfflineStorageService.js';
import { showToast } from './Toast.js';

export function renderOfflineVaultView(container) {
  const state = AppState.getState();
  const { offline, collection, ui } = state;
  const offlineItems = Array.from(offline.offlineMap.values());

  // Filter
  let filtered = [...offlineItems];
  if (ui.searchQuery) {
    const q = ui.searchQuery.toLowerCase();
    filtered = filtered.filter(f => f.name.toLowerCase().includes(q));
  }

  container.innerHTML = `
    <!-- Top Offline Banner -->
    <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2)); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-lg); padding: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
      <div>
        <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          Encrypted Offline Vault
        </div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.35rem; max-width: 650px;">
          These documents are encrypted with AES-GCM 256-bit and saved locally in your browser's private storage. 
          You can preview, search, and add them to the PDF Builder without an internet connection or active Google session.
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem;">
        <button class="btn btn-outline btn-sm" id="btn-browse-drive-for-offline">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>Browse More Documents</span>
        </button>
      </div>
    </div>

    <!-- Section Title -->
    <div class="section-title-bar">
      <div class="section-title">Offline Documents (${filtered.length})</div>
      <div style="font-size: 0.8rem; color: var(--text-muted);">${formatBytes(offline.storageUsage)} used</div>
    </div>

    ${filtered.length === 0 ? `
      <div style="text-align: center; padding: 4rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle); color: var(--text-muted);">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem; color: var(--success);"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary);">No offline documents saved yet</div>
        <div style="font-size: 0.88rem; max-width: 450px; margin: 0.5rem auto 1.5rem; line-height: 1.5;">
          Click "Keep Offline" on any document in your Dashboard or Google Drive to encrypt and store a private copy for offline access.
        </div>
        <button class="btn btn-primary" id="btn-explore-for-offline">Explore Documents</button>
      </div>
    ` : `
      <div class="documents-grid">
        ${filtered.map(doc => renderOfflineDocCard(doc, state)).join('')}
      </div>
    `}
  `;

  attachOfflineEvents(container, filtered);
}

function renderOfflineDocCard(doc, state) {
  const isPdf = isPdfFile(doc.mimeType, doc.name);
  const inCollection = state.collection.items.some(i => i.id === doc.fileId);
  const badgeStyle = getCategoryBadge(doc.category || 'Other');

  return `
    <div class="doc-card" data-file-id="${doc.fileId}">
      <div class="doc-preview-thumb" data-action="preview">
        ${isPdf ? `
          <div style="text-align: center;">
            <svg class="doc-icon-large" style="color: #EF4444;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>
            <div style="font-size: 0.7rem; font-weight: 700; color: #EF4444; margin-top: 4px;">OFFLINE PDF</div>
          </div>
        ` : `
          <svg class="doc-icon-large" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        `}

        <div class="doc-overlay-badge">
          <span class="status-badge offline-ready">✓ Offline Vault</span>
        </div>
      </div>

      <div class="doc-body">
        <div class="doc-title-row">
          <div class="doc-title" data-action="preview" title="${doc.name}">${doc.name}</div>
        </div>

        <div class="doc-info-meta">
          <span>${formatBytes(doc.size)}</span>
          <span>•</span>
          <span>Synced: ${formatDate(doc.lastSyncedAt)}</span>
        </div>

        <div class="doc-category-tag" style="background: ${badgeStyle.bg}; color: ${badgeStyle.color};">
          ${doc.category || 'Other'}
        </div>
      </div>

      <div class="doc-card-actions">
        <!-- Remove Offline Copy -->
        <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.3);" data-action="remove-offline" title="Remove local copy">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span>Remove</span>
        </button>

        <div style="display: flex; gap: 0.35rem;">
          <!-- Add to Collection -->
          <button class="btn-icon ${inCollection ? 'active' : ''}" style="${inCollection ? 'color: var(--accent-primary); border-color: var(--accent-primary);' : ''}" data-action="toggle-collection" title="Add to Collection Cart">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </button>

          <!-- Explicit Download Button -->
          <button class="btn-icon" data-action="export-device" title="Export to device downloads">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>

          <!-- Preview In-App -->
          <button class="btn-icon" data-action="preview" title="Preview Document">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function attachOfflineEvents(container, items) {
  container.querySelector('#btn-browse-drive-for-offline')?.addEventListener('click', () => AppState.setActiveView('explorer'));
  container.querySelector('#btn-explore-for-offline')?.addEventListener('click', () => AppState.setActiveView('explorer'));

  container.querySelectorAll('.doc-card').forEach(card => {
    const fileId = card.getAttribute('data-file-id');
    const doc = items.find(i => i.fileId === fileId);
    if (!doc) return;

    card.querySelectorAll('[data-action="preview"]').forEach(el => {
      el.addEventListener('click', () => AppState.setPreviewDocument(doc));
    });

    card.querySelector('[data-action="remove-offline"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await SmartOfflineSyncService.removeOfflineCopy(fileId);
        showToast(`Removed offline copy. Google Drive original preserved.`, 'info');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    card.querySelector('[data-action="toggle-collection"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (CollectionService.has(fileId)) {
        CollectionService.remove(fileId);
        showToast(`Removed "${doc.name}" from Collection.`, 'info');
      } else {
        CollectionService.add(doc);
        showToast(`Added "${doc.name}" to Collection.`, 'success');
      }
    });

    card.querySelector('[data-action="export-device"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        showToast(`Decrypting "${doc.name}" for device export...`, 'info');
        const decrypted = await OfflineStorageService.getDecryptedDocument(fileId);
        const blob = new Blob([decrypted.rawBuffer], { type: doc.mimeType });
        exportFileToDevice(blob, doc.name);
        showToast(`Exported "${doc.name}" to Downloads.`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}
