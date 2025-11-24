import Database from "better-sqlite3";
import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { createClient, id as createId } from "tigerbeetle-node";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ConnectionConfig {
  cluster_id: string; // Will be converted to BigInt
  replica_addresses: string[];
}

interface AccountData {
  id?: string; // Optional for auto-generation, will be converted to BigInt
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

// ============================================================================
// GLOBAL STATE
// ============================================================================

let mainWindow: BrowserWindow | null = null;
let tigerBeetleClient: any = null;
let localDb: Database.Database | null = null;
const isDev = !app.isPackaged;

// ============================================================================
// DATABASE INITIALIZATION (SQLite Sidecar)
// ============================================================================

function initializeLocalDatabase() {
  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, "tigerbeetle-studio.db");

  console.log("📁 Initializing local database at:", dbPath);

  localDb = new Database(dbPath);

  // Create tables
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

  // Run migrations for existing databases
  migrateDatabase();

  console.log("✅ Local database initialized");
}

function migrateDatabase() {
  if (!localDb) return;

  console.log("🔄 Running database migrations...");

  try {
    // Get current columns for accounts table
    const accountColumns = localDb.pragma("table_info(accounts)") as any[];
    const accountColumnNames = accountColumns.map((col) => col.name);

    // Add missing columns to accounts table
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
        console.log(`  ➕ Adding column: accounts.${migration.name}`);
        localDb.exec(migration.sql);
      }
    }

    // Get current columns for transfers table
    const transferColumns = localDb.pragma("table_info(transfers)") as any[];
    const transferColumnNames = transferColumns.map((col) => col.name);

    // Add missing columns to transfers table
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
        console.log(`  ➕ Adding column: transfers.${migration.name}`);
        localDb.exec(migration.sql);
      }
    }

    console.log("✅ Database migrations completed");
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
  }
}

// ============================================================================
// TIGERBEETLE CONNECTION
// ============================================================================

async function connectToTigerBeetle(config: ConnectionConfig) {
  try {
    console.log("🔌 Connecting to TigerBeetle...", config);

    // Close existing connection if any
    if (tigerBeetleClient) {
      console.log("Closing existing connection...");
      tigerBeetleClient = null;
    }

    // Create new client
    tigerBeetleClient = createClient({
      cluster_id: BigInt(config.cluster_id),
      replica_addresses: config.replica_addresses,
    });

    // Store connection config
    if (localDb) {
      const stmt = localDb.prepare(`
        INSERT OR REPLACE INTO connection_config (id, cluster_id, replica_addresses, updated_at)
        VALUES (1, ?, ?, strftime('%s', 'now'))
      `);
      stmt.run(config.cluster_id, JSON.stringify(config.replica_addresses));
    }

    console.log("✅ Connected to TigerBeetle");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Failed to connect to TigerBeetle:", error);
    throw new Error(`Connection failed: ${error.message}`);
  }
}

function getStoredConnectionConfig(): ConnectionConfig | null {
  if (!localDb) return null;

  try {
    const stmt = localDb.prepare(
      "SELECT cluster_id, replica_addresses FROM connection_config WHERE id = 1"
    );
    const row = stmt.get() as any;

    if (row) {
      return {
        cluster_id: row.cluster_id,
        replica_addresses: JSON.parse(row.replica_addresses),
      };
    }
  } catch (error) {
    console.error("Failed to get stored config:", error);
  }

  return null;
}

// ============================================================================
// BIGINT SERIALIZATION HELPERS
// ============================================================================

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
  defaultValue: bigint = 0n
): bigint {
  if (!value) return defaultValue;
  try {
    return BigInt(value);
  } catch {
    return defaultValue;
  }
}

// ============================================================================
// FLAG DECODING
// ============================================================================

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

// ============================================================================
// ACCOUNT OPERATIONS
// ============================================================================

