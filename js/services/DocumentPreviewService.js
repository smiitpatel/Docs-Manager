/**
 * Docs Manager - Document Preview Engine
 * Provides in-app secure viewing of PDF documents and Images,
 * decrypting offline copies on-the-fly and managing memory safely.
 */

import { OfflineStorageService } from './OfflineStorageService.js';
import { GoogleDriveService } from './GoogleDriveService.js';
import { isPdfFile, isImageFile } from '../utils/helpers.js';

class DocumentPreviewServiceClass {
  constructor() {
    this.activeBlobUrl = null;
  }

  /**
   * Acquire a previewable Blob URL for a document (either from encrypted offline storage or Google Drive)
   */
  async getPreviewUrl(doc) {
    // Revoke previous blob URL if any to free memory
    this.revokeActiveUrl();

    const fileId = doc.id || doc.fileId;

    // 1. Try offline storage first (fast, works without internet)
    const offlineDoc = await OfflineStorageService.getDecryptedDocument(fileId);
    if (offlineDoc && offlineDoc.rawBuffer) {
      const blob = new Blob([offlineDoc.rawBuffer], { type: doc.mimeType || 'application/pdf' });
      this.activeBlobUrl = URL.createObjectURL(blob);
      return {
        url: this.activeBlobUrl,
        blob,
        isFromOffline: true,
        source: 'Encrypted Offline Vault'
      };
    }

    // 2. If not offline, download from Google Drive
    const rawBuffer = await GoogleDriveService.downloadFileBuffer(fileId);
    const blob = new Blob([rawBuffer], { type: doc.mimeType || 'application/pdf' });
    this.activeBlobUrl = URL.createObjectURL(blob);

    return {
      url: this.activeBlobUrl,
      blob,
      isFromOffline: false,
      source: 'Google Drive Stream'
    };
  }

  /**
   * Release active object URL
   */
  revokeActiveUrl() {
    if (this.activeBlobUrl) {
      URL.revokeObjectURL(this.activeBlobUrl);
      this.activeBlobUrl = null;
    }
  }

  /**
   * Detect preview capabilities
   */
  canPreview(doc) {
    return isPdfFile(doc.mimeType, doc.name) || isImageFile(doc.mimeType, doc.name);
  }
}

export const DocumentPreviewService = new DocumentPreviewServiceClass();
