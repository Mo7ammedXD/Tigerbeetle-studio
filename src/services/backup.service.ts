import type {
  BackupData,
  BackupHistoryItem,
  BackupOptions,
  ExportResult,
  ProgressCallback,
} from "../types/backup.types";
import { CryptoService } from "./crypto.service";

export class BackupService {
  private static readonly STORAGE_KEY = "tigerbeetle_backup_history";
  private static readonly MAX_HISTORY = 10;

  static async createBackup(
    options: BackupOptions,
    onProgress?: ProgressCallback
  ): Promise<ExportResult> {
    try {
      onProgress?.(0, "Initializing backup...");

      const backup: BackupData = {
        metadata: {
          version: "2.0",
          exportDate: new Date().toISOString(),
          source: "TigerBeetle Studio",
          accountsCount: 0,
          transfersCount: 0,
        },
      };

      onProgress?.(20, "Fetching accounts...");
      backup.accounts = await this.fetchAllAccounts(onProgress);
      backup.metadata.accountsCount = backup.accounts.length;

      onProgress?.(50, "Fetching transfers...");
      backup.transfers = await this.fetchAllTransfers(onProgress);
      backup.metadata.transfersCount = backup.transfers.length;

      if (options.includeConfig) {
        onProgress?.(60, "Including configuration...");
        const config = await window.tigerBeetleApi.getConnectionConfig();
        if (config) {
          backup.config = config;
        }
      }

      onProgress?.(80, "Creating backup file...");

      let content = JSON.stringify(backup, null, 2);
      const name = options.name || `backup_${Date.now()}`;
      let filename = `${name}.json`;

      if (options.encrypt && options.password) {
        onProgress?.(85, "Encrypting backup...");
        content = await CryptoService.encrypt(content, options.password);
        filename = `${name}.encrypted.json`;
      }

      const checksum = await CryptoService.generateChecksum(content);
      backup.metadata.checksum = checksum;

      onProgress?.(95, "Preparing download...");

      const blob = new Blob([content], { type: "application/json" });
      this.downloadBlob(blob, filename);

      const historyItem: BackupHistoryItem = {
        name,
        filename,
        date: new Date().toLocaleString(),
        size: this.formatBytes(blob.size),
        accounts: backup.accounts?.length || 0,
        transfers: backup.transfers?.length || 0,
        encrypted: options.encrypt,
      };

      this.addToHistory(historyItem);

      onProgress?.(100, "Backup completed");

      return {
        success: true,
        filename,
        size: blob.size,
        recordsExported:
          (backup.accounts?.length || 0) + (backup.transfers?.length || 0),
      };
    } catch (error) {
      return {
        success: false,
        filename: "",
        size: 0,
        recordsExported: 0,
        error: error instanceof Error ? error.message : "Backup failed",
      };
    }
  }

  static getHistory(): BackupHistoryItem[] {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      // Silent error handling
    }
    return [];
  }

  static addToHistory(item: BackupHistoryItem): void {
    try {
      const history = this.getHistory();
      history.unshift(item);
      const trimmed = history.slice(0, this.MAX_HISTORY);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
    } catch (error) {}
  }

  static clearHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {}
  }

  /**
   * Fetch all accounts using cursor-based pagination
   */
  private static async fetchAllAccounts(
    onProgress?: ProgressCallback
  ): Promise<any[]> {
    const allAccounts: any[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    const pageSize = 1000;
    let pageCount = 0;

    while (hasMore) {
      const result = await window.tigerBeetleApi.getAccounts(
        pageSize,
        cursor,
        "next"
      );

      if (result.success && result.data) {
        const data = result.data;
        const accounts = data.data || [];
        allAccounts.push(...accounts);

        hasMore = data.hasMore || false;
        cursor = data.nextCursor || null;
        pageCount++;

        const progress = 20 + Math.min(30, (pageCount * pageSize) / 10000);
        onProgress?.(
          Math.round(progress),
          `Fetching accounts... (${allAccounts.length} loaded)`
        );

        if (pageCount > 10000) {
          console.warn("Reached maximum page limit for accounts");
          break;
        }
      } else {
        break;
      }
    }

    return allAccounts;
  }

  /**
   * Fetch all transfers using cursor-based pagination
   */
  private static async fetchAllTransfers(
    onProgress?: ProgressCallback
  ): Promise<any[]> {
    const allTransfers: any[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    const pageSize = 1000;
    let pageCount = 0;

    while (hasMore) {
      const result = await window.tigerBeetleApi.getTransfers(
        pageSize,
        cursor,
        "next"
      );

      if (result.success && result.data) {
        const data = result.data;
        const transfers = data.data || [];
        allTransfers.push(...transfers);

        hasMore = data.hasMore || false;
        cursor = data.nextCursor || null;
        pageCount++;

        const progress = 50 + Math.min(30, (pageCount * pageSize) / 10000);
        onProgress?.(
          Math.round(progress),
          `Fetching transfers... (${allTransfers.length} loaded)`
        );

        if (pageCount > 10000) {
          console.warn("Reached maximum page limit for transfers");
          break;
        }
      } else {
        break;
      }
    }

    return allTransfers;
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

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }
}