async function createAccount(data: AccountData) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  if (!localDb) {
    throw new Error("Local database not initialized");
  }

  try {
    // Generate ID if not provided
    const accountId = data.id ? deserializeBigInt(data.id) : createId();

    console.log("📝 Creating account:", accountId.toString());

    // Create account in TigerBeetle
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
      console.error("TigerBeetle account creation errors:", errors);
      throw new Error(`Failed to create account: ${JSON.stringify(errors[0])}`);
    }

    // Store in local SQLite
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
      id: accountId.toString(),
    };
  } catch (error: any) {
    console.error("❌ Failed to create account:", error);
    throw error;
  }
}

async function getAccounts(limit: number = 100, offset: number = 0) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  if (!localDb) {
    throw new Error("Local database not initialized");
  }

  try {
    console.log(`📋 Fetching accounts (limit: ${limit}, offset: ${offset})...`);

    // Get total count
    const countStmt = localDb.prepare("SELECT COUNT(*) as total FROM accounts");
    const countResult = countStmt.get() as { total: number };
    const total = countResult.total;

    // Get paginated IDs from SQLite
    const stmt = localDb.prepare(
      "SELECT * FROM accounts ORDER BY created_at DESC LIMIT ? OFFSET ?"
    );
    const localAccounts = stmt.all(limit, offset) as AccountRecord[];

    if (localAccounts.length === 0) {
      return [];
    }

    // Lookup accounts in TigerBeetle
    const ids = localAccounts.map((acc) => BigInt(acc.id));
    const tbAccounts = await tigerBeetleClient.lookupAccounts(ids);

    // Merge local metadata with TigerBeetle data
    const accountsMap = new Map(
      tbAccounts.map((acc: any) => [acc.id.toString(), acc])
    );

    const result = localAccounts.map((localAcc) => {
      const tbAcc = accountsMap.get(localAcc.id);

      if (!tbAcc) {
        // Account exists locally but not in TigerBeetle (shouldn't happen)
        return {
          id: localAcc.id,
          alias: localAcc.alias,
          ledger: localAcc.ledger,
          code: localAcc.code,
          debits_posted: "0",
          credits_posted: "0",
          balance: "0",
          exists: false,
        };
      }

      const debits = (tbAcc as any).debits_posted.toString();
      const credits = (tbAcc as any).credits_posted.toString();
      const balance = (
        (tbAcc as any).credits_posted - (tbAcc as any).debits_posted
      ).toString();

      return {
        id: localAcc.id,
        alias: localAcc.alias,
        ledger: localAcc.ledger,
        code: localAcc.code,
        debits_posted: debits,
        credits_posted: credits,
        debits_pending: (tbAcc as any).debits_pending.toString(),
        credits_pending: (tbAcc as any).credits_pending.toString(),
        balance: balance,
        user_data_128: (tbAcc as any).user_data_128.toString(),
        user_data_64: (tbAcc as any).user_data_64.toString(),
        user_data_32: (tbAcc as any).user_data_32,
        timestamp: (tbAcc as any).timestamp.toString(),
        flags: decodeAccountFlags((tbAcc as any).flags || 0),
        exists: true,
      };
    });

    console.log(`✅ Fetched ${result.length} of ${total} accounts`);
    return {
      data: result,
      total,
      limit,
      offset,
    };
  } catch (error: any) {
    console.error("❌ Failed to get accounts:", error);
    throw error;
  }
}

async function deleteAccount(id: string) {
  if (!localDb) {
    throw new Error("Local database not initialized");
  }

  try {
    console.log("🗑️ Deleting account from local database:", id);

    const stmt = localDb.prepare("DELETE FROM accounts WHERE id = ?");
    stmt.run(id);

    console.log("✅ Account deleted from local database");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Failed to delete account:", error);
    throw error;
  }
}

// ============================================================================
// TRANSFER OPERATIONS
// ============================================================================

