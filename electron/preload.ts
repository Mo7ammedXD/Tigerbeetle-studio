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

  getAccounts: (limit?: number, offset?: number): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke("get-accounts", limit, offset);
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
    offset?: number
  ): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke("get-transfers", limit, offset);
  },
};

// Expose the API to the renderer process

try {
  contextBridge.exposeInMainWorld("tigerBeetleApi", api);
} catch (error) {
}

// TypeScript declaration for window object
declare global {
  interface Window {
    tigerBeetleApi: typeof api;
  }
}
