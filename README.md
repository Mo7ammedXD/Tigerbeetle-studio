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
  not start or embed a server)
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

### Run in development

```bash
npm run electron:dev
```

This starts Vite on port 5173 and launches Electron against it with DevTools
open. Override the port with `VITE_DEV_SERVER_PORT` if 5173 is taken.

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
| `electron/preload.ts` | The contextBridge API surface (the file vite builds) |
| `src/types/window.d.ts` | The renderer-facing contract for that API |
| `src/components/` | One Vue SFC per view |
| `src/services/` | Backup, export, import, validation, crypto |
| `src/utils/bigint.ts` | 128-bit amount/ID formatting and parsing |

`electron/preload.ts` and `src/types/window.d.ts` must be kept in step by hand —
there is no code generation between them.

---

## Features

### Dashboard
Summary counters, top accounts by balance, per-ledger breakdown and recent
activity. Counters reflect the **page that was fetched**, not a grand total —
TigerBeetle has no cheap `COUNT(*)`.

### Accounts
Cursor-paginated table with expandable rows (pending amounts, user data,
timestamp). Filter by ledger, code and date range. Create accounts with
validation on the 128-bit ID, ledger and code ranges.

### Transfers
Same table and filter model as Accounts. Create single transfers with amount
parsing that respects the ledger's configured decimal places.

### Bulk Operations
CSV/JSON preview and batch creation of accounts and transfers, with a dry-run
mode.

### Advanced Search
Client-side search across fetched accounts and transfers, with case-sensitive
and regex options plus a saved search history. Results are capped by
TigerBeetle's 8,189-item batch limit.

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
Save multiple cluster profiles locally and switch between them.

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

- **Two-phase transfers** — `pending_id` and `timeout` are hardcoded to zero;
  there is no post/void UI
- **Linked transfer chains** — the template checkbox is metadata only; no
  `flags` are sent
- **`get_account_balances`** and **change events (CDC)** — not wired
- **Imported events** — user-supplied timestamps are not supported
- **Batching** — creates submit one item per call rather than filling a batch
- **Auto-refresh / live updates** — only a 10s connection health check; tables
  refresh on demand
- **Auto-reconnect** on connection loss
- **Server-side sorting** — column sort reorders the current page only
- **Code signing, notarization and auto-update** — installers are unsigned
- **Tests and CI** — there is no test suite yet

Disconnecting drops the client reference without calling `client.destroy()`.

---

## Contributing

Type-check before opening a PR:

```bash
npx vue-tsc --noEmit
```

`tsconfig.json` runs with `strict`, `noUnusedLocals` and `noUnusedParameters`
enabled, and the tree is currently clean — please keep it that way.

## License

[MIT](LICENSE)
