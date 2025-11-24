# 🐯 TigerBeetle Studio - Complete Documentation

**Comprehensive README for the open-source TigerBeetle Studio project**

See the main [README.md](./README.md) for quick start guide.

---

## 💰 Currency System

TigerBeetle Studio features a sophisticated multi-currency system that supports international and regional currencies.

### Supported Currencies

#### **Arabic Currencies** (5)

- 🇱🇾 **LYD** - دينار ليبي (Libyan Dinar) - Symbol: ل.د - Decimals: 3
- 🇪🇬 **EGP** - جنيه مصري (Egyptian Pound) - Symbol: ج.م - Decimals: 2
- 🇹🇳 **TND** - دينار تونسي (Tunisian Dinar) - Symbol: د.ت - Decimals: 3
- 🇸🇦 **SAR** - ريال سعودي (Saudi Riyal) - Symbol: ر.س - Decimals: 2
- 🇦🇪 **AED** - درهم إماراتي (UAE Dirham) - Symbol: د.إ - Decimals: 2

#### **International Currencies** (6)

- 🇺🇸 **USD** - US Dollar - Symbol: $ - Decimals: 2
- 🇪🇺 **EUR** - Euro - Symbol: € - Decimals: 2
- 🇬🇧 **GBP** - British Pound - Symbol: £ - Decimals: 2
- 🇯🇵 **JPY** - Japanese Yen - Symbol: ¥ - Decimals: 0

#### **Cryptocurrencies** (2)

- ₿ **BTC** - Bitcoin - Decimals: 8
- Ξ **ETH** - Ethereum - Decimals: 18

#### **Custom Currency**

- 💱 Create any custom currency with your own symbol, decimals, and name

### How Currency Works

1. **Per-Ledger Currency**: Each ledger can have its own currency
2. **Global Fallback**: Set a global default currency
3. **Real-Time Display**: All amounts automatically format in the correct currency
4. **BigInt-Safe**: Financial-grade precision with BigInt calculations
5. **Flexible Decimals**: Support for 0-18 decimal places

### Usage Example

```typescript
// Ledger 1: Libyan Dinar (3 decimals)
Amount: 1000000 (raw)
Display: ل.د 1,000.000

// Ledger 2: US Dollar (2 decimals)
Amount: 1000000 (raw)
Display: $10,000.00

// Ledger 3: Bitcoin (8 decimals)
Amount: 100000000 (raw)
Display: ₿1.00000000
```

---

## ⌨️ Keyboard Shortcuts

### Navigation

- `Cmd/Ctrl + 1` - Dashboard
- `Cmd/Ctrl + 2` - Accounts
- `Cmd/Ctrl + 3` - Transfers
- `Cmd/Ctrl + 4` - Query Builder
- `Cmd/Ctrl + 5` - Account History

### Actions

- `Cmd/Ctrl + N` - New Account/Transfer
- `Cmd/Ctrl + R` - Refresh Data
- `Cmd/Ctrl + F` - Search/Find
- `Cmd/Ctrl + E` - Export Data
- `Cmd/Ctrl + ,` - Settings

### Views

- `Cmd/Ctrl + D` - Toggle Dark Mode
- `Cmd/Ctrl + K` - Show Keyboard Shortcuts
- `Cmd/Ctrl + B` - Toggle Sidebar

---

## 📦 Installation

### Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **TigerBeetle**: Latest version

### Install Dependencies

```bash
# Clone the repository
git clone https://github.com/yourusername/tigerbeetle-studio.git
cd tigerbeetle-studio

# Install dependencies
npm install

# Rebuild native modules for Electron
npm run postinstall
```

---

## 🚀 Quick Start

### 1. Start TigerBeetle Server

```bash
# Download TigerBeetle (macOS ARM64)
curl -LO https://github.com/tigerbeetle/tigerbeetle/releases/latest/download/tigerbeetle-macos-aarch64.zip
unzip tigerbeetle-macos-aarch64.zip
chmod +x tigerbeetle

# Format the data file
./tigerbeetle format --cluster=0 --replica=0 0_0.tigerbeetle

# Start the server
./tigerbeetle start --addresses=3003 0_0.tigerbeetle
```

### 2. Start TigerBeetle Studio

```bash
# Development mode
npm run dev

# Or build and run
npm run build
npm start
```

### 3. Connect to TigerBeetle

1. Click "Connect" in the top bar
2. Enter Cluster ID: `0`
3. Enter Replica Address: `3003`
4. Click "Connect"

---

## 🛠️ Development

### Tech Stack

- **Frontend Framework**: Vue 3 (Composition API)
- **UI Library**: Vuetify 3
- **Desktop Framework**: Electron 28
- **Language**: TypeScript 5.3
- **Build Tool**: Vite 5
- **Database (Remote)**: TigerBeetle
- **Database (Local)**: SQLite (better-sqlite3)
- **Charts**: Chart.js 4
- **Icons**: Material Design Icons