async function createTransfer(data: TransferData) {
  if (!tigerBeetleClient) {
    throw new Error("Not connected to TigerBeetle");
  }

  if (!localDb) {
    throw new Error("Local database not initialized");
  }

  try {
    // Generate ID if not provided
    const transferId = data.id ? deserializeBigInt(data.id) : createId();

    console.log("💸 Creating transfer:", transferId.toString());

    // Create transfer in TigerBeetle
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
      console.error("TigerBeetle transfer creation errors:", errors);
      throw new Error(
        `Failed to create transfer: ${JSON.stringify(errors[0])}`
      );
    }

    // Store in local SQLite
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
      id: transferId.toString(),
    };
  } catch (error: any) {
    console.error("❌ Failed to create transfer:", error);
    throw error;
  }
}

async function getTransfers(limit: number = 100, offset: number = 0) {
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

    // Get total count
    const countStmt = localDb.prepare(
      "SELECT COUNT(*) as total FROM transfers"
    );
    const countResult = countStmt.get() as { total: number };
    const total = countResult.total;

    // Get paginated transfer IDs from SQLite
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

    const localTransfers = stmt.all(limit, offset) as any[];

    if (localTransfers.length === 0) {
      return [];
    }

    // Lookup transfers in TigerBeetle to get actual data
    const transferIds = localTransfers.map((t) => BigInt(t.id));
    const tbTransfers = await tigerBeetleClient.lookupTransfers(transferIds);

    // Create a map of TigerBeetle transfers by ID
    const tbTransfersMap = new Map(
      tbTransfers.map((t: any) => [t.id.toString(), t])
    );

    // Merge local metadata with TigerBeetle data
    const result = localTransfers.map((localTransfer) => {
      const tbTransfer = tbTransfersMap.get(localTransfer.id);

      if (!tbTransfer) {
        // Transfer exists locally but not in TigerBeetle (shouldn't happen)
        return {
          ...localTransfer,
          exists: false,
        };
      }

      return {
        id: localTransfer.id,
        debit_account_id: localTransfer.debit_account_id,
        credit_account_id: localTransfer.credit_account_id,
        debit_alias: localTransfer.debit_alias,
        credit_alias: localTransfer.credit_alias,
        amount: (tbTransfer as any).amount.toString(),
        ledger: (tbTransfer as any).ledger,
        code: (tbTransfer as any).code,
        flags: decodeTransferFlags((tbTransfer as any).flags || 0),
        pending_id: (tbTransfer as any).pending_id?.toString() || "0",
        timeout: (tbTransfer as any).timeout || 0,
        timestamp: (tbTransfer as any).timestamp.toString(),
        user_data_128: (tbTransfer as any).user_data_128.toString(),
        user_data_64: (tbTransfer as any).user_data_64.toString(),
        user_data_32: (tbTransfer as any).user_data_32,
        created_at: localTransfer.created_at,
        exists: true,
      };
    });

    console.log(
      `✅ Fetched ${result.length} of ${total} transfers from TigerBeetle`
    );
    return {
      data: result,
      total,
      limit,
      offset,
    };
  } catch (error: any) {
    console.error("❌ Failed to get transfers:", error);
    throw error;
  }
}

// ============================================================================
// IPC HANDLERS
// ============================================================================

function setupIpcHandlers() {
  // Connection
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

  // Accounts
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
    async (_event, limit?: number, offset?: number) => {
      try {
        const result = await getAccounts(limit, offset);
        return { success: true, data: result };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle("delete-account", async (_event, id: string) => {
    try {
      const result = await deleteAccount(id);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Transfers
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
    async (_event, limit?: number, offset?: number) => {
      try {
        const result = await getTransfers(limit, offset);
        return { success: true, data: result };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );
}

// ============================================================================
// ELECTRON APP LIFECYCLE
// ============================================================================

function createWindow() {
  // Determine preload script path
  const preloadPath = isDev
    ? path.join(__dirname, "preload.js")
    : path.join(__dirname, "preload.js");

  console.log("🔧 Preload path:", preloadPath);
  console.log("🔧 __dirname:", __dirname);
  console.log("🔧 isDev:", isDev);

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
    console.log("🔧 Loading URL:", url);
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
  console.log("🚀 TigerBeetle Studio starting...");

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
    console.log("📁 Closing local database...");
    localDb.close();
  }
});
