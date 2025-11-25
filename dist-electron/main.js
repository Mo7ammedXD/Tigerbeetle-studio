import A from "better-sqlite3";
import { app as l, BrowserWindow as R, ipcMain as d } from "electron";
import T from "path";
import { createClient as C, id as S } from "tigerbeetle-node";
import { fileURLToPath as y } from "url";
const D = y(import.meta.url), L = T.dirname(D);
let E = null, i = null, n = null;
const h = !l.isPackaged;
function U() {
  const t = l.getPath("userData"), e = T.join(t, "tigerbeetle-studio.db");
  n = new A(e), n.exec(`
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
  `), F();
}
function F() {
  if (n)
    try {
      const e = n.pragma("table_info(accounts)").map((c) => c.name), r = [
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
      for (const c of r)
        e.includes(c.name) || n.exec(c.sql);
      const _ = n.pragma("table_info(transfers)").map((c) => c.name), p = [
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
      for (const c of p)
        _.includes(c.name) || n.exec(c.sql);
    } catch {
    }
}
async function X(t) {
  try {
    return i && (i = null), i = C({
      cluster_id: BigInt(t.cluster_id),
      replica_addresses: t.replica_addresses
    }), n && n.prepare(`
        INSERT OR REPLACE INTO connection_config (id, cluster_id, replica_addresses, updated_at)
        VALUES (1, ?, ?, strftime('%s', 'now'))
      `).run(t.cluster_id, JSON.stringify(t.replica_addresses)), { success: !0 };
  } catch (e) {
    throw new Error(`Connection failed: ${e.message}`);
  }
}
function B() {
  if (!n) return null;
  try {
    const e = n.prepare(
      "SELECT cluster_id, replica_addresses FROM connection_config WHERE id = 1"
    ).get();
    if (e)
      return {
        cluster_id: e.cluster_id,
        replica_addresses: JSON.parse(e.replica_addresses)
      };
  } catch {
  }
  return null;
}
function u(t, e = 0n) {
  if (!t) return e;
  try {
    return BigInt(t);
  } catch {
    return e;
  }
}
function M(t) {
  const e = [];
  return t & 1 && e.push("linked"), t & 2 && e.push("debits_must_not_exceed_credits"), t & 4 && e.push("credits_must_not_exceed_debits"), t & 8 && e.push("history"), e;
}
function x(t) {
  const e = [];
  return t & 1 && e.push("linked"), t & 2 && e.push("pending"), t & 4 && e.push("post_pending_transfer"), t & 8 && e.push("void_pending_transfer"), t & 16 && e.push("balancing_debit"), t & 32 && e.push("balancing_credit"), e;
}
async function G(t) {
  if (!i)
    throw new Error("Not connected to TigerBeetle");
  if (!n)
    throw new Error("Local database not initialized");
  try {
    const e = t.id ? u(t.id) : S(), r = {
      id: e,
      debits_pending: 0n,
      debits_posted: 0n,
      credits_pending: 0n,
      credits_posted: 0n,
      user_data_128: u(t.user_data_128),
      user_data_64: u(t.user_data_64),
      user_data_32: t.user_data_32 || 0,
      reserved: 0,
      ledger: t.ledger,
      code: t.code,
      flags: t.flags || 0,
      timestamp: 0n
    }, o = await i.createAccounts([r]);
    if (o.length > 0)
      throw new Error(`Failed to create account: ${JSON.stringify(o[0])}`);
    return n.prepare(`
      INSERT INTO accounts (id, alias, ledger, code, user_data_128, user_data_64, user_data_32)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      e.toString(),
      t.alias,
      t.ledger,
      t.code,
      t.user_data_128 || null,
      t.user_data_64 || null,
      t.user_data_32 || null
    ), {
      success: !0,
      id: e.toString()
    };
  } catch (e) {
    throw e;
  }
}
async function P(t = 100, e = 0) {
  if (!i)
    throw new Error("Not connected to TigerBeetle");
  if (!n)
    throw new Error("Local database not initialized");
  try {
    const _ = n.prepare("SELECT COUNT(*) as total FROM accounts").get().total, c = n.prepare(
      "SELECT * FROM accounts ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).all(t, e);
    if (c.length === 0)
      return [];
    const g = c.map((s) => BigInt(s.id)), m = await i.lookupAccounts(g), N = new Map(
      m.map((s) => [s.id.toString(), s])
    );
    return {
      data: c.map((s) => {
        const a = N.get(s.id);
        if (!a)
          return {
            id: s.id,
            alias: s.alias,
            ledger: s.ledger,
            code: s.code,
            debits_posted: "0",
            credits_posted: "0",
            balance: "0",
            exists: !1
          };
        const f = a.debits_posted.toString(), O = a.credits_posted.toString(), b = (a.credits_posted - a.debits_posted).toString();
        return {
          id: s.id,
          alias: s.alias,
          ledger: s.ledger,
          code: s.code,
          debits_posted: f,
          credits_posted: O,
          debits_pending: a.debits_pending.toString(),
          credits_pending: a.credits_pending.toString(),
          balance: b,
          user_data_128: a.user_data_128.toString(),
          user_data_64: a.user_data_64.toString(),
          user_data_32: a.user_data_32,
          timestamp: a.timestamp.toString(),
          flags: M(a.flags || 0),
          exists: !0
        };
      }),
      total: _,
      limit: t,
      offset: e
    };
  } catch (r) {
    throw r;
  }
}
async function v(t) {
  if (!n)
    throw new Error("Local database not initialized");
  try {
    return n.prepare("DELETE FROM accounts WHERE id = ?").run(t), { success: !0 };
  } catch (e) {
    throw e;
  }
}
async function q(t) {
  if (!i)
    throw new Error("Not connected to TigerBeetle");
  if (!n)
    throw new Error("Local database not initialized");
  try {
    const e = t.id ? u(t.id) : S(), r = {
      id: e,
      debit_account_id: u(t.debit_account_id),
      credit_account_id: u(t.credit_account_id),
      amount: u(t.amount),
      pending_id: 0n,
      user_data_128: u(t.user_data_128),
      user_data_64: u(t.user_data_64),
      user_data_32: t.user_data_32 || 0,
      timeout: 0,
      ledger: t.ledger,
      code: t.code,
      flags: t.flags || 0,
      timestamp: 0n
    }, o = await i.createTransfers([r]);
    if (o.length > 0)
      throw new Error(
        `Failed to create transfer: ${JSON.stringify(o[0])}`
      );
    return n.prepare(`
      INSERT INTO transfers (id, debit_account_id, credit_account_id, amount, ledger, code, user_data_128, user_data_64, user_data_32)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      e.toString(),
      t.debit_account_id,
      t.credit_account_id,
      t.amount,
      t.ledger,
      t.code,
      t.user_data_128 || null,
      t.user_data_64 || null,
      t.user_data_32 || null
    ), {
      success: !0,
      id: e.toString()
    };
  } catch (e) {
    throw e;
  }
}
async function Y(t = 100, e = 0) {
  if (!i)
    throw new Error("Not connected to TigerBeetle");
  if (!n)
    throw new Error("Local database not initialized");
  try {
    const _ = n.prepare(
      "SELECT COUNT(*) as total FROM transfers"
    ).get().total, c = n.prepare(`
      SELECT 
        t.*,
        da.alias as debit_alias,
        ca.alias as credit_alias
      FROM transfers t
      LEFT JOIN accounts da ON t.debit_account_id = da.id
      LEFT JOIN accounts ca ON t.credit_account_id = ca.id
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(t, e);
    if (c.length === 0)
      return [];
    const g = c.map((s) => BigInt(s.id)), m = await i.lookupTransfers(g), N = new Map(
      m.map((s) => [s.id.toString(), s])
    );
    return {
      data: c.map((s) => {
        var f;
        const a = N.get(s.id);
        return a ? {
          id: s.id,
          debit_account_id: s.debit_account_id,
          credit_account_id: s.credit_account_id,
          debit_alias: s.debit_alias,
          credit_alias: s.credit_alias,
          amount: a.amount.toString(),
          ledger: a.ledger,
          code: a.code,
          flags: x(a.flags || 0),
          pending_id: ((f = a.pending_id) == null ? void 0 : f.toString()) || "0",
          timeout: a.timeout || 0,
          timestamp: a.timestamp.toString(),
          user_data_128: a.user_data_128.toString(),
          user_data_64: a.user_data_64.toString(),
          user_data_32: a.user_data_32,
          created_at: s.created_at,
          exists: !0
        } : {
          ...s,
          exists: !1
        };
      }),
      total: _,
      limit: t,
      offset: e
    };
  } catch (r) {
    throw r;
  }
}
function z() {
  d.handle("connect", async (t, e) => {
    try {
      return await X(e), { success: !0 };
    } catch (r) {
      return { success: !1, error: r.message };
    }
  }), d.handle("get-connection-config", async () => B()), d.handle("disconnect", async () => i ? (i = null, { success: !0 }) : { success: !1, error: "Not connected" }), d.handle("is-connected", async () => ({ connected: i !== null })), d.handle("create-account", async (t, e) => {
    try {
      return await G(e);
    } catch (r) {
      return { success: !1, error: r.message };
    }
  }), d.handle(
    "get-accounts",
    async (t, e, r) => {
      try {
        return { success: !0, data: await P(e, r) };
      } catch (o) {
        return { success: !1, error: o.message };
      }
    }
  ), d.handle("delete-account", async (t, e) => {
    try {
      return await v(e);
    } catch (r) {
      return { success: !1, error: r.message };
    }
  }), d.handle("create-transfer", async (t, e) => {
    try {
      return await q(e);
    } catch (r) {
      return { success: !1, error: r.message };
    }
  }), d.handle(
    "get-transfers",
    async (t, e, r) => {
      try {
        return { success: !0, data: await Y(e, r) };
      } catch (o) {
        return { success: !1, error: o.message };
      }
    }
  );
}
function w() {
  const t = h ? T.join(L, "preload.js") : T.join(L, "preload.js");
  if (E = new R({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: t,
      nodeIntegration: !1,
      contextIsolation: !0
    },
    title: "TigerBeetle Studio"
  }), h) {
    const r = `http://localhost:${process.env.VITE_DEV_SERVER_PORT || "5173"}`;
    E.loadURL(r), E.webContents.openDevTools();
  } else
    E.loadFile(T.join(L, "../dist/index.html"));
  E.on("closed", () => {
    E = null;
  });
}
l.whenReady().then(() => {
  U(), z(), w(), l.on("activate", () => {
    R.getAllWindows().length === 0 && w();
  });
});
l.on("window-all-closed", () => {
  process.platform !== "darwin" && (n && n.close(), l.quit());
});
l.on("before-quit", () => {
  n && n.close();
});