### Project Structure

```
tigerbeetle-studio/
├── electron/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # IPC bridge
│   └── database.ts          # SQLite operations
├── src/
│   ├── components/          # Vue components
│   │   ├── AccountsView.vue
│   │   ├── TransfersView.vue
│   │   ├── Dashboard.vue
│   │   ├── QueryBuilder.vue
│   │   ├── AccountHistory.vue
│   │   ├── PendingTransfers.vue
│   │   ├── TransferTemplates.vue
│   │   ├── BulkOperations.vue
│   │   ├── BackupExport.vue
│   │   ├── AdvancedSearch.vue
│   │   ├── ClusterManager.vue
│   │   ├── LedgerConfig.vue
│   │   ├── DataVisualization.vue
│   │   ├── FlowVisualizer.vue
│   │   └── CodeGenerator.vue
│   ├── composables/         # Vue composables
│   │   ├── useCurrency.ts
│   │   └── useKeyboardShortcuts.ts
│   ├── types/               # TypeScript types
│   │   ├── tigerbeetle.ts
│   │   └── window.d.ts
│   ├── utils/               # Utility functions
│   │   └── bigint.ts
│   ├── plugins/             # Vue plugins
│   │   └── vuetify.ts
│   ├── stores/              # State management
│   │   └── config.ts
│   ├── App.vue              # Root component
│   └── main.ts              # Vue entry point
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

---

## 🏗️ Building

### Build for All Platforms

```bash
npm run electron:build
```

### Build for Specific Platform

```bash
# macOS
npm run electron:build -- --mac

# Windows
npm run electron:build -- --win

# Linux
npm run electron:build -- --linux
```

### Output

Built applications will be in the `release/` directory:

- **macOS**: `.dmg` installer
- **Windows**: `.exe` installer
- **Linux**: `.AppImage` package

---

## 🔧 Technical Details

### BigInt Handling

TigerBeetle uses 128-bit integers for IDs and amounts. JavaScript's `BigInt` handles this, but requires special serialization:

```typescript
// Main Process → Renderer
// Convert BigInt to String
const account = {
  id: "123456789012345678901234567890",
  balance: "1000000",
};

// Renderer → Main Process
// Convert String back to BigInt
const accountId = BigInt("123456789012345678901234567890");
```

### Currency Formatting

```typescript
import { formatTBAmount } from "@/utils/bigint";
import { useCurrency } from "@/composables/useCurrency";

const { getCurrencyForLedger } = useCurrency();

// Format amount with ledger currency
const currency = getCurrencyForLedger(ledgerId);
const formatted = formatTBAmount(amount, currency);
// Result: "ل.د 1,000.000" for LYD
```

### Sidecar Database Schema

```sql
-- Accounts Table
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  alias TEXT NOT NULL,
  ledger INTEGER NOT NULL,
  code INTEGER NOT NULL,
  user_data_128 TEXT,
  user_data_64 TEXT,
  user_data_32 INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transfers Table
CREATE TABLE transfers (
  id TEXT PRIMARY KEY,
  debit_account_id TEXT NOT NULL,
  credit_account_id TEXT NOT NULL,
  amount TEXT NOT NULL,
  ledger INTEGER NOT NULL,
  code INTEGER NOT NULL,
  user_data_128 TEXT,
  user_data_64 TEXT,
  user_data_32 INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ledger Configs Table
CREATE TABLE ledger_configs (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  currency_symbol TEXT NOT NULL,
  currency_decimals INTEGER NOT NULL,
  currency_name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Reporting Bugs

1. Check if the bug is already reported in [Issues](https://github.com/yourusername/tigerbeetle-studio/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Your environment (OS, Node version, etc.)

### Suggesting Features

1. Check [Discussions](https://github.com/yourusername/tigerbeetle-studio/discussions) for existing suggestions
2. Create a new discussion with:
   - Feature description
   - Use case
   - Mockups or examples (if applicable)

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Vue 3 Composition API
- Write meaningful commit messages
- Add JSDoc comments for functions
- Update documentation for new features
- Ensure all tests pass
- Follow the existing code style

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- [TigerBeetle](https://tigerbeetle.com/) - The amazing database this tool is built for
- [Vue.js](https://vuejs.org/) - The progressive JavaScript framework
- [Electron](https://www.electronjs.org/) - Build cross-platform desktop apps
- [Vuetify](https://vuetifyjs.com/) - Material Design component framework
- All our [contributors](https://github.com/yourusername/tigerbeetle-studio/graphs/contributors)

---

## 📞 Support

- **Documentation**: [Full Documentation](./docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/tigerbeetle-studio/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/tigerbeetle-studio/discussions)
- **Email**: support@tigerbeetle-studio.com

---

<div align="center">

**Built with ❤️ for the TigerBeetle community**

⭐ Star us on GitHub if you find this project useful!

</div>
