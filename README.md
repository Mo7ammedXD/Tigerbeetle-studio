#  TigerBeetle Studio

A modern desktop GUI application for managing and visualizing TigerBeetle databases.

---

##  Core Functionality

###  Dashboard

Real-time overview of your TigerBeetle database with key metrics and visualizations.

**Features:**

- **Live Statistics**: Total accounts, transfers, and balance summaries
- **Recent Activity**: Latest accounts and transfers with quick actions
- **Performance Metrics**: Transaction throughput and database health
- **Visual Charts**: Balance distribution, transfer trends, and activity graphs
- **Quick Actions**: Create accounts/transfers directly from dashboard

###  Account Management

Complete account lifecycle management with advanced filtering and search.

**Features:**

- **Account List**: Paginated view of all accounts
- **Create Accounts**: Single or bulk account creation with validation
- **Account Details**: View complete account information including:
  - Balance (debits, credits, pending)
  - Flags and status
  - User data fields (128-bit, 64-bit, 32-bit)
  - Timestamp and ledger information
- **Search & Filter**: Find accounts by ID, ledger, code, or balance range
- **Account History**: View all transfers for a specific account
- **Bulk Operations**: Import/export accounts in batch

###  Transfer Management

Comprehensive transfer operations with templates and pending transfer support.

**Features:**

- **Transfer List**: View all transfers with detailed information
- **Create Transfers**: Single or batch transfer creation
- **Transfer Details**:
  - Debit and credit account IDs
  - Amount with currency formatting
  - Ledger and code
  - Flags (linked, pending, post-pending, voiding)
  - User data fields
  - Timestamp
- **Pending Transfers**: Manage two-phase commit transfers
- **Transfer Templates**: Save and reuse common transfer patterns
- **Linked Transfers**: Create dependent transfer chains
- **Voiding**: Reverse transfers with proper audit trail

###  Advanced Search

Powerful search capabilities across accounts and transfers.

**Features:**

- **Multi-Field Search**: Search by ID, ledger, code, amount, balance
- **Combined Filters**: Apply multiple filters simultaneously
- **Export Results**: Download search results as JSON/CSV

###  Data Visualization

Financial insights.

**Features:**

- **Flow Visualization**: Sankey diagrams showing money flow between accounts

###  Backup & Export

Comprehensive data backup and export functionality.

**Features:**

- **Full Backup**: Export entire database with encryption
- **Selective Export**: Choose specific accounts/transfers to export
- **Multiple Formats**:
  - JSON (structured data)
  - CSV (spreadsheet compatible)
  - SQL (database import)
- **Encryption**: AES-256-GCM encryption for sensitive data
- **Compression**: Reduce backup file sizes
- **Backup History**: Track and manage previous backups
- **Import/Restore**: Import data from backup files
- **Validation**: Verify data integrity before import
- **Duplicate Detection**: Skip or merge duplicate records

###  Configuration Management

#### Ledger Configuration

Define and manage ledgers with custom settings.

**Features:**

- **Ledger Setup**: Create ledgers with unique IDs
- **Currency Assignment**: Set currency per ledger
- **Metadata**: Add descriptions and notes
- **Multi-Ledger Support**: Manage multiple ledgers simultaneously

#### Currency System

Flexible multi-currency support with automatic formatting.

**Supported Currencies:**

- **Arabic Currencies**: LYD (دينار ليبي), EGP (جنيه مصري), TND (دينار تونسي), SAR (ريال سعودي), AED (درهم إماراتي)
- **International**: USD ($), EUR (€), GBP (£), JPY (¥)
- **Cryptocurrencies**: BTC (₿), ETH (Ξ)
- **Custom Currencies**: Define your own with custom symbols and decimals

**Features:**

- **Per-Ledger Currency**: Each ledger can have its own currency
- **Global Default**: Set a fallback currency
- **Automatic Formatting**: All amounts display in correct currency format
- **Decimal Precision**: Support for 0-18 decimal places
- **BigInt-Safe**: Financial-grade precision

#### Cluster Management

Connect and manage TigerBeetle clusters.

**Features:**

- **Connection Manager**: Save and switch between multiple clusters
- **Cluster Profiles**: Store connection details (cluster ID, replica addresses)
- **Health Monitoring**: Check cluster status and connectivity
- **Auto-Reconnect**: Automatic reconnection on connection loss

###  User Interface

#### Theme & Appearance

- **Dark/Light Mode**: Toggle between themes
- **Responsive Design**: Adapts to different window sizes
- **Material Design**: Clean, modern Vuetify components
- **Color-Coded Data**: Visual indicators for status and values

#### Keyboard Shortcuts

Efficient navigation and actions via keyboard.

**Navigation:**

- `Ctrl/Cmd + 1` - Dashboard
- `Ctrl/Cmd + 2` - Accounts
- `Ctrl/Cmd + 3` - Transfers

**Actions:**

- `Ctrl/Cmd + R` - Refresh data
- `Ctrl/Cmd + F` - Focus search
- `Ctrl/Cmd + E` - Export/Backup
- `Ctrl/Cmd + D` - Toggle dark mode
- `Ctrl/Cmd + K` - Show keyboard shortcuts

### 📋 Data Display Features

#### Smart Formatting

- **BigInt Handling**: Safe handling of 128-bit integers
- **Currency Display**: Automatic currency symbol and decimal formatting
- **Timestamp Formatting**: Human-readable dates and times
- **Number Formatting**: Thousands separators and proper decimals
- **Balance Colors**: Green for positive, red for negative

