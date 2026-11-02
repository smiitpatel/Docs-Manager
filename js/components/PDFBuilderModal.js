/**
 * Docs Manager - Smart PDF Builder Modal
 * 
 * CORE FEATURES (Section 14):
 * - Page size, orientation, image fit, margin customization
 * - In-browser generation via pdf-lib
 * - Live preview of generated combined PDF
 * - Download to device OR Save directly into authorized Google Drive folder
 */

import { AppState } from '../state/AppState.js';
import { SmartPDFBuilder } from '../services/SmartPDFBuilder.js';
import { GoogleDriveService } from '../services/GoogleDriveService.js';
import { exportFileToDevice } from '../utils/helpers.js';
import { showToast } from './Toast.js';

let generatedPdfBlob = null;
let generatedPdfUrl = null;

export function renderPDFBuilderModal() {
  const modalRoot = document.getElementById('pdf-builder-modal-root');
  if (!modalRoot) return;

  const isOpen = AppState.getState().ui.isPdfBuilderOpen;
  if (!isOpen) {
    if (generatedPdfUrl) {
      URL.revokeObjectURL(generatedPdfUrl);
      generatedPdfUrl = null;
      generatedPdfBlob = null;
    }
    modalRoot.innerHTML = '';
    return;
  }

  const items = AppState.getState().collection.items || [];

  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="pdf-builder-backdrop">
      <div class="modal-container large" style="max-height: 94vh;">
        <!-- Header -->
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            <div class="modal-title">Smart PDF Builder</div>
          </div>
          <button class="btn-icon" id="btn-close-pdf-builder">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;" id="builder-grid">
            <!-- Left Column: Settings -->
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Combined PDF Document Title</label>
                <input type="text" id="pdf-title-input" class="form-input" value="Combined_Family_Documents" />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="form-group">
                  <label class="form-label">Page Size</label>
                  <select id="pdf-page-size" class="form-select">
                    <option value="A4" selected>A4 (Standard)</option>
                    <option value="Letter">US Letter</option>
                    <option value="Original">Original Dimensions</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Orientation</label>
                  <select id="pdf-orientation" class="form-select">
                    <option value="portrait" selected>Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="form-group">
                  <label class="form-label">Image Fit</label>
                  <select id="pdf-image-fit" class="form-select">
                    <option value="contain" selected>Fit to Page (Contain)</option>
                    <option value="fill">Fill Entire Page</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Page Margins</label>
                  <select id="pdf-margins" class="form-select">
                    <option value="18" selected>Compact (18pt)</option>
                    <option value="36">Normal (36pt)</option>
                    <option value="0">None (Full Bleed)</option>
                  </select>
                </div>
              </div>

              <div style="padding: 0.85rem; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); font-size: 0.82rem; color: var(--text-secondary);">
                <strong>Documents to Merge (${items.length}):</strong>
                <ul style="margin: 0.5rem 0 0 1.25rem; max-height: 120px; overflow-y: auto;">
                  ${items.map((it, i) => `<li>${i + 1}. ${it.name}</li>`).join('')}
                </ul>
              </div>

              <!-- Progress bar container -->
              <div id="pdf-build-progress-wrap" style="display: none;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.35rem;">
                  <span id="pdf-progress-status">Building PDF...</span>
                  <span id="pdf-progress-percent">0%</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" id="pdf-progress-bar" style="width: 0%;"></div>
                </div>
              </div>

              <button class="btn btn-primary" id="btn-generate-pdf">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span>Generate Combined PDF</span>
              </button>
            </div>

            <!-- Right Column: Live Output Preview -->
            <div style="background: #05070E; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; min-height: 380px; position: relative;" id="pdf-preview-pane">
              <div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.75rem;"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                <div style="font-weight: 600; color: var(--text-primary);">Preview will appear here</div>
                <div style="font-size: 0.8rem; margin-top: 0.25rem;">Click "Generate Combined PDF" to compile your documents locally in your browser.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-builder">Cancel</button>

          <button class="btn btn-outline" id="btn-download-built-pdf" disabled style="opacity: 0.5;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Download to Device</span>
          </button>

          <button class="btn btn-primary" id="btn-save-drive-built-pdf" disabled style="opacity: 0.5;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span>Save to Google Drive</span>
          </button>
        </div>
      </div>
    </div>
  `;

  attachBuilderEvents(modalRoot, items);
}

function attachBuilderEvents(modalRoot, items) {
  const close = () => AppState.setPdfBuilderOpen(false);

  modalRoot.querySelector('#btn-close-pdf-builder')?.addEventListener('click', close);
  modalRoot.querySelector('#btn-cancel-builder')?.addEventListener('click', close);
  modalRoot.querySelector('#pdf-builder-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'pdf-builder-backdrop') close();
  });

  const generateBtn = modalRoot.querySelector('#btn-generate-pdf');
  const progressWrap = modalRoot.querySelector('#pdf-build-progress-wrap');
  const progressBar = modalRoot.querySelector('#pdf-progress-bar');
  const progressText = modalRoot.querySelector('#pdf-progress-status');
  const progressPct = modalRoot.querySelector('#pdf-progress-percent');
  const previewPane = modalRoot.querySelector('#pdf-preview-pane');
  const downloadBtn = modalRoot.querySelector('#btn-download-built-pdf');
  const saveDriveBtn = modalRoot.querySelector('#btn-save-drive-built-pdf');

  generateBtn?.addEventListener('click', async () => {
    const title = modalRoot.querySelector('#pdf-title-input').value.trim() || 'Combined_Documents';
    const pageSize = modalRoot.querySelector('#pdf-page-size').value;
    const orientation = modalRoot.querySelector('#pdf-orientation').value;
    const imageFit = modalRoot.querySelector('#pdf-image-fit').value;
    const margin = parseInt(modalRoot.querySelector('#pdf-margins').value, 10);

    progressWrap.style.display = 'block';
    generateBtn.disabled = true;

    try {
      generatedPdfBlob = await SmartPDFBuilder.buildCombinedPDF(
        items,
        { title, pageSize, orientation, imageFit, margin },
        (pct, status) => {
          progressBar.style.width = `${pct}%`;
          progressPct.textContent = `${pct}%`;
          progressText.textContent = status;
        }
      );

      if (generatedPdfUrl) URL.revokeObjectURL(generatedPdfUrl);
      generatedPdfUrl = URL.createObjectURL(generatedPdfBlob);

      // Render live preview iframe
      previewPane.innerHTML = `
        <iframe src="${generatedPdfUrl}" style="width: 100%; height: 100%; border: none; border-radius: var(--radius-md);"></iframe>
      `;

      // Enable export buttons
      downloadBtn.disabled = false;
      downloadBtn.style.opacity = '1';
      saveDriveBtn.disabled = false;
      saveDriveBtn.style.opacity = '1';

      showToast('Combined PDF generated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
      progressText.textContent = 'Error: ' + err.message;
    } finally {
      generateBtn.disabled = false;
    }
  });

  // Download PDF to device storage
  downloadBtn?.addEventListener('click', () => {
    if (!generatedPdfBlob) return;
    const title = modalRoot.querySelector('#pdf-title-input').value.trim() || 'Combined_Documents';
    const filename = `${title}.pdf`;
    exportFileToDevice(generatedPdfBlob, filename);
    showToast(`Exported "${filename}" to device storage.`, 'success');
  });

  // Save PDF to Google Drive inside authorized root
  saveDriveBtn?.addEventListener('click', async () => {
    if (!generatedPdfBlob) return;
    const title = modalRoot.querySelector('#pdf-title-input').value.trim() || 'Combined_Documents';
    const filename = `${title}.pdf`;
    const targetFolderId = AppState.getState().drive.currentFolderId || AppState.getState().drive.rootFolderId;

    try {
      showToast(`Saving "${filename}" to Google Drive...`, 'info');
      await GoogleDriveService.uploadFile(generatedPdfBlob, filename, targetFolderId);
      showToast(`Saved "${filename}" to Google Drive folder!`, 'success');
      close();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
