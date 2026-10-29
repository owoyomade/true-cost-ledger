import * as store from "../store.js";
import { resolveSettings, lineName, lineIndex, isPaid } from "../calc.js";

export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const uid = p => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

export const items = () => store.getItems();
export const settings = () => resolveSettings(items().settings);

const fmtCache = {};
export function money(n) {
  const cur = settings().currency || "CAD";
  try {
    fmtCache[cur] ||= new Intl.NumberFormat(undefined, { style: "currency", currency: cur });
    return fmtCache[cur].format(n || 0);
  } catch { return (n || 0).toFixed(2); }
}
export const pct = n => Number.isFinite(n) ? (n * 100).toFixed(n !== 0 && Math.abs(n) < 0.1 ? 1 : 0) + "%" : "–";
export const sign = n => n < -0.004 ? "neg" : n > 0.004 ? "pos" : "";
export const fmtDate = d => {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt) ? d : dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

export function lineTag(id, s = settings()) {
  const i = lineIndex(s, id);
  const color = !id || id === "all" || i < 0 ? "var(--all)" : `var(--p${i % 8})`;
  return `<span class="tag" style="--c:${color}">${esc(lineName(s, id))}</span>`;
}

export function statusBadge(r) {
  if (isPaid(r)) return "";
  const due = r.due || "";
  const late = due && due < today();
  const word = r.kind === "sale" ? "Awaiting payment" : "Unpaid";
  return ` <span class="badge ${late ? "late" : "due"}">${late ? "Overdue" : word}${due ? ` · due ${esc(fmtDate(due))}` : ""}</span>`;
}

let toastT;
export function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
}

export function download(filename, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function persist(fn, okMsg) {
  try { await fn(); if (okMsg) toast(okMsg); return true; }
  catch (e) { console.error(e); toast("Couldn’t save on this device. Check storage space and try again."); return false; }
}

export const slug = name => (name || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "item";
