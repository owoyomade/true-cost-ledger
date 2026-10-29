// Pure accounting logic. Nothing here touches the DOM or storage, so it is unit-tested directly.
import { DEFAULT_SETTINGS, LEGACY_LINES, MONTHS, TRANSFER_TYPES, KIND_LABEL } from "./constants.js";

export const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const round2 = n => Math.round(n * 100) / 100;

export function resolveSettings(raw) {
  raw = raw || {};
  const s = { ...DEFAULT_SETTINGS, ...raw };
  // Settings from the original artifact stored `live: {women: true, ...}` instead of a lines list.
  if (!Array.isArray(raw.lines)) {
    s.lines = raw.live
      ? LEGACY_LINES.map(l => ({ ...l, active: !!raw.live[l.id] }))
      : DEFAULT_SETTINGS.lines.map(l => ({ ...l }));
    if (raw.live && raw.name) s.onboarded = true;
  }
  if (raw.live && !raw.taxName) s.taxName = "GST/HST";
  if (!Array.isArray(s.expenseCats) || !s.expenseCats.length) s.expenseCats = [...DEFAULT_SETTINGS.expenseCats];
  if (!Array.isArray(s.accounts) || !s.accounts.length) s.accounts = DEFAULT_SETTINGS.accounts.map(a => ({ ...a }));
  s.fyStart = Math.min(12, Math.max(1, parseInt(s.fyStart, 10) || 1));
  return s;
}

export function lineName(s, id) {
  if (!id || id === "all") return "Whole business";
  const l = s.lines.find(x => x.id === id) || LEGACY_LINES.find(x => x.id === id);
  return l ? l.name : id;
}
export const lineIndex = (s, id) => s.lines.findIndex(x => x.id === id);
export const accountOf = (s, r) => r.account && s.accounts.some(a => a.id === r.account) ? r.account : s.accounts[0].id;
export function accountName(s, id) { const a = s.accounts.find(x => x.id === id); return a ? a.name : (id || "—"); }
export const isPaid = r => (r.status || "paid") === "paid";

const pad = n => String(n).padStart(2, "0");
const ymd = (y, m) => { y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return `${y}-${pad(m)}-01`; };

export function fiscalYearOf(date, fyStart) {
  const y = +date.slice(0, 4), m = +date.slice(5, 7);
  return m >= fyStart ? y : y - 1;
}
export function fyLabel(y, fyStart) { return fyStart === 1 ? String(y) : `FY ${y}–${String(y + 1).slice(2)}`; }

// Period keys: "all", "y:2026" (fiscal year starting in 2026), "m:2026-03", "q:2026-1" (fiscal quarter).
export function periodRange(key, fyStart = 1) {
  if (!key || key === "all") return null;
  const [kind, val] = key.split(":");
  if (kind === "y") { const y = +val; return { from: ymd(y, fyStart), to: ymd(y + 1, fyStart) }; }
  if (kind === "m") { const [y, m] = val.split("-").map(Number); return { from: ymd(y, m), to: ymd(y, m + 1) }; }
  if (kind === "q") { const [y, q] = val.split("-").map(Number); const m = fyStart + (q - 1) * 3; return { from: ymd(y, m), to: ymd(y, m + 3) }; }
  return null;
}
export const inRange = (r, range) => !range || ((r.date || "") >= range.from && (r.date || "") < range.to);

export function periodLabel(key, fyStart) {
  if (!key || key === "all") return "All time";
  const [kind, val] = key.split(":");
  if (kind === "y") return fyLabel(+val, fyStart);
  if (kind === "m") { const [y, m] = val.split("-").map(Number); return `${MONTHS[m - 1]} ${y}`; }
  if (kind === "q") { const [y, q] = val.split("-"); return `Q${q} ${fyLabel(+y, fyStart)}`; }
  return key;
}

