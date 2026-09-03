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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  hasPrevious: boolean;
  count: number;
}

export interface QueryAccountsFilter {
  ledger?: number;
  code?: number;
  timestamp_min?: string;
  timestamp_max?: string;
  limit?: number;
  flags?: number;
  reversed?: boolean;
}

export interface QueryTransfersFilter {
  ledger?: number;
  code?: number;
  timestamp_min?: string;
  timestamp_max?: string;
  limit?: number;
  flags?: number;
  reversed?: boolean;
  account_id?: string;
}

export interface BalanceHistoryOptions {
  limit?: number;
  /** Nanosecond timestamp. Omit or 0 for unbounded. */
  timestamp_min?: string;
  timestamp_max?: string;
  /** Take the most recent changes in the window rather than the oldest. */
  reversed?: boolean;
}

export interface AccountBalance {
  debits_pending: string;
  debits_posted: string;
  credits_pending: string;
  credits_posted: string;
  balance: string;
  timestamp: string;
}

export interface BatchFailure {
  index: number;
  id: string;
  result: unknown;
}

export interface BatchResult {
  requested: number;
  created: number;
  ids: string[];
  failures: BatchFailure[];
}

export interface PendingResolution {
  id: string;
  pending_id: string;
  action: "post" | "void";
}

export interface TigerBeetleApi {
  connect: (config: ConnectionConfig) => Promise<ApiResponse>;
  disconnect: () => Promise<ApiResponse>;
  isConnected: () => Promise<{ connected: boolean }>;
  getConnectionConfig: () => Promise<ConnectionConfig | null>;
  createAccount: (data: AccountData) => Promise<ApiResponse<{ id: string }>>;
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
  ) => Promise<ApiResponse<CursorPaginatedResponse<any>>>;
  deleteAccount: (id: string) => Promise<ApiResponse>;
  createTransfer: (data: TransferData) => Promise<ApiResponse<{ id: string }>>;
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
  ) => Promise<ApiResponse<CursorPaginatedResponse<any>>>;
  importAccountsFromJson: (filePath: string) => Promise<ApiResponse<any>>;
  lookupAccountsByIds: (ids: string[]) => Promise<ApiResponse<any[]>>;
  lookupTransfersByIds: (ids: string[]) => Promise<ApiResponse<any[]>>;
  queryAccounts: (filter: QueryAccountsFilter) => Promise<ApiResponse<any[]>>;
  queryTransfers: (filter: QueryTransfersFilter) => Promise<ApiResponse<any[]>>;
  getAccountTransfers: (
    accountId: string,
    limit?: number
  ) => Promise<ApiResponse<any[]>>;
  getAccountBalances: (
    accountId: string,
    options?: BalanceHistoryOptions
  ) => Promise<ApiResponse<AccountBalance[]>>;
  createAccountsBatch: (
    items: AccountData[]
  ) => Promise<ApiResponse<BatchResult>>;
  createTransfersBatch: (
    items: TransferData[]
  ) => Promise<ApiResponse<BatchResult>>;
  postPendingTransfer: (
    pendingId: string,
    amount?: string
  ) => Promise<ApiResponse<PendingResolution>>;
  voidPendingTransfer: (
    pendingId: string
  ) => Promise<ApiResponse<PendingResolution>>;
}

declare global {
  interface Window {
    tigerBeetleApi: TigerBeetleApi;
  }
}
