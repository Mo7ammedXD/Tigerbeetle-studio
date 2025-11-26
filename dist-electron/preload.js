const { contextBridge, ipcRenderer } = require("electron");
const api = {
  // Connection Management
  connect: (config) => {
    return ipcRenderer.invoke("connect", config);
  },
  disconnect: () => {
    return ipcRenderer.invoke("disconnect");
  },
  isConnected: () => {
    return ipcRenderer.invoke("is-connected");
  },
  getConnectionConfig: () => {
    return ipcRenderer.invoke("get-connection-config");
  },
  // Account Management
  createAccount: (data) => {
    return ipcRenderer.invoke("create-account", data);
  },
  getAccounts: (limit, offset) => {
    return ipcRenderer.invoke("get-accounts", limit, offset);
  },
  deleteAccount: (id) => {
    return ipcRenderer.invoke("delete-account", id);
  },
  // Transfer Management
  createTransfer: (data) => {
    return ipcRenderer.invoke("create-transfer", data);
  },
  getTransfers: (limit, offset) => {
    return ipcRenderer.invoke("get-transfers", limit, offset);
  },
  // Import/Export
  importAccountsFromJson: (filePath) => {
    return ipcRenderer.invoke("import-accounts-from-json", filePath);
  },
  lookupAccountsByIds: (ids) => {
    return ipcRenderer.invoke("lookup-accounts-by-ids", ids);
  }
};
try {
  contextBridge.exposeInMainWorld("tigerBeetleApi", api);
} catch (error) {
}