export function periodOptions(items, s, todayStr) {
  const fy = fiscalYearOf(todayStr, s.fyStart);
  const years = new Set([fy]);
  Object.values(items).forEach(r => { if (r.date && r.kind !== "settings") years.add(fiscalYearOf(r.date, s.fyStart)); });
  const thisMonth = todayStr.slice(0, 7);
  const [ty, tm] = thisMonth.split("-").map(Number);
  const lastMonth = ymd(ty, tm - 1).slice(0, 7);
  const q = Math.floor((((tm - s.fyStart) % 12 + 12) % 12) / 3) + 1;
  return [
    "all", `m:${thisMonth}`, `m:${lastMonth}`, `q:${fy}-${q}`,
    ...[...years].sort((a, b) => b - a).map(y => `y:${y}`)
  ];
}

/**
 * Works out the true cost of a stock purchase.
 * "Landed cost" is everything paid to get goods to your door. Tax paid on the purchase is only part of
 * that cost when the business is NOT tax-registered; registered businesses claim it back instead.
 * `cashOut` is what actually left the bank, which always includes the tax.
 */
export function orderCalc(o, s) {
  const product = num(o.product), ship = num(o.shipping), duty = num(o.duties),
    broker = num(o.brokerage), tax = num(o.importTax), other = num(o.other);
  const taxCost = s.registered ? 0 : tax;
  const landed = product + ship + duty + broker + other + taxCost;
  const units = num(o.units);
  const unitCost = units > 0 ? landed / units : 0;
  const price = num(o.price);
  const unitProfit = price - unitCost;
  const cashOut = product + ship + duty + broker + other + tax;
  return { product, ship, duty, broker, tax, taxCost, other, landed, cashOut, units, unitCost, price, unitProfit, margin: price > 0 ? unitProfit / price : NaN };
}

/**
 * Profit on one sale. Cost of goods sold (COGS) comes from the linked purchase's landed unit cost,
 * or from a manually entered unit cost when the sale isn't linked. Tax charged to the customer
 * is never revenue: it's money held for the tax authority.
 */
export function saleCalc(sl, items, s) {
  const o = sl.orderId ? items[sl.orderId] : null;
  const units = num(sl.units);
  const unitCost = o ? orderCalc(o, s).unitCost : num(sl.unitCost);
  const cogs = unitCost * units;
  const revenue = num(sl.amount);
  const fees = num(sl.fees), ship = num(sl.shipping);
  const tax = s.registered ? num(sl.taxCollected) : 0;
  const profit = revenue - fees - ship - cogs;
  return { units, unitCost, cogs, revenue, fees, ship, tax, total: revenue + tax, profit, margin: revenue > 0 ? profit / revenue : NaN, order: o };
}

// Expenses are entered tax-inclusive; a registered business recovers the tax, so it isn't an expense.
export function costCalc(c, s) {
  const amount = num(c.amount);
  const tax = s.registered ? Math.min(num(c.taxPaid), amount) : 0;
  return { amount, tax, expense: amount - tax };
}

export const byNewest = (a, b) => (b.date || "").localeCompare(a.date || "") || (b.created || 0) - (a.created || 0);
export const byOldest = (a, b) => -byNewest(a, b);
export const listOf = (items, kind) => Object.values(items).filter(r => r.kind === kind).sort(byNewest);
export const matchLine = (r, line) => line === "any" || (r.line || "all") === line;

/**
 * Profit & loss on an accrual basis: income and costs count on the record's date, whether or not
 * the money has moved yet. Purchases aren't costs here; stock only becomes a cost (COGS) when sold.
 * @param range {from, to} as YYYY-MM-DD strings, or null for all time
 * @param line a product group id, "all" (whole-business items), or "any" (no filter)
 */
