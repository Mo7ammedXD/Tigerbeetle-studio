import Database from "better-sqlite3";
import { app, BrowserWindow, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { createClient, id as createId } from "tigerbeetle-node";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ConnectionConfig {
  cluster_id: string;
  replica_addresses: string[];
}

interface AccountData {
  id?: string;
  ledger: number;
  code: number;
  alias: string;
  user_data_128?: string;
  user_data_64?: string;
  user_data_32?: number;
  flags?: number;
}

interface TransferData {
  id?: string; // Optional for auto-generation
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

interface AccountRecord {
  id: string;
  alias: string;
  ledger: number;
  code: number;
  created_at: number;
}

interface TransferRecord {
  id: string;
  debit_account_id: string;
  credit_account_id: string;
  amount: string;
  ledger: number;
  code: number;
  created_at: number;
}

let mainWindow: BrowserWindow | null = null;
let tigerBeetleClient: any = null;
let localDb: Database.Database | null = null;
const isDev = !app.isPackaged;

function initializeLocalDatabase() {
  try {
    const userDataPath = app.getPath("userData");
    const dbPath = path.join(userDataPath, "tigerbeetle-studio.db");

    localDb = new Database(dbPath);

    localDb.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        alias TEXT NOT NULL,
        ledger INTEGER NOT NULL,
        code INTEGER NOT NULL,
        user_data_128 TEXT,
        user_data_64 TEXT,
        user_data_32 INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      
      CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        debit_account_id TEXT NOT NULL,
        credit_account_id TEXT NOT NULL,
        amount TEXT NOT NULL,
        ledger INTEGER NOT NULL,
        code INTEGER NOT NULL,
        user_data_128 TEXT,
        user_data_64 TEXT,
        user_data_32 INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      
      CREATE TABLE IF NOT EXISTS connection_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        cluster_id TEXT NOT NULL,
        replica_addresses TEXT NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_accounts_ledger ON accounts(ledger);
      CREATE INDEX IF NOT EXISTS idx_transfers_debit ON transfers(debit_account_id);
      CREATE INDEX IF NOT EXISTS idx_transfers_credit ON transfers(credit_account_id);
    `);

    migrateDatabase();
  } catch (error: any) {
    localDb = null;
  }
}

function migrateDatabase() {
  if (!localDb) return;

  try {
    const accountColumns = localDb.pragma("table_info(accounts)") as any[];
    const accountColumnNames = accountColumns.map((col) => col.name);

    const accountMigrations = [
      {
        name: "user_data_128",
        sql: "ALTER TABLE accounts ADD COLUMN user_data_128 TEXT",
      },
      {
        name: "user_data_64",
        sql: "ALTER TABLE accounts ADD COLUMN user_data_64 TEXT",
      },
      {
        name: "user_data_32",
        sql: "ALTER TABLE accounts ADD COLUMN user_data_32 INTEGER",
      },
    ];

    for (const migration of accountMigrations) {
      if (!accountColumnNames.includes(migration.name)) {
        localDb.exec(migration.sql);
      }
    }

    const transferColumns = localDb.pragma("table_info(transfers)") as any[];
    const transferColumnNames = transferColumns.map((col) => col.name);

    const transferMigrations = [
      {
        name: "user_data_128",
        sql: "ALTER TABLE transfers ADD COLUMN user_data_128 TEXT",
      },
      {
        name: "user_data_64",
        sql: "ALTER TABLE transfers ADD COLUMN user_data_64 TEXT",
      },
      {
        name: "user_data_32",
        sql: "ALTER TABLE transfers ADD COLUMN user_data_32 INTEGER",
      },
    ];

    for (const migration of transferMigrations) {
      if (!transferColumnNames.includes(migration.name)) {
        localDb.exec(migration.sql);
      }
    }
  } catch (error: any) {}
}

async function connectToTigerBeetle(config: ConnectionConfig) {
  try {
    if (tigerBeetleClient) {
      tigerBeetleClient = null;
    }

    tigerBeetleClient = createClient({
      cluster_id: BigInt(config.cluster_id),
      replica_addresses: config.replica_addresses,
    });

    if (localDb) {
      const stmt = localDb.prepare(`
        INSERT OR REPLACE INTO connection_config (id, cluster_id, replica_addresses, updated_at)
        VALUES (1, ?, ?, strftime('%s', 'now'))
      `);
      stmt.run(config.cluster_id, JSON.stringify(config.replica_addresses));
    } else {
      try {
        const configPath = path.join(
          app.getPath("userData"),
          "connection.json",
        );
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      } catch (error) {}
    }

    return { success: true };
  } catch (error: any) {
    throw new Error(`Connection failed: ${error.message}`);
  }
}

function getStoredConnectionConfig(): ConnectionConfig | null {
  if (!localDb) {
    try {
      const configPath = path.join(app.getPath("userData"), "connection.json");
      if (fs.existsSync(configPath)) {
        const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        return data;
      }
    } catch (error) {}
    return null;
  }

  try {
    const stmt = localDb.prepare(
      "SELECT cluster_id, replica_addresses FROM connection_config WHERE id = 1",
    );
    const row = stmt.get() as any;

    if (row) {
      return {
        cluster_id: row.cluster_id,
        replica_addresses: JSON.parse(row.replica_addresses),
      };
    }
  } catch (error) {}

  return null;
}

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "bigint") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === "object") {
    const serialized: any = {};
    for (const key in obj) {
      serialized[key] = serializeBigInt(obj[key]);
    }
    return serialized;
  }

  return obj;
}

function deserializeBigInt(
  value: string | undefined,
  defaultValue: bigint = 0n,
): bigint {
  if (!value) return defaultValue;
  try {
    return BigInt(value);
  } catch {
    return defaultValue;
  }
}

function decodeAccountFlags(flags: number): string[] {
  const result: string[] = [];
  if (flags & 0x01) result.push("linked");
  if (flags & 0x02) result.push("debits_must_not_exceed_credits");
  if (flags & 0x04) result.push("credits_must_not_exceed_debits");
  if (flags & 0x08) result.push("history");
  return result;
}

function decodeTransferFlags(flags: number): string[] {
  const result: string[] = [];
  if (flags & 0x01) result.push("linked");
  if (flags & 0x02) result.push("pending");
  if (flags & 0x04) result.push("post_pending_transfer");
  if (flags & 0x08) result.push("void_pending_transfer");
  if (flags & 0x10) result.push("balancing_debit");
  if (flags & 0x20) result.push("balancing_credit");
  return result;
}

async function createAccount(data: AccountData) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  try {
    const accountId = data.id ? deserializeBigInt(data.id) : createId();

    const account = {
      id: accountId,
      debits_pending: 0n,
      debits_posted: 0n,
      credits_pending: 0n,
      credits_posted: 0n,
      user_data_128: deserializeBigInt(data.user_data_128),
      user_data_64: deserializeBigInt(data.user_data_64),
      user_data_32: data.user_data_32 || 0,
      reserved: 0,
      ledger: data.ledger,
      code: data.code,
      flags: data.flags || 0,
      timestamp: 0n,
    };

    const errors = await tigerBeetleClient.createAccounts([account]);

    if (errors.length > 0) {
      throw new Error(`Failed to create account: ${JSON.stringify(errors[0])}`);
    }

    if (localDb) {
      try {
        const stmt = localDb.prepare(`
          INSERT INTO accounts (id, alias, ledger, code, user_data_128, user_data_64, user_data_32)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          accountId.toString(),
          data.alias,
          data.ledger,
          data.code,
          data.user_data_128 || null,
          data.user_data_64 || null,
          data.user_data_32 || null,
        );
      } catch (err) {}
    }

    return {
      success: true,
      id: accountId.toString(),
    };
  } catch (error: any) {
    throw error;
  }
}

