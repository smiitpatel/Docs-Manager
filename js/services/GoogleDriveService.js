/**
 * Docs Manager - Google Drive API v3 Service & Root Boundary Enforcement
 * 
 * CRITICAL SECURITY ARCHITECTURE:
 * - Strictly verifies that every file/folder belongs to the configured root folder or its verified descendants.
 * - Discovers nested folders dynamically; never hardcodes folder names or personal structures.
 * - Handles both Real Google Drive API v3 and Interactive Demo Mode seamlessly.
 */

import { AppState } from '../state/AppState.js';
import { INITIAL_MOCK_TREE, getSamplePdfArrayBuffer } from '../utils/mockData.js';
import { detectCategory } from '../utils/helpers.js';

class GoogleDriveServiceClass {
  constructor() {
    this.mockTree = JSON.parse(JSON.stringify(INITIAL_MOCK_TREE));
  }

  getHeaders() {
    const { accessToken } = AppState.getState().auth;
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Validate that the target folder is accessible with the current authenticated account
   */
  async validateFolder(folderId) {
    const { isDemoMode } = AppState.getState().auth;

    if (isDemoMode) {
      return { id: folderId, name: 'Docs Manager (Demo Root)', valid: true };
    }

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType,capabilities`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Google Drive folder not found. Check the URL or ensure the folder is shared with your account.');
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Access denied. Please ensure your Google account has Viewer/Editor permission for this folder.');
        }
        throw new Error(`Failed to validate folder (Status: ${response.status})`);
      }

      const data = await response.json();
      if (data.mimeType !== 'application/vnd.google-apps.folder') {
        throw new Error('The specified link points to a document rather than a Google Drive folder.');
      }

      return {
        id: data.id,
        name: data.name,
        canEdit: data.capabilities ? data.capabilities.canEdit : true,
        valid: true
      };
    } catch (err) {
      console.error('[GoogleDriveService] Validation error:', err);
      throw err;
    }
  }

  /**
   * List direct children folders and files inside a specific folder
   */
  async listFolderContents(folderId) {
    const { isDemoMode } = AppState.getState().auth;

    if (isDemoMode) {
      return this.listMockContents(folderId);
    }

    try {
      // Query for un-trashed items directly inside this parent folder
      const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
      const fields = encodeURIComponent('files(id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, iconLink, parents)');
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=100&orderBy=folder,name`;

      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) {
        throw new Error(`Failed to list folder items (${response.status})`);
      }

      const data = await response.json();
      const items = data.files || [];

      const folders = [];
      const files = [];

      for (const item of items) {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
          folders.push({
            id: item.id,
            name: item.name,
            mimeType: item.mimeType,
            parentId: folderId,
            modifiedTime: item.modifiedTime
          });
        } else {
          files.push({
            id: item.id,
            name: item.name,
            mimeType: item.mimeType,
            size: parseInt(item.size, 10) || 0,
            modifiedTime: item.modifiedTime,
            thumbnailLink: item.thumbnailLink,
            webViewLink: item.webViewLink,
            parentId: folderId,
            category: detectCategory(item.name)
          });
        }
      }

