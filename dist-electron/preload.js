import { contextBridge as c, ipcRenderer as n } from "electron";
const s = {
  // Connection Management
  connect: (e) => n.invoke("connect", e),
  disconnect: () => n.invoke("disconnect"),
  isConnected: () => n.invoke("is-connected"),
  getConnectionConfig: () => n.invoke("get-connection-config"),
  // Account Management
  createAccount: (e) => n.invoke("create-account", e),
  getAccounts: (e, r, t, o) => n.invoke(
    "get-accounts",
    e,
    r,
    t,
    o
  ),
  deleteAccount: (e) => n.invoke("delete-account", e),
  // Transfer Management
  createTransfer: (e) => n.invoke("create-transfer", e),
  getTransfers: (e, r, t, o) => n.invoke(
    "get-transfers",
    e,
    r,
    t,
    o
  ),
  // Import / Lookup
  importAccountsFromJson: (e) => n.invoke("import-accounts-from-json", e),
  lookupAccountsByIds: (e) => n.invoke("lookup-accounts-by-ids", e),
  lookupTransfersByIds: (e) => n.invoke("lookup-transfers-by-ids", e),
  queryAccounts: (e) => n.invoke("query-accounts", e),
  queryTransfers: (e) => n.invoke("query-transfers", e),
  getAccountTransfers: (e, r) => n.invoke("get-account-transfers", e, r)
};
try {
  c.exposeInMainWorld("tigerBeetleApi", s);
} catch (e) {
  console.error("[preload] Failed to expose tigerBeetleApi:", e);
}
