/**
 * Docs Manager - Offline Storage Service (IndexedDB + Web Crypto AES-GCM)
 * 
 * CRITICAL SECURITY & OFFLINE ARCHITECTURE:
 * - Sensitive document blobs are stored ONLY inside private, browser-sandboxed IndexedDB.
 * - Every document blob is encrypted with AES-GCM 256-bit prior to saving.
 * - Files are NEVER exported to Android/Desktop public Downloads folder during "Keep Offline".
 * - Key lifecycle is independent of Google OAuth access tokens.
 * - Long-term offline access is guaranteed even after months of inactivity.
 */

import { encryptBuffer, decryptBuffer, clearVault } from '../utils/crypto.js';

const DB_NAME = 'DocsManager_Storage_v1';
const DB_VERSION = 1;

const STORES = {
  OFFLINE_DOCS: 'offline_documents',
  TREE_CACHE: 'tree_cache',
  APP_PREFS: 'app_preferences'
};

class OfflineStorageServiceClass {
  constructor() {
    this.dbPromise = this.initDB();
  }

  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORES.OFFLINE_DOCS)) {
          const store = db.createObjectStore(STORES.OFFLINE_DOCS, { keyPath: 'fileId' });
          store.createIndex('by_name', 'name', { unique: false });
          store.createIndex('by_lastSynced', 'lastSyncedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.TREE_CACHE)) {
          db.createObjectStore(STORES.TREE_CACHE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.APP_PREFS)) {
          db.createObjectStore(STORES.APP_PREFS, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  /**
   * Save and Encrypt a document into private IndexedDB
   */
  async saveOfflineDocument(fileId, name, mimeType, size, rawArrayBuffer, sourceFolderPath = '') {
    const db = await this.dbPromise;

    // 1. Encrypt buffer with AES-GCM 256-bit
    const { iv, cipherBuffer } = await encryptBuffer(rawArrayBuffer);

    const record = {
      fileId,
      name,
      mimeType,
      size,
      iv: Array.from(iv), // Store as regular array for clean IDB serialization
      cipherBuffer,
      lastSyncedAt: new Date().toISOString(),
      sourceFolderPath,
      status: 'Available Offline'
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OFFLINE_DOCS, 'readwrite');
      tx.objectStore(STORES.OFFLINE_DOCS).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Decrypt and retrieve an offline document
   */
  async getDecryptedDocument(fileId) {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OFFLINE_DOCS, 'readonly');
      const req = tx.objectStore(STORES.OFFLINE_DOCS).get(fileId);

      req.onsuccess = async () => {
        const record = req.result;
        if (!record) {
          resolve(null);
          return;
        }

        try {
          const rawBuffer = await decryptBuffer(record.cipherBuffer, new Uint8Array(record.iv));
          resolve({
            fileId: record.fileId,
            name: record.name,
            mimeType: record.mimeType,
            size: record.size,
            rawBuffer,
            lastSyncedAt: record.lastSyncedAt,
            sourceFolderPath: record.sourceFolderPath
          });
        } catch (err) {
          console.error('[OfflineStorage] Decryption failed for file:', fileId, err);
          reject(new Error('Document decryption failed. Integrity error or corrupted copy.'));
        }
      };

      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Remove only the local offline copy (Leaves Google Drive original completely untouched)
   */
  async removeOfflineCopy(fileId) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OFFLINE_DOCS, 'readwrite');
      tx.objectStore(STORES.OFFLINE_DOCS).delete(fileId);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Check if a specific fileId is saved offline
   */
  async isFileOffline(fileId) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OFFLINE_DOCS, 'readonly');
      const req = tx.objectStore(STORES.OFFLINE_DOCS).get(fileId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get metadata list of all offline documents (excluding heavy cipher bytes for fast rendering)
   */
  async getAllOfflineMetadata() {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OFFLINE_DOCS, 'readonly');
      const req = tx.objectStore(STORES.OFFLINE_DOCS).openCursor();
      const results = [];

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const val = cursor.value;
          results.push({
            fileId: val.fileId,
            id: val.fileId,
            name: val.name,
            mimeType: val.mimeType,
            size: val.size,
            lastSyncedAt: val.lastSyncedAt,
            sourceFolderPath: val.sourceFolderPath,
            status: val.status || 'Available Offline'
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Cache Google Drive directory tree so folder structure remains accessible when offline
   */
  async cacheTreeData(rootFolderId, treeObject) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TREE_CACHE, 'readwrite');
      tx.objectStore(STORES.TREE_CACHE).put({
        id: rootFolderId || 'current_tree',
        timestamp: new Date().toISOString(),
        tree: treeObject
      });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Retrieve cached Google Drive tree for offline viewing
   */
  async getCachedTreeData(rootFolderId) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TREE_CACHE, 'readonly');
      const req = tx.objectStore(STORES.TREE_CACHE).get(rootFolderId || 'current_tree');
      req.onsuccess = () => resolve(req.result ? req.result.tree : null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get browser storage quota & usage
   */
  async getStorageMetrics() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          percent: estimate.quota ? Math.round((estimate.usage / estimate.quota) * 100) : 0
        };
      } catch (e) {
        console.warn('Storage estimate failed:', e);
      }
    }
    return { usage: 0, quota: 0, percent: 0 };
  }

  /**
   * Completely erase all offline documents and cached metadata (used on Full Secure Logout)
   */
  async clearAllOfflineData() {
    const db = await this.dbPromise;
    await Promise.all([
      new Promise((resolve) => {
        const tx = db.transaction(STORES.OFFLINE_DOCS, 'readwrite');
        tx.objectStore(STORES.OFFLINE_DOCS).clear();
        tx.oncomplete = () => resolve();
      }),
      new Promise((resolve) => {
        const tx = db.transaction(STORES.TREE_CACHE, 'readwrite');
        tx.objectStore(STORES.TREE_CACHE).clear();
        tx.oncomplete = () => resolve();
      }),
      clearVault()
    ]);
  }
}

export const OfflineStorageService = new OfflineStorageServiceClass();
