/**
 * Docs Manager - Collection & Cart View Component
 * 
 * CORE FEATURE (Section 14):
 * - Independent workspace aggregating cross-folder documents
 * - Selection ordering, duplicate detection, and source paths
 * - Triggers In-Browser Smart PDF Builder
 */

import { AppState } from '../state/AppState.js';
import { CollectionService } from '../services/CollectionService.js';
import { formatBytes, isPdfFile } from '../utils/helpers.js';
import { showToast } from './Toast.js';

export function renderCollectionView(container) {
  const state = AppState.getState();
  const { collection, offline } = state;
  const items = collection.items || [];

  container.innerHTML = `
    <!-- Top Action Banner -->
    <div style="background: linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(168, 85, 247, 0.2)); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: var(--radius-lg); padding: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
      <div>
        <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          Document Collection & PDF Builder
        </div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.35rem; max-width: 650px;">
          Select documents across multiple Google Drive folders and combine them into one single PDF. 
          Original documents and folders remain completely untouched. Works 100% locally in your browser.
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem; align-items: center;">
        ${items.length > 0 ? `
          <button class="btn btn-outline btn-sm" id="btn-clear-collection">Clear Cart</button>
          <button class="btn btn-primary" id="btn-open-pdf-builder">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>Create Combined PDF (${items.length})</span>
          </button>
        ` : ''}
      </div>
    </div>

    <!-- Items Section -->
    <div class="section-title-bar">
      <div class="section-title">Selected Documents in Cart (${items.length})</div>
      <div style="font-size: 0.8rem; color: var(--text-muted);">You can reorder pages using the Up / Down controls</div>
    </div>

    ${items.length === 0 ? `
      <div style="text-align: center; padding: 4rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle); color: var(--text-muted);">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem; color: var(--accent-primary);"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary);">Your Collection is currently empty</div>
        <div style="font-size: 0.88rem; max-width: 460px; margin: 0.5rem auto 1.5rem; line-height: 1.5;">
          Navigate to any folder in Google Drive or your Dashboard, click the Collection Cart icon on any ID card or PDF, and merge them here.
        </div>
        <button class="btn btn-primary" id="btn-goto-drive">Browse Google Drive</button>
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        ${items.map((item, idx) => {
          const isPdf = isPdfFile(item.mimeType, item.name);
          const isOfflineReady = offline.offlineMap.has(item.id || item.fileId);

          return `
            <div class="collection-item-row" data-item-id="${item.id || item.fileId}" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.85rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; transition: all 0.2s;">
              <div style="display: flex; align-items: center; gap: 1rem; min-width: 0;">
                <!-- Order Number Badge -->
                <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--accent-primary-light); color: var(--accent-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; flex-shrink: 0;">
                  ${idx + 1}
                </div>

                <!-- Type Icon -->
                ${isPdf ? `
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="1.8" style="flex-shrink: 0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                ` : `
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="1.8" style="flex-shrink: 0;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                `}

                <div style="min-width: 0;">
                  <div style="font-weight: 600; font-size: 0.92rem; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                    ${item.name}
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; margin-top: 0.2rem;">
                    <span>${formatBytes(item.size)}</span>
                    <span>•</span>
                    <span style="color: var(--accent-primary);">${item.path || 'Root Folder'}</span>
                    ${isOfflineReady ? `
                      <span>•</span>
                      <span style="color: var(--success); font-weight: 600;">✓ Offline Available</span>
                    ` : ''}
                  </div>
                </div>
              </div>

              <!-- Reorder and Delete Controls -->
              <div style="display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;">
                <button class="btn-icon" data-action="move-up" data-idx="${idx}" ${idx === 0 ? 'disabled style="opacity: 0.3;"' : ''} title="Move up in PDF order">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
                </button>

                <button class="btn-icon" data-action="move-down" data-idx="${idx}" ${idx === items.length - 1 ? 'disabled style="opacity: 0.3;"' : ''} title="Move down in PDF order">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>

                <button class="btn-icon" data-action="remove-item" data-id="${item.id || item.fileId}" style="color: var(--danger);" title="Remove from cart">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;

  attachCollectionEvents(container, items);
}

function attachCollectionEvents(container, items) {
  container.querySelector('#btn-goto-drive')?.addEventListener('click', () => AppState.setActiveView('explorer'));

  container.querySelector('#btn-clear-collection')?.addEventListener('click', () => {
    if (confirm('Clear all items from your collection cart?')) {
      CollectionService.clear();
      showToast('Collection cart cleared.', 'info');
    }
  });

  container.querySelector('#btn-open-pdf-builder')?.addEventListener('click', () => {
    AppState.setPdfBuilderOpen(true);
  });

  // Reorder and delete actions
  container.querySelectorAll('[data-action="move-up"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      if (idx > 0) {
        CollectionService.reorder(idx, idx - 1);
      }
    });
  });

  container.querySelectorAll('[data-action="move-down"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      if (idx < items.length - 1) {
        CollectionService.reorder(idx, idx + 1);
      }
    });
  });

  container.querySelectorAll('[data-action="remove-item"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      CollectionService.remove(id);
      showToast('Document removed from collection.', 'info');
    });
  });
}
