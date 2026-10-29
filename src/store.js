import * as db from "./db.js";
import { KINDS } from "./constants.js";

// The in-memory copy of every record, keyed by id. The UI reads from here and re-renders when it changes;
// each change is then written through to IndexedDB so it survives a reload.
let items = {};
const listeners = new Set();
const emit = () => listeners.forEach(fn => fn(items));

export const getItems = () => items;
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };

const isRecord = r => r && typeof r === "object" && typeof r.id === "string" && KINDS.includes(r.kind);
const stamp = rec => { const now = Date.now(); return { ...rec, updated: now, created: rec.created || now }; };

export async function load() {
  const rows = await db.getAll();
  items = Object.fromEntries(rows.map(r => [r.id, r]));
  emit();
}

export async function save(rec) {
  rec = stamp(rec);
  items = { ...items, [rec.id]: rec };
  emit();
  await db.put(rec);
  return rec;
}

export async function saveMany(recs) {
  recs = recs.map(stamp);
  items = { ...items, ...Object.fromEntries(recs.map(r => [r.id, r])) };
  emit();
  await db.putMany(recs);
}

export async function remove(id) {
  const { [id]: _gone, ...rest } = items;
  items = rest;
  emit();
  await db.remove(id);
}

export function exportBackup() {
  return JSON.stringify({ app: "cloverelle-ledger", version: 2, exported: new Date().toISOString(), records: Object.values(items) }, null, 2);
}

// Accepts this app's backup file, or a plain {id: record} map like the original artifact stored.
export function parseBackup(text) {
  const data = JSON.parse(text);
  const recs = Array.isArray(data) ? data : Array.isArray(data?.records) ? data.records : Object.values(data || {});
  const valid = recs.filter(isRecord);
  if (!valid.length) throw new Error("No ledger records found in that file.");
  return valid;
}

// Replaces everything with the backup's contents. Returns the record count.
export async function importBackup(text) {
  const valid = parseBackup(text);
  await db.replaceAll(valid);
  items = Object.fromEntries(valid.map(r => [r.id, r]));
  emit();
  return valid.length;
}