export function profitAndLoss(items, s, range, line = "any") {
  const pick = kind => listOf(items, kind).filter(r => inRange(r, range) && matchLine(r, line));
  const sales = pick("sale"), costs = pick("cost");
  let revenue = 0, cogs = 0, fees = 0, shipping = 0;
  sales.forEach(x => { const c = saleCalc(x, items, s); revenue += c.revenue; cogs += c.cogs; fees += c.fees; shipping += c.ship; });
  const byCat = {};
  costs.forEach(c => { const k = c.category || "Other"; byCat[k] = (byCat[k] || 0) + costCalc(c, s).expense; });
  const expenses = Object.values(byCat).reduce((a, b) => a + b, 0);
  const gross = revenue - cogs;
  const selling = fees + shipping;
  const net = gross - selling - expenses;
  return {
    revenue, cogs, gross, grossMargin: revenue ? gross / revenue : NaN,
    fees, shipping, selling,
    expenses, byCat: Object.entries(byCat).sort((a, b) => b[1] - a[1]),
    net, netMargin: revenue ? net / revenue : NaN,
    count: sales.length + costs.length
  };
}

// Twelve rows, one per month of the fiscal year beginning in `fy`.
export function monthlyPL(items, s, fy) {
  return Array.from({ length: 12 }, (_, i) => {
    const from = ymd(fy, s.fyStart + i), to = ymd(fy, s.fyStart + i + 1);
    const p = profitAndLoss(items, s, { from, to });
    const [y, m] = from.split("-").map(Number);
    return { key: from.slice(0, 7), label: `${MONTHS[m - 1].slice(0, 3)} ${String(y).slice(2)}`, ...p };
  });
}

export function spending(items, s, range, line = "any") {
  const pick = kind => listOf(items, kind).filter(r => inRange(r, range) && matchLine(r, line));
  const t = { product: 0, ship: 0, duty: 0, fees: 0, tax: 0, biz: 0, revenue: 0 };
  pick("order").forEach(o => { const c = orderCalc(o, s); t.product += c.product; t.ship += c.ship; t.duty += c.duty; t.fees += c.broker + c.other; t.tax += c.taxCost; });
  pick("cost").forEach(c => { t.biz += costCalc(c, s).expense; });
  pick("sale").forEach(x => { const c = saleCalc(x, items, s); t.ship += c.ship; t.fees += c.fees; t.revenue += c.revenue; });
  t.total = t.product + t.ship + t.duty + t.fees + t.tax + t.biz;
  return t;
}

/**
 * Turns every record into a ledger line, oldest first.
 * Each entry lists its `effects` on money accounts as {account, delta}: a transfer between accounts has
 * two effects that cancel out overall. Unpaid sales and bills are listed but have no effects until paid,
 * which is what keeps "cash in accounts" honest.
 */
export function ledgerEntries(items, s) {
  const out = [];
  Object.values(items).forEach(r => {
    let e = null;
    const acct = accountOf(s, r);
    if (r.kind === "sale") {
      const c = saleCalc(r, items, s);
      const net = c.total - c.fees - c.ship;
      e = { inAmt: c.total, outAmt: c.fees + c.ship, tax: c.tax, desc: r.desc || (c.order ? c.order.item : "Sale"), party: r.party || r.channel || "", effects: [{ account: acct, delta: net }] };
    } else if (r.kind === "order") {
      const c = orderCalc(r, s);
      e = { inAmt: 0, outAmt: c.cashOut, tax: s.registered ? c.tax : 0, desc: r.item || "Purchase", party: r.supplier || "", effects: [{ account: acct, delta: -c.cashOut }] };
    } else if (r.kind === "cost") {
      const c = costCalc(r, s);
      e = { inAmt: 0, outAmt: c.amount, tax: c.tax, desc: r.desc || r.category || "Expense", party: r.party || "", effects: [{ account: acct, delta: -c.amount }] };
    } else if (r.kind === "transfer") {
      const amt = num(r.amount), type = r.type || "transfer";
      const into = type === "owner_in" || type === "loan_in";
      const effects = type === "transfer"
        ? [{ account: accountOf(s, { account: r.from }), delta: -amt }, { account: accountOf(s, { account: r.to }), delta: amt }]
        : [{ account: acct, delta: into ? amt : -amt }];
      e = { inAmt: type === "transfer" ? amt : into ? amt : 0, outAmt: type === "transfer" ? amt : into ? 0 : amt, tax: 0, desc: r.desc || TRANSFER_TYPES[type], party: "", effects };
    }
    if (!e) return;
    const paid = r.kind === "transfer" || isPaid(r);
    // Cash moves on the day it was paid; the record date drives profit & loss.
    const date = (paid && r.paidOn) || r.date || "";
    out.push({ ...e, rec: r, id: r.id, kind: r.kind, typeLabel: r.kind === "transfer" ? TRANSFER_TYPES[r.type || "transfer"] : KIND_LABEL[r.kind], date, ref: r.ref || "", line: r.line, paid, effects: paid ? e.effects : [] });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.rec.created || 0) - (b.rec.created || 0));
}