async function queryAccountsFromTigerBeetle(
  limit: number = 100,
  ledger?: number,
  code?: number,
  reversed: boolean = false,
  timestamp_min: bigint = 0n,
  timestamp_max: bigint = 0n,
) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  try {
    const filter = {
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      ledger: ledger || 0,
      code: code || 0,
      timestamp_min: timestamp_min,
      timestamp_max: timestamp_max,
      limit: limit,
      flags: reversed ? 1 : 0,
      reserved: new Uint8Array(6),
    };

    const accounts = await tigerBeetleClient.queryAccounts(filter);
    return accounts;
  } catch (error: any) {
    throw error;
  }
}

// Cache for account/transfer counts to avoid repeated full scans
const countCache = {
  accounts: { value: 0, timestamp: 0 },
  transfers: { value: 0, timestamp: 0 },
};

// Get cached count or fetch if stale (> 5 seconds)
async function getCachedAccountCount(): Promise<number> {
  const now = Date.now();
  if (
    countCache.accounts.timestamp &&
    now - countCache.accounts.timestamp < 5000
  ) {
    return countCache.accounts.value;
  }

  // Fetch just one item to get total count
  const sample = await queryAccountsFromTigerBeetle(1, 0, 0, true, 0n);
  // In production, TigerBeetle should return total count in metadata
  // For now, we need to fetch all to get count (but cache it)
  const all = await fetchAllAccountsFromTigerBeetle(1);
  countCache.accounts.value = all.length;
  countCache.accounts.timestamp = now;
  return all.length;
}

