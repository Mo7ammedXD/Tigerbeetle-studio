# TigerBeetle Studio

A desktop GUI for managing and visualizing [TigerBeetle](https://tigerbeetle.com) databases.
Built with Electron, Vue 3 and Vuetify.

> **Status:** early (`0.1.0`). The feature set below is what actually ships today;
> known gaps are listed explicitly in [Not implemented yet](#not-implemented-yet).

---

## Getting started

### Prerequisites

- **Node.js 18+** and npm
- A **running TigerBeetle cluster** you can reach (the app is a client; it does
  not start or embed a server). `docker compose` brings one up — see
  [Local cluster](#local-cluster).
- Native modules (`better-sqlite3`, `tigerbeetle-node`) are rebuilt against
  Electron on install, so you need a working C/C++ toolchain:
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Windows: Visual Studio Build Tools ("Desktop development with C++")
  - Linux: `build-essential` and `python3`

### Install

```bash
git clone <your-fork-url>
cd Tigerbeetle-studio
npm install          # runs electron-rebuild for the native modules
```

### Local cluster

```bash
npm run db:up      # format on first run, then start TigerBeetle on :3000
npm run seed       # load a demo dataset
npm run db:logs    # follow the cluster log
npm run db:down    # stop, keeping the data
npm run db:reset   # stop and delete the data file
```

The compose file runs a single replica with `--development`, and relaxes seccomp
because TigerBeetle needs `io_uring`, which Docker's default profile blocks.

`npm run seed` writes 130 accounts and 420 transfers shaped to exercise the
awkward parts: three ledgers with 2, 0 and 8 decimal places, accounts carrying
real constraint flags, an account left with a negative balance, linked chains
(one deliberately rejected), and pending transfers in every state — open,
posted, partially posted, voided and expired.

### Run in development

```bash
npm run electron:dev
```

This starts Vite on port 5173 and launches Electron against it with DevTools
open. **Set `VITE_DEV_SERVER_PORT` if 5173 is already taken** — the app loads
whatever is serving on that port, so another project's dev server will be
displayed instead of this one, with no error.

### Type-check and build

```bash
npm run build:check   # vue-tsc, then vite build, then electron-builder
npm run build         # skips the type-check
```

Installers are written to `release/`: `.dmg` (macOS), NSIS `.exe` (Windows),
`AppImage` (Linux). Builds are unsigned — see
[Not implemented yet](#not-implemented-yet).

### Connect to a cluster

Launch the app and click **Connect**, then supply:

- **Cluster ID** — e.g. `0`
- **Replica addresses** — e.g. `3000` or `127.0.0.1:3000`, one entry per replica

The connection is stored locally in SQLite under Electron's `userData`
directory and restored on next launch.

---

## Architecture

```
Vue renderer  ──window.tigerBeetleApi──▶  preload (contextBridge)
                                              │  ipcRenderer.invoke
                                              ▼
                                        Electron main
                                              ├──▶ tigerbeetle-node client
                                              └──▶ better-sqlite3 (local sidecar)
```

TigerBeetle stores no names, so the SQLite sidecar holds **aliases and
connection config only**. It is a local convenience cache, never a source of
financial truth. Deleting an account in the UI removes only its local alias —
TigerBeetle is immutable and the account itself remains.

Key paths:

| Path | Role |
| --- | --- |
| `electron/main.ts` | IPC handlers, TigerBeetle client, SQLite sidecar |
| `electron/preload.ts` | The contextBridge API surface (built to `preload.cjs`) |
| `src/types/window.d.ts` | The renderer-facing contract for that API |
| `src/components/` | One Vue SFC per view |
| `src/services/` | Backup, export, import, validation, crypto |
| `src/utils/bigint.ts` | 128-bit amount/ID formatting and parsing |

`electron/preload.ts` and `src/types/window.d.ts` must be kept in step by hand —
there is no code generation between them. Run `npm run check:ipc` to verify.

The preload is built as CommonJS (`preload.cjs`). Electron only accepts
CommonJS preload scripts, and `"type": "module"` would otherwise make the
bundle ESM, which Electron rejects with *"Cannot use import statement outside a
module"* — leaving `window.tigerBeetleApi` undefined at runtime. The main
process bundle stays ESM, which Electron 28 supports.

---

## Features

### Dashboard
Summary counters, top accounts by balance, per-ledger breakdown and recent
activity. Counters reflect the **page that was fetched**, not a grand total —
TigerBeetle has no cheap `COUNT(*)`.

### Accounts
Cursor-paginated table with expandable rows (pending amounts, user data,
timestamp). Filter by ledger, code and date range. Create accounts with
validation on the 128-bit ID, ledger and code ranges, and with account flags —
overdraft protection (`debits_must_not_exceed_credits`), its liability-side
counterpart, and `history`.

Every row opens a **statement**: the account's transfers in time order with a
running balance derived backwards from the current posted balance, plus a
**balance-over-time** chart for accounts created with the `history` flag.

The chart covers a selectable period — 24h, 7d, 30d, 90d, all, or a custom date
range — and reports the opening balance, closing balance and change across it.
An account with more balance changes than fit in one request shows the most
recent window and says so, since "opening" is then the start of what is shown
rather than of the period.

### Transfers
Same table and filter model as Accounts. Create single transfers with amount
parsing that respects the ledger's configured decimal places, and with transfer
flags — `pending` (with timeout), balancing and closing.

**Multi-leg** composes several transfers into one linked chain that succeeds or
fails atomically — a payment and its fee, for instance.

### Bulk Operations
CSV/JSON preview and batch creation of accounts and transfers, with a dry-run
mode. Rows are submitted in real batches rather than one call per record.

TigerBeetle caps a request by *message size*, not item count. The commonly
quoted 8,189 assumes a 1MiB message body; a default cluster uses 32KiB, which
holds **253** items of 128 bytes. Exceeding it fails with *"Too much data
provided on this batch"*, so the app starts at 253 and halves on rejection.
Set `TB_BATCH_LIMIT` if your cluster is tuned for larger messages.

### Pending (two-phase transfers)
Lists pending transfers with their status — open, posted, voided or expired —
and resolves them. Posting supports a partial amount, which voids the
remainder. Statuses are derived by scanning recent transfers for the post or
void that references each reservation.

### Query
Runs server-side against TigerBeetle's query API, filtering on ledger, code,
timestamp range and the `user_data` fields, so only matching rows come back.
The `user_data` fields can be named locally — turning "user_data_128 = 4417"
into "Order = 4417" — and results export to JSON.

### Trial Balance
Scans every account and verifies that posted debits equal posted credits on
each ledger, then reports accounts violating their own constraints: an
overdrawn `debits_must_not_exceed_credits` account, or a closed account with a
residual balance.

### Backup & Export
- Export to JSON, CSV or SQL
- Full backups with **AES-256-GCM** encryption (PBKDF2-SHA256, 100k iterations)
- Import/restore with validation, dry-run and duplicate detection
- Backup history (metadata only — the file itself is saved where you chose it)

### Charts & Flow Visualizer
Chart.js views for balance distribution and transfer activity, plus a canvas
node graph of money movement between accounts with pan, zoom and selection.

### Ledgers & currencies
Per-ledger currency with 12 presets — LYD, EGP, TND, SAR, AED, USD, EUR, GBP,
JPY, BTC, ETH and a custom option — supporting 0–18 decimal places. All amounts
are handled as `BigInt` end to end; formatting is decimal-aware, so a JPY
(0-decimal) ledger and a BTC (8-decimal) ledger both render correctly.

### Cluster Manager
Save multiple cluster profiles locally and switch between them. Each profile
carries an environment; connecting to one marked **Production** shows a
standing banner and requires typing the cluster name before any write.

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + 1` | Dashboard |
| `Ctrl/Cmd + 2` | Accounts |
| `Ctrl/Cmd + 3` | Transfers |
| `Ctrl/Cmd + R` | Refresh connection status |
| `Ctrl/Cmd + F` | Advanced Search |
| `Ctrl/Cmd + E` | Backup & Export |
| `Ctrl/Cmd + D` | Toggle dark mode |
| `Ctrl/Cmd + K` or `/` | Show shortcuts |

Shortcuts are suppressed while you are typing in a field.

---

## Not implemented yet

Called out so the feature list above stays honest:

- **`get_change_events` (CDC)** — not wired
- **Imported events** — user-supplied timestamps are not supported
- **Auto-refresh / live updates** — only a 10s connection health check; tables
  refresh on demand
- **Auto-reconnect** on connection loss
- **Server-side sorting** — column sort reorders the current page only
- **Shared configuration** — aliases live in a local SQLite file and ledger,
  currency and field-label settings live in `localStorage`, so they are
  per-machine and not shared between teammates
- **Code signing, notarization and auto-update** — installers are unsigned
- **Tests and CI** — there is no test suite yet

Disconnecting drops the client reference without calling `client.destroy()`.
Pending-transfer status is derived from a scan of recent transfers, so a
reservation resolved outside that window shows as open.

## Contributing

Type-check and verify the IPC surface before opening a PR:

```bash
npx vue-tsc --noEmit
npm run check:ipc
```

`check:ipc` guards the hand-maintained contract between `electron/main.ts`,
`electron/preload.ts` and `src/types/window.d.ts`. A drift between those three
is what silently disabled pagination and filtering once already.

`tsconfig.json` runs with `strict`, `noUnusedLocals` and `noUnusedParameters`
enabled, and the tree is currently clean — please keep it that way.

## License

[MIT](LICENSE)
