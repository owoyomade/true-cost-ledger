export const CURRENCIES = ["CAD", "USD", "GBP", "EUR", "AUD", "NZD", "NGN", "GHS", "KES", "ZAR", "INR", "AED", "JPY", "CHF", "SEK", "MXN", "BRL", "SGD"];

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const DEFAULT_EXPENSE_CATS = [
  "Advertising & marketing", "Bank & payment fees", "Contractors & freelancers", "Equipment & tools",
  "Insurance", "Legal & professional", "Licences & registration", "Office & supplies",
  "Packaging & shipping supplies", "Rent & utilities", "Software & subscriptions", "Phone & internet",
  "Travel & vehicle", "Meals & entertainment", "Training", "Website & hosting", "Wages & payroll", "Other"
];

export const DEFAULT_SETTINGS = {
  id: "settings", kind: "settings",
  name: "", currency: "CAD", fyStart: 1,
  registered: false, taxName: "Sales tax", salesTax: 0, importTax: 0, dutyRate: "",
  lines: [{ id: "general", name: "General", active: true }],
  expenseCats: DEFAULT_EXPENSE_CATS,
  accounts: [{ id: "bank", name: "Business bank account", opening: 0 }, { id: "cash", name: "Cash", opening: 0 }],
  onboarded: false
};

// Settings saved by the original Cloverelle artifact used a fixed set of lines.
export const LEGACY_LINES = [
  { id: "women", name: "Cloverelle Women" },
  { id: "men", name: "Cloverelle Men" },
  { id: "little", name: "Cloverelle Little" },
  { id: "gifts", name: "Cloverelle Gifts" },
  { id: "skin", name: "Cloverelle Skin" }
];

export const TRANSFER_TYPES = {
  owner_in: "Owner money in",
  owner_out: "Owner drawing",
  loan_in: "Loan received",
  loan_out: "Loan repayment",
  transfer: "Transfer between accounts"
};

export const KIND_LABEL = { sale: "Sale", order: "Purchase", cost: "Expense", transfer: "Transfer" };
export const KINDS = ["order", "sale", "cost", "transfer", "settings"];
export const TABS = ["overview", "ledger", "sales", "orders", "costs", "reports", "setup"];
