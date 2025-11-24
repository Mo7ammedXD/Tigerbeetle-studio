const { contextBridge, ipcRenderer } = require('electron');

// ============================================================================
// EXPOSED API
// ============================================================================


const api = {
  // Connection Management
  connect: (config) => {
    return ipcRenderer.invoke('connect', config);
  },

  disconnect: () => {
    return ipcRenderer.invoke('disconnect');
  },

  isConnected: () => {
    return ipcRenderer.invoke('is-connected');
  },

  getConnectionConfig: () => {
    return ipcRenderer.invoke('get-connection-config');
  },

  // Account Management
  createAccount: (data) => {
    return ipcRenderer.invoke('create-account', data);
  },

  getAccounts: () => {
    return ipcRenderer.invoke('get-accounts');
  },

  deleteAccount: (id) => {
    return ipcRenderer.invoke('delete-account', id);
  },

  // Transfer Management
  createTransfer: (data) => {
    return ipcRenderer.invoke('create-transfer', data);
  },

  getTransfers: () => {
    return ipcRenderer.invoke('get-transfers');
  }
};

try {
  contextBridge.exposeInMainWorld('tigerBeetleApi', api);
} catch (error) {
}