// Adds a running balance (for one account, or all combined) in date order.
export function withRunningBalance(entries, s, account = "any") {
  const accts = account === "any" ? s.accounts : s.accounts.filter(a => a.id === account);
  let bal = accts.reduce((a, x) => a + num(x.opening), 0);
  const opening = bal;
  const rows = entries
    .filter(e => account === "any" || e.effects.some(f => f.account === account) || (!e.paid && accountOf(s, e.rec) === account))
    .map(e => {
      const delta = e.effects.filter(f => account === "any" || f.account === account).reduce((a, f) => a + f.delta, 0);
      bal = round2(bal + delta);
      return { ...e, delta, balance: bal };
    });
  return { opening, rows, closing: bal };
}

export function accountBalances(items, s) {
  const entries = ledgerEntries(items, s);
  return s.accounts.map(a => ({
    ...a,
    balance: round2(num(a.opening) + entries.reduce((sum, e) => sum + e.effects.filter(f => f.account === a.id).reduce((x, f) => x + f.delta, 0), 0))
  }));
}

export function openItems(items, s, todayStr) {
  const age = r => {
    const due = r.due || r.date;
    if (!due) return 0;
    return Math.floor((Date.parse(todayStr) - Date.parse(due)) / 86400000);
  };
  const receivable = listOf(items, "sale").filter(r => !isPaid(r)).map(r => ({ rec: r, amount: saleCalc(r, items, s).total, age: age(r) }));
  const payable = [...listOf(items, "order"), ...listOf(items, "cost")].filter(r => !isPaid(r)).map(r => ({
    rec: r, amount: r.kind === "order" ? orderCalc(r, s).cashOut : costCalc(r, s).amount, age: age(r)
  }));
  const sum = xs => xs.reduce((a, x) => a + x.amount, 0);
  return { receivable, payable, totalReceivable: sum(receivable), totalPayable: sum(payable) };
}

export function taxSummary(items, s, range) {
  if (!s.registered) return null;
  let collected = 0, paid = 0;
  listOf(items, "sale").filter(r => inRange(r, range)).forEach(r => { collected += num(r.taxCollected); });
  listOf(items, "order").filter(r => inRange(r, range)).forEach(r => { paid += num(r.importTax); });
  listOf(items, "cost").filter(r => inRange(r, range)).forEach(r => { paid += costCalc(r, s).tax; });
  return { collected, paid, owing: collected - paid };
}

export function stockRows(items, s, line = "any") {
  const soldBy = {};
  listOf(items, "sale").forEach(x => { if (x.orderId) soldBy[x.orderId] = (soldBy[x.orderId] || 0) + num(x.units); });
  return listOf(items, "order").filter(o => matchLine(o, line)).map(o => {
    const c = orderCalc(o, s);
    const sold = soldBy[o.id] || 0;
    const left = c.units - sold;
    return { o, c, sold, left, value: Math.max(left, 0) * c.unitCost };
  }).filter(x => x.c.units > 0);
}

export function lineRows(items, s, range) {
  return [...s.lines.map(l => l.id), "all"].map(id => {
    const p = profitAndLoss(items, s, range, id);
    return { id, revenue: p.revenue, gross: p.revenue - p.cogs - p.selling, expenses: p.expenses, net: p.net, any: p.count > 0 };
  }).filter(r => r.any || (r.id !== "all" && s.lines.find(l => l.id === r.id)?.active));
}