async function getCachedTransferCount(): Promise<number> {
  const now = Date.now();
  if (
    countCache.transfers.timestamp &&
    now - countCache.transfers.timestamp < 5000
  ) {
    return countCache.transfers.value;
  }

  const all = await fetchAllTransfersFromTigerBeetle(1);
  countCache.transfers.value = all.length;
  countCache.transfers.timestamp = now;
  return all.length;
}

async function fetchAllAccountsFromTigerBeetle(ledger?: number, code?: number) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  const allAccounts: any[] = [];
  let timestamp_min = 0n;
  const batchSize = 8189;
  let batchCount = 0;

  try {
    while (true) {
      batchCount++;
      const batch = await queryAccountsFromTigerBeetle(
        batchSize,
        ledger,
        code,
        false,
        timestamp_min,
      );

      if (batch.length === 0) {
        break;
      }

      allAccounts.push(...batch);

      if (batch.length < batchSize) {
        break;
      }

      const lastAccount = batch[batch.length - 1];
      timestamp_min = (lastAccount as any).timestamp + 1n;
    }

    return allAccounts;
  } catch (error: any) {
    throw error;
  }
}

async function queryTransfersFromTigerBeetle(
  limit: number = 100,
  ledger?: number,
  code?: number,
  reversed: boolean = true,
  timestamp_min: bigint = 0n,
  timestamp_max: bigint = 0n,
) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  try {
    const filter = {
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      ledger: ledger || 0,
      code: code || 0,
      timestamp_min: timestamp_min,
      timestamp_max: timestamp_max,
      limit: limit,
      flags: reversed ? 1 : 0,
      reserved: new Uint8Array(6),
    };

    const transfers = await tigerBeetleClient.queryTransfers(filter);
    return transfers;
  } catch (error: any) {
    throw error;
  }
}

async function fetchAllTransfersFromTigerBeetle(
  ledger?: number,
  code?: number,
) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  const allTransfers: any[] = [];
  let timestamp_max = 0n;
  const batchSize = 8189;
  let batchCount = 0;

  try {
    while (true) {
      batchCount++;
      const batch = await queryTransfersFromTigerBeetle(
        batchSize,
        ledger,
        code,
        true,
        0n,
        timestamp_max,
      );

      if (batch.length === 0) {
        break;
      }

      allTransfers.push(...batch);

      if (batch.length < batchSize) {
        break;
      }

      const lastTransfer = batch[batch.length - 1];
      timestamp_max = (lastTransfer as any).timestamp - 1n;
    }

    return allTransfers;
  } catch (error: any) {
    throw error;
  }
}

