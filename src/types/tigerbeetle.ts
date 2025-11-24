export type TB_ID = string;
export type TB_Amount = string;
export type TB_Timestamp = string;

export type AccountFlag =
  | "linked"
  | "debits_must_not_exceed_credits"
  | "credits_must_not_exceed_debits"
  | "history";

export type TransferFlag =
  | "linked"
  | "pending"
  | "post_pending_transfer"
  | "void_pending_transfer"
  | "balancing_debit"
  | "balancing_credit";

export interface TBAccount {
  id: TB_ID;
  alias: string;
  ledger: number;
  code: number;
  debits_posted: TB_Amount;
  credits_posted: TB_Amount;
  debits_pending: TB_Amount;
  credits_pending: TB_Amount;
  balance: TB_Amount;
  user_data_128: TB_ID;
  user_data_64: TB_ID;
  user_data_32: number;
  timestamp: TB_Timestamp;
  flags: AccountFlag[];
  exists?: boolean;
}

export interface TBTransfer {
  id: TB_ID;
  debit_account_id: TB_ID;
  credit_account_id: TB_ID;
  debit_alias?: string;
  credit_alias?: string;
  amount: TB_Amount;
  pending_id: TB_ID;
  user_data_128: TB_ID;
  user_data_64: TB_ID;
  user_data_32: number;
  timeout: number;
  ledger: number;
  code: number;
  flags: TransferFlag[];
  timestamp: TB_Timestamp;
  created_at: number;
  exists?: boolean;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  decimals: number;
  name: string;
}

export interface LedgerConfig {
  id: number;
  name: string;
  currency: CurrencyConfig;
  description?: string;
  accountCodes?: CodeDefinition[];
  transferCodes?: CodeDefinition[];
}

export interface CodeDefinition {
  code: number;
  name: string;
  description: string;
}

export const DEFAULT_CURRENCY: CurrencyConfig = {
  code: "USD",
  symbol: "$",
  decimals: 2,
  name: "US Dollar",
};