#### Tables & Lists

- **Pagination**: Handle large datasets efficiently
- **Sorting**: Sort by any column
- **Column Visibility**: Show/hide columns
- **Row Selection**: Select multiple items for bulk actions
- **Quick Actions**: Context menus for common operations
- **Expandable Rows**: View detailed information inline

#### Real-Time Updates

- **Auto-Refresh**: Configurable automatic data refresh
- **Live Counters**: Real-time statistics updates
- **Change Indicators**: Highlight new or modified records
- **Refresh Control**: Manual refresh with loading states

###  Data Integrity

#### Validation

- **Input Validation**: Validate all user inputs before submission
- **BigInt Safety**: Prevent overflow and precision loss
- **Required Fields**: Enforce mandatory fields
- **Format Checking**: Validate IDs, amounts, and codes
- **Duplicate Prevention**: Check for duplicate IDs

#### Error Handling

- **User-Friendly Messages**: Clear error descriptions
- **Error Recovery**: Graceful handling of failures
- **Retry Logic**: Automatic retry for transient errors
- **Error Logging**: Track errors for debugging

###  Performance Features

#### Optimization

- **Lazy Loading**: Load data on demand
- **Virtual Scrolling**: Handle large lists efficiently
- **Caching**: Cache frequently accessed data
- **Batch Operations**: Process multiple items together
- **Debounced Search**: Reduce unnecessary queries

#### Limits

- **TigerBeetle Limits**: Respects 8,189 item batch limit
- **Pagination**: Default 25-100 items per page
- **Query Limits**: Configurable result limits
- **Memory Management**: Efficient data handling

---

##  Use Cases

### Financial Applications

- **Banking Systems**: Manage customer accounts and transactions
- **Payment Processing**: Handle payment transfers with two-phase commit
- **Accounting**: Track debits, credits, and balances
- **Multi-Currency**: Support international transactions

### Development & Testing

- **Database Inspection**: View and analyze TigerBeetle data
- **Testing**: Create test accounts and transfers
- **Debugging**: Trace transaction flows and account states
- **Performance Testing**: Monitor database performance

### Data Management

- **Backup & Recovery**: Regular backups with encryption
- **Data Migration**: Import/export data between environments
- **Reporting**: Generate reports and visualizations
- **Auditing**: Track all account and transfer activity

---

##  Key Benefits

### User Experience

✅ **Intuitive Interface** - Clean, modern design with Material Design  
✅ **Fast Navigation** - Keyboard shortcuts for power users  
✅ **Visual Feedback** - Real-time updates and loading states  
✅ **Error Prevention** - Validation and confirmation dialogs

### Data Management

✅ **Multi-Currency** - Support for 13+ currencies plus custom  
✅ **Bulk Operations** - Import/export thousands of records  
✅ **Data Integrity** - Validation and duplicate detection  
✅ **Secure Backups** - AES-256 encryption

### Performance

✅ **Efficient Queries** - Optimized database access  
✅ **Batch Processing** - Handle large datasets  
✅ **Caching** - Reduce database load  
✅ **Responsive** - Fast UI updates

### Developer-Friendly

✅ **Open Source** - MIT License  
✅ **TypeScript** - Type-safe codebase  
✅ **Modern Stack** - Vue 3, Electron, Vite  
✅ **Extensible** - Easy to add features

---

## 🔄 Workflow Examples

### Creating an Account

1. Navigate to Accounts view
2. Click "Create Account"
3. Enter account details (ID, ledger, code)
4. Set initial balance (optional)
5. Add user data fields (optional)
6. Click "Create"
7. Account appears in list immediately

### Making a Transfer

1. Navigate to Transfers view
2. Click "Create Transfer"
3. Enter transfer details:
   - Debit account ID
   - Credit account ID
   - Amount
   - Ledger and code
4. Set flags (pending, linked, etc.)
5. Click "Create"
6. Transfer executes and balances update

### Searching Data

1. Navigate to Advanced Search
2. Select entity type (Accounts/Transfers)
3. Add filters:
   - Ledger, code
   - Amount/balance range
   - Date range
   - User data
4. Click "Search"
5. View results in table
6. Export results if needed

### Creating a Backup

1. Navigate to Backup & Export
2. Select backup options:
   - Include accounts/transfers
   - Encryption password
   - Compression level
3. Click "Create Backup"
4. Save backup file
5. Backup added to history

---

## 📊 Technical Capabilities

### TigerBeetle Integration

- **Native Client**: Uses official TigerBeetle Node.js client
- **Full API Support**: All TigerBeetle operations supported
- **BigInt Handling**: Proper 128-bit integer support
- **Batch Operations**: Efficient bulk processing
- **Error Handling**: Comprehensive error management

### Data Storage

- **Primary**: TigerBeetle database (remote)
- **Sidecar**: SQLite database (local metadata)
- **Cached**: In-memory caching for performance
- **Backups**: Encrypted file-based backups

### Cross-Platform

- **macOS**: Native .dmg installer (Intel & Apple Silicon)
- **Windows**: Native .exe installer
- **Linux**: AppImage package
- **Consistent**: Same features across all platforms

---

<div align="center">

**Built for the TigerBeetle Community**

A powerful, user-friendly desktop application for managing TigerBeetle databases.

</div>
