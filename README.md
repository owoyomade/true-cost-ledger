# Ledger

A complete bookkeeping app for small businesses. Record sales, stock purchases, expenses and money transfers. Ledger then works out landed costs, profit, cash balances, sales tax and what's owed in either direction.

It's an installable web app (PWA). It runs in any modern browser, installs to a phone's home screen or a computer's dock, and works fully offline. Records are stored on the device, not on a server.

## Features

- **Overview dashboard**: revenue, net profit, cash in accounts, receivables, payables and stock value, plus a monthly chart for the financial year.
- **Ledger**: every money movement in date order with a running balance. Filter by period, account or type, search, and export to CSV.
- **Sales**: link a sale to the purchase its stock came from and profit uses the true landed cost. Track invoices awaiting payment and overdue ones.
- **Purchases & stock**: product, freight, duties, broker fees and import tax combine into a cost per unit. Stock on hand is tracked automatically.
- **Expenses**: categorised running costs, with unpaid bills and recoverable tax.
- **Transfers**: owner money in, drawings, loans and moves between accounts. These change cash but not profit.
- **Reports** (printable or saved as PDF): profit & loss, monthly breakdown, financial position, sales-tax summary, receivables/payables aging, inventory valuation, top customers.
- **Settings for any business**: currency, financial-year start month, tax name and rates (GST/HST, VAT, sales tax), product groups, money accounts with opening balances, and expense categories.
- **Data safety**: JSON backup and restore, CSV exports, and a persistent-storage request so the browser doesn't clear data on its own.

## Getting started

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev        # development server at http://localhost:5173
npm test           # unit tests for the accounting logic and storage
npm run build      # production build in dist/
npm run preview    # serve the production build locally
```

## Installing as an app

The app must be served over HTTPS (or from `localhost`) to be installable.

- **Chrome / Edge (desktop or Android)**: use the install button in the app's banner or Settings, or the install icon in the address bar.
- **iPhone / iPad**: open in Safari, tap Share, then **Add to Home Screen**.
- **Safari on Mac**: File, then **Add to Dock**.

Once installed, the app opens in its own window and keeps working without internet. When a new version is deployed, the app shows a "Reload" banner.

## Deploying

`npm run build` produces a static site in `dist/` that any static host can serve, such as Vercel, Netlify, Cloudflare Pages or GitHub Pages. No server or database is needed.

## Where data lives

All records are stored in the browser's IndexedDB on the device that created them. Nothing is sent to a server. As a result:

- Each device or browser has its own separate copy. To move data to another device, use **Settings → Backup & restore**.
- Clearing site data in the browser deletes the records. Keep regular backups.

## How the numbers are calculated

- **Landed cost** = product + shipping + duties + broker fees + other costs. Import tax is included only when the business is *not* registered to collect tax. Registered businesses recover it.
- **Cost of goods sold** = units sold × the landed unit cost of the linked purchase (or a manually entered unit cost).
- **Profit & loss** is accrual-based. Sales and expenses count on their date, whether paid or not. Unsold stock is an asset, not a cost.
- **Cash balances** count only paid items, on the date they were paid.
- **Sales-tax summary** = tax charged on sales − recoverable tax paid on purchases and expenses.

These figures are estimates to help run the business. They don't replace an accountant or official tax filings.

## Project structure

```
index.html            App shell and page markup
src/
  main.js             Entry point: wires tabs, global clicks and start-up
  calc.js             Pure accounting logic (fully unit-tested)
  constants.js        Defaults, currencies, record types
  db.js               Small IndexedDB wrapper
  store.js            In-memory records + persistence, backup/restore
  styles.css          Design tokens (light/dark), layout, print styles
  ui/
    util.js           Formatting, DOM and download helpers
    forms.js          Add/edit dialogs for every record type
    views.js          Overview, ledger and list tables
    reports.js        Printable financial reports
    settings.js       Settings, list editors, onboarding, export, backup
    shell.js          Install prompt, offline status, update banner
public/               Icons and favicon
scripts/make-icons.mjs  Generates the PNG app icons (npm run icons)
test/                 Vitest unit tests
```
