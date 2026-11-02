/**
 * Docs Manager - Smart Offline Sync Service
 * 
 * CORE FEATURES (Section 5 & 13):
 * - Keep Offline: Encrypts & saves inside private IndexedDB; never exports to device Downloads!
 * - In-App Preview: Available offline without internet connection.
 * - Long-Term Access: Decoupled encryption keys preserve access even after months of inactivity.
 * - Storage management: Quota monitoring, interrupted download recovery.
 */

import { AppState } from '../state/AppState.js';
import { OfflineStorageService } from './OfflineStorageService.js';
import { GoogleDriveService } from './GoogleDriveService.js';

class SmartOfflineSyncServiceClass {
  constructor() {
    this.init();
  }

  async init() {
    await this.refreshOfflineRegistry();
    await this.updateStorageMetrics();
  }

  /**
   * Load all offline documents from IndexedDB into AppState
   */
  async refreshOfflineRegistry() {
    try {
      const records = await OfflineStorageService.getAllOfflineMetadata();
      const map = new Map();
      for (const rec of records) {
        map.set(rec.fileId, rec);
      }
      AppState.setOfflineMap(map);
    } catch (err) {
      console.error('[SmartOfflineSync] Failed to load offline records:', err);
    }
  }

  /**
   * Query browser storage estimate and update AppState
   */
  async updateStorageMetrics() {
    const metrics = await OfflineStorageService.getStorageMetrics();
    AppState.setStorageMetrics(metrics.usage, metrics.quota);
    return metrics;
  }

  /**
   * "Keep Offline" Action
   * Securely saves an encrypted copy into private IndexedDB
   */
  async keepDocumentOffline(doc) {
    const fileId = doc.id || doc.fileId;
    if (!fileId) throw new Error('Missing file ID');

    // 1. Mark as downloading
    AppState.setFileSyncing(fileId, true);

    try {
      // 2. Check storage quota
      const metrics = await this.updateStorageMetrics();
      if (metrics.quota > 0 && (metrics.usage + (doc.size || 500000)) > (metrics.quota * 0.95)) {
        throw new Error('Storage limit reached on your browser device. Free up space before keeping more offline.');
      }

      // 3. Download binary from Google Drive
      const rawBuffer = await GoogleDriveService.downloadFileBuffer(fileId);

      // 4. Encrypt with AES-GCM 256-bit and save into IndexedDB
      const pathStr = doc.path || (AppState.getState().drive.currentFolderPath.map(p => p.name).join(' / '));
      const record = await OfflineStorageService.saveOfflineDocument(
        fileId,
        doc.name,
        doc.mimeType,
        doc.size || rawBuffer.byteLength,
        rawBuffer,
        pathStr
      );

      // 5. Update local map
      const { offlineMap } = AppState.getState().offline;
      offlineMap.set(fileId, record);
      AppState.setOfflineMap(new Map(offlineMap));

      await this.updateStorageMetrics();
      return record;
    } catch (err) {
      console.error('[SmartOfflineSync] Keep offline failed:', err);
      throw err;
    } finally {
      AppState.setFileSyncing(fileId, false);
    }
  }

  /**
   * "Remove Offline Copy" Action
   * Removes local encrypted blob from IndexedDB. ORIGINAL GOOGLE DRIVE FILE IS PRESERVED!
   */
  async removeOfflineCopy(fileId) {
    try {
      await OfflineStorageService.removeOfflineCopy(fileId);

      const { offlineMap } = AppState.getState().offline;
      offlineMap.delete(fileId);
      AppState.setOfflineMap(new Map(offlineMap));

      await this.updateStorageMetrics();
      return true;
    } catch (err) {
      console.error('[SmartOfflineSync] Remove offline copy failed:', err);
      throw err;
    }
  }

  /**
   * Get sync status of a file
   * Returns: 'Available Offline' | 'Downloading' | 'Not Downloaded' | 'Update Available'
   */
  getFileSyncStatus(fileId, driveModifiedTime = null) {
    const { syncingFileIds, offlineMap } = AppState.getState().offline;

    if (syncingFileIds.has(fileId)) {
      return 'Downloading';
    }

    const offlineRec = offlineMap.get(fileId);
    if (!offlineRec) {
      return 'Not Downloaded';
    }

    if (driveModifiedTime && offlineRec.lastSyncedAt) {
      const driveTime = new Date(driveModifiedTime).getTime();
      const syncTime = new Date(offlineRec.lastSyncedAt).getTime();
      if (driveTime > syncTime + 5000) {
        return 'Update Available';
      }
    }

    return 'Available Offline';
  }
}

export const SmartOfflineSyncService = new SmartOfflineSyncServiceClass();
