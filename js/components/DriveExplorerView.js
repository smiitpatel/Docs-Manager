/**
 * Docs Manager - Google Drive Explorer View
 */

import { AppState } from '../state/AppState.js';
import { RootFolderService } from '../services/RootFolderService.js';
import { GoogleDriveService } from './../services/GoogleDriveService.js';
import { SmartOfflineSyncService } from '../services/SmartOfflineSyncService.js';
import { CollectionService } from '../services/CollectionService.js';
import { formatBytes, formatDate, getCategoryBadge, isPdfFile, exportFileToDevice } from '../utils/helpers.js';
import { showToast } from './Toast.js';

export function renderDriveExplorerView(container) {
  const state = AppState.getState();
  const { drive, offline, collection } = state;
  const { currentFolderPath, folders, files, isLoading } = drive;

  // Filter files by search query if any
  let displayFiles = [...(files || [])];
  if (state.ui.searchQuery) {
    const q = state.ui.searchQuery.toLowerCase();
    displayFiles = displayFiles.filter(f => f.name.toLowerCase().includes(q));
  }

  container.innerHTML = `
    <!-- Breadcrumb Toolbar -->
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
      <div class="breadcrumb-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 0.25rem; color: #FBBF24;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        ${currentFolderPath.map((crumb, idx) => `
          <div class="breadcrumb-item ${idx === currentFolderPath.length - 1 ? 'active' : ''}" data-crumb-idx="${idx}">
            ${crumb.name}
          </div>
          ${idx < currentFolderPath.length - 1 ? `<span>/</span>` : ''}
        `).join('')}
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <button class="btn btn-secondary btn-sm" id="btn-create-folder" title="Create nested folder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
          <span>New Folder</span>
        </button>

        <label class="btn btn-primary btn-sm" style="margin: 0; cursor: pointer;" title="Upload document to current folder">
          <input type="file" id="file-upload-input" style="display: none;" accept="image/*,application/pdf" />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Upload File</span>
        </label>

        <button class="btn-icon" id="btn-refresh-folder" title="Refresh folder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </button>
      </div>
    </div>

    ${isLoading ? `
      <div style="padding: 4rem; text-align: center; color: var(--text-muted);">
        <div class="progress-bar-bg" style="width: 200px; margin: 0 auto 1rem;">
          <div class="progress-bar-fill" style="width: 70%; animation: pulse-danger 1s infinite;"></div>
        </div>
        <div>Loading Google Drive folder contents...</div>
      </div>
    ` : `
      <!-- Subfolders Section -->
      ${folders && folders.length > 0 ? `
        <div class="section-title-bar">
          <div class="section-title">Folders (${folders.length})</div>
        </div>
        <div class="folders-grid">
          ${folders.map(folder => `
            <div class="folder-card" data-folder-id="${folder.id}" data-folder-name="${folder.name}">
              <svg class="folder-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
              <div style="flex: 1; min-width: 0;">
                <div class="folder-name">${folder.name}</div>
                <div class="folder-meta">Google Drive Folder</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Files Section -->
      <div class="section-title-bar" style="margin-top: 1.25rem;">
        <div class="section-title">Documents in this Folder (${displayFiles.length})</div>
      </div>

      ${displayFiles.length === 0 ? `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <div style="font-weight: 600; color: var(--text-primary);">This folder is empty</div>
          <div style="font-size: 0.85rem; margin-top: 0.25rem;">Upload a document or create a subfolder above.</div>
        </div>
      ` : `
        <div class="documents-grid">
          ${displayFiles.map(doc => renderFileItem(doc, state)).join('')}
        </div>
      `}
    `}
  `;

  // Attach Event Handlers
  attachExplorerEvents(container, state);
}

function renderFileItem(doc, state) {
  const isPdf = isPdfFile(doc.mimeType, doc.name);
  const isOffline = state.offline.offlineMap.has(doc.id);
  const isSyncing = state.offline.syncingFileIds.has(doc.id);
  const inCollection = state.collection.items.some(i => i.id === doc.id);
  const badgeStyle = getCategoryBadge(doc.category || 'Other');

  return `
    <div class="doc-card" data-file-id="${doc.id}">
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
            <span class="status-badge downloading">Downloading...</span>
          ` : isOffline ? `
            <span class="status-badge offline-ready">Offline Ready</span>
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
          <button class="btn btn-outline btn-sm" style="color: var(--success); border-color: rgba(16, 185, 129, 0.4);" data-action="remove-offline" title="Remove local offline copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Offline</span>
          </button>
        ` : `
          <button class="btn btn-secondary btn-sm" data-action="keep-offline" title="Keep encrypted offline copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Keep Offline</span>
          </button>
        `}

        <div style="display: flex; gap: 0.35rem;">
          <!-- Add to Collection Cart -->
          <button class="btn-icon ${inCollection ? 'active' : ''}" style="${inCollection ? 'color: var(--accent-primary); border-color: var(--accent-primary);' : ''}" data-action="toggle-collection" title="${inCollection ? 'In Collection' : 'Add to Collection'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </button>

          <!-- Explicit Download Button (Section 5) -->
          <button class="btn-icon" data-action="export-device" title="Download to Device Storage">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>

          <!-- Preview -->
          <button class="btn-icon" data-action="preview" title="Preview Document">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function attachExplorerEvents(container, state) {
  // Breadcrumb clicks
  container.querySelectorAll('.breadcrumb-item').forEach(crumb => {
    crumb.addEventListener('click', () => {
      const idx = parseInt(crumb.getAttribute('data-crumb-idx'), 10);
      RootFolderService.navigateToBreadcrumb(idx);
    });
  });

  // Folder navigation clicks
  container.querySelectorAll('.folder-card').forEach(card => {
    card.addEventListener('click', () => {
      const folderId = card.getAttribute('data-folder-id');
      const folderName = card.getAttribute('data-folder-name');
      RootFolderService.navigateToFolder(folderId, folderName);
    });
  });

  // Refresh
  container.querySelector('#btn-refresh-folder')?.addEventListener('click', () => {
    RootFolderService.refreshCurrentFolder();
  });

  // Create Folder
  container.querySelector('#btn-create-folder')?.addEventListener('click', async () => {
    const folderName = prompt('Enter new folder name:');
    if (!folderName || !folderName.trim()) return;

    try {
      const parentId = state.drive.currentFolderId;
      await GoogleDriveService.createFolder(folderName.trim(), parentId);
      showToast(`Folder "${folderName}" created successfully.`, 'success');
      await RootFolderService.refreshCurrentFolder();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // File Upload
  const uploadInput = container.querySelector('#file-upload-input');
  if (uploadInput) {
    uploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        showToast(`Uploading "${file.name}" to Google Drive...`, 'info');
        const parentId = state.drive.currentFolderId;
        await GoogleDriveService.uploadFile(file, file.name, parentId);
        showToast(`"${file.name}" uploaded successfully!`, 'success');
        await RootFolderService.refreshCurrentFolder();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // File Actions
  container.querySelectorAll('.doc-card').forEach(card => {
    const fileId = card.getAttribute('data-file-id');
    const doc = state.drive.files.find(f => f.id === fileId);
    if (!doc) return;

    card.querySelectorAll('[data-action="preview"]').forEach(el => {
      el.addEventListener('click', () => AppState.setPreviewDocument(doc));
    });

    card.querySelector('[data-action="keep-offline"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await SmartOfflineSyncService.keepDocumentOffline(doc);
        showToast(`"${doc.name}" saved to private offline vault.`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    card.querySelector('[data-action="remove-offline"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await SmartOfflineSyncService.removeOfflineCopy(fileId);
        showToast(`Offline copy removed. Google Drive original preserved.`, 'info');
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
        showToast(`Preparing download for "${doc.name}"...`, 'info');
        const rawBuffer = await GoogleDriveService.downloadFileBuffer(fileId);
        const blob = new Blob([rawBuffer], { type: doc.mimeType });
        exportFileToDevice(blob, doc.name);
        showToast(`Downloaded "${doc.name}" to device storage.`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}