async function getAccounts(
  limit: number = 50,
  cursor: string | null = null,
  direction: "next" | "prev" = "next",
  filters?: {
    ledger?: number;
    code?: number;
    timestamp_min?: string;
    timestamp_max?: string;
  },
) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  try {
    // Fetch one extra item to determine if there are more results
    const fetchLimit = limit + 1;

    // Parse cursor (timestamp) or use defaults
    let timestamp_min = 0n;
    let timestamp_max = 0n;
    const reversed = direction === "prev";

    if (cursor) {
      const cursorTimestamp = BigInt(cursor);
      if (direction === "next") {
        timestamp_max = cursorTimestamp - 1n;
      } else {
        timestamp_min = cursorTimestamp + 1n;
      }
    }

   
    if (filters?.timestamp_min) {
      timestamp_min = BigInt(filters.timestamp_min);
    }
    if (filters?.timestamp_max) {
      timestamp_max = BigInt(filters.timestamp_max);
    }

    const accounts = await queryAccountsFromTigerBeetle(
      fetchLimit,
      filters?.ledger || 0,
      filters?.code,
      !reversed,
      timestamp_min,
      timestamp_max,
    );

    const hasMore = accounts.length > limit;
    const hasPrevious = cursor !== null;

    const resultAccounts = hasMore ? accounts.slice(0, -1) : accounts;

    const result = resultAccounts.map((tbAcc: any) => {
      const debits = tbAcc.debits_posted.toString();
      const credits = tbAcc.credits_posted.toString();
      const balance = (tbAcc.credits_posted - tbAcc.debits_posted).toString();

      let alias = `Account ${tbAcc.id.toString().slice(0, 8)}...`;
      if (localDb) {
        try {
          const stmt = localDb.prepare(
            "SELECT alias FROM accounts WHERE id = ?",
          );
          const row = stmt.get(tbAcc.id.toString()) as any;
          if (row) alias = row.alias;
        } catch (err) {}
      }

      return {
        id: tbAcc.id.toString(),
        alias: alias,
        ledger: tbAcc.ledger,
        code: tbAcc.code,
        debits_posted: debits,
        credits_posted: credits,
        debits_pending: tbAcc.debits_pending.toString(),
        credits_pending: tbAcc.credits_pending.toString(),
        balance: balance,
        user_data_128: tbAcc.user_data_128.toString(),
        user_data_64: tbAcc.user_data_64.toString(),
        user_data_32: tbAcc.user_data_32,
        timestamp: tbAcc.timestamp.toString(),
        flags: decodeAccountFlags(tbAcc.flags || 0),
        exists: true,
      };
    });

    // Determine cursors for next/previous pages
    const nextCursor =
      hasMore && result.length > 0 ? result[result.length - 1].timestamp : null;

    const prevCursor =
      hasPrevious && result.length > 0 ? result[0].timestamp : null;

    return {
      data: result,
      nextCursor,
      prevCursor,
      hasMore,
      hasPrevious,
      count: result.length,
    };
  } catch (error: any) {
    throw error;
  }
}

async function deleteAccount(id: string) {
  if (!localDb) {
    throw new Error("Local database not initialized");
  }

  try {
    const stmt = localDb.prepare("DELETE FROM accounts WHERE id = ?");
    stmt.run(id);

    return { success: true };
  } catch (error: any) {
    throw error;
  }
}

async function importAccountsFromJson(filePath: string) {
  if (!localDb) {
    throw new Error("Local database not initialized");
  }

  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  try {
    const fs = await import("fs");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(fileContent);

    if (!data.accounts || !Array.isArray(data.accounts)) {
      throw new Error("Invalid JSON format");
    }

    let imported = 0;
    const stmt = localDb.prepare(`
      INSERT OR REPLACE INTO accounts (id, alias, ledger, code, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `);

    for (const account of data.accounts) {
      stmt.run(account.id, account.name, 1, account.code);
      imported++;
    }

    return { success: true, imported };
  } catch (error: any) {
    throw error;
  }
}

async function lookupAccountsByIds(ids: string[]) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  try {
    const bigintIds = ids.map((id) => BigInt(id));
    const accounts = await tigerBeetleClient.lookupAccounts(bigintIds);

    const result = accounts.map((tbAcc: any) => {
      const debits = tbAcc.debits_posted.toString();
      const credits = tbAcc.credits_posted.toString();
      const balance = (tbAcc.credits_posted - tbAcc.debits_posted).toString();

      return {
        id: tbAcc.id.toString(),
        alias: `Account ${tbAcc.id.toString().slice(0, 8)}...`,
        ledger: tbAcc.ledger,
        code: tbAcc.code,
        debits_posted: debits,
        credits_posted: credits,
        debits_pending: tbAcc.debits_pending.toString(),
        credits_pending: tbAcc.credits_pending.toString(),
        balance: balance,
        user_data_128: tbAcc.user_data_128.toString(),
        user_data_64: tbAcc.user_data_64.toString(),
        user_data_32: tbAcc.user_data_32,
        timestamp: tbAcc.timestamp.toString(),
        flags: decodeAccountFlags(tbAcc.flags || 0),
        exists: true,
      };
    });

    return result;
  } catch (error: any) {
    throw error;
  }
}