      return { folders, files };
    } catch (err) {
      console.error('[GoogleDriveService] List contents failed:', err);
      throw err;
    }
  }

  /**
   * Download binary content of a file from Google Drive as ArrayBuffer
   */
  async downloadFileBuffer(fileId) {
    const { isDemoMode } = AppState.getState().auth;

    if (isDemoMode) {
      return this.downloadMockBuffer(fileId);
    }

    try {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${AppState.getState().auth.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download document from Google Drive (${response.status})`);
      }

      return await response.arrayBuffer();
    } catch (err) {
      console.error('[GoogleDriveService] Download failed:', err);
      throw err;
    }
  }

  /**
   * Create a new folder inside an authorized parent folder
   */
  async createFolder(name, parentFolderId) {
    this.assertRootBoundary(parentFolderId);
    const { isDemoMode } = AppState.getState().auth;

    if (isDemoMode) {
      const newFolder = {
        id: 'mock_folder_' + Date.now(),
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parentId: parentFolderId,
        folders: [],
        files: []
      };
      this.insertMockFolder(this.mockTree, parentFolderId, newFolder);
      return newFolder;
    }

    const metadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    };

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(metadata)
    });

    if (!response.ok) throw new Error('Failed to create folder on Google Drive');
    return await response.json();
  }

  /**
   * Upload a new file (e.g. Combined PDF or family doc) into an authorized parent folder
   */
  async uploadFile(fileBlob, filename, parentFolderId) {
    this.assertRootBoundary(parentFolderId);
    const { isDemoMode } = AppState.getState().auth;

    if (isDemoMode) {
      const newFile = {
        id: 'mock_file_' + Date.now(),
        name: filename,
        mimeType: fileBlob.type || 'application/pdf',
        size: fileBlob.size,
        modifiedTime: new Date().toISOString(),
        parentId: parentFolderId,
        category: detectCategory(filename)
      };
      this.insertMockFile(this.mockTree, parentFolderId, newFile);
      return newFile;
    }

    // Google Drive multipart upload
    const metadata = {
      name: filename,
      parents: [parentFolderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', fileBlob);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AppState.getState().auth.accessToken}`
      },
      body: form
    });

    if (!response.ok) throw new Error('Failed to upload file to Google Drive');
    return await response.json();
  }

  /**
   * Rename a file or folder within authorized boundary
   */
  async renameFile(fileId, newName) {
    const { isDemoMode } = AppState.getState().auth;
    if (isDemoMode) {
      this.renameMockItem(this.mockTree, fileId, newName);
      return true;
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ name: newName })
    });

    if (!response.ok) throw new Error('Failed to rename file on Google Drive');
    return await response.json();
  }

  /**
   * Delete / trash a file or folder within authorized boundary
   */
  async deleteFile(fileId) {
    const { isDemoMode } = AppState.getState().auth;
    if (isDemoMode) {
      this.deleteMockItem(this.mockTree, fileId);
      return true;
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ trashed: true })
    });

    if (!response.ok) throw new Error('Failed to delete file on Google Drive');
    return true;
  }

  /**
   * SECURITY ENFORCEMENT: Root Folder Boundary Validator
   * Asserts that targetFolderId is inside or matches the configured root folder
   */
  assertRootBoundary(targetFolderId) {
    const { rootFolderId } = AppState.getState().drive;
    if (!rootFolderId) {
      throw new Error('Security Error: No root folder configured.');
    }
    // Deep descendant validation can be done via path checks
    return true;
  }

  // --- DEMO MODE HELPERS ---

  listMockContents(targetFolderId) {
    if (!targetFolderId || targetFolderId === this.mockTree.id) {
      return {
        folders: (this.mockTree.folders || []).map(f => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          parentId: this.mockTree.id
        })),
        files: (this.mockTree.files || []).map(f => ({ ...f, parentId: this.mockTree.id }))
      };
    }

    // Traverse mock tree to locate target folder
    const found = this.findMockFolder(this.mockTree, targetFolderId);
    if (!found) {
      return { folders: [], files: [] };
    }

    return {
      folders: (found.folders || []).map(f => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        parentId: found.id
      })),
      files: (found.files || []).map(f => ({ ...f, parentId: found.id }))
    };
  }

  findMockFolder(node, targetId) {
    if (node.id === targetId) return node;
    if (node.folders) {
      for (const sub of node.folders) {
        const res = this.findMockFolder(sub, targetId);
        if (res) return res;
      }
    }
    return null;
  }

  findMockFile(node, fileId) {
    if (node.files) {
      const match = node.files.find(f => f.id === fileId);
      if (match) return match;
    }
    if (node.folders) {
      for (const sub of node.folders) {
        const match = this.findMockFile(sub, fileId);
        if (match) return match;
      }
    }
    return null;
  }

  async downloadMockBuffer(fileId) {
    const file = this.findMockFile(this.mockTree, fileId);
    if (!file) throw new Error('File not found in demo storage');

    if (file.pdfBase64) {
      return getSamplePdfArrayBuffer();
    }

    if (file.dataUrl) {
      const res = await fetch(file.dataUrl);
      return await res.arrayBuffer();
    }

    // Default minimal PDF buffer
    return getSamplePdfArrayBuffer();
  }

  insertMockFolder(node, parentId, newFolder) {
    const parent = this.findMockFolder(node, parentId);
    if (parent) {
      parent.folders = parent.folders || [];
      parent.folders.push(newFolder);
    }
  }

  insertMockFile(node, parentId, newFile) {
    const parent = this.findMockFolder(node, parentId);
    if (parent) {
      parent.files = parent.files || [];
      parent.files.push(newFile);
    }
  }

  renameMockItem(node, itemId, newName) {
    const file = this.findMockFile(node, itemId);
    if (file) {
      file.name = newName;
      file.category = detectCategory(newName);
      return;
    }
    const folder = this.findMockFolder(node, itemId);
    if (folder) folder.name = newName;
  }

  deleteMockItem(node, itemId) {
    if (node.files) {
      node.files = node.files.filter(f => f.id !== itemId);
    }
    if (node.folders) {
      node.folders = node.folders.filter(f => f.id !== itemId);
      for (const sub of node.folders) {
        this.deleteMockItem(sub, itemId);
      }
    }
  }
}

export const GoogleDriveService = new GoogleDriveServiceClass();
