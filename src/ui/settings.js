import * as store from "../store.js";
import { num, listOf, orderCalc, saleCalc, costCalc, lineName, accountName, accountOf } from "../calc.js";
import { CURRENCIES, MONTHS } from "../constants.js";
import { $, $$, esc, uid, items, settings, lineTag, toast, download, persist, slug, today, guessCurrency } from "./util.js";
import { filteredLedger } from "./views.js";
import { LAST_BACKUP, renderBizMenu } from "./bizmenu.js";

const saveSettings = patch => persist(() => store.save({ ...settings(), ...patch, id: "settings", kind: "settings" }));
const editing = el => document.activeElement && el.contains(document.activeElement) && document.activeElement.matches("input:not([type=checkbox]),select");

function fillStaticSelects() {
  $$("[data-currencies]").forEach(sel => { sel.innerHTML = CURRENCIES.map(c => `<option>${c}</option>`).join(""); });
  $$("[data-months]").forEach(sel => { sel.innerHTML = MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join(""); });
}

function renderBusiness(s) {
  if (editing($("#setupForm"))) return;
  $("#s-name").value = s.name; $("#s-cur").value = s.currency; $("#s-fy").value = s.fyStart;
  $("#s-reg").checked = !!s.registered; $("#s-taxname").value = s.taxName;
  $("#s-sales").value = s.salesTax; $("#s-imp").value = s.importTax; $("#s-duty").value = s.dutyRate;
}
function readBusiness() {
  return {
    name: $("#s-name").value.trim(), currency: $("#s-cur").value, fyStart: +$("#s-fy").value,
    registered: $("#s-reg").checked, taxName: $("#s-taxname").value.trim() || "Sales tax",
    salesTax: num($("#s-sales").value), importTax: num($("#s-imp").value),
    dutyRate: $("#s-duty").value === "" ? "" : num($("#s-duty").value)
  };
}

const usage = (field, id) => Object.values(items()).filter(r => r.kind !== "settings" && [].concat(field).some(f => r[f] === id)).length;

function renderLines(s) {
  const el = $("#linesEditor"); if (editing(el)) return;
  el.innerHTML = s.lines.map(l => `<div class="editrow" data-id="${esc(l.id)}">
    <input type="checkbox" data-k="active" ${l.active ? "checked" : ""} aria-label="Active">
    ${lineTag(l.id, s).replace(/>[^<]*<\/span>$/, "></span>")}
    <input type="text" data-k="name" value="${esc(l.name)}" aria-label="Group name">
    <button type="button" class="iconbtn" data-del aria-label="Remove ${esc(l.name)}">Remove</button></div>`).join("");
}
function renderAccounts(s) {
  const el = $("#acctEditor"); if (editing(el)) return;
  el.innerHTML = s.accounts.map(a => `<div class="editrow" data-id="${esc(a.id)}">
    <input type="text" data-k="name" value="${esc(a.name)}" aria-label="Account name">
    <input type="number" step="0.01" inputmode="decimal" data-k="opening" value="${esc(a.opening ?? 0)}" aria-label="Opening balance" title="Opening balance">
    <button type="button" class="iconbtn" data-del aria-label="Remove ${esc(a.name)}">Remove</button></div>`).join("");
}
function renderCats(s) {
  const el = $("#catEditor"); if (editing(el)) return;
  el.innerHTML = s.expenseCats.map((c, i) => `<div class="editrow" data-i="${i}">
    <input type="text" data-k="name" value="${esc(c)}" aria-label="Category name">
    <button type="button" class="iconbtn" data-del aria-label="Remove ${esc(c)}">Remove</button></div>`).join("");
}