async function lookupTransfersByIds(ids: string[]) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  try {
    const bigintIds = ids.map((id) => BigInt(id));
    const transfers = await tigerBeetleClient.lookupTransfers(bigintIds);

    const result = transfers.map((tbTransfer: any) => ({
      id: tbTransfer.id.toString(),
      debit_account_id: tbTransfer.debit_account_id.toString(),
      credit_account_id: tbTransfer.credit_account_id.toString(),
      amount: tbTransfer.amount.toString(),
      pending_id: tbTransfer.pending_id.toString(),
      user_data_128: tbTransfer.user_data_128.toString(),
      user_data_64: tbTransfer.user_data_64.toString(),
      user_data_32: tbTransfer.user_data_32,
      timeout: tbTransfer.timeout,
      ledger: tbTransfer.ledger,
      code: tbTransfer.code,
      flags: tbTransfer.flags,
      timestamp: tbTransfer.timestamp.toString(),
    }));

    return result;
  } catch (error: any) {
    throw error;
  }
}

async function queryAccountsWithFilter(filter: any) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  try {
    const queryFilter = {
      user_data_128: filter.user_data_128 ? BigInt(filter.user_data_128) : 0n,
      user_data_64: filter.user_data_64 ? BigInt(filter.user_data_64) : 0n,
      user_data_32: filter.user_data_32 || 0,
      ledger: filter.ledger || 0,
      code: filter.code || 0,
      timestamp_min: filter.timestamp_min ? BigInt(filter.timestamp_min) : 0n,
      timestamp_max: filter.timestamp_max ? BigInt(filter.timestamp_max) : 0n,
      limit: Math.min(filter.limit || 8189, 8189),
      flags: filter.reversed ? 1 : 0,
      reserved: new Uint8Array(6),
    };

    const accounts = await tigerBeetleClient.queryAccounts(queryFilter);

    const result = accounts.map((tbAcc: any) => {
      const debits = tbAcc.debits_posted.toString();
      const credits = tbAcc.credits_posted.toString();
      const balance = (tbAcc.credits_posted - tbAcc.debits_posted).toString();

      return {
        id: tbAcc.id.toString(),
        alias: `Account ${tbAcc.id.toString().slice(0, 8)}...`,
        ledger: tbAcc.ledger,
        code: tbAcc.code,
        debits_posted: debits,
        credits_posted: credits,
        debits_pending: tbAcc.debits_pending.toString(),
        credits_pending: tbAcc.credits_pending.toString(),
        balance: balance,
        user_data_128: tbAcc.user_data_128.toString(),
        user_data_64: tbAcc.user_data_64.toString(),
        user_data_32: tbAcc.user_data_32,
        timestamp: tbAcc.timestamp.toString(),
        flags: decodeAccountFlags(tbAcc.flags || 0),
        exists: true,
      };
    });

    return result;
  } catch (error: any) {
    throw error;
  }
}

async function queryTransfersWithFilter(filter: any) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  try {
    const queryFilter = {
      user_data_128: filter.user_data_128 ? BigInt(filter.user_data_128) : 0n,
      user_data_64: filter.user_data_64 ? BigInt(filter.user_data_64) : 0n,
      user_data_32: filter.user_data_32 || 0,
      ledger: filter.ledger || 0,
      code: filter.code || 0,
      timestamp_min: filter.timestamp_min ? BigInt(filter.timestamp_min) : 0n,
      timestamp_max: filter.timestamp_max ? BigInt(filter.timestamp_max) : 0n,
      limit: Math.min(filter.limit || 8189, 8189),
      flags: filter.reversed ? 1 : 0,
      reserved: new Uint8Array(6),
    };

    const transfers = await tigerBeetleClient.queryTransfers(queryFilter);

    const result = transfers.map((tbTransfer: any) => ({
      id: tbTransfer.id.toString(),
      debit_account_id: tbTransfer.debit_account_id.toString(),
      credit_account_id: tbTransfer.credit_account_id.toString(),
      amount: tbTransfer.amount.toString(),
      pending_id: tbTransfer.pending_id.toString(),
      user_data_128: tbTransfer.user_data_128.toString(),
      user_data_64: tbTransfer.user_data_64.toString(),
      user_data_32: tbTransfer.user_data_32,
      timeout: tbTransfer.timeout,
      ledger: tbTransfer.ledger,
      code: tbTransfer.code,
      flags: tbTransfer.flags,
      timestamp: tbTransfer.timestamp.toString(),
    }));

    return result;
  } catch (error: any) {
    throw error;
  }
}

