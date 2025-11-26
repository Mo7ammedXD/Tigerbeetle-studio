export interface Account {
  id: string;
  alias?: string;
  ledger: number;
  code: number;
  balance: string;
  debits_posted: string;
  credits_posted: string;
  debits_pending?: string;
  credits_pending?: string;
  flags?: number;
  timestamp?: string;
}

export interface Transfer {
  id: string;
  debit_account_id: string;
  credit_account_id: string;
  amount: string;
  ledger: number;
  code: number;
  flags?: number;
  timestamp?: string;
  pending_id?: string;
  timeout?: number;
}

export interface BackupMetadata {
  version: string;
  exportDate: string;
  source: string;
  accountsCount: number;
  transfersCount: number;
  checksum?: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  accounts?: Account[];
  transfers?: Transfer[];
  config?: ConnectionConfig;
}

export interface ConnectionConfig {
  clusterID: string;
  replicaAddresses: string[];
}

export interface ExportOptions {
  entity: "all" | "accounts" | "transfers";
  format: "json" | "csv" | "sql";
  includeMetadata: boolean;
  compress: boolean;
  batchSize?: number;
  filters?: ExportFilters;
}

export interface ExportFilters {
  ledger?: number;
  code?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ImportOptions {
  dryRun: boolean;
  skipDuplicates: boolean;
  batchSize?: number;
  validateOnly?: boolean;
}

export interface BackupOptions {
  name?: string;
  includeConfig: boolean;
  encrypt: boolean;
  password?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    accountsCount: number;
    transfersCount: number;
    duplicateIds: string[];
  };
}

export interface ValidationError {
  type: "missing_field" | "invalid_type" | "invalid_value" | "duplicate_id";
  field: string;
  message: string;
  recordIndex?: number;
}

export interface ValidationWarning {
  type: "large_amount" | "old_timestamp" | "unusual_code";
  field: string;
  message: string;
  recordIndex?: number;
}

export interface ProgressCallback {
  (progress: number, message: string): void;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  size: number;
  recordsExported: number;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  accountsImported: number;
  transfersImported: number;
  accountsSkipped: number;
  transfersSkipped: number;
  errors: string[];
  duration: number;
}

export interface BackupHistoryItem {
  name: string;
  filename: string;
  date: string;
  size: string;
  accounts: number;
  transfers: number;
  encrypted: boolean;
}
