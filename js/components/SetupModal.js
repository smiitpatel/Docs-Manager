/**
 * Docs Manager - Setup & Welcome Modal
 * 
 * CORE FEATURES (Section 2 & 3):
 * - Initial setup workflow
 * - Dynamic Google Drive root folder configuration (extracts ID from URL)
 * - Google Identity Services OAuth Client ID setup with clear step-by-step guidance
 * - Instant Demo Mode for immediate Live Server testing
 */

import { AppState } from '../state/AppState.js';
import { RootFolderService } from '../services/RootFolderService.js';
import { AuthenticationService } from '../services/AuthenticationService.js';
import { showToast } from './Toast.js';

export function renderSetupModal() {
  const modalRoot = document.getElementById('setup-modal-root');
  if (!modalRoot) return;

  const isOpen = AppState.getState().ui.isSetupOpen;
  if (!isOpen) {
    modalRoot.innerHTML = '';
    return;
  }

  const { auth, drive } = AppState.getState();

  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="setup-backdrop">
      <div class="modal-container" style="max-width: 600px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="./favicon.svg" style="width: 28px; height: 28px;" />
            <div class="modal-title">Connect Google Drive</div>
          </div>
          <button class="btn-icon" id="btn-close-setup">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="modal-body">
          <div style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">
            Docs Manager acts as your family's private, encrypted offline interface to your existing Google Drive documents.
            No data is stored on external cloud databases or paid servers.
          </div>

          <!-- Demo Mode Callout -->
          <div style="background: linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(16, 185, 129, 0.15)); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: var(--radius-md); padding: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
            <div>
              <div style="font-weight: 600; color: var(--text-primary); font-size: 0.92rem;">Testing with Live Server?</div>
              <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
                Explore real sample family documents, offline sync, and the PDF builder immediately.
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-start-demo-mode">
              <span>Try Demo Mode</span>
            </button>
          </div>

          <hr style="border: none; border-top: 1px solid var(--border-subtle); margin: 0.5rem 0;" />

          <!-- Step 1: Google OAuth Client ID -->
          <div class="form-group">
            <label class="form-label">1. Google OAuth 2.0 Web Client ID</label>
            <input 
              type="text" 
              id="setup-client-id" 
              class="form-input" 
              placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com" 
              value="${auth.clientId || ''}"
            />
            <div class="form-helper">
              Create a free OAuth 2.0 Client ID in the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: var(--accent-primary);">Google Cloud Console</a> for a "Web application". Add <code>${window.location.origin}</code> to Authorized JavaScript Origins.
            </div>
          </div>

          <!-- Step 2: Google Drive Root Folder URL -->
          <div class="form-group">
            <label class="form-label">2. Google Drive Root Folder URL or ID</label>
            <input 
              type="text" 
              id="setup-root-folder" 
              class="form-input" 
              placeholder="e.g. https://drive.google.com/drive/folders/1aBcDeFgHi..." 
              value="${drive.rootFolderId || ''}"
            />
            <div class="form-helper">
              Paste the shareable link or folder URL of the root folder (e.g. Papa's shared "Docs Manager" folder). The folder ID will be extracted automatically.
            </div>
          </div>

          <div style="font-size: 0.76rem; color: var(--text-muted); line-height: 1.4; padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-md);">
            🔒 <strong>Strict Privacy:</strong> Your Google OAuth Client Secret is NEVER requested and never stored. Access tokens stay in your browser's private memory and are never sent to external servers.
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-setup">Cancel</button>
          <button class="btn btn-primary" id="btn-save-setup">Save & Authenticate</button>
        </div>
      </div>
    </div>
  `;

  attachSetupEvents(modalRoot);
}

function attachSetupEvents(modalRoot) {
  const close = () => AppState.setSetupOpen(false);

  modalRoot.querySelector('#btn-close-setup')?.addEventListener('click', close);
  modalRoot.querySelector('#btn-cancel-setup')?.addEventListener('click', close);
  modalRoot.querySelector('#setup-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'setup-backdrop') close();
  });

  // Demo Mode
  modalRoot.querySelector('#btn-start-demo-mode')?.addEventListener('click', async () => {
    AuthenticationService.startDemoMode();
    await RootFolderService.configureRootFolder('mock_root_family_docs_12345');
    showToast('Entered Interactive Demo Mode with family documents!', 'success');
    close();
  });

  // Save & Connect
  modalRoot.querySelector('#btn-save-setup')?.addEventListener('click', async () => {
    const clientId = modalRoot.querySelector('#setup-client-id').value.trim();
    const folderInput = modalRoot.querySelector('#setup-root-folder').value.trim();

    if (!clientId && !AppState.getState().auth.isDemoMode) {
      alert('Please enter your Google OAuth Client ID or choose "Try Demo Mode" above.');
      return;
    }

    if (clientId) {
      AppState.setAuth({ clientId });
    }

    if (folderInput) {
      try {
        await RootFolderService.configureRootFolder(folderInput);
        showToast('Root folder verified and saved!', 'success');
      } catch (err) {
        showToast(err.message, 'warning');
      }
    }

    // Trigger GIS OAuth flow if client ID is set
    if (clientId) {
      try {
        await AuthenticationService.signIn();
        close();
      } catch (err) {
        showToast(err.message, 'error');
      }
    } else {
      close();
    }
  });
}
