import { describe, it, expect } from "vitest";
import { sampleRecords, sampleSettings } from "../src/sample.js";
import { resolveSettings, saleCalc, stockRows, profitAndLoss } from "../src/calc.js";
import { KINDS } from "../src/constants.js";

const TODAY = "2026-03-02"; // early in the month, to check dates never land in the future
const records = sampleRecords(TODAY);
const items = Object.fromEntries(records.map(r => [r.id, r]));
const s = resolveSettings(sampleSettings());

describe("sample shop", () => {
  it("flags every record as sample, with unique ids and valid kinds", () => {
    expect(records.every(r => r.sample && KINDS.includes(r.kind))).toBe(true);
    expect(new Set(records.map(r => r.id)).size).toBe(records.length);
  });

  it("never dates a record after today", () => {
    expect(records.every(r => r.date <= TODAY)).toBe(true);
  });

  it("links sales to real purchases without overselling stock", () => {
    records.filter(r => r.kind === "sale").forEach(sl => expect(items[sl.orderId]).toBeDefined());
    stockRows(items, s).forEach(row => expect(row.left).toBeGreaterThanOrEqual(0));
  });

  it("shows a profitable shop, so the demo looks realistic", () => {
    records.filter(r => r.kind === "sale").forEach(sl => expect(saleCalc(sl, items, s).profit).toBeGreaterThan(0));
    expect(profitAndLoss(items, s, null).net).toBeGreaterThan(0);
  });
});
