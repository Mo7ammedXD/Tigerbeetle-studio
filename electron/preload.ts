import { contextBridge, ipcRenderer } from "electron";

// ============================================================================
// TYPE DEFINITIONS (matching main.ts)
// ============================================================================

export interface ConnectionConfig {
  cluster_id: string;
  replica_addresses: string[];
}

export interface AccountData {
  id?: string;
  ledger: number;
  code: number;
  alias: string;
  user_data_128?: string;
  user_data_64?: string;
  user_data_32?: number;
  flags?: number;
}

export interface TransferData {
  id?: string;
  debit_account_id: string;
  credit_account_id: string;
  amount: string;
  ledger: number;
  code: number;
  user_data_128?: string;
  user_data_64?: string;
  user_data_32?: number;
  flags?: number;
  pending_id?: string;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// EXPOSED API
// ============================================================================

const api = {
  // Connection Management
  connect: (config: ConnectionConfig): Promise<ApiResponse> => {
    return ipcRenderer.invoke("connect", config);
  },

  disconnect: (): Promise<ApiResponse> => {
    return ipcRenderer.invoke("disconnect");
  },

  isConnected: (): Promise<{ connected: boolean }> => {
    return ipcRenderer.invoke("is-connected");
  },

  getConnectionConfig: (): Promise<ConnectionConfig | null> => {
    return ipcRenderer.invoke("get-connection-config");
  },

  // Account Management
  createAccount: (data: AccountData): Promise<ApiResponse<{ id: string }>> => {
    return ipcRenderer.invoke("create-account", data);
  },

  getAccounts: (
    limit?: number,
    cursor?: string | null,
    direction?: "next" | "prev",
    filters?: {
      ledger?: number;
      code?: number;
      timestamp_min?: string;
      timestamp_max?: string;
    }
  ): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(
      "get-accounts",
      limit,
      cursor,
      direction,
      filters
    );
  },

  deleteAccount: (id: string): Promise<ApiResponse> => {
    return ipcRenderer.invoke("delete-account", id);
  },

  // Transfer Management
  createTransfer: (
    data: TransferData
  ): Promise<ApiResponse<{ id: string }>> => {
    return ipcRenderer.invoke("create-transfer", data);
  },

  getTransfers: (
    limit?: number,
    cursor?: string | null,
    direction?: "next" | "prev",
    filters?: {
      ledger?: number;
      code?: number;
      timestamp_min?: string;
      timestamp_max?: string;
    }
  ): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(
      "get-transfers",
      limit,
      cursor,
      direction,
      filters
    );
  },

  // Import / Lookup
  importAccountsFromJson: (filePath: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke("import-accounts-from-json", filePath);
  },

  lookupAccountsByIds: (ids: string[]): Promise<ApiResponse<any[]>> => {
    return ipcRenderer.invoke("lookup-accounts-by-ids", ids);
  },

  lookupTransfersByIds: (ids: string[]): Promise<ApiResponse<any[]>> => {
    return ipcRenderer.invoke("lookup-transfers-by-ids", ids);
  },

  queryAccounts: (filter: any): Promise<ApiResponse<any[]>> => {
    return ipcRenderer.invoke("query-accounts", filter);
  },

  queryTransfers: (filter: any): Promise<ApiResponse<any[]>> => {
    return ipcRenderer.invoke("query-transfers", filter);
  },

  getAccountBalances: (
    accountId: string,
    limit?: number
  ): Promise<ApiResponse<any[]>> => {
    return ipcRenderer.invoke("get-account-balances", accountId, limit);
  },

  createAccountsBatch: (items: AccountData[]): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke("create-accounts-batch", items);
  },

  createTransfersBatch: (items: TransferData[]): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke("create-transfers-batch", items);
  },

  postPendingTransfer: (
    pendingId: string,
    amount?: string
  ): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke("post-pending-transfer", pendingId, amount);
  },

  voidPendingTransfer: (pendingId: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke("void-pending-transfer", pendingId);
  },

  getAccountTransfers: (
    accountId: string,
    limit?: number
  ): Promise<ApiResponse<any[]>> => {
    return ipcRenderer.invoke("get-account-transfers", accountId, limit);
  },
};

// Expose the API to the renderer process

try {
  contextBridge.exposeInMainWorld("tigerBeetleApi", api);
} catch (error) {
  console.error("[preload] Failed to expose tigerBeetleApi:", error);
}
