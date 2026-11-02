/**
 * Docs Manager - Reactive Central Application State
 */

class StateStore {
  constructor() {
    const savedTheme = localStorage.getItem('docs_manager_theme') || 'dark';
    const savedRootFolderId = localStorage.getItem('docs_manager_root_folder_id') || null;
    const savedRootFolderName = localStorage.getItem('docs_manager_root_folder_name') || 'Family Documents';
    const savedClientId = localStorage.getItem('docs_manager_google_client_id') || '';
    const savedDemoMode = localStorage.getItem('docs_manager_demo_mode') === 'true';

    this.state = {
      auth: {
        isSignedIn: false,
        isDemoMode: savedDemoMode,
        userProfile: null,
        accessToken: null,
        tokenExpiresAt: null,
        isTokenExpired: false,
        clientId: savedClientId
      },
      drive: {
        rootFolderId: savedRootFolderId,
        rootFolderName: savedRootFolderName,
        currentFolderId: savedRootFolderId,
        currentFolderPath: [{ id: savedRootFolderId, name: savedRootFolderName }],
        folders: [], // Direct children folders of current folder
        files: [],   // Direct children files of current folder
        allDiscoveredFolders: [],
        allDiscoveredFiles: [],
        isLoading: false
      },
      offline: {
        offlineMap: new Map(), // fileId -> offlineDocRecord
        storageUsage: 0,
        storageQuota: 0,
        isNetworkOnline: navigator.onLine,
        syncingFileIds: new Set()
      },
      collection: {
        items: [] // List of items in Document Collection / Cart
      },
      ui: {
        activeView: 'dashboard', // 'dashboard' | 'explorer' | 'collection' | 'offline'
        theme: savedTheme,
        searchQuery: '',
        selectedCategory: null,
        previewDocument: null,
        isPdfBuilderOpen: false,
        isSettingsOpen: false,
        isSetupOpen: false,
        isSidebarOpen: false
      }
    };

    this.listeners = new Set();

    // Listen to network changes
    window.addEventListener('online', () => this.setNetworkStatus(true));
    window.addEventListener('offline', () => this.setNetworkStatus(false));
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[AppState] Error notifying listener:', err);
      }
    }
  }

  // --- Auth Mutators ---
  setAuth(authUpdate) {
    this.state.auth = { ...this.state.auth, ...authUpdate };
    if (authUpdate.clientId !== undefined) {
      localStorage.setItem('docs_manager_google_client_id', authUpdate.clientId);
    }
    if (authUpdate.isDemoMode !== undefined) {
      localStorage.setItem('docs_manager_demo_mode', String(authUpdate.isDemoMode));
    }
    this.notify();
  }

  // --- Drive Mutators ---
  setRootFolder(folderId, folderName = 'Family Documents') {
    this.state.drive.rootFolderId = folderId;
    this.state.drive.rootFolderName = folderName;
    this.state.drive.currentFolderId = folderId;
    this.state.drive.currentFolderPath = [{ id: folderId, name: folderName }];
    localStorage.setItem('docs_manager_root_folder_id', folderId);
    localStorage.setItem('docs_manager_root_folder_name', folderName);
    this.notify();
  }

  setCurrentFolder(folderId, folderName, pathArray = null) {
    this.state.drive.currentFolderId = folderId;
    if (pathArray) {
      this.state.drive.currentFolderPath = pathArray;
    } else {
      // Find or append
      const existingIdx = this.state.drive.currentFolderPath.findIndex(p => p.id === folderId);
      if (existingIdx >= 0) {
        this.state.drive.currentFolderPath = this.state.drive.currentFolderPath.slice(0, existingIdx + 1);
      } else {
        this.state.drive.currentFolderPath.push({ id: folderId, name: folderName });
      }
    }
    this.notify();
  }

  setDriveData({ folders = [], files = [], allDiscoveredFolders = [], allDiscoveredFiles = [], isLoading = false }) {
    if (folders) this.state.drive.folders = folders;
    if (files) this.state.drive.files = files;
    if (allDiscoveredFolders.length > 0) this.state.drive.allDiscoveredFolders = allDiscoveredFolders;
    if (allDiscoveredFiles.length > 0) this.state.drive.allDiscoveredFiles = allDiscoveredFiles;
    this.state.drive.isLoading = isLoading;
    this.notify();
  }

  // --- Offline Mutators ---
  setOfflineMap(map) {
    this.state.offline.offlineMap = map;
    this.notify();
  }

  setStorageMetrics(usage, quota) {
    this.state.offline.storageUsage = usage;
    this.state.offline.storageQuota = quota;
    this.notify();
  }

  setNetworkStatus(isOnline) {
    this.state.offline.isNetworkOnline = isOnline;
    this.notify();
  }

  setFileSyncing(fileId, isSyncing) {
    if (isSyncing) {
      this.state.offline.syncingFileIds.add(fileId);
    } else {
      this.state.offline.syncingFileIds.delete(fileId);
    }
    this.notify();
  }

  // --- Collection / Cart Mutators ---
  addToCollection(document) {
    // Check duplicate
    const exists = this.state.collection.items.some(item => item.id === document.id);
    if (!exists) {
      this.state.collection.items = [...this.state.collection.items, document];
      this.saveCollectionToLocal();
      this.notify();
      return true;
    }
    return false;
  }

  removeFromCollection(documentId) {
    this.state.collection.items = this.state.collection.items.filter(item => item.id !== documentId);
    this.saveCollectionToLocal();
    this.notify();
  }

  reorderCollection(startIndex, endIndex) {
    const items = [...this.state.collection.items];
    const [movedItem] = items.splice(startIndex, 1);
    items.splice(endIndex, 0, movedItem);
    this.state.collection.items = items;
    this.saveCollectionToLocal();
    this.notify();
  }

  clearCollection() {
    this.state.collection.items = [];
    this.saveCollectionToLocal();
    this.notify();
  }

  setCollectionItems(items) {
    this.state.collection.items = items;
    this.saveCollectionToLocal();
    this.notify();
  }

  saveCollectionToLocal() {
    try {
      // Store lightweight reference array in localStorage
      const minimal = this.state.collection.items.map(i => ({
        id: i.id,
        name: i.name,
        mimeType: i.mimeType,
        size: i.size,
        path: i.path,
        parentId: i.parentId
      }));
      localStorage.setItem('docs_manager_collection_items', JSON.stringify(minimal));
    } catch (e) {
      console.warn('Failed to save collection to localStorage:', e);
    }
  }

  // --- UI Mutators ---
  setActiveView(view) {
    this.state.ui.activeView = view;
    this.notify();
  }

  setTheme(theme) {
    this.state.ui.theme = theme;
    localStorage.setItem('docs_manager_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.notify();
  }

  setSearchQuery(query) {
    this.state.ui.searchQuery = query;
    this.notify();
  }

  setSelectedCategory(cat) {
    this.state.ui.selectedCategory = cat;
    this.notify();
  }

  setPreviewDocument(doc) {
    this.state.ui.previewDocument = doc;
    this.notify();
  }

  setPdfBuilderOpen(isOpen) {
    this.state.ui.isPdfBuilderOpen = isOpen;
    this.notify();
  }

  setSettingsOpen(isOpen) {
    this.state.ui.isSettingsOpen = isOpen;
    this.notify();
  }

  setSetupOpen(isOpen) {
    this.state.ui.isSetupOpen = isOpen;
    this.notify();
  }

  setSidebarOpen(isOpen) {
    this.state.ui.isSidebarOpen = isOpen;
    this.notify();
  }
}

export const AppState = new StateStore();