function initEditors() {
  // product groups
  $("#linesEditor").addEventListener("change", e => {
    const row = e.target.closest(".editrow"); if (!row) return;
    const lines = settings().lines.map(l => l.id !== row.dataset.id ? l
      : { ...l, [e.target.dataset.k]: e.target.type === "checkbox" ? e.target.checked : (e.target.value.trim() || l.name) });
    saveSettings({ lines });
  });
  $("#linesEditor").addEventListener("click", e => {
    if (!e.target.matches("[data-del]")) return;
    const id = e.target.closest(".editrow").dataset.id, s = settings();
    const n = usage("line", id);
    if (n) { toast(`Used by ${n} record${n === 1 ? "" : "s"}. Untick it to make it inactive instead.`); return; }
    if (s.lines.length === 1) { toast("Keep at least one group."); return; }
    saveSettings({ lines: s.lines.filter(l => l.id !== id) });
  });
  $("#addLine").addEventListener("click", async () => {
    const s = settings();
    await saveSettings({ lines: [...s.lines, { id: uid("g"), name: `Group ${s.lines.length + 1}`, active: true }] });
    $("#linesEditor .editrow:last-child input[type=text]")?.select();
  });

  // money accounts
  $("#acctEditor").addEventListener("change", e => {
    const row = e.target.closest(".editrow"); if (!row) return;
    const k = e.target.dataset.k;
    const accounts = settings().accounts.map(a => a.id !== row.dataset.id ? a
      : { ...a, [k]: k === "opening" ? num(e.target.value) : (e.target.value.trim() || a.name) });
    saveSettings({ accounts });
  });
  $("#acctEditor").addEventListener("click", e => {
    if (!e.target.matches("[data-del]")) return;
    const id = e.target.closest(".editrow").dataset.id, s = settings();
    // records with no account fall back to the first one, so they count against it too
    const n = usage(["account", "from", "to"], id) +
      (s.accounts[0].id === id ? Object.values(items()).filter(r => r.kind !== "settings" && !r.account).length : 0);
    if (n) { toast(`Used by ${n} record${n === 1 ? "" : "s"}, so it can’t be removed.`); return; }
    if (s.accounts.length === 1) { toast("Keep at least one account."); return; }
    saveSettings({ accounts: s.accounts.filter(a => a.id !== id) });
  });
  $("#addAcct").addEventListener("click", async () => {
    const s = settings();
    await saveSettings({ accounts: [...s.accounts, { id: uid("a"), name: "New account", opening: 0 }] });
    $("#acctEditor .editrow:last-child input[type=text]")?.select();
  });

  // expense categories (renames carry over to existing expenses)
  $("#catEditor").addEventListener("change", async e => {
    const row = e.target.closest(".editrow"); if (!row) return;
    const s = settings(), i = +row.dataset.i, old = s.expenseCats[i], next = e.target.value.trim();
    if (!next || next === old) { e.target.value = old; return; }
    if (s.expenseCats.includes(next)) { toast("That category already exists."); e.target.value = old; return; }
    const cats = s.expenseCats.map((c, j) => j === i ? next : c);
    const affected = listOf(items(), "cost").filter(r => r.category === old).map(r => ({ ...r, category: next }));
    await persist(() => store.saveMany([{ ...s, expenseCats: cats }, ...affected]),
      affected.length ? `Renamed on ${affected.length} expense${affected.length === 1 ? "" : "s"}` : "");
  });
  $("#catEditor").addEventListener("click", e => {
    if (!e.target.matches("[data-del]")) return;
    const s = settings(), i = +e.target.closest(".editrow").dataset.i;
    if (s.expenseCats.length === 1) { toast("Keep at least one category."); return; }
    saveSettings({ expenseCats: s.expenseCats.filter((_, j) => j !== i) });
  });
  $("#addCat").addEventListener("click", async () => {
    const s = settings();
    let name = "New category", n = 2;
    while (s.expenseCats.includes(name)) name = `New category ${n++}`;
    await saveSettings({ expenseCats: [...s.expenseCats, name] });
    $("#catEditor .editrow:last-child input")?.select();
  });
}

