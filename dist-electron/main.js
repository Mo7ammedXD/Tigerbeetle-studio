import X from "better-sqlite3";
import { app as h, BrowserWindow as U, ipcMain as l } from "electron";
import O from "fs";
import E from "path";
import { createClient as P, id as M } from "tigerbeetle-node";
import { fileURLToPath as q } from "url";
const G = q(import.meta.url), C = E.dirname(G);
let w = null, c = null;
const v = 8189;
let i = null;
const D = !h.isPackaged;
function j() {
  try {
    const t = h.getPath("userData"), e = E.join(t, "tigerbeetle-studio.db");
    i = new X(e), i.exec(`
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
    `), W();
  } catch {
    i = null;
  }
}
function W() {
  if (i)
    try {
      const e = i.pragma("table_info(accounts)").map((o) => o.name), n = [
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
      for (const o of n)
        e.includes(o.name) || i.exec(o.sql);
      const r = i.pragma("table_info(transfers)").map((o) => o.name), d = [
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
      for (const o of d)
        r.includes(o.name) || i.exec(o.sql);
    } catch {
    }
}
async function k(t) {
  try {
    if (c && (c = null), c = P({
      cluster_id: BigInt(t.cluster_id),
      replica_addresses: t.replica_addresses
    }), i)
      i.prepare(`
        INSERT OR REPLACE INTO connection_config (id, cluster_id, replica_addresses, updated_at)
        VALUES (1, ?, ?, strftime('%s', 'now'))
      `).run(t.cluster_id, JSON.stringify(t.replica_addresses));
    else
      try {
        const e = E.join(
          h.getPath("userData"),
          "connection.json"
        );
        O.writeFileSync(e, JSON.stringify(t, null, 2));
      } catch {
      }
    return { success: !0 };
  } catch (e) {
    throw new Error(`Connection failed: ${e.message}`);
  }
}
function J() {
  if (!i) {
    try {
      const t = E.join(h.getPath("userData"), "connection.json");
      if (O.existsSync(t))
        return JSON.parse(O.readFileSync(t, "utf-8"));
    } catch {
    }
    return null;
  }
  try {
    const e = i.prepare(
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
function p(t, e = 0n) {
  if (!t) return e;
  try {
    return BigInt(t);
  } catch {
    return e;
  }
}
function x(t) {
  const e = [];
  return t & 1 && e.push("linked"), t & 2 && e.push("debits_must_not_exceed_credits"), t & 4 && e.push("credits_must_not_exceed_debits"), t & 8 && e.push("history"), e;
}
function $(t) {
  const e = [];
  return t & 1 && e.push("linked"), t & 2 && e.push("pending"), t & 4 && e.push("post_pending_transfer"), t & 8 && e.push("void_pending_transfer"), t & 16 && e.push("balancing_debit"), t & 32 && e.push("balancing_credit"), e;
}
async function H(t) {
  if (!c)
    throw new Error("Not connected to TigerBeetle");
  try {
    const e = t.id ? p(t.id) : M(), n = {
      id: e,
      debits_pending: 0n,
      debits_posted: 0n,
      credits_pending: 0n,
      credits_posted: 0n,
      user_data_128: p(t.user_data_128),
      user_data_64: p(t.user_data_64),
      user_data_32: t.user_data_32 || 0,
      reserved: 0,
      ledger: t.ledger,
      code: t.code,
      flags: t.flags || 0,
      timestamp: 0n
    }, s = await c.createAccounts([n]);
    if (s.length > 0)
      throw new Error(`Failed to create account: ${JSON.stringify(s[0])}`);
    if (i)
      try {
        i.prepare(`
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
        );
      } catch {
      }
    return {
      success: !0,
      data: { id: e.toString() }
    };
  } catch (e) {
    throw e;
  }
}
async function V(t = 100, e, n, s = !1, r = 0n, d = 0n) {
  if (!c)
    throw new Error("Not connected to TigerBeetle");
  try {
    const o = {
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      ledger: e || 0,
      code: n || 0,
      timestamp_min: r,
      timestamp_max: d,
      limit: t,
      flags: s ? 1 : 0,
      reserved: new Uint8Array(6)
    };
    return await c.queryAccounts(o);
  } catch (o) {
    throw o;
  }
}
async function Y(t = 100, e, n, s = !0, r = 0n, d = 0n) {
  if (!c)
    throw new Error("Not connected to TigerBeetle");
  try {
    const o = {
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      ledger: e || 0,
      code: n || 0,
      timestamp_min: r,
      timestamp_max: d,
      limit: t,
      flags: s ? 1 : 0,
      reserved: new Uint8Array(6)
    };
    return await c.queryTransfers(o);
  } catch (o) {
    throw o;
  }
}
async function z(t = 50, e = null, n = "next", s) {
  if (!c)
    throw new Error("Not connected to TigerBeetle");
  try {
    const r = Math.min(t + 1, v);
    let d = 0n, o = 0n;
    const m = n === "prev";
    if (e) {
      const a = BigInt(e);
      n === "next" ? o = a - 1n : d = a + 1n;
    }
    s != null && s.timestamp_min && (d = BigInt(s.timestamp_min)), s != null && s.timestamp_max && (o = BigInt(s.timestamp_max));
    const g = await V(
      r,
      (s == null ? void 0 : s.ledger) || 0,
      s == null ? void 0 : s.code,
      !m,
      d,
      o
    ), u = g.length > t, y = e !== null, _ = (u ? g.slice(0, -1) : g).map((a) => {
      const N = a.debits_posted.toString(), f = a.credits_posted.toString(), L = (a.credits_posted - a.debits_posted).toString();
      let S = `Account ${a.id.toString().slice(0, 8)}...`;
      if (i)
        try {
          const T = i.prepare(
            "SELECT alias FROM accounts WHERE id = ?"
          ).get(a.id.toString());
          T && (S = T.alias);
        } catch {
        }
      return {
        id: a.id.toString(),
        alias: S,
        ledger: a.ledger,
        code: a.code,
        debits_posted: N,
        credits_posted: f,
        debits_pending: a.debits_pending.toString(),
        credits_pending: a.credits_pending.toString(),
        balance: L,
        user_data_128: a.user_data_128.toString(),
        user_data_64: a.user_data_64.toString(),
        user_data_32: a.user_data_32,
        timestamp: a.timestamp.toString(),
        flags: x(a.flags || 0),
        exists: !0
      };
    }), R = u && _.length > 0 ? _[_.length - 1].timestamp : null, B = y && _.length > 0 ? _[0].timestamp : null;
    return {
      data: _,
      nextCursor: R,
      prevCursor: B,
      hasMore: u,
      hasPrevious: y,
      count: _.length
    };
  } catch (r) {
    throw r;
  }
}
async function K(t) {
  if (!i)
    throw new Error("Local database not initialized");
  try {
    return i.prepare("DELETE FROM accounts WHERE id = ?").run(t), { success: !0 };
  } catch (e) {
    throw e;
  }
}
async function Z(t) {
  if (!i)
    throw new Error("Local database not initialized");
  if (!c)
    throw new Error("Not connected to TigerBeetle");
  try {
    const n = (await import("fs")).readFileSync(t, "utf-8"), s = JSON.parse(n);
    if (!s.accounts || !Array.isArray(s.accounts))
      throw new Error("Invalid JSON format");
    let r = 0;
    const d = i.prepare(`
      INSERT OR REPLACE INTO accounts (id, alias, ledger, code, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `);
    for (const o of s.accounts)
      d.run(o.id, o.name, 1, o.code), r++;
    return { success: !0, imported: r };
  } catch (e) {
    throw e;
  }
}
async function Q(t) {
  if (!c)
    throw new Error("Not connected to TigerBeetle");
  try {
    const e = t.map((r) => BigInt(r));
    return (await c.lookupAccounts(e)).map((r) => {
      const d = r.debits_posted.toString(), o = r.credits_posted.toString(), m = (r.credits_posted - r.debits_posted).toString();
      return {
        id: r.id.toString(),
        alias: `Account ${r.id.toString().slice(0, 8)}...`,
        ledger: r.ledger,
        code: r.code,
        debits_posted: d,
        credits_posted: o,
        debits_pending: r.debits_pending.toString(),
        credits_pending: r.credits_pending.toString(),
        balance: m,
        user_data_128: r.user_data_128.toString(),
        user_data_64: r.user_data_64.toString(),
        user_data_32: r.user_data_32,
        timestamp: r.timestamp.toString(),
        flags: x(r.flags || 0),
        exists: !0
      };
    });
  } catch (e) {
    throw e;
  }
}
async function b(t) {
  if (!c)
    throw new Error("Not connected to TigerBeetle");
  try {
    const e = t.map((r) => BigInt(r));
    return (await c.lookupTransfers(e)).map((r) => ({
      id: r.id.toString(),
      debit_account_id: r.debit_account_id.toString(),
      credit_account_id: r.credit_account_id.toString(),
      amount: r.amount.toString(),
      pending_id: r.pending_id.toString(),
      user_data_128: r.user_data_128.toString(),
      user_data_64: r.user_data_64.toString(),
      user_data_32: r.user_data_32,
      timeout: r.timeout,
      ledger: r.ledger,
      code: r.code,
      flags: r.flags,
      timestamp: r.timestamp.toString()
    }));
  } catch (e) {
    throw e;
  }
}
async function tt(t, e = 100) {
  if (!c)
    throw new Error("Not connected to TigerBeetle");
  try {
    const n = {
      account_id: BigInt(t),
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      code: 0,
      timestamp_min: 0n,
      timestamp_max: 0n,
      limit: Math.min(e, v),
      // AccountFilterFlags: debits(1) | credits(2) | reversed(4)
      // Both sides of the account, newest first.
      flags: 7
    };
    return (await c.getAccountTransfers(n)).map((r) => ({
      id: r.id.toString(),
      debit_account_id: r.debit_account_id.toString(),
      credit_account_id: r.credit_account_id.toString(),
      amount: r.amount.toString(),
      pending_id: r.pending_id.toString(),
      user_data_128: r.user_data_128.toString(),
      user_data_64: r.user_data_64.toString(),
      user_data_32: r.user_data_32,
      timeout: r.timeout,
      ledger: r.ledger,
      code: r.code,
      flags: r.flags,
      timestamp: r.timestamp.toString()
    }));
  } catch (n) {
    throw n;
  }
}
async function et(t) {
  if (!c)
    throw new Error("Not connected to TigerBeetle");
  try {
    const e = {
      user_data_128: t.user_data_128 ? BigInt(t.user_data_128) : 0n,
      user_data_64: t.user_data_64 ? BigInt(t.user_data_64) : 0n,
      user_data_32: t.user_data_32 || 0,
      ledger: t.ledger || 0,
      code: t.code || 0,
      timestamp_min: t.timestamp_min ? BigInt(t.timestamp_min) : 0n,
      timestamp_max: t.timestamp_max ? BigInt(t.timestamp_max) : 0n,
      limit: Math.min(t.limit || 8189, 8189),
      flags: t.reversed ? 1 : 0,
      reserved: new Uint8Array(6)
    };
    return (await c.queryAccounts(e)).map((r) => {
      const d = r.debits_posted.toString(), o = r.credits_posted.toString(), m = (r.credits_posted - r.debits_posted).toString();
      return {
        id: r.id.toString(),
        alias: `Account ${r.id.toString().slice(0, 8)}...`,
        ledger: r.ledger,
        code: r.code,
        debits_posted: d,
        credits_posted: o,
        debits_pending: r.debits_pending.toString(),
        credits_pending: r.credits_pending.toString(),
        balance: m,
        user_data_128: r.user_data_128.toString(),
        user_data_64: r.user_data_64.toString(),
        user_data_32: r.user_data_32,
        timestamp: r.timestamp.toString(),
        flags: x(r.flags || 0),
        exists: !0
      };
    });
  } catch (e) {
    throw e;
  }
}
async function rt(t) {
  if (!c)
    throw new Error("Not connected to TigerBeetle");
  try {
    const e = {
      user_data_128: t.user_data_128 ? BigInt(t.user_data_128) : 0n,
      user_data_64: t.user_data_64 ? BigInt(t.user_data_64) : 0n,
      user_data_32: t.user_data_32 || 0,
      ledger: t.ledger || 0,
      code: t.code || 0,
      timestamp_min: t.timestamp_min ? BigInt(t.timestamp_min) : 0n,
      timestamp_max: t.timestamp_max ? BigInt(t.timestamp_max) : 0n,
      limit: Math.min(t.limit || 8189, 8189),
      flags: t.reversed ? 1 : 0,
      reserved: new Uint8Array(6)
    };
    return (await c.queryTransfers(e)).map((r) => ({
      id: r.id.toString(),
      debit_account_id: r.debit_account_id.toString(),
      credit_account_id: r.credit_account_id.toString(),
      amount: r.amount.toString(),
      pending_id: r.pending_id.toString(),
      user_data_128: r.user_data_128.toString(),
      user_data_64: r.user_data_64.toString(),
      user_data_32: r.user_data_32,
      timeout: r.timeout,
      ledger: r.ledger,
      code: r.code,
      flags: r.flags,
      timestamp: r.timestamp.toString()
    }));
  } catch (e) {
    throw e;
  }
}
async function nt(t) {
  if (!c)
    throw new Error("Not connected to TigerBeetle");
  try {
    const e = t.id ? p(t.id) : M(), n = {
      id: e,
      debit_account_id: p(t.debit_account_id),
      credit_account_id: p(t.credit_account_id),
      amount: p(t.amount),
      pending_id: 0n,
      user_data_128: p(t.user_data_128),
      user_data_64: p(t.user_data_64),
      user_data_32: t.user_data_32 || 0,
      timeout: 0,
      ledger: t.ledger,
      code: t.code,
      flags: t.flags || 0,
      timestamp: 0n
    }, s = await c.createTransfers([n]);
    if (s.length > 0)
      throw new Error(
        `Failed to create transfer: ${JSON.stringify(s[0])}`
      );
    if (i)
      try {
        i.prepare(`
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
        );
      } catch {
      }
    return {
      success: !0,
      data: { id: e.toString() }
    };
  } catch (e) {
    throw e;
  }
}
async function st(t = 50, e = null, n = "next", s) {
  if (!c)
    throw new Error("Not connected to TigerBeetle");
  try {
    const r = Math.min(t + 1, v);
    let d = 0n, o = 0n;
    const m = n === "next";
    if (e) {
      const a = BigInt(e);
      n === "next" ? o = a - 1n : d = a + 1n;
    }
    s != null && s.timestamp_min && (d = BigInt(s.timestamp_min)), s != null && s.timestamp_max && (o = BigInt(s.timestamp_max));
    const g = await Y(
      r,
      (s == null ? void 0 : s.ledger) || 0,
      s == null ? void 0 : s.code,
      m,
      d,
      o
    ), u = g.length > t, y = e !== null, _ = (u ? g.slice(0, -1) : g).map((a) => {
      var L;
      let N = a.debit_account_id.toString(), f = a.credit_account_id.toString();
      if (i)
        try {
          const S = i.prepare(
            "SELECT alias FROM accounts WHERE id = ?"
          ), I = S.get(
            a.debit_account_id.toString()
          ), T = S.get(
            a.credit_account_id.toString()
          );
          I && (N = I.alias), T && (f = T.alias);
        } catch {
        }
      return {
        id: a.id.toString(),
        debit_account_id: a.debit_account_id.toString(),
        credit_account_id: a.credit_account_id.toString(),
        debit_alias: N,
        credit_alias: f,
        amount: a.amount.toString(),
        ledger: a.ledger,
        code: a.code,
        flags: $(a.flags || 0),
        pending_id: ((L = a.pending_id) == null ? void 0 : L.toString()) || "0",
        timeout: a.timeout || 0,
        timestamp: a.timestamp.toString(),
        user_data_128: a.user_data_128.toString(),
        user_data_64: a.user_data_64.toString(),
        user_data_32: a.user_data_32,
        exists: !0
      };
    }), R = u && _.length > 0 ? _[_.length - 1].timestamp : null, B = y && _.length > 0 ? _[0].timestamp : null;
    return {
      data: _,
      nextCursor: R,
      prevCursor: B,
      hasMore: u,
      hasPrevious: y,
      count: _.length
    };
  } catch (r) {
    throw r;
  }
}
function at() {
  l.handle("connect", async (t, e) => {
    try {
      return await k(e), { success: !0 };
    } catch (n) {
      return { success: !1, error: n.message };
    }
  }), l.handle("get-connection-config", async () => J()), l.handle("disconnect", async () => c ? (c = null, { success: !0 }) : { success: !1, error: "Not connected" }), l.handle("is-connected", async () => ({ connected: c !== null })), l.handle("create-account", async (t, e) => {
    try {
      return await H(e);
    } catch (n) {
      return { success: !1, error: n.message };
    }
  }), l.handle(
    "get-accounts",
    async (t, e, n, s, r) => {
      try {
        const u = await z(
          e ?? 50,
          n === void 0 ? null : n,
          s ?? "next",
          r ?? void 0
        );
        return {
          success: !0,
          data: {
            data: u.data,
            nextCursor: u.nextCursor,
            prevCursor: u.prevCursor,
            hasMore: u.hasMore,
            hasPrevious: u.hasPrevious,
            count: u.count
          }
        };
      } catch (d) {
        return { success: !1, error: d.message };
      }
    }
  ), l.handle("delete-account", async (t, e) => {
    try {
      return await K(e);
    } catch (n) {
      return { success: !1, error: n.message };
    }
  }), l.handle(
    "import-accounts-from-json",
    async (t, e) => {
      try {
        return await Z(e);
      } catch (n) {
        return { success: !1, error: n.message };
      }
    }
  ), l.handle("lookup-accounts-by-ids", async (t, e) => {
    try {
      return { success: !0, data: await Q(e) };
    } catch (n) {
      return { success: !1, error: n.message };
    }
  }), l.handle("lookup-transfers-by-ids", async (t, e) => {
    try {
      return { success: !0, data: await b(e) };
    } catch (n) {
      return { success: !1, error: n.message };
    }
  }), l.handle(
    "get-account-transfers",
    async (t, e, n) => {
      try {
        return { success: !0, data: await tt(e, n ?? 100) };
      } catch (s) {
        return { success: !1, error: s.message };
      }
    }
  ), l.handle("query-accounts", async (t, e) => {
    try {
      return { success: !0, data: await et(e) };
    } catch (n) {
      return { success: !1, error: n.message };
    }
  }), l.handle("query-transfers", async (t, e) => {
    try {
      return { success: !0, data: await rt(e) };
    } catch (n) {
      return { success: !1, error: n.message };
    }
  }), l.handle("create-transfer", async (t, e) => {
    try {
      return await nt(e);
    } catch (n) {
      return { success: !1, error: n.message };
    }
  }), l.handle(
    "get-transfers",
    async (t, e, n, s, r) => {
      try {
        const u = await st(
          e ?? 50,
          n === void 0 ? null : n,
          s ?? "next",
          r ?? void 0
        );
        return {
          success: !0,
          data: {
            data: u.data,
            nextCursor: u.nextCursor,
            prevCursor: u.prevCursor,
            hasMore: u.hasMore,
            hasPrevious: u.hasPrevious,
            count: u.count
          }
        };
      } catch (d) {
        return { success: !1, error: d.message };
      }
    }
  );
}
function F() {
  const t = D ? E.join(C, "preload.js") : E.join(C, "preload.js");
  if (w = new U({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: t,
      nodeIntegration: !1,
      contextIsolation: !0
    },
    title: "TigerBeetle Studio"
  }), D) {
    const n = `http://localhost:${process.env.VITE_DEV_SERVER_PORT || "5173"}`;
    w.loadURL(n), w.webContents.openDevTools();
  } else
    w.loadFile(E.join(C, "../dist/index.html"));
  w.on("closed", () => {
    w = null;
  });
}
h.whenReady().then(() => {
  j(), at(), F(), h.on("activate", () => {
    U.getAllWindows().length === 0 && F();
  });
});
h.on("window-all-closed", () => {
  process.platform !== "darwin" && (i && i.close(), h.quit());
});
h.on("before-quit", () => {
  i && i.close();
});
