import { describe, it, expect } from "vitest";
import {
  resolveSettings, orderCalc, saleCalc, profitAndLoss, ledgerEntries, withRunningBalance,
  accountBalances, openItems, taxSummary, stockRows, periodRange, periodOptions, fiscalYearOf
} from "../src/calc.js";

const base = resolveSettings({ name: "Test Co" });
const reg = resolveSettings({ name: "Test Co", registered: true });

const items = {
  o1: { id: "o1", kind: "order", date: "2026-02-01", line: "general", item: "Widgets", units: 10, product: 100, shipping: 20, importTax: 6, account: "bank" },
  s1: { id: "s1", kind: "sale", date: "2026-03-01", line: "general", orderId: "o1", units: 4, amount: 120, fees: 5, shipping: 3, taxCollected: 15.6, account: "bank" },
  s2: { id: "s2", kind: "sale", date: "2026-03-10", line: "general", units: 1, unitCost: 10, amount: 50, status: "unpaid", due: "2026-03-20" },
  c1: { id: "c1", kind: "cost", date: "2026-03-05", category: "Software & subscriptions", amount: 33.9, taxPaid: 3.9, account: "bank" },
  t1: { id: "t1", kind: "transfer", type: "owner_in", date: "2026-01-15", amount: 500, account: "bank" },
  t2: { id: "t2", kind: "transfer", type: "transfer", date: "2026-01-20", amount: 50, from: "bank", to: "cash" }
};

describe("orders", () => {
  it("counts import tax as a cost only when not registered", () => {
    expect(orderCalc(items.o1, base).landed).toBe(126);
    expect(orderCalc(items.o1, reg).landed).toBe(120);
    expect(orderCalc(items.o1, reg).cashOut).toBe(126);
    expect(orderCalc(items.o1, reg).unitCost).toBe(12);
  });
});

describe("sales", () => {
  it("uses the linked order's landed unit cost", () => {
    const c = saleCalc(items.s1, items, reg);
    expect(c.cogs).toBe(48);
    expect(c.profit).toBe(120 - 5 - 3 - 48);
    expect(c.total).toBeCloseTo(135.6);
  });
  it("ignores tax collected when not registered", () => {
    expect(saleCalc(items.s1, items, base).tax).toBe(0);
  });
});

describe("profit and loss", () => {
  it("separates gross profit, selling costs and net-of-tax expenses", () => {
    const p = profitAndLoss(items, reg, null);
    expect(p.revenue).toBe(170);
    expect(p.cogs).toBe(58);
    expect(p.selling).toBe(8);
    expect(p.expenses).toBeCloseTo(30);
    expect(p.net).toBeCloseTo(170 - 58 - 8 - 30);
  });
  it("filters by period", () => {
    expect(profitAndLoss(items, reg, periodRange("m:2026-02")).revenue).toBe(0);
  });
});

describe("ledger", () => {
  it("leaves unpaid items out of balances and keeps transfers balanced", () => {
    const bal = accountBalances(items, reg);
    const bank = bal.find(a => a.id === "bank").balance;
    const cash = bal.find(a => a.id === "cash").balance;
    // 500 in - 50 out - 126 purchase + (135.6 - 8) sale - 33.9 expense
    expect(bank).toBeCloseTo(500 - 50 - 126 + 127.6 - 33.9);
    expect(cash).toBe(50);
    const { rows, closing } = withRunningBalance(ledgerEntries(items, reg), reg);
    expect(closing).toBeCloseTo(bank + cash);
    expect(rows.map(r => r.id)).toEqual(["t1", "t2", "o1", "s1", "c1", "s2"]);
  });
});

describe("open items and tax", () => {
  it("reports receivables with age past due", () => {
    const o = openItems(items, reg, "2026-03-30");
    expect(o.totalReceivable).toBe(50);
    expect(o.receivable[0].age).toBe(10);
    expect(o.totalPayable).toBe(0);
  });
  it("nets tax collected against recoverable tax paid", () => {
    const t = taxSummary(items, reg, null);
    expect(t.collected).toBeCloseTo(15.6);
    expect(t.paid).toBeCloseTo(9.9);
    expect(taxSummary(items, base, null)).toBeNull();
  });
});

describe("inventory", () => {
  it("values unsold stock at landed cost", () => {
    const [row] = stockRows(items, reg);
    expect(row.left).toBe(6);
    expect(row.value).toBe(72);
  });
});

describe("periods and settings", () => {
  it("handles fiscal years that don't start in January", () => {
    expect(fiscalYearOf("2026-03-15", 4)).toBe(2025);
    expect(periodRange("y:2025", 4)).toEqual({ from: "2025-04-01", to: "2026-04-01" });
    expect(periodRange("m:2026-12")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
    expect(periodOptions({}, resolveSettings({}), "2026-01-15")).toContain("m:2025-12");
  });
  it("migrates the original artifact's line settings", () => {
    const s = resolveSettings({ name: "Cloverelle", live: { women: true, men: false } });
    expect(s.lines.map(l => l.id)).toEqual(["women", "men", "little", "gifts", "skin"]);
    expect(s.lines[0].active).toBe(true);
    expect(s.taxName).toBe("GST/HST");
    expect(s.onboarded).toBe(true);
  });
});
