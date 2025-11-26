import type {
  Account,
  BackupData,
  ExportOptions,
  ExportResult,
  ProgressCallback,
  Transfer,
} from "../types/backup.types";
import { CryptoService } from "./crypto.service";

export class ExportService {
  private static readonly BATCH_SIZE = 8189;
  private static readonly MAX_RETRIES = 3;

  static async exportData(
    options: ExportOptions,
    onProgress?: ProgressCallback
  ): Promise<ExportResult> {
    try {
      onProgress?.(0, "Initializing export...");

      const data: BackupData = {
        metadata: {
          version: "2.0",
          exportDate: new Date().toISOString(),
          source: "TigerBeetle Studio",
          accountsCount: 0,
          transfersCount: 0,
        },
      };

      if (options.entity === "all" || options.entity === "accounts") {
        onProgress?.(20, "Fetching accounts...");
        data.accounts = await this.fetchAllAccounts(options, onProgress);
        data.metadata.accountsCount = data.accounts.length;
      }

      if (options.entity === "all" || options.entity === "transfers") {
        onProgress?.(50, "Fetching transfers...");
        data.transfers = await this.fetchAllTransfers(options, onProgress);
        data.metadata.transfersCount = data.transfers.length;
      }

      onProgress?.(80, "Generating export file...");

      let content: string;
      let filename: string;
      let mimeType: string;

      switch (options.format) {
        case "json":
          content = JSON.stringify(data, null, 2);
          filename = `tigerbeetle_export_${Date.now()}.json`;
          mimeType = "application/json";
          break;
        case "csv":
          content = this.generateCSV(data);
          filename = `tigerbeetle_export_${Date.now()}.csv`;
          mimeType = "text/csv";
          break;
        case "sql":
          content = this.generateSQL(data);
          filename = `tigerbeetle_export_${Date.now()}.sql`;
          mimeType = "text/plain";
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      if (options.includeMetadata && options.format === "json") {
        const checksum = await CryptoService.generateChecksum(content);
        data.metadata.checksum = checksum;
        content = JSON.stringify(data, null, 2);
      }

      onProgress?.(90, "Preparing download...");

      const blob = new Blob([content], { type: mimeType });
      this.downloadBlob(blob, filename);

      onProgress?.(100, "Export completed");

      return {
        success: true,
        filename,
        size: blob.size,
        recordsExported:
          (data.accounts?.length || 0) + (data.transfers?.length || 0),
      };
    } catch (error) {
      return {
        success: false,
        filename: "",
        size: 0,
        recordsExported: 0,
        error: error instanceof Error ? error.message : "Export failed",
      };
    }
  }

  private static async fetchAllAccounts(
    options: ExportOptions,
    onProgress?: ProgressCallback
  ): Promise<Account[]> {
    const accounts: Account[] = [];
    let offset = 0;
    const batchSize = options.batchSize || this.BATCH_SIZE;
    let hasMore = true;

    while (hasMore) {
      const result = await this.retryOperation(async () => {
        return await window.tigerBeetleApi.getAccounts(batchSize, offset);
      });

      if (!result.success) {
        throw new Error("Failed to fetch accounts");
      }

      const batch = this.extractData<Account>(result.data);
      if (batch.length === 0) {
        hasMore = false;
      } else {
        accounts.push(...batch);
        offset += batch.length;

        if (batch.length < batchSize) {
          hasMore = false;
        }
      }

      onProgress?.(
        20 + (accounts.length / 10000) * 20,
        `Fetched ${accounts.length} accounts...`
      );
    }

    return this.applyFilters(accounts, options);
  }

  private static async fetchAllTransfers(
    options: ExportOptions,
    onProgress?: ProgressCallback
  ): Promise<Transfer[]> {
    const transfers: Transfer[] = [];
    let offset = 0;
    const batchSize = options.batchSize || this.BATCH_SIZE;
    let hasMore = true;

    while (hasMore) {
      const result = await this.retryOperation(async () => {
        return await window.tigerBeetleApi.getTransfers(batchSize, offset);
      });

      if (!result.success) {
        throw new Error("Failed to fetch transfers");
      }

      const batch = this.extractData<Transfer>(result.data);
      if (batch.length === 0) {
        hasMore = false;
      } else {
        transfers.push(...batch);
        offset += batch.length;

        if (batch.length < batchSize) {
          hasMore = false;
        }
      }

      onProgress?.(
        50 + (transfers.length / 10000) * 20,
        `Fetched ${transfers.length} transfers...`
      );
    }

    return this.applyFilters(transfers, options);
  }

  private static extractData<T>(data: any): T[] {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === "object" && "data" in data) {
      return Array.isArray(data.data) ? data.data : [];
    }
    return [];
  }

