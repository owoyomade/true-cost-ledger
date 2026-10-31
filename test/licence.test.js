import { describe, it, expect } from "vitest";
import { normaliseCode, hashCode, isValidCode, countEntries, canAddEntry, buyUrlFor, FREE_LIMIT, CODE_HASHES, BUY_URL, SHOP_URLS } from "../src/licence.js";

// A made-up code, so the real buyer code never appears in the repo.
const TEST_CODE = "TC-TEST-2346-ABCD";

describe("unlock codes", () => {
  it("ignores case, spaces and dashes", () => {
    expect(normaliseCode(" tc-test 2346-abcd ")).toBe("TCTEST2346ABCD");
    expect(normaliseCode(null)).toBe("");
  });

  it("accepts a code whose hash is listed, however it's typed", async () => {
    const hashes = [await hashCode(TEST_CODE)];
    expect(await isValidCode(TEST_CODE, hashes)).toBe(true);
    expect(await isValidCode("tc test 2346 abcd", hashes)).toBe(true);
    expect(await isValidCode("TC-TEST-2346-ABCE", hashes)).toBe(false);
    expect(await isValidCode("", hashes)).toBe(false);
  });

  it("ships with real SHA-256 hashes, not codes", () => {
    expect(CODE_HASHES.length).toBeGreaterThan(0);
    CODE_HASHES.forEach(h => expect(h).toMatch(/^[0-9a-f]{64}$/));
  });
});

describe("free trial", () => {
  const entries = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [`s${i}`, { id: `s${i}`, kind: "sale" }]));

  it("counts real entries only, not settings or sample records", () => {
    const items = { ...entries(3), settings: { id: "settings", kind: "settings" }, x: { id: "x", kind: "sale", sample: true } };
    expect(countEntries(items)).toBe(3);
  });

  it("stops new entries at the limit unless unlocked", () => {
    expect(canAddEntry(entries(FREE_LIMIT - 1), false)).toBe(true);
    expect(canAddEntry(entries(FREE_LIMIT), false)).toBe(false);
    expect(canAddEntry(entries(FREE_LIMIT + 10), true)).toBe(true);
  });
});

describe("buy link", () => {
  it("sends Etsy visitors back to Etsy and everyone else to the main shop", () => {
    expect(buyUrlFor("etsy")).toBe(SHOP_URLS.etsy);
    expect(buyUrlFor("etsy")).toMatch(/^https:\/\/www\.etsy\.com\//);
    expect(buyUrlFor("")).toBe(BUY_URL);
    expect(buyUrlFor("somewhere-else")).toBe(BUY_URL);
  });
});
