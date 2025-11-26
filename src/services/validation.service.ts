import type {
  Account,
  BackupData,
  Transfer,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from "../types/backup.types";

export class ValidationService {
  static validateBackupData(data: BackupData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const duplicateIds: string[] = [];

    if (!data.metadata) {
      errors.push({
        type: "missing_field",
        field: "metadata",
        message: "Backup metadata is missing",
      });
    }

    const accountIds = new Set<string>();
    if (data.accounts) {
      data.accounts.forEach((account, index) => {
        const accountErrors = this.validateAccount(account, index);
        errors.push(...accountErrors);

        if (accountIds.has(account.id)) {
          duplicateIds.push(account.id);
          errors.push({
            type: "duplicate_id",
            field: "accounts.id",
            message: `Duplicate account ID: ${account.id}`,
            recordIndex: index,
          });
        }
        accountIds.add(account.id);

        const accountWarnings = this.generateAccountWarnings(account, index);
        warnings.push(...accountWarnings);
      });
    }

    const transferIds = new Set<string>();
    if (data.transfers) {
      data.transfers.forEach((transfer, index) => {
        const transferErrors = this.validateTransfer(
          transfer,
          index,
          accountIds
        );
        errors.push(...transferErrors);

        if (transferIds.has(transfer.id)) {
          duplicateIds.push(transfer.id);
          errors.push({
            type: "duplicate_id",
            field: "transfers.id",
            message: `Duplicate transfer ID: ${transfer.id}`,
            recordIndex: index,
          });
        }
        transferIds.add(transfer.id);

        const transferWarnings = this.generateTransferWarnings(transfer, index);
        warnings.push(...transferWarnings);
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        accountsCount: data.accounts?.length || 0,
        transfersCount: data.transfers?.length || 0,
        duplicateIds: Array.from(new Set(duplicateIds)),
      },
    };
  }

  private static validateAccount(
    account: Account,
    index: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!account.id) {
      errors.push({
        type: "missing_field",
        field: "accounts.id",
        message: "Account ID is required",
        recordIndex: index,
      });
    }

    if (typeof account.ledger !== "number") {
      errors.push({
        type: "invalid_type",
        field: "accounts.ledger",
        message: "Ledger must be a number",
        recordIndex: index,
      });
    }

    if (typeof account.code !== "number") {
      errors.push({
        type: "invalid_type",
        field: "accounts.code",
        message: "Code must be a number",
        recordIndex: index,
      });
    }

    if (!this.isValidBigInt(account.balance)) {
      errors.push({
        type: "invalid_value",
        field: "accounts.balance",
        message: "Balance must be a valid number string",
        recordIndex: index,
      });
    }

    return errors;
  }

  private static validateTransfer(
    transfer: Transfer,
    index: number,
    validAccountIds: Set<string>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!transfer.id) {
      errors.push({
        type: "missing_field",
        field: "transfers.id",
        message: "Transfer ID is required",
        recordIndex: index,
      });
    }

    if (!transfer.debit_account_id) {
      errors.push({
        type: "missing_field",
        field: "transfers.debit_account_id",
        message: "Debit account ID is required",
        recordIndex: index,
      });
    } else if (
      validAccountIds.size > 0 &&
      !validAccountIds.has(transfer.debit_account_id)
    ) {
      errors.push({
        type: "invalid_value",
        field: "transfers.debit_account_id",
        message: `Debit account ${transfer.debit_account_id} does not exist`,
        recordIndex: index,
      });
    }

    if (!transfer.credit_account_id) {
      errors.push({
        type: "missing_field",
        field: "transfers.credit_account_id",
        message: "Credit account ID is required",
        recordIndex: index,
      });
    } else if (
      validAccountIds.size > 0 &&
      !validAccountIds.has(transfer.credit_account_id)
    ) {
      errors.push({
        type: "invalid_value",
        field: "transfers.credit_account_id",
        message: `Credit account ${transfer.credit_account_id} does not exist`,
        recordIndex: index,
      });
    }

    if (!this.isValidBigInt(transfer.amount)) {
      errors.push({
        type: "invalid_value",
        field: "transfers.amount",
        message: "Amount must be a valid number string",
        recordIndex: index,
      });
    } else if (BigInt(transfer.amount) <= 0n) {
      errors.push({
        type: "invalid_value",
        field: "transfers.amount",
        message: "Amount must be greater than zero",
        recordIndex: index,
      });
    }

    if (typeof transfer.ledger !== "number") {
      errors.push({
        type: "invalid_type",
        field: "transfers.ledger",
        message: "Ledger must be a number",
        recordIndex: index,
      });
    }

    return errors;
  }

  private static generateAccountWarnings(
    account: Account,
    index: number
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (
      account.balance &&
      BigInt(account.balance) > BigInt("1000000000000000")
    ) {
      warnings.push({
        type: "large_amount",
        field: "accounts.balance",
        message: "Unusually large balance detected",
        recordIndex: index,
      });
    }

    if (account.code && (account.code < 0 || account.code > 10000)) {
      warnings.push({
        type: "unusual_code",
        field: "accounts.code",
        message: "Unusual account code value",
        recordIndex: index,
      });
    }

    return warnings;
  }

  private static generateTransferWarnings(
    transfer: Transfer,
    index: number
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (
      transfer.amount &&
      BigInt(transfer.amount) > BigInt("1000000000000000")
    ) {
      warnings.push({
        type: "large_amount",
        field: "transfers.amount",
        message: "Unusually large transfer amount",
        recordIndex: index,
      });
    }

    if (transfer.timestamp) {
      const timestamp = new Date(transfer.timestamp);
      const now = new Date();
      const daysDiff =
        (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 365) {
        warnings.push({
          type: "old_timestamp",
          field: "transfers.timestamp",
          message: "Transfer timestamp is more than a year old",
          recordIndex: index,
        });
      }
    }

    return warnings;
  }

  private static isValidBigInt(value: any): boolean {
    if (typeof value !== "string" && typeof value !== "number") {
      return false;
    }
    try {
      BigInt(value);
      return true;
    } catch {
      return false;
    }
  }
}