  private static applyFilters<T extends Account | Transfer>(
    items: T[],
    options: ExportOptions
  ): T[] {
    if (!options.filters) {
      return items;
    }

    return items.filter((item) => {
      if (
        options.filters!.ledger !== undefined &&
        item.ledger !== options.filters!.ledger
      ) {
        return false;
      }
      if (
        options.filters!.code !== undefined &&
        item.code !== options.filters!.code
      ) {
        return false;
      }
      return true;
    });
  }

  private static generateCSV(data: BackupData): string {
    const lines: string[] = [];

    if (data.accounts && data.accounts.length > 0) {
      lines.push("=== ACCOUNTS ===");
      lines.push(
        "id,alias,ledger,code,balance,debits_posted,credits_posted,flags,timestamp"
      );

      data.accounts.forEach((acc) => {
        lines.push(
          [
            this.escapeCSV(acc.id),
            this.escapeCSV(acc.alias || ""),
            acc.ledger,
            acc.code,
            this.escapeCSV(acc.balance),
            this.escapeCSV(acc.debits_posted),
            this.escapeCSV(acc.credits_posted),
            acc.flags || 0,
            this.escapeCSV(acc.timestamp || ""),
          ].join(",")
        );
      });
      lines.push("");
    }

    if (data.transfers && data.transfers.length > 0) {
      lines.push("=== TRANSFERS ===");
      lines.push(
        "id,debit_account_id,credit_account_id,amount,ledger,code,flags,timestamp"
      );

      data.transfers.forEach((t) => {
        lines.push(
          [
            this.escapeCSV(t.id),
            this.escapeCSV(t.debit_account_id),
            this.escapeCSV(t.credit_account_id),
            this.escapeCSV(t.amount),
            t.ledger,
            t.code,
            t.flags || 0,
            this.escapeCSV(t.timestamp || ""),
          ].join(",")
        );
      });
    }

    return lines.join("\n");
  }

  private static escapeCSV(value: string | number): string {
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private static generateSQL(data: BackupData): string {
    const lines: string[] = [
      "-- TigerBeetle Export SQL",
      "-- Generated: " + new Date().toISOString(),
      "",
      "BEGIN TRANSACTION;",
      "",
    ];

    if (data.accounts && data.accounts.length > 0) {
      lines.push("-- Accounts");
      lines.push(
        "CREATE TABLE IF NOT EXISTS accounts (",
        "  id TEXT PRIMARY KEY,",
        "  alias TEXT,",
        "  ledger INTEGER NOT NULL,",
        "  code INTEGER NOT NULL,",
        "  balance TEXT NOT NULL,",
        "  debits_posted TEXT NOT NULL,",
        "  credits_posted TEXT NOT NULL,",
        "  flags INTEGER DEFAULT 0,",
        "  timestamp TEXT",
        ");",
        ""
      );

      data.accounts.forEach((acc) => {
        lines.push(
          `INSERT INTO accounts (id, alias, ledger, code, balance, debits_posted, credits_posted, flags, timestamp) ` +
            `VALUES ('${this.escapeSQL(acc.id)}', '${this.escapeSQL(
              acc.alias || ""
            )}', ${acc.ledger}, ${acc.code}, ` +
            `'${this.escapeSQL(acc.balance)}', '${this.escapeSQL(
              acc.debits_posted
            )}', '${this.escapeSQL(acc.credits_posted)}', ` +
            `${acc.flags || 0}, '${this.escapeSQL(acc.timestamp || "")}');`
        );
      });
      lines.push("");
    }

    if (data.transfers && data.transfers.length > 0) {
      lines.push("-- Transfers");
      lines.push(
        "CREATE TABLE IF NOT EXISTS transfers (",
        "  id TEXT PRIMARY KEY,",
        "  debit_account_id TEXT NOT NULL,",
        "  credit_account_id TEXT NOT NULL,",
        "  amount TEXT NOT NULL,",
        "  ledger INTEGER NOT NULL,",
        "  code INTEGER NOT NULL,",
        "  flags INTEGER DEFAULT 0,",
        "  timestamp TEXT",
        ");",
        ""
      );

      data.transfers.forEach((t) => {
        lines.push(
          `INSERT INTO transfers (id, debit_account_id, credit_account_id, amount, ledger, code, flags, timestamp) ` +
            `VALUES ('${this.escapeSQL(t.id)}', '${this.escapeSQL(
              t.debit_account_id
            )}', '${this.escapeSQL(t.credit_account_id)}', ` +
            `'${this.escapeSQL(t.amount)}', ${t.ledger}, ${t.code}, ${
              t.flags || 0
            }, '${this.escapeSQL(t.timestamp || "")}');`
        );
      });
      lines.push("");
    }

    lines.push("COMMIT;");
    return lines.join("\n");
  }

  private static escapeSQL(value: string): string {
    return value.replace(/'/g, "''");
  }

  private static async retryOperation<T>(
    operation: () => Promise<T>,
    retries = this.MAX_RETRIES
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === retries - 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error("Operation failed after retries");
  }

  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
