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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface TigerBeetleApi {
  connect: (config: ConnectionConfig) => Promise<ApiResponse>;
  disconnect: () => Promise<ApiResponse>;
  isConnected: () => Promise<{ connected: boolean }>;
  getConnectionConfig: () => Promise<ConnectionConfig | null>;
  createAccount: (data: AccountData) => Promise<ApiResponse<{ id: string }>>;
  getAccounts: (
    limit?: number,
    offset?: number
  ) => Promise<ApiResponse<PaginatedResponse<any> | any[]>>;
  deleteAccount: (id: string) => Promise<ApiResponse>;
  createTransfer: (data: TransferData) => Promise<ApiResponse<{ id: string }>>;
  getTransfers: (
    limit?: number,
    offset?: number
  ) => Promise<ApiResponse<PaginatedResponse<any> | any[]>>;
}

declare global {
  interface Window {
    tigerBeetleApi: TigerBeetleApi;
  }
}
