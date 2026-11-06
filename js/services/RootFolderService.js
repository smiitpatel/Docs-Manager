/**
 * Docs Manager - Root Folder Configuration Service
 * Extracts, validates, and manages Google Drive Root Folder boundaries
 */

import { AppState } from '../state/AppState.js';
import { extractFolderId } from '../utils/helpers.js';
import { GoogleDriveService } from './GoogleDriveService.js';
import { OfflineStorageService } from './OfflineStorageService.js';
import { APP_CONFIG } from '../config.js';
import { showToast } from '../components/Toast.js';

class RootFolderServiceClass {
  /**
   * Google Colab-Style Auto-Discovery & Initialization:
   * 1. If valid rootFolderId is already stored, validates & uses it.
   * 2. Otherwise, automatically searches Google Drive for folder named 'Docs Manager' (or APP_CONFIG.ROOT_FOLDER_NAME).
   * 3. If found: binds to it immediately and fetches files.
   * 4. If not found: creates new 'Docs Manager' folder on Drive root with organized starter subfolders!
   */
  async autoInitializeDocsManagerFolder() {
    const { rootFolderId } = AppState.getState().drive;
    const { isDemoMode } = AppState.getState().auth;

    if (isDemoMode) {
      await this.refreshCurrentFolder();
      return;
    }

    // 1. If we already had a configured rootFolderId, verify it's accessible
    if (rootFolderId && rootFolderId !== 'mock_root_family_docs') {
      try {
        const validation = await GoogleDriveService.validateFolder(rootFolderId);
        if (validation && validation.valid) {
          AppState.setRootFolder(rootFolderId, validation.name);
          await this.refreshCurrentFolder();
          showToast(`Connected to Google Drive folder: ${validation.name}`, 'success');
          return;
        }
      } catch (err) {
        console.warn('[RootFolderService] Stored root folder not accessible, proceeding to auto-discovery:', err);
      }
    }

    // 2. Colab-style auto-discovery or creation
    try {
      showToast('Checking Google Drive for "Docs Manager" folder...', 'info', 2000);
      const folderName = APP_CONFIG.ROOT_FOLDER_NAME || 'Docs Manager';
      const starterFolders = APP_CONFIG.STARTER_SUBFOLDERS || [];

      const result = await GoogleDriveService.ensureDocsManagerFolder(folderName, starterFolders);

      AppState.setRootFolder(result.id, result.name);

      if (result.isNew) {
        showToast(`✨ Created "${result.name}" folder on your Google Drive with organized subfolders!`, 'success', 5000);
      } else {
        showToast(`📂 Connected to your existing "${result.name}" folder on Google Drive!`, 'success', 3500);
      }

      await this.refreshCurrentFolder();
    } catch (err) {
      console.error('[RootFolderService] Auto-initialize folder failed:', err);
      showToast(`Drive connection error: ${err.message}`, 'error', 5000);
    }
  }

  /**
   * Process a pasted folder URL or raw ID, validate permissions, and set as active root
   */
  async configureRootFolder(rawInput) {
    const folderId = extractFolderId(rawInput);
    if (!folderId) {
      throw new Error('Invalid Google Drive folder link or ID. Please check the URL format.');
    }

    // Validate access using authenticated account
    const validation = await GoogleDriveService.validateFolder(folderId);
    if (!validation.valid) {
      throw new Error('Cannot access this Google Drive folder with your account.');
    }

    const folderName = validation.name || 'Family Documents';

    // Update App State & persistent storage
    AppState.setRootFolder(folderId, folderName);

    // Initial fetch of folder contents
    await this.refreshCurrentFolder();

    return {
      id: folderId,
      name: folderName
    };
  }

  /**
   * Refresh the currently viewed folder
   */
  async refreshCurrentFolder() {
    const { currentFolderId, rootFolderId } = AppState.getState().drive;
    const targetId = currentFolderId || rootFolderId;

    if (!targetId) return;

    AppState.setDriveData({ isLoading: true });

    try {
      const { folders, files } = await GoogleDriveService.listFolderContents(targetId);

      // Cache current view tree for offline browsing
      await OfflineStorageService.cacheTreeData(targetId, { folders, files });

      AppState.setDriveData({
        folders,
        files,
        isLoading: false
      });
    } catch (err) {
      console.warn('[RootFolderService] Online list failed, attempting offline cache:', err);

      // Attempt to load from offline cache
      const cached = await OfflineStorageService.getCachedTreeData(targetId);
      if (cached) {
        AppState.setDriveData({
          folders: cached.folders || [],
          files: cached.files || [],
          isLoading: false
        });
      } else {
        AppState.setDriveData({ isLoading: false });
        throw err;
      }
    }
  }

  /**
   * Navigate down into a subfolder
   */
  async navigateToFolder(folderId, folderName) {
    AppState.setCurrentFolder(folderId, folderName);
    await this.refreshCurrentFolder();
  }

  /**
   * Navigate up to a specific breadcrumb
   */
  async navigateToBreadcrumb(targetIndex) {
    const { currentFolderPath } = AppState.getState().drive;
    if (targetIndex >= 0 && targetIndex < currentFolderPath.length) {
      const target = currentFolderPath[targetIndex];
      const newPath = currentFolderPath.slice(0, targetIndex + 1);
      AppState.setCurrentFolder(target.id, target.name, newPath);
      await this.refreshCurrentFolder();
    }
  }
}

export const RootFolderService = new RootFolderServiceClass();
