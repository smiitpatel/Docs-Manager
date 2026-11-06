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
   * Resolve appropriate MIME type using doc metadata and filename heuristics
   */
  resolveMimeType(doc) {
    let mime = doc.mimeType;
    if (!mime || mime === 'application/octet-stream') {
      const name = (doc.name || '').toLowerCase();
      if (/\.jpe?g$/i.test(name)) mime = 'image/jpeg';
      else if (/\.png$/i.test(name)) mime = 'image/png';
      else if (/\.webp$/i.test(name)) mime = 'image/webp';
      else if (/\.gif$/i.test(name)) mime = 'image/gif';
      else if (/\.svg$/i.test(name)) mime = 'image/svg+xml';
      else if (/\.pdf$/i.test(name)) mime = 'application/pdf';
      else mime = 'application/octet-stream';
    }
    return mime;
  }

  /**
   * Acquire a previewable Blob URL for a document (either from encrypted offline storage or Google Drive)
   */
  async getPreviewUrl(doc) {
    // Revoke previous blob URL if any to free memory
    this.revokeActiveUrl();

    const fileId = doc.id || doc.fileId;
    const resolvedMime = this.resolveMimeType(doc);

    // 1. Try offline storage first (instant, works without internet)
    try {
      const offlineDoc = await OfflineStorageService.getDecryptedDocument(fileId);
      if (offlineDoc && offlineDoc.rawBuffer) {
        const blob = new Blob([offlineDoc.rawBuffer], { type: resolvedMime });
        this.activeBlobUrl = URL.createObjectURL(blob);
        return {
          url: this.activeBlobUrl,
          blob,
          isFromOffline: true,
          source: 'Encrypted Offline Vault'
        };
      }
    } catch (e) {
      console.warn('[DocumentPreviewService] Offline read skipped:', e);
    }

    // 2. Download original binary from Google Drive
    try {
      const rawBuffer = await GoogleDriveService.downloadFileBuffer(fileId);
      const blob = new Blob([rawBuffer], { type: resolvedMime });
      this.activeBlobUrl = URL.createObjectURL(blob);

      return {
        url: this.activeBlobUrl,
        blob,
        isFromOffline: false,
        source: 'Google Drive Stream'
      };
    } catch (err) {
      // 3. Fallback for photos: if stream fails and Google thumbnailLink is available, use high-res image CDN
      if (isImageFile(resolvedMime, doc.name) && doc.thumbnailLink) {
        const highResUrl = doc.thumbnailLink.replace(/=s\d+.*$/, '=s1600');
        return {
          url: highResUrl,
          blob: null,
          isFromOffline: false,
          source: 'Google Drive Image CDN'
        };
      }
      throw err;
    }
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