function renderWelcome(s) {
  const show = !s.onboarded && !Object.values(items()).some(r => r.kind !== "settings");
  $("#welcome").hidden = !show;
}
function initWelcome() {
  const f = $("#welcome");
  const sync = () => $$("[data-w-tax]").forEach(el => { el.hidden = !$("#w-reg").checked; });
  $("#w-reg").addEventListener("change", sync);
  $("#w-cur").value = guessCurrency();
  f.addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#w-name").value.trim();
    if (!name) { toast("Add your business name."); $("#w-name").focus(); return; }
    const names = $("#w-lines").value.split(",").map(x => x.trim()).filter(Boolean);
    const lines = names.length ? names.map(n => ({ id: slug(n) + "-" + Math.random().toString(36).slice(2, 5), name: n, active: true })) : settings().lines;
    const registered = $("#w-reg").checked;
    saveSettings({
      name, currency: $("#w-cur").value, fyStart: +$("#w-fy").value, registered, lines, onboarded: true,
      taxName: registered ? ($("#w-taxname").value.trim() || "Sales tax") : settings().taxName,
      salesTax: registered ? num($("#w-rate").value) : 0
    }).then(() => toast("All set. Add your first sale, purchase or expense."));
  });
}
function exportCSV(kind) {
  const s = settings(), it = items();
  const L = r => lineName(s, r.line), A = r => accountName(s, accountOf(s, r)), St = r => (r.status || "paid") === "paid" ? "Paid" : "Unpaid";
  const fixed = v => v.toFixed(2);
  const map = {
    orders: { rows: listOf(it, "order"), cols: [["Date", "date"], ["Group", L], ["Item", "item"], ["Supplier", "supplier"], ["Ref", "ref"], ["Units", "units"], ["Product cost", "product"], ["Shipping", "shipping"], ["Duties", "duties"], [`${s.taxName} paid`, "importTax"], ["Broker fees", "brokerage"], ["Other", "other"], ["Landed cost", r => fixed(orderCalc(r, s).landed)], ["Cost per unit", r => fixed(orderCalc(r, s).unitCost)], ["Selling price", "price"], ["Status", St], ["Account", A], ["Due", "due"], ["Paid on", "paidOn"], ["Notes", "notes"]] },
    sales: { rows: listOf(it, "sale"), cols: [["Date", "date"], ["Group", L], ["What sold", "desc"], ["Customer", "party"], ["Ref", "ref"], ["Channel", "channel"], ["Units", "units"], ["Amount (before tax)", "amount"], [`${s.taxName} charged`, "taxCollected"], ["Fees", "fees"], ["Delivery", "shipping"], ["Cost of goods", r => fixed(saleCalc(r, it, s).cogs)], ["Profit", r => fixed(saleCalc(r, it, s).profit)], ["Status", St], ["Account", A], ["Due", "due"], ["Paid on", "paidOn"], ["Notes", "notes"]] },
    costs: { rows: listOf(it, "cost"), cols: [["Date", "date"], ["Category", "category"], ["Description", "desc"], ["Paid to", "party"], ["Ref", "ref"], ["For", L], ["Repeats", "repeat"], ["Amount", "amount"], [`${s.taxName} included`, r => fixed(costCalc(r, s).tax)], ["Expense (net of recoverable tax)", r => fixed(costCalc(r, s).expense)], ["Status", St], ["Account", A], ["Due", "due"], ["Paid on", "paidOn"], ["Notes", "notes"]] },
    ledger: { rows: filteredLedger().rows, cols: [["Date", "date"], ["Type", "typeLabel"], ["Description", "desc"], ["Party", "party"], ["Ref", "ref"], ["Account", e => e.rec.kind === "transfer" && (e.rec.type || "transfer") === "transfer" ? `${accountName(s, e.rec.from)} → ${accountName(s, e.rec.to)}` : A(e.rec)], ["Money in", e => e.inAmt ? fixed(e.inAmt) : ""], ["Money out", e => e.outAmt ? fixed(e.outAmt) : ""], [s.taxName, e => e.tax ? fixed(e.tax) : ""], ["Status", e => e.paid ? "Paid" : "Unpaid"], ["Balance", e => e.paid ? fixed(e.balance) : ""]] }
  }[kind];
  const cell = v => { const x = String(v ?? ""); return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
  const csv = [map.cols.map(c => c[0]).join(","), ...map.rows.map(r => map.cols.map(c => cell(typeof c[1] === "function" ? c[1](r) : r[c[1]])).join(","))].join("\n");
  download(`${slug(s.name || "ledger")}-${kind}-${today()}.csv`, "﻿" + csv, "text/csv;charset=utf-8");
}

async function refreshStorageNote() {
  let persisted = false;
  try { persisted = await navigator.storage?.persisted?.(); if (!persisted) persisted = await navigator.storage?.persist?.(); } catch {}
  const n = Object.values(items()).filter(r => r.kind !== "settings").length;
  $("#storageNote").textContent = `${n} record${n === 1 ? "" : "s"} on this device.` +
    (persisted ? " Storage is protected from automatic clean-up." : " Your browser may clear storage if space runs low, so keep a backup.");
}

function initBackup() {
  $("#backupBtn").addEventListener("click", () => {
    download(`${slug(settings().name || "ledger")}-backup-${today()}.json`, store.exportBackup(), "application/json");
    // Remembered per device so the business menu can say how long ago the last backup was.
    try { localStorage.setItem(LAST_BACKUP, today()); } catch {}
    renderBizMenu();
    toast("Backup saved");
  });
  $("#restoreBtn").addEventListener("click", () => $("#restoreFile").click());
  $("#restoreFile").addEventListener("change", async e => {
    const file = e.target.files[0]; e.target.value = "";
    if (!file) return;
    if (!confirm("Restoring replaces everything in TrueCost Ledger on this device with the backup. Continue?")) return;
    try { const n = await store.importBackup(await file.text()); toast(`Restored ${n} records`); }
    catch (err) { toast(err.message || "That file couldn’t be read as a TrueCost Ledger backup."); }
  });
  $("#eraseBtn").addEventListener("click", async () => {
    if (!confirm("Erase every record and setting on this device? This can’t be undone.")) return;
    if (prompt('Type ERASE to confirm.') !== "ERASE") { toast("Nothing was erased."); return; }
    await persist(async () => { for (const id of Object.keys(items())) await store.remove(id); }, "All data erased");
  });
}

export function renderSettings() {
  const s = settings();
  renderBusiness(s); renderLines(s); renderAccounts(s); renderCats(s); renderWelcome(s); refreshStorageNote();
}

export function initSettings() {
  fillStaticSelects(); initEditors(); initWelcome(); initBackup();
  let t = null;
  $("#setupForm").addEventListener("change", () => { clearTimeout(t); saveSettings(readBusiness()).then(ok => ok && toast("Settings saved")); });
  $("#setupForm").addEventListener("input", e => {
    if (e.target.type === "checkbox" || e.target.tagName === "SELECT") return;
    clearTimeout(t); t = setTimeout(() => saveSettings(readBusiness()), 800);
  });
  document.addEventListener("click", e => { const ex = e.target.closest("[data-export]"); if (ex) exportCSV(ex.dataset.export); });
}

