/**
 * Docs Manager - Integrated Document Viewer Modal
 * 
 * CORE FEATURES (Section 6 & 13):
 * - In-app preview for PDFs and Images (JPG, PNG, WebP)
 * - Automatic decryption for offline documents
 * - Zoom, fit, fullscreen controls
 * - Keep Offline toggle & explicit Download to device button
 * - Zero export to device files unless user clicks Download
 */

import { AppState } from '../state/AppState.js';
import { DocumentPreviewService } from '../services/DocumentPreviewService.js';
import { SmartOfflineSyncService } from '../services/SmartOfflineSyncService.js';
import { NavigationService } from '../services/NavigationService.js';
import { formatBytes, formatDate, isPdfFile, exportFileToDevice } from '../utils/helpers.js';
import { showToast } from './Toast.js';

export function renderDocumentPreviewModal() {
  const modalRoot = document.getElementById('preview-modal-root');
  if (!modalRoot) return;

  const doc = AppState.getState().ui.previewDocument;
  if (!doc) {
    modalRoot.innerHTML = '';
    return;
  }

  const isPdf = isPdfFile(doc.mimeType, doc.name);
  const isOffline = AppState.getState().offline.offlineMap.has(doc.id || doc.fileId);

  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="preview-backdrop">
      <div class="modal-container large" style="height: 92vh; width: 95vw; max-width: 1350px;">
        <!-- Viewer Header -->
        <div class="modal-header" style="padding: 0.85rem 1.25rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0;">
            ${isPdf ? `
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            ` : `
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            `}
            <div style="font-weight: 600; font-size: 1rem; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
              ${doc.name}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <!-- Keep Offline Toggle -->
            ${isOffline ? `
              <button class="btn btn-outline btn-sm" id="btn-viewer-remove-offline" style="color: var(--success); border-color: rgba(16, 185, 129, 0.4);" title="Remove local copy">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Available Offline</span>
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" id="btn-viewer-keep-offline" title="Encrypt & Keep Offline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Keep Offline</span>
              </button>
            `}

            <!-- Explicit Download to Device -->
            <button class="btn btn-primary btn-sm" id="btn-viewer-download" title="Export file to device storage">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Download</span>
            </button>

            <!-- Close Modal -->
            <button class="btn-icon" id="btn-close-viewer" title="Close viewer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!-- Viewer Body -->
        <div style="flex: 1; display: flex; overflow: hidden; background: #05070E;">
          <!-- Main Display Area -->
          <div id="viewer-stage" style="flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; position: relative;">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.85rem; color: var(--text-muted); font-size: 0.9rem;" id="viewer-loading-msg">
              <div class="spinner"></div>
              <div>Decrypting and preparing document preview...</div>
            </div>
          </div>

          <!-- Info Sidebar -->
          <div class="viewer-sidebar desktop-only" style="width: 280px; background: var(--bg-secondary); border-left: 1px solid var(--border-subtle); padding: 1.25rem;">
            <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 1rem;">
              Document Details
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.82rem;">
              <div>
                <div style="color: var(--text-muted); margin-bottom: 2px;">File Size</div>
                <div style="font-weight: 600; color: var(--text-primary);">${formatBytes(doc.size)}</div>
              </div>

              <div>
                <div style="color: var(--text-muted); margin-bottom: 2px;">Category</div>
                <div style="font-weight: 600; color: var(--text-primary);">${doc.category || 'General Document'}</div>
              </div>

              <div>
                <div style="color: var(--text-muted); margin-bottom: 2px;">Folder Location</div>
                <div style="font-weight: 600; color: var(--accent-primary); word-break: break-all;">${doc.path || 'Root Folder'}</div>
              </div>

              <div>
                <div style="color: var(--text-muted); margin-bottom: 2px;">Offline Encryption</div>
                <div style="font-weight: 600; color: ${isOffline ? 'var(--success)' : 'var(--text-muted)'};">
                  ${isOffline ? '✓ AES-GCM 256 Encrypted' : 'Not Saved Offline'}
                </div>
              </div>

              <div style="margin-top: 1rem; padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-md); font-size: 0.74rem; color: var(--text-secondary); line-height: 1.4;">
                🔒 <strong>Privacy Assurance:</strong> Previews are generated securely inside your browser sandbox. Decrypted buffers are wiped upon closing.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load preview data asynchronously
  let currentBlob = null;
  const stage = modalRoot.querySelector('#viewer-stage');

  DocumentPreviewService.getPreviewUrl(doc)
    .then(({ url, blob, isFromOffline }) => {
      currentBlob = blob;
      stage.innerHTML = '';

      if (isPdf) {
        // Embedded PDF viewer
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        stage.appendChild(iframe);
      } else {
        // Image viewer
        const img = document.createElement('img');
        img.src = url;
        img.alt = doc.name;
        img.setAttribute('referrerpolicy', 'no-referrer');
        img.style.maxWidth = '92%';
        img.style.maxHeight = '92%';
        img.style.objectFit = 'contain';
        img.style.borderRadius = 'var(--radius-md)';
        img.style.boxShadow = 'var(--shadow-lg)';
        stage.appendChild(img);
      }
    })
    .catch((err) => {
      stage.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 2.5rem 1.5rem; max-width: 500px; margin: 0 auto;">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" style="margin-bottom: 0.75rem;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div style="font-size: 1.05rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">Could not preview document</div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem; line-height: 1.5;">${escapeHtml(err.message)}</div>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            ${doc.webViewLink ? `
              <a href="${escapeHtml(doc.webViewLink)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span>Open in Google Drive</span>
              </a>
            ` : ''}
            <button class="btn btn-secondary btn-sm" id="btn-preview-retry">Retry Preview</button>
          </div>
        </div>
      `;
      stage.querySelector('#btn-preview-retry')?.addEventListener('click', () => {
        renderDocumentPreviewModal();
      });
    });

  // Close handlers
  const close = () => {
    DocumentPreviewService.revokeActiveUrl();
    AppState.setPreviewDocument(null);
    NavigationService.backIfStep('preview');
  };

  modalRoot.querySelector('#btn-close-viewer')?.addEventListener('click', close);
  modalRoot.querySelector('#preview-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'preview-backdrop') close();
  });

  // Keep Offline button
  modalRoot.querySelector('#btn-viewer-keep-offline')?.addEventListener('click', async () => {
    try {
      await SmartOfflineSyncService.keepDocumentOffline(doc);
      showToast(`"${doc.name}" is now encrypted offline.`, 'success');
      renderDocumentPreviewModal();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Remove Offline button
  modalRoot.querySelector('#btn-viewer-remove-offline')?.addEventListener('click', async () => {
    try {
      await SmartOfflineSyncService.removeOfflineCopy(doc.id || doc.fileId);
      showToast('Offline copy removed from private storage.', 'info');
      renderDocumentPreviewModal();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Explicit Download button
  modalRoot.querySelector('#btn-viewer-download')?.addEventListener('click', async () => {
    if (currentBlob) {
      exportFileToDevice(currentBlob, doc.name);
      showToast(`Exported "${doc.name}" to device Downloads.`, 'success');
    } else {
      showToast('Downloading full document for export...', 'info');
      try {
        const raw = await import('../services/GoogleDriveService.js').then(m => m.GoogleDriveService.downloadFileBuffer(doc.id || doc.fileId));
        const mime = DocumentPreviewService.resolveMimeType(doc);
        const dlBlob = new Blob([raw], { type: mime });
        exportFileToDevice(dlBlob, doc.name);
        showToast(`Exported "${doc.name}" to device Downloads.`, 'success');
      } catch (err) {
        showToast('Download failed: ' + err.message, 'error');
      }
    }
  });
}
