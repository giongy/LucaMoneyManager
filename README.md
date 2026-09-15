# LucaMoneyManager
<img width="1333" height="720" alt="image" src="https://github.com/user-attachments/assets/b4ab0684-6870-4422-90cb-8d5684ee053d" />

**A personal finance and money manager for Windows.** Budgeting, expense tracking, an investment
portfolio, scheduled transactions and reports — in a desktop app built with Java + Chromium (JCEF),
backed by a plain SQLite file.

**No account, no subscription, no cloud service.** Your data is a single `.db` file on your own
disk. Put it in a synced folder (OneDrive, Dropbox…) and the **Android companion app** reads the
same file — no server in between.

![Dashboard](anonimizzate/home.png)

---

## Download

**[⬇ Download the latest Windows installer](https://github.com/giongy/LucaMoneyManager/releases/latest)**

A normal wizard installer: no admin rights required (installs per-user by default), no runtime to
install first — a trimmed Java runtime ships inside. Windows 10/11, 64-bit.

Your data lives in `%APPDATA%\LucaMoneyManager\` and is never touched by install, upgrade or
uninstall.

The Android companion app (`.apk`) is published on the same releases page. It is a companion, not a
standalone app: it needs the desktop database to read.

> Windows SmartScreen will warn on first run — the installer is not code-signed (a certificate costs
> a few hundred euros a year). *More info → Run anyway*, or build it yourself from source.

---

## Features

### Dashboard
The home screen gives a full picture of your finances at a glance, through nine widgets:
- **Account balances** — all accounts with their current balance, grouped by type
- **Budget bubbles** — current month's spending per category, with totals (actual vs. budget) for expenses, income, and net
- **Upcoming scheduled transactions** — next recurring payments and income, with due dates
- **Budget vs Reality chart** — monthly trend comparing planned vs. actual net balance
- **Top spending categories** and **recent transactions**
- **This month's expenses** — proportional bars, each row clickable to drill into the transactions behind it
- **Yearly income/expense chart** and **monthly savings**

**The layout is yours:** widgets can be dragged between rows, resized to any width, and rows given
their own height. The arrangement is saved and restored on the next launch.

### Accounts
- Multiple account types: checking, savings, credit card, cash, investment, loan
- Custom emoji icons, colors, and currency per account
- Balance history tracking, net-worth summary and per-account sparklines
- Closed and hidden accounts, to retire an old account without deleting it
- **Automatic credit card settlement** — for cards with auto-settle enabled, a scheduled transfer
  from the paying account is created for the last closed month's total, on the card's payment day.
  The amount realigns itself as soon as a new expense is recorded on the card.
- Reconciliation workflow (verified / unverified transactions)

### Transactions
- Full CRUD for income, expenses, and transfers
- **Split transactions** — split one transaction across multiple categories
- **Tags** — free-form labels with colors for cross-category grouping
- **Attachments** — link files (receipts, invoices) to a transaction
- **Reconciliation status** — mark transactions as verified or pending
- Inline editing, keyboard shortcuts, and context menu actions
- Filters by date range, account, category, type, tag, reconciliation status
- **Portfolio link badge** — transactions linked to a portfolio position are clearly marked

### Categories
- Hierarchical structure (parent → child)
- Custom icon and color per category
- Separate trees for expenses and income

### Budget

![Budget](anonimizzate/budget.png)

- **Monthly and annual budgets** per category with master-amount support
- Four views:
  - **Grid** — full year at a glance, inline editing per cell
  - **Trend** — budget vs. actual chart with cumulative lines and monthly bars
  - **Deviations** — ranked list of over/under-budget categories
  - **Month** — detailed breakdown for a single month with progress bars
- Sticky multi-row header for easy scrolling through 12 months
- Quick filters: only red (over budget), only current month
- Bulk budget generation from historical averages

### Scheduled Transactions
- Recurring transactions with configurable frequency (daily, weekly, monthly, yearly, etc.)
- Start and end dates, active/inactive toggle
- **Overdue notice** — badge alert when a scheduled transaction is past due
- **Forecasts** — future balance projection based on scheduled items
- Linked to portfolio positions when applicable

### Portfolio

![Portfolio](anonimizzate/titoli.png)

- Track stocks, ETFs, bonds and other financial instruments by ticker
- Buy / sell / dividend / expense operations per position
- Charts:
  - **Exposure by ticker** — donut chart of portfolio allocation
  - **Annual return by ticker** — stacked bar chart per year
  - **Cumulative return** — total portfolio value over time
  - **Dividends per ticker per month** — bar chart breakdown
- Realized and unrealized gain/loss per position

### Reports

![Reports](anonimizzate/report.png)

- **Financial health score** — composite metric with breakdown and suggestions
- Spending trend by top categories with mini sparkline charts
- **Savings rate** — monthly and rolling average
- Month-by-month expense analysis
- Cross-filters by category tree, date range, and year
- Powered by Chart.js with responsive rendering

### Notes
- Rich text notes with a Quill editor (the editor is loaded on demand, not at startup)
- Pinning, per-note colour, tag filtering and search

### Settings
- **Themes** — four built-in (🌁 Nebbia, 📜 Carta, 🛢️ Petrolio, 🪟 Vetro) plus fully customizable colour themes
- **Backup** — automatic backup on close with configurable directory and retention count
- **Attachments** — configurable storage directory
- **HTTP server** — optional LAN web server for remote access
- **Autostart** — launch with Windows
- **Keyboard shortcuts** reference panel
- Database info and manual backup trigger

---

## Architecture

```
JS Frontend (Vanilla JS, ~20,000 LOC across 21 modules)
    ↓  cefQuery (JSON payload, Base64-encoded)   ↑ same API over HTTP on the LAN
Bridge.java — dispatches 137 operations
    ↓
Database.java — all JDBC queries
    ↓
SQLite (schema v26, 22 tables)
```

**Tech stack:**
- Java 25, Maven
- JCEF v146 (Chromium Embedded Framework)
- Swing (window chrome, system tray, dialogs)
- SQLite via JDBC
- Chart.js (charts), Quill (notes editor, lazy-loaded)
- No JS framework — pure Vanilla JS

**Database tables:** `accounts`, `categories`, `transactions`, `transaction_splits`, `transaction_tags`, `tags`, `budgets`, `budget_config`, `scheduled_transactions`, `scheduled_transaction_tags`, `portfolio`, `portfolio_transactions`, `forecasts`, `forecast_categories`, `notes`, `note_tags`, `reports`, `range_presets`, `app_settings`, `schema_version`, `sync_meta`, `imported_pending`

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full startup sequence, bridge protocol, and database lifecycle.

---

## Android companion app

A lightweight Android app (Kotlin, Material Design 3, min SDK 26) sharing the same SQLite database via OneDrive:
- Account balance overview with favorites
- Quick transaction entry with a category picker (shortened to the categories flagged as mobile favourites on the desktop)
- Home screen widget (account balances)
- Periodic background sync via WorkManager

**The phone never writes to the shared database.** It opens a local copy read-only and appends new
entries to a `pending.jsonl` queue next to the database; the desktop imports the queue at startup,
skipping entries it has already seen. This avoids two writers on a OneDrive-synced file — the
situation that produces conflict copies and, at worst, a corrupted database.

---

## Build

```bash
mvn package
```

Output: `target/moneymanager-*.jar` (fat JAR, includes all dependencies — the `web/` folder is
served from disk, so HTML/CSS/JS can be edited without recompiling)

**Requirements:** Java 25, Maven 3.x

To produce the distributable Windows installer instead (Maven → `jlink` → `jpackage` → Inno Setup),
run `tools\build\build-installer.bat`. It additionally needs [Inno Setup 6](https://jrsoftware.org/isdl.php).

---

## License

**Source available — all rights reserved.**

The code is public so it can be read, audited and learned from. It is not released under an
open-source licence: there is no grant to use, modify, redistribute or publish derivative works.
If you want to do any of that, or are interested in the project commercially, open an issue.
