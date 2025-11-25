const { contextBridge: t, ipcRenderer: e } = require("electron"), r = {
  // Connection Management
  connect: (n) => e.invoke("connect", n),
  disconnect: () => e.invoke("disconnect"),
  isConnected: () => e.invoke("is-connected"),
  getConnectionConfig: () => e.invoke("get-connection-config"),
  // Account Management
  createAccount: (n) => e.invoke("create-account", n),
  getAccounts: () => e.invoke("get-accounts"),
  deleteAccount: (n) => e.invoke("delete-account", n),
  // Transfer Management
  createTransfer: (n) => e.invoke("create-transfer", n),
  getTransfers: () => e.invoke("get-transfers")
};
try {
  t.exposeInMainWorld("tigerBeetleApi", r);
} catch {
}
