/**
 * Docs Manager - Document Collection & Cart Service
 * 
 * CORE ARCHITECTURE (Section 14):
 * - Allows cross-folder document selection (e.g., Aadhar from Papa, PAN from My Docs, Bank statement from Banking).
 * - Adding to Collection NEVER moves, deletes, renames, or alters original Google Drive documents.
 * - Manages selection order, duplicates, and thumbnail previews.
 * - Works seamlessly with both online and offline documents.
 */

import { AppState } from '../state/AppState.js';

class CollectionServiceClass {
  constructor() {
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem('docs_manager_collection_items');
      if (saved) {
        const items = JSON.parse(saved);
        if (Array.isArray(items)) {
          AppState.setCollectionItems(items);
        }
      }
    } catch (e) {
      console.warn('[CollectionService] Could not parse saved collection:', e);
    }
  }

  /**
   * Add a document to the collection cart
   * @param {Object} doc - Document object
   * @returns {boolean} true if added, false if duplicate
   */
  add(doc) {
    const fileId = doc.id || doc.fileId;
    const currentFolderPath = AppState.getState().drive.currentFolderPath;
    const pathStr = doc.path || (currentFolderPath.length ? currentFolderPath.map(p => p.name).join(' / ') : 'Root');

    const item = {
      id: fileId,
      fileId: fileId,
      name: doc.name,
      mimeType: doc.mimeType,
      size: doc.size,
      path: pathStr,
      parentId: doc.parentId,
      addedAt: new Date().toISOString()
    };

    return AppState.addToCollection(item);
  }

  /**
   * Remove item from collection
   */
  remove(fileId) {
    AppState.removeFromCollection(fileId);
  }

  /**
   * Reorder items within collection
   */
  reorder(fromIndex, toIndex) {
    AppState.reorderCollection(fromIndex, toIndex);
  }

  /**
   * Clear entire collection
   */
  clear() {
    AppState.clearCollection();
  }

  /**
   * Check if a document is currently in the collection
   */
  has(fileId) {
    return AppState.getState().collection.items.some(i => i.id === fileId || i.fileId === fileId);
  }

  /**
   * Total items in collection
   */
  getCount() {
    return AppState.getState().collection.items.length;
  }
}

export const CollectionService = new CollectionServiceClass();
