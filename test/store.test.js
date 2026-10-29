import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import * as store from "../src/store.js";

describe("store", () => {
  it("saves records, survives a reload, and round-trips through a backup", async () => {
    await store.save({ id: "s1", kind: "sale", date: "2026-05-01", amount: 40 });
    await store.save({ id: "c1", kind: "cost", date: "2026-05-02", amount: 12, category: "Other" });
    await store.remove("c1");

    await store.load(); // re-read from IndexedDB, as a page reload would
    expect(Object.keys(store.getItems())).toEqual(["s1"]);
    expect(store.getItems().s1.created).toBeTypeOf("number");

    const backup = store.exportBackup();
    await store.save({ id: "x", kind: "sale", amount: 1 });
    expect(await store.importBackup(backup)).toBe(1);
    expect(store.getItems().x).toBeUndefined();
  });

  it("rejects files that contain no ledger records", () => {
    expect(() => store.parseBackup('{"hello":"world"}')).toThrow(/No ledger records/);
    expect(() => store.parseBackup("not json")).toThrow();
  });
});
