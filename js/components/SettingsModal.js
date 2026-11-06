/**
 * Docs Manager - Settings & Security Modal
 * 
 * CORE FEATURES (Section 3, 9, 13):
 * - Root folder management
 * - Encryption architecture details & security disclosures
 * - Storage metrics breakdown
 * - Choice between "Logout (Retain Offline Copies)" and "Logout & Wipe All Local Data"
 */

import { AppState } from '../state/AppState.js';
import { RootFolderService } from '../services/RootFolderService.js';
import { AuthenticationService } from '../services/AuthenticationService.js';
import { formatBytes } from '../utils/helpers.js';
import { showToast } from './Toast.js';

export function renderSettingsModal() {
  const modalRoot = document.getElementById('settings-modal-root');
  if (!modalRoot) return;

  const isOpen = AppState.getState().ui.isSettingsOpen;
  if (!isOpen) {
    modalRoot.innerHTML = '';
    return;
  }

  const { auth, drive, offline } = AppState.getState();
  const usageStr = formatBytes(offline.storageUsage);
  const quotaStr = offline.storageQuota > 0 ? formatBytes(offline.storageQuota) : 'Available';

  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="settings-backdrop">
      <div class="modal-container" style="max-width: 650px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <div class="modal-title">Settings & Storage Security</div>
          </div>
          <button class="btn-icon" id="btn-close-settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Root Folder Configuration -->
          <!--<div class="form-group">
            <label class="form-label">Google Drive Root Folder</label>
            <div style="display: flex; gap: 0.5rem;">
              <input 
                type="text" 
                id="settings-root-folder" 
                class="form-input" 
                style="flex: 1;" 
                placeholder="Folder URL or ID" 
                value="${drive.rootFolderId || ''}"
              />
              <button class="btn btn-secondary btn-sm" id="btn-update-root-folder">Update</button>
            </div>
            <div class="form-helper">
              Current Folder: <strong>${drive.rootFolderName || 'None'}</strong>. All operations stay strictly constrained within this boundary.
            </div>
          </div> -->

          <!-- OAuth Client ID -->
          <!--
          <div class="form-group">
            <label class="form-label">Google OAuth 2.0 Client ID</label>
            <input 
              type="text" 
              id="settings-client-id" 
              class="form-input" 
              value="${auth.clientId || ''}" 
              placeholder="e.g. 123456...apps.googleusercontent.com"
            />
            <div class="form-helper">Public client ID for Google Identity Services.</div>
          </div>
          -->

          <!-- Local Storage Breakdown -->
          <div style="padding: 1rem; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
            <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.75rem;">
              Private Offline Storage
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.82rem;">
              <div>
                <span style="color: var(--text-muted);">Encrypted Documents:</span>
                <strong style="color: var(--text-primary); margin-left: 0.25rem;">${offline.offlineMap.size} files</strong>
              </div>
              <div>
                <span style="color: var(--text-muted);">Space Used:</span>
                <strong style="color: var(--text-primary); margin-left: 0.25rem;">${usageStr}</strong>
              </div>
              <div>
                <span style="color: var(--text-muted);">Storage Quota:</span>
                <strong style="color: var(--text-primary); margin-left: 0.25rem;">${quotaStr}</strong>
              </div>
              <div>
                <span style="color: var(--text-muted);">Cipher:</span>
                <strong style="color: var(--success); margin-left: 0.25rem;">AES-GCM 256-bit</strong>
              </div>
            </div>
          </div>

          <!-- Security & Long-Term Offline Architecture Disclosure (Section 9 & 13) -->
          <div style="padding: 0.85rem; background: var(--bg-tertiary); border-radius: var(--radius-md); font-size: 0.76rem; color: var(--text-secondary); line-height: 1.5;">
            🛡️ <strong>Long-Term Offline Access Architecture:</strong>
            <ul style="margin: 0.35rem 0 0 1.25rem;">
              <li>Offline encryption keys have a local browser-bound lifecycle completely decoupled from Google OAuth access tokens.</li>
              <li>Even after months of inactivity when your Google Drive token expires, your offline documents remain completely viewable.</li>
              <li><strong>Security Notice:</strong> In-browser Web Crypto encryption safeguards files stored on your local disk. However, users should keep their device passcode enabled as anyone with physical access to your unlocked browser profile could access the data.</li>
            </ul>
          </div>

          <!-- Logout Options (Section 9) -->
          <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.6rem;">
            <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-secondary);">Sign Out Options</div>

            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" id="btn-logout-retain" style="flex: 1;">
                <span>Logout (Retain Offline Copies)</span>
              </button>

              <button class="btn btn-danger btn-sm" id="btn-logout-wipe" style="flex: 1;">
                <span>Logout & Wipe All Local Data</span>
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-primary" id="btn-save-settings">Done</button>
        </div>
      </div>
    </div>
  `;

  attachSettingsEvents(modalRoot);
}

function attachSettingsEvents(modalRoot) {
  const close = () => AppState.setSettingsOpen(false);

  modalRoot.querySelector('#btn-close-settings')?.addEventListener('click', close);
  modalRoot.querySelector('#btn-save-settings')?.addEventListener('click', close);
  modalRoot.querySelector('#settings-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'settings-backdrop') close();
  });

  // Update Root Folder
  modalRoot.querySelector('#btn-update-root-folder')?.addEventListener('click', async () => {
    const input = modalRoot.querySelector('#settings-root-folder').value.trim();
    if (!input) return;

    try {
      await RootFolderService.configureRootFolder(input);
      showToast('Google Drive root folder updated!', 'success');
      renderSettingsModal();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Update Client ID
  modalRoot.querySelector('#settings-client-id')?.addEventListener('change', (e) => {
    const val = e.target.value.trim();
    AppState.setAuth({ clientId: val });
    showToast('Client ID saved.', 'info');
  });

  // Logout retaining copies
  modalRoot.querySelector('#btn-logout-retain')?.addEventListener('click', async () => {
    if (confirm('Sign out from Google Drive? Your encrypted offline copies will remain accessible offline on this device.')) {
      await AuthenticationService.signOut({ retainOfflineCopies: true });
      showToast('Signed out. Offline documents preserved.', 'info');
      close();
    }
  });

  // Logout and wipe all local data
  modalRoot.querySelector('#btn-logout-wipe')?.addEventListener('click', async () => {
    if (confirm('WARNING: This will sign you out and completely DELETE all local encrypted offline documents, cached metadata, and encryption keys from this browser. Are you sure?')) {
      await AuthenticationService.signOut({ retainOfflineCopies: false });
      showToast('All local data wiped. Signed out securely.', 'info');
      close();
    }
  });
}
