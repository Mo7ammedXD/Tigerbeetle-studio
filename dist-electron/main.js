import Database from "better-sqlite3";
import { app, BrowserWindow, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { createClient, id } from "tigerbeetle-node";
import { fileURLToPath } from "url";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
let mainWindow = null;
let tigerBeetleClient = null;
let localDb = null;
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
  } catch (error) {
    localDb = null;
  }
}
function migrateDatabase() {
  if (!localDb) return;
  try {
    const accountColumns = localDb.pragma("table_info(accounts)");
    const accountColumnNames = accountColumns.map((col) => col.name);
    const accountMigrations = [
      {
        name: "user_data_128",
        sql: "ALTER TABLE accounts ADD COLUMN user_data_128 TEXT"
      },
      {
        name: "user_data_64",
        sql: "ALTER TABLE accounts ADD COLUMN user_data_64 TEXT"
      },
      {
        name: "user_data_32",
        sql: "ALTER TABLE accounts ADD COLUMN user_data_32 INTEGER"
      }
    ];
    for (const migration of accountMigrations) {
      if (!accountColumnNames.includes(migration.name)) {
        localDb.exec(migration.sql);
      }
    }
    const transferColumns = localDb.pragma("table_info(transfers)");
    const transferColumnNames = transferColumns.map((col) => col.name);
    const transferMigrations = [
      {
        name: "user_data_128",
        sql: "ALTER TABLE transfers ADD COLUMN user_data_128 TEXT"
      },
      {
        name: "user_data_64",
        sql: "ALTER TABLE transfers ADD COLUMN user_data_64 TEXT"
      },
      {
        name: "user_data_32",
        sql: "ALTER TABLE transfers ADD COLUMN user_data_32 INTEGER"
      }
    ];
    for (const migration of transferMigrations) {
      if (!transferColumnNames.includes(migration.name)) {
        localDb.exec(migration.sql);
      }
    }
  } catch (error) {
  }
}
async function connectToTigerBeetle(config) {
  try {
    if (tigerBeetleClient) {
      tigerBeetleClient = null;
    }
    tigerBeetleClient = createClient({
      cluster_id: BigInt(config.cluster_id),
      replica_addresses: config.replica_addresses
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
          "connection.json"
        );
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      } catch (error) {
      }
    }
    return { success: true };
  } catch (error) {
    throw new Error(`Connection failed: ${error.message}`);
  }
}
function getStoredConnectionConfig() {
  if (!localDb) {
    try {
      const configPath = path.join(app.getPath("userData"), "connection.json");
      if (fs.existsSync(configPath)) {
        const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        return data;
      }
    } catch (error) {
    }
    return null;
  }
  try {
    const stmt = localDb.prepare(
      "SELECT cluster_id, replica_addresses FROM connection_config WHERE id = 1"
    );
    const row = stmt.get();
    if (row) {
      return {
        cluster_id: row.cluster_id,
        replica_addresses: JSON.parse(row.replica_addresses)
      };
    }
  } catch (error) {
  }
  return null;
}
function deserializeBigInt(value, defaultValue = 0n) {
  if (!value) return defaultValue;
  try {
    return BigInt(value);
  } catch {
    return defaultValue;
  }
}
function decodeAccountFlags(flags) {
  const result = [];
  if (flags & 1) result.push("linked");
  if (flags & 2) result.push("debits_must_not_exceed_credits");
  if (flags & 4) result.push("credits_must_not_exceed_debits");
  if (flags & 8) result.push("history");
  return result;
}
function decodeTransferFlags(flags) {
  const result = [];
  if (flags & 1) result.push("linked");
  if (flags & 2) result.push("pending");
  if (flags & 4) result.push("post_pending_transfer");
  if (flags & 8) result.push("void_pending_transfer");
  if (flags & 16) result.push("balancing_debit");
  if (flags & 32) result.push("balancing_credit");
  return result;
}
async function createAccount(data) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }
  try {
    const accountId = data.id ? deserializeBigInt(data.id) : id();
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
      timestamp: 0n
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
          data.user_data_32 || null
        );
      } catch (err) {
      }
    }
    return {
      success: true,
      id: accountId.toString()
    };
  } catch (error) {
    throw error;
  }
}
async function queryAccountsFromTigerBeetle(limit = 100, ledger, code, reversed = false, timestamp_min = 0n, timestamp_max = 0n) {
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
      timestamp_min,
      timestamp_max,
      limit,
      flags: reversed ? 1 : 0,
      reserved: new Uint8Array(6)
    };
    const accounts = await tigerBeetleClient.queryAccounts(filter);
    return accounts;
  } catch (error) {
    throw error;
  }
}
async function queryTransfersFromTigerBeetle(limit = 100, ledger, code, reversed = true, timestamp_min = 0n, timestamp_max = 0n) {
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
      timestamp_min,
      timestamp_max,
      limit,
      flags: reversed ? 1 : 0,
      reserved: new Uint8Array(6)
    };
    const transfers = await tigerBeetleClient.queryTransfers(filter);
    return transfers;
  } catch (error) {
    throw error;
  }
}
async function getAccounts(limit = 50, cursor = null, direction = "next", filters) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }
  try {
    const fetchLimit = limit + 1;
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
    if (filters == null ? void 0 : filters.timestamp_min) {
      timestamp_min = BigInt(filters.timestamp_min);
    }
    if (filters == null ? void 0 : filters.timestamp_max) {
      timestamp_max = BigInt(filters.timestamp_max);
    }
    const accounts = await queryAccountsFromTigerBeetle(
      fetchLimit,
      (filters == null ? void 0 : filters.ledger) || 1,
      filters == null ? void 0 : filters.code,
      !reversed,
      // TigerBeetle's reversed flag (true = newest first)
      timestamp_min,
      timestamp_max
    );
    const hasMore = accounts.length > limit;
    const hasPrevious = cursor !== null;
    const resultAccounts = hasMore ? accounts.slice(0, -1) : accounts;
    const result = resultAccounts.map((tbAcc) => {
      const debits = tbAcc.debits_posted.toString();
      const credits = tbAcc.credits_posted.toString();
      const balance = (tbAcc.credits_posted - tbAcc.debits_posted).toString();
      let alias = `Account ${tbAcc.id.toString().slice(0, 8)}...`;
      if (localDb) {
        try {
          const stmt = localDb.prepare(
            "SELECT alias FROM accounts WHERE id = ?"
          );
          const row = stmt.get(tbAcc.id.toString());
          if (row) alias = row.alias;
        } catch (err) {
        }
      }
      return {
        id: tbAcc.id.toString(),
        alias,
        ledger: tbAcc.ledger,
        code: tbAcc.code,
        debits_posted: debits,
        credits_posted: credits,
        debits_pending: tbAcc.debits_pending.toString(),
        credits_pending: tbAcc.credits_pending.toString(),
        balance,
        user_data_128: tbAcc.user_data_128.toString(),
        user_data_64: tbAcc.user_data_64.toString(),
        user_data_32: tbAcc.user_data_32,
        timestamp: tbAcc.timestamp.toString(),
        flags: decodeAccountFlags(tbAcc.flags || 0),
        exists: true
      };
    });
    const nextCursor = hasMore && result.length > 0 ? result[result.length - 1].timestamp : null;
    const prevCursor = hasPrevious && result.length > 0 ? result[0].timestamp : null;
    return {
      data: result,
      nextCursor,
      prevCursor,
      hasMore,
      hasPrevious,
      count: result.length
    };
  } catch (error) {
    throw error;
  }
}
async function deleteAccount(id2) {
  if (!localDb) {
    throw new Error("Local database not initialized");
  }
  try {
    const stmt = localDb.prepare("DELETE FROM accounts WHERE id = ?");
    stmt.run(id2);
    return { success: true };
  } catch (error) {
    throw error;
  }
}
async function importAccountsFromJson(filePath) {
  if (!localDb) {
    throw new Error("Local database not initialized");
  }
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }
  try {
    const fs2 = await import("fs");
    const fileContent = fs2.readFileSync(filePath, "utf-8");
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
  } catch (error) {
    throw error;
  }
}
async function lookupAccountsByIds(ids) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }
  try {
    const bigintIds = ids.map((id2) => BigInt(id2));
    const accounts = await tigerBeetleClient.lookupAccounts(bigintIds);
    const result = accounts.map((tbAcc) => {
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
        balance,
        user_data_128: tbAcc.user_data_128.toString(),
        user_data_64: tbAcc.user_data_64.toString(),
        user_data_32: tbAcc.user_data_32,
        timestamp: tbAcc.timestamp.toString(),
        flags: decodeAccountFlags(tbAcc.flags || 0),
        exists: true
      };
    });
    return result;
  } catch (error) {
    throw error;
  }
}
async function lookupTransfersByIds(ids) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }
  try {
    const bigintIds = ids.map((id2) => BigInt(id2));
    const transfers = await tigerBeetleClient.lookupTransfers(bigintIds);
    const result = transfers.map((tbTransfer) => ({
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
      timestamp: tbTransfer.timestamp.toString()
    }));
    return result;
  } catch (error) {
    throw error;
  }
}
async function queryAccountsWithFilter(filter) {
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
      reserved: new Uint8Array(6)
    };
    const accounts = await tigerBeetleClient.queryAccounts(queryFilter);
    const result = accounts.map((tbAcc) => {
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
        balance,
        user_data_128: tbAcc.user_data_128.toString(),
        user_data_64: tbAcc.user_data_64.toString(),
        user_data_32: tbAcc.user_data_32,
        timestamp: tbAcc.timestamp.toString(),
        flags: decodeAccountFlags(tbAcc.flags || 0),
        exists: true
      };
    });
    return result;
  } catch (error) {
    throw error;
  }
}
async function queryTransfersWithFilter(filter) {
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
      reserved: new Uint8Array(6)
    };
    const transfers = await tigerBeetleClient.queryTransfers(queryFilter);
    const result = transfers.map((tbTransfer) => ({
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
      timestamp: tbTransfer.timestamp.toString()
    }));
    return result;
  } catch (error) {
    throw error;
  }
}
async function createTransfer(data) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }
  try {
    const transferId = data.id ? deserializeBigInt(data.id) : id();
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
      timestamp: 0n
    };
    const errors = await tigerBeetleClient.createTransfers([transfer]);
    if (errors.length > 0) {
      throw new Error(
        `Failed to create transfer: ${JSON.stringify(errors[0])}`
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
          data.user_data_32 || null
        );
      } catch (err) {
      }
    }
    return {
      success: true,
      id: transferId.toString()
    };
  } catch (error) {
    throw error;
  }
}
async function getTransfers(limit = 50, cursor = null, direction = "next", filters) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }
  try {
    const fetchLimit = limit + 1;
    let timestamp_min = 0n;
    let timestamp_max = 0n;
    const reversed = direction === "next";
    if (cursor) {
      const cursorTimestamp = BigInt(cursor);
      if (direction === "next") {
        timestamp_max = cursorTimestamp - 1n;
      } else {
        timestamp_min = cursorTimestamp + 1n;
      }
    }
    if (filters == null ? void 0 : filters.timestamp_min) {
      timestamp_min = BigInt(filters.timestamp_min);
    }
    if (filters == null ? void 0 : filters.timestamp_max) {
      timestamp_max = BigInt(filters.timestamp_max);
    }
    const transfers = await queryTransfersFromTigerBeetle(
      fetchLimit,
      (filters == null ? void 0 : filters.ledger) || 1,
      filters == null ? void 0 : filters.code,
      reversed,
      timestamp_min,
      timestamp_max
    );
    const hasMore = transfers.length > limit;
    const hasPrevious = cursor !== null;
    const resultTransfers = hasMore ? transfers.slice(0, -1) : transfers;
    const result = resultTransfers.map((tbTransfer) => {
      var _a;
      let debitAlias = tbTransfer.debit_account_id.toString();
      let creditAlias = tbTransfer.credit_account_id.toString();
      if (localDb) {
        try {
          const stmt = localDb.prepare(
            "SELECT alias FROM accounts WHERE id = ?"
          );
          const debitRow = stmt.get(
            tbTransfer.debit_account_id.toString()
          );
          const creditRow = stmt.get(
            tbTransfer.credit_account_id.toString()
          );
          if (debitRow) debitAlias = debitRow.alias;
          if (creditRow) creditAlias = creditRow.alias;
        } catch (err) {
        }
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
        pending_id: ((_a = tbTransfer.pending_id) == null ? void 0 : _a.toString()) || "0",
        timeout: tbTransfer.timeout || 0,
        timestamp: tbTransfer.timestamp.toString(),
        user_data_128: tbTransfer.user_data_128.toString(),
        user_data_64: tbTransfer.user_data_64.toString(),
        user_data_32: tbTransfer.user_data_32,
        exists: true
      };
    });
    const nextCursor = hasMore && result.length > 0 ? result[result.length - 1].timestamp : null;
    const prevCursor = hasPrevious && result.length > 0 ? result[0].timestamp : null;
    return {
      data: result,
      nextCursor,
      prevCursor,
      hasMore,
      hasPrevious,
      count: result.length
    };
  } catch (error) {
    throw error;
  }
}
function setupIpcHandlers() {
  ipcMain.handle("connect", async (_event, config) => {
    try {
      await connectToTigerBeetle(config);
      return { success: true };
    } catch (error) {
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
  ipcMain.handle("create-account", async (_event, data) => {
    try {
      const result = await createAccount(data);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle(
    "get-accounts",
    async (_event, limit, cursor, direction, filters) => {
      try {
        const cleanLimit = limit ?? 50;
        const cleanCursor = cursor === void 0 ? null : cursor;
        const cleanDirection = direction ?? "next";
        const cleanFilters = filters ?? void 0;
        const result = await getAccounts(
          cleanLimit,
          cleanCursor,
          cleanDirection,
          cleanFilters
        );
        return {
          success: true,
          data: {
            data: result.data,
            nextCursor: result.nextCursor,
            prevCursor: result.prevCursor,
            hasMore: result.hasMore,
            hasPrevious: result.hasPrevious,
            count: result.count
          }
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );
  ipcMain.handle("delete-account", async (_event, id2) => {
    try {
      const result = await deleteAccount(id2);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle(
    "import-accounts-from-json",
    async (_event, filePath) => {
      try {
        const result = await importAccountsFromJson(filePath);
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );
  ipcMain.handle("lookup-accounts-by-ids", async (_event, ids) => {
    try {
      const result = await lookupAccountsByIds(ids);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("lookup-transfers-by-ids", async (_event, ids) => {
    try {
      const result = await lookupTransfersByIds(ids);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("query-accounts", async (_event, filter) => {
    try {
      const result = await queryAccountsWithFilter(filter);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("query-transfers", async (_event, filter) => {
    try {
      const result = await queryTransfersWithFilter(filter);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("create-transfer", async (_event, data) => {
    try {
      const result = await createTransfer(data);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle(
    "get-transfers",
    async (_event, limit, cursor, direction, filters) => {
      try {
        const cleanLimit = limit ?? 50;
        const cleanCursor = cursor === void 0 ? null : cursor;
        const cleanDirection = direction ?? "next";
        const cleanFilters = filters ?? void 0;
        const result = await getTransfers(
          cleanLimit,
          cleanCursor,
          cleanDirection,
          cleanFilters
        );
        return {
          success: true,
          data: {
            data: result.data,
            nextCursor: result.nextCursor,
            prevCursor: result.prevCursor,
            hasMore: result.hasMore,
            hasPrevious: result.hasPrevious,
            count: result.count
          }
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );
}
function createWindow() {
  const preloadPath = isDev ? path.join(__dirname$1, "preload.js") : path.join(__dirname$1, "preload.js");
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true
    },
    title: "TigerBeetle Studio"
  });
  if (isDev) {
    const port = process.env.VITE_DEV_SERVER_PORT || "5173";
    const url = `http://localhost:${port}`;
    mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
app.whenReady().then(() => {
  initializeLocalDatabase();
  setupIpcHandlers();
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
