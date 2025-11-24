import Database from "better-sqlite3";
import { app, BrowserWindow, ipcMain } from "electron";
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
  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, "tigerbeetle-studio.db");
  console.log("📁 Initializing local database at:", dbPath);
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
  console.log("✅ Local database initialized");
}
function migrateDatabase() {
  if (!localDb) return;
  console.log("🔄 Running database migrations...");
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
        console.log(`  ➕ Adding column: accounts.${migration.name}`);
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
        console.log(`  ➕ Adding column: transfers.${migration.name}`);
        localDb.exec(migration.sql);
      }
    }
    console.log("✅ Database migrations completed");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  }
}
async function connectToTigerBeetle(config) {
  try {
    console.log("🔌 Connecting to TigerBeetle...", config);
    if (tigerBeetleClient) {
      console.log("Closing existing connection...");
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
    }
    console.log("✅ Connected to TigerBeetle");
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to connect to TigerBeetle:", error);
    throw new Error(`Connection failed: ${error.message}`);
  }
}
function getStoredConnectionConfig() {
  if (!localDb) return null;
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
    console.error("Failed to get stored config:", error);
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
  if (!localDb) {
    throw new Error("Local database not initialized");
  }
  try {
    const accountId = data.id ? deserializeBigInt(data.id) : id();
    console.log("📝 Creating account:", accountId.toString());
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
      console.error("TigerBeetle account creation errors:", errors);
      throw new Error(`Failed to create account: ${JSON.stringify(errors[0])}`);
    }
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
    console.log("✅ Account created successfully");
    return {
      success: true,
      id: accountId.toString()
    };
  } catch (error) {
    console.error("❌ Failed to create account:", error);
    throw error;
  }
}
async function getAccounts(limit = 100, offset = 0) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }
  if (!localDb) {
    throw new Error("Local database not initialized");
  }
  try {
    console.log(`📋 Fetching accounts (limit: ${limit}, offset: ${offset})...`);
    const countStmt = localDb.prepare("SELECT COUNT(*) as total FROM accounts");
    const countResult = countStmt.get();
    const total = countResult.total;
    const stmt = localDb.prepare(
      "SELECT * FROM accounts ORDER BY created_at DESC LIMIT ? OFFSET ?"
    );
    const localAccounts = stmt.all(limit, offset);
    if (localAccounts.length === 0) {
      return [];
    }
    const ids = localAccounts.map((acc) => BigInt(acc.id));
    const tbAccounts = await tigerBeetleClient.lookupAccounts(ids);
    const accountsMap = new Map(
      tbAccounts.map((acc) => [acc.id.toString(), acc])
    );
    const result = localAccounts.map((localAcc) => {
      const tbAcc = accountsMap.get(localAcc.id);
      if (!tbAcc) {
        return {
          id: localAcc.id,
          alias: localAcc.alias,
          ledger: localAcc.ledger,
          code: localAcc.code,
          debits_posted: "0",
          credits_posted: "0",
          balance: "0",
          exists: false
        };
      }
      const debits = tbAcc.debits_posted.toString();
      const credits = tbAcc.credits_posted.toString();
      const balance = (tbAcc.credits_posted - tbAcc.debits_posted).toString();
      return {
        id: localAcc.id,
        alias: localAcc.alias,
        ledger: localAcc.ledger,
        code: localAcc.code,
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
    console.log(`✅ Fetched ${result.length} of ${total} accounts`);
    return {
      data: result,
      total,
      limit,
      offset
    };
  } catch (error) {
    console.error("❌ Failed to get accounts:", error);
    throw error;
  }
}
async function deleteAccount(id2) {
  if (!localDb) {
    throw new Error("Local database not initialized");
  }
  try {
    console.log("🗑️ Deleting account from local database:", id2);
    const stmt = localDb.prepare("DELETE FROM accounts WHERE id = ?");
    stmt.run(id2);
    console.log("✅ Account deleted from local database");
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to delete account:", error);
    throw error;
  }
}
async function createTransfer(data) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }
  if (!localDb) {
    throw new Error("Local database not initialized");
  }
  try {
    const transferId = data.id ? deserializeBigInt(data.id) : id();
    console.log("💸 Creating transfer:", transferId.toString());
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
      console.error("TigerBeetle transfer creation errors:", errors);
      throw new Error(
        `Failed to create transfer: ${JSON.stringify(errors[0])}`
      );
    }
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
    console.log("✅ Transfer created successfully");
    return {
      success: true,
      id: transferId.toString()
    };
  } catch (error) {
    console.error("❌ Failed to create transfer:", error);
    throw error;
  }
}
async function getTransfers(limit = 100, offset = 0) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }
  if (!localDb) {
    throw new Error("Local database not initialized");
  }
  try {
    console.log(
      `📋 Fetching transfers (limit: ${limit}, offset: ${offset})...`
    );
    const countStmt = localDb.prepare(
      "SELECT COUNT(*) as total FROM transfers"
    );
    const countResult = countStmt.get();
    const total = countResult.total;
    const stmt = localDb.prepare(`
      SELECT 
        t.*,
        da.alias as debit_alias,
        ca.alias as credit_alias
      FROM transfers t
      LEFT JOIN accounts da ON t.debit_account_id = da.id
      LEFT JOIN accounts ca ON t.credit_account_id = ca.id
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const localTransfers = stmt.all(limit, offset);
    if (localTransfers.length === 0) {
      return [];
    }
    const transferIds = localTransfers.map((t) => BigInt(t.id));
    const tbTransfers = await tigerBeetleClient.lookupTransfers(transferIds);
    const tbTransfersMap = new Map(
      tbTransfers.map((t) => [t.id.toString(), t])
    );
    const result = localTransfers.map((localTransfer) => {
      var _a;
      const tbTransfer = tbTransfersMap.get(localTransfer.id);
      if (!tbTransfer) {
        return {
          ...localTransfer,
          exists: false
        };
      }
      return {
        id: localTransfer.id,
        debit_account_id: localTransfer.debit_account_id,
        credit_account_id: localTransfer.credit_account_id,
        debit_alias: localTransfer.debit_alias,
        credit_alias: localTransfer.credit_alias,
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
        created_at: localTransfer.created_at,
        exists: true
      };
    });
    console.log(
      `✅ Fetched ${result.length} of ${total} transfers from TigerBeetle`
    );
    return {
      data: result,
      total,
      limit,
      offset
    };
  } catch (error) {
    console.error("❌ Failed to get transfers:", error);
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
    async (_event, limit, offset) => {
      try {
        const result = await getAccounts(limit, offset);
        return { success: true, data: result };
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
    async (_event, limit, offset) => {
      try {
        const result = await getTransfers(limit, offset);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );
}
function createWindow() {
  const preloadPath = isDev ? path.join(__dirname$1, "preload.js") : path.join(__dirname$1, "preload.js");
  console.log("🔧 Preload path:", preloadPath);
  console.log("🔧 __dirname:", __dirname$1);
  console.log("🔧 isDev:", isDev);
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
    console.log("🔧 Loading URL:", url);
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
  console.log("🚀 TigerBeetle Studio starting...");
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
    console.log("📁 Closing local database...");
    localDb.close();
  }
});
