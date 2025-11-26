import type {
  Account,
  BackupData,
  ImportOptions,
  ImportResult,
  ProgressCallback,
  Transfer,
} from "../types/backup.types";
import { CryptoService } from "./crypto.service";
import { DataMapperService } from "./data-mapper.service";
import { ValidationService } from "./validation.service";

export class ImportService {
  private static readonly BATCH_SIZE = 8189;
  private static readonly MAX_RETRIES = 3;

  static async importFromFile(
    file: File,
    options: ImportOptions,
    password?: string,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    const startTime = Date.now();

    try {
      onProgress?.(0, "Reading file...");

      const content = await this.readFile(file);

      onProgress?.(10, "Parsing data...");

      let jsonContent = content;
      const isEncrypted =
        file.name.includes(".encrypted") || file.name.includes(".enc");

      if (isEncrypted) {
        if (!password) {
          throw new Error("Password required for encrypted backup");
        }
        onProgress?.(15, "Decrypting data...");
        jsonContent = await CryptoService.decrypt(content, password);
      }

      const data: BackupData = JSON.parse(jsonContent);

      onProgress?.(20, "Validating data...");

      const validation = ValidationService.validateBackupData(data);

      if (!validation.valid) {
        const errorMessages = validation.errors
          .map((e) => e.message)
          .slice(0, 5);
        throw new Error(
          `Validation failed with ${
            validation.errors.length
          } errors:\n${errorMessages.join("\n")}`
        );
      }

      if (validation.warnings.length > 0) {
        // Warnings exist but proceeding with import
      }

      if (options.dryRun || options.validateOnly) {
        return {
          success: true,
          accountsImported: 0,
          transfersImported: 0,
          accountsSkipped: 0,
          transfersSkipped: 0,
          errors: [],
          duration: Date.now() - startTime,
        };
      }

      onProgress?.(30, "Importing data...");

      const result = await this.importData(data, options, onProgress);

      return {
        ...result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        accountsImported: 0,
        transfersImported: 0,
        accountsSkipped: 0,
        transfersSkipped: 0,
        errors: [error instanceof Error ? error.message : "Import failed"],
        duration: Date.now() - startTime,
      };
    }
  }

  private static async importData(
    data: BackupData,
    options: ImportOptions,
    onProgress?: ProgressCallback
  ): Promise<Omit<ImportResult, "duration">> {
    let accountsImported = 0;
    let transfersImported = 0;
    let accountsSkipped = 0;
    let transfersSkipped = 0;
    const errors: string[] = [];

    if (data.accounts && data.accounts.length > 0) {
      onProgress?.(40, `Importing ${data.accounts.length} accounts...`);

      const accountResult = await this.importAccounts(
        data.accounts,
        options,
        (progress) => {
          onProgress?.(
            40 + progress * 0.25,
            `Importing accounts: ${Math.round(progress)}%`
          );
        }
      );

      accountsImported = accountResult.imported;
      accountsSkipped = accountResult.skipped;
      errors.push(...accountResult.errors);
    }

    if (data.transfers && data.transfers.length > 0) {
      onProgress?.(65, `Importing ${data.transfers.length} transfers...`);

      const transferResult = await this.importTransfers(
        data.transfers,
        options,
        (progress) => {
          onProgress?.(
            65 + progress * 0.3,
            `Importing transfers: ${Math.round(progress)}%`
          );
        }
      );

      transfersImported = transferResult.imported;
      transfersSkipped = transferResult.skipped;
      errors.push(...transferResult.errors);
    }

    onProgress?.(100, "Import completed");

    return {
      success: errors.length === 0,
      accountsImported,
      transfersImported,
      accountsSkipped,
      transfersSkipped,
      errors,
    };
  }

  private static async importAccounts(
    accounts: Account[],
    options: ImportOptions,
    onProgress?: (progress: number) => void
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const batchSize = options.batchSize || this.BATCH_SIZE;

    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize);

      try {
        for (const account of batch) {
          try {
            const accountData = DataMapperService.accountToAccountData(account);
            const result = await this.retryOperation(async () => {
              return await window.tigerBeetleApi.createAccount(accountData);
            });

            if (result.success) {
              imported++;
            } else {
              if (options.skipDuplicates && result.error?.includes("exists")) {
                skipped++;
              } else {
                errors.push(
                  `Failed to import account ${account.id}: ${result.error}`
                );
              }
            }
          } catch (error) {
            if (options.skipDuplicates) {
              skipped++;
            } else {
              errors.push(
                `Error importing account ${account.id}: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`
              );
            }
          }
        }
      } catch (error) {
        errors.push(
          `Error processing accounts batch ${i}-${i + batch.length}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }

      onProgress?.(((i + batch.length) / accounts.length) * 100);
    }

    return { imported, skipped, errors };
  }

  private static async importTransfers(
    transfers: Transfer[],
    options: ImportOptions,
    onProgress?: (progress: number) => void
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const batchSize = options.batchSize || this.BATCH_SIZE;

    for (let i = 0; i < transfers.length; i += batchSize) {
      const batch = transfers.slice(i, i + batchSize);

      try {
        for (const transfer of batch) {
          try {
            const transferData =
              DataMapperService.transferToTransferData(transfer);
            const result = await this.retryOperation(async () => {
              return await window.tigerBeetleApi.createTransfer(transferData);
            });

            if (result.success) {
              imported++;
            } else {
              if (options.skipDuplicates && result.error?.includes("exists")) {
                skipped++;
              } else {
                errors.push(
                  `Failed to import transfer ${transfer.id}: ${result.error}`
                );
              }
            }
          } catch (error) {
            if (options.skipDuplicates) {
              skipped++;
            } else {
              errors.push(
                `Error importing transfer ${transfer.id}: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`
              );
            }
          }
        }
      } catch (error) {
        errors.push(
          `Error processing transfers batch ${i}-${i + batch.length}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }

      onProgress?.(((i + batch.length) / transfers.length) * 100);
    }

    return { imported, skipped, errors };
  }

  private static async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
          resolve(result);
        } else {
          reject(new Error("Failed to read file as text"));
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
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
}