async function createTransfer(data: TransferData) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  try {
    const transferId = data.id ? deserializeBigInt(data.id) : createId();

    const transfer = {
      id: transferId,
      debit_account_id: deserializeBigInt(data.debit_account_id),
      credit_account_id: deserializeBigInt(data.credit_account_id),
      amount: deserializeBigInt(data.amount),
      pending_id: 0n,
      user_data_128: deserializeBigInt(data.user_data_128),
      user_data_64: deserializeBigInt(data.user_data_64),
      user_data_32: data.user_data_32 || 0,
      timeout: 0,
      ledger: data.ledger,
      code: data.code,
      flags: data.flags || 0,
      timestamp: 0n,
    };

    const errors = await tigerBeetleClient.createTransfers([transfer]);

    if (errors.length > 0) {
      throw new Error(
        `Failed to create transfer: ${JSON.stringify(errors[0])}`,
      );
    }

    if (localDb) {
      try {
        const stmt = localDb.prepare(`
          INSERT INTO transfers (id, debit_account_id, credit_account_id, amount, ledger, code, user_data_128, user_data_64, user_data_32)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          transferId.toString(),
          data.debit_account_id,
          data.credit_account_id,
          data.amount,
          data.ledger,
          data.code,
          data.user_data_128 || null,
          data.user_data_64 || null,
          data.user_data_32 || null,
        );
      } catch (err) {}
    }

    return {
      success: true,
      id: transferId.toString(),
    };
  } catch (error: any) {
    throw error;
  }
}

async function getTransfers(
  limit: number = 50,
  cursor: string | null = null,
  direction: "next" | "prev" = "next",
  filters?: {
    ledger?: number;
    code?: number;
    timestamp_min?: string;
    timestamp_max?: string;
  },
) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  try {
    // Fetch one extra item to determine if there are more results
    const fetchLimit = limit + 1;

    // Parse cursor (timestamp) or use defaults
    let timestamp_min = 0n;
    let timestamp_max = 0n;
    const reversed = direction === "next"; // For transfers, 'next' means older (reversed)

    if (cursor) {
      const cursorTimestamp = BigInt(cursor);
      if (direction === "next") {
        // For next page, get records with timestamp < cursor (older records)
        timestamp_max = cursorTimestamp - 1n;
      } else {
        // For previous page, get records with timestamp > cursor (newer records)
        timestamp_min = cursorTimestamp + 1n;
      }
    }

    // Apply user filters if provided
    if (filters?.timestamp_min) {
      timestamp_min = BigInt(filters.timestamp_min);
    }
    if (filters?.timestamp_max) {
      timestamp_max = BigInt(filters.timestamp_max);
    }

    // Query transfers using TigerBeetle's native query API
    const transfers = await queryTransfersFromTigerBeetle(
      fetchLimit,
      filters?.ledger || 0,
      filters?.code,
      reversed,
      timestamp_min,
      timestamp_max,
    );

    // Check if there are more results
    const hasMore = transfers.length > limit;
    const hasPrevious = cursor !== null;

    // Remove the extra item if we have more
    const resultTransfers = hasMore ? transfers.slice(0, -1) : transfers;

    // Map transfers to response format with aliases from local DB
    const result = resultTransfers.map((tbTransfer: any) => {
      let debitAlias = tbTransfer.debit_account_id.toString();
      let creditAlias = tbTransfer.credit_account_id.toString();

      if (localDb) {
        try {
          const stmt = localDb.prepare(
            "SELECT alias FROM accounts WHERE id = ?",
          );
          const debitRow = stmt.get(
            tbTransfer.debit_account_id.toString(),
          ) as any;
          const creditRow = stmt.get(
            tbTransfer.credit_account_id.toString(),
          ) as any;
          if (debitRow) debitAlias = debitRow.alias;
          if (creditRow) creditAlias = creditRow.alias;
        } catch (err) {}
      }

      return {
        id: tbTransfer.id.toString(),
        debit_account_id: tbTransfer.debit_account_id.toString(),
        credit_account_id: tbTransfer.credit_account_id.toString(),
        debit_alias: debitAlias,
        credit_alias: creditAlias,
        amount: tbTransfer.amount.toString(),
        ledger: tbTransfer.ledger,
        code: tbTransfer.code,
        flags: decodeTransferFlags(tbTransfer.flags || 0),
        pending_id: tbTransfer.pending_id?.toString() || "0",
        timeout: tbTransfer.timeout || 0,
        timestamp: tbTransfer.timestamp.toString(),
        user_data_128: tbTransfer.user_data_128.toString(),
        user_data_64: tbTransfer.user_data_64.toString(),
        user_data_32: tbTransfer.user_data_32,
        exists: true,
      };
    });

    // Determine cursors for next/previous pages
    const nextCursor =
      hasMore && result.length > 0 ? result[result.length - 1].timestamp : null;

    const prevCursor =
      hasPrevious && result.length > 0 ? result[0].timestamp : null;

    return {
      data: result,
      nextCursor,
      prevCursor,
      hasMore,
      hasPrevious,
      count: result.length,
    };
  } catch (error: any) {
    throw error;
  }
}

function setupIpcHandlers() {
  ipcMain.handle("connect", async (_event, config: ConnectionConfig) => {
    try {
      await connectToTigerBeetle(config);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-connection-config", async () => {
    return getStoredConnectionConfig();
  });

  ipcMain.handle("disconnect", async () => {
    if (tigerBeetleClient) {
      tigerBeetleClient = null;
      return { success: true };
    }
    return { success: false, error: "Not connected" };
  });

  ipcMain.handle("is-connected", async () => {
    return { connected: tigerBeetleClient !== null };
  });

  ipcMain.handle("create-account", async (_event, data: AccountData) => {
    try {
      const result = await createAccount(data);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "get-accounts",
    async (
      _event,
      limit?: number,
      cursor?: string | null,
      direction?: "next" | "prev",
      filters?: {
        ledger?: number;
        code?: number;
        timestamp_min?: string;
        timestamp_max?: string;
      },
    ) => {
      try {
        const cleanLimit = limit ?? 50;
        const cleanCursor = cursor === undefined ? null : cursor;
        const cleanDirection = direction ?? "next";
        const cleanFilters = filters ?? undefined;

        const result = await getAccounts(
          cleanLimit,
          cleanCursor,
          cleanDirection,
          cleanFilters,
        );

        // Return plain serializable object
        return {
          success: true,
          data: {
            data: result.data,
            nextCursor: result.nextCursor,
            prevCursor: result.prevCursor,
            hasMore: result.hasMore,
            hasPrevious: result.hasPrevious,
            count: result.count,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle("delete-account", async (_event, id: string) => {
    try {
      const result = await deleteAccount(id);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "import-accounts-from-json",
    async (_event, filePath: string) => {
      try {
        const result = await importAccountsFromJson(filePath);
        return result;
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle("lookup-accounts-by-ids", async (_event, ids: string[]) => {
    try {
      const result = await lookupAccountsByIds(ids);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("lookup-transfers-by-ids", async (_event, ids: string[]) => {
    try {
      const result = await lookupTransfersByIds(ids);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("query-accounts", async (_event, filter: any) => {
    try {
      const result = await queryAccountsWithFilter(filter);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("query-transfers", async (_event, filter: any) => {
    try {
      const result = await queryTransfersWithFilter(filter);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("create-transfer", async (_event, data: TransferData) => {
    try {
      const result = await createTransfer(data);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "get-transfers",
    async (
      _event,
      limit?: number,
      cursor?: string | null,
      direction?: "next" | "prev",
      filters?: {
        ledger?: number;
        code?: number;
        timestamp_min?: string;
        timestamp_max?: string;
      },
    ) => {
      try {
        // Clean up parameters to avoid undefined issues
        const cleanLimit = limit ?? 50;
        const cleanCursor = cursor === undefined ? null : cursor;
        const cleanDirection = direction ?? "next";
        const cleanFilters = filters ?? undefined;

        const result = await getTransfers(
          cleanLimit,
          cleanCursor,
          cleanDirection,
          cleanFilters,
        );

        // Return plain serializable object
        return {
          success: true,
          data: {
            data: result.data,
            nextCursor: result.nextCursor,
            prevCursor: result.prevCursor,
            hasMore: result.hasMore,
            hasPrevious: result.hasPrevious,
            count: result.count,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );
}

function createWindow() {
  const preloadPath = isDev
    ? path.join(__dirname, "preload.js")
    : path.join(__dirname, "preload.js");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "TigerBeetle Studio",
  });

  if (isDev) {
    // Use environment variable or default port
    const port = process.env.VITE_DEV_SERVER_PORT || "5173";
    const url = `http://localhost:${port}`;
    mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize local database
  initializeLocalDatabase();

  // Setup IPC handlers
  setupIpcHandlers();

  // Create window
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (localDb) {
      localDb.close();
    }
    app.quit();
  }
});

app.on("before-quit", () => {
  if (localDb) {
    localDb.close();
  }
});
