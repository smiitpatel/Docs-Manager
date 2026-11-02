/**
 * Docs Manager - Root Folder Configuration Service
 * Extracts, validates, and manages Google Drive Root Folder boundaries
 */

import { AppState } from '../state/AppState.js';
import { extractFolderId } from '../utils/helpers.js';
import { GoogleDriveService } from './GoogleDriveService.js';
import { OfflineStorageService } from './OfflineStorageService.js';

class RootFolderServiceClass {
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
