import * as store from "../store.js";
import { resolveSettings, lineName, lineIndex, isPaid } from "../calc.js";

export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const uid = p => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

export const items = () => store.getItems();

/** Best guess at the owner's currency from the browser's language and region, e.g. en-GB → GBP. */
export function guessCurrency() {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    const map = { CA: "CAD", US: "USD", GB: "GBP", AU: "AUD", NZ: "NZD", NG: "NGN", GH: "GHS", KE: "KES", ZA: "ZAR", IN: "INR", AE: "AED", JP: "JPY", CH: "CHF", SE: "SEK", MX: "MXN", BR: "BRL", SG: "SGD" };
    return map[region] || (["DE", "FR", "IT", "ES", "NL", "IE", "BE", "AT", "PT", "FI"].includes(region) ? "EUR" : "USD");
  } catch { return "USD"; }
}
let guessedCurrency = null;

// Before setup nothing is saved, so amounts use the same guessed currency the welcome form shows.
// Saved settings always win; ones without a currency (from the original Canadian app) still fall back to CAD.
export const settings = () => resolveSettings(items().settings || { currency: guessedCurrency ||= guessCurrency() });

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

/**
 * On phones, wide tables show each row as a card (see table.cards in styles.css).
 * Copies each column heading onto its cells as data-label so the card can show
 * "Amount", "Profit" and so on next to the value. The column whose heading has
 * class "main" becomes the card's title.
 */
export function cardify(table) {
  const heads = [...table.querySelectorAll("thead th")];
  // Two- and three-column tables already fit a phone screen.
  table.classList.toggle("cards", heads.length > 3);
  if (heads.length <= 3) return;
  for (const tr of table.querySelectorAll("tbody tr")) {
    let col = 0;
    for (const td of tr.cells) {
      const th = heads[col];
      // Cells spanning several columns (totals, empty states) have no single heading.
      if (td.colSpan === 1 && th) {
        td.dataset.label = th.textContent;
        td.classList.toggle("main", th.classList.contains("main"));
      }
      col += td.colSpan;
    }
  }
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
