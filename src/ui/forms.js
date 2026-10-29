import * as store from "../store.js";
import { num, orderCalc, saleCalc, listOf, stockRows, isPaid } from "../calc.js";
import { TRANSFER_TYPES } from "../constants.js";
import { $, esc, uid, today, items, settings, money, pct, toast, persist } from "./util.js";
import { allowNewEntry } from "./licence.js";

const M = 'type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00"';
const F = (id, label, val, attrs = "", help = "", full = false, extra = "") =>
  `<div class="f${full ? " full" : ""}"><label for="${id}">${label}${extra}</label><input id="${id}" name="${id}" value="${esc(val ?? "")}" ${attrs}>${help ? `<span class="help">${help}</span>` : ""}</div>`;
const S = (id, label, options, help = "", full = false) =>
  `<div class="f${full ? " full" : ""}"><label for="${id}">${label}</label><select id="${id}" name="${id}">${options}</select>${help ? `<span class="help">${help}</span>` : ""}</div>`;
const opt = (value, label, sel) => `<option value="${esc(value)}" ${sel === value ? "selected" : ""}>${esc(label)}</option>`;
const group = title => `<fieldset><legend class="grp">${title}</legend></fieldset>`;
const notesField = rec => `<div class="f full"><label for="notes">Notes</label><textarea id="notes" name="notes">${esc(rec.notes || "")}</textarea></div>`;
const est = key => ` <button type="button" class="linkbtn" data-est="${key}">Estimate</button>`;

function lineOptions(sel, includeAll) {
  const s = settings();
  const lines = s.lines.filter(l => l.active || l.id === sel);
  return (includeAll ? opt("all", "Whole business", sel) : "") + lines.map(l => opt(l.id, l.name + (l.active ? "" : " (inactive)"), sel)).join("");
}
const accountOptions = sel => settings().accounts.map(a => opt(a.id, a.name, sel)).join("");

function paymentBlock(rec, kind) {
  const paid = isPaid(rec);
  const unpaidLabel = kind === "sale" ? "Awaiting payment (invoice sent)" : "Not paid yet (bill to pay)";
  return `${group("Payment")}
    ${S("status", "Status", opt("paid", kind === "sale" ? "Paid by customer" : "Paid", rec.status || "paid") + opt("unpaid", unpaidLabel, rec.status))}
    ${S("account", kind === "sale" ? "Paid into" : "Paid from", accountOptions(rec.account || settings().accounts[0].id))}
    <div class="f" data-when="unpaid"${paid ? " hidden" : ""}><label for="due">Due date</label><input id="due" name="due" type="date" value="${esc(rec.due || "")}"></div>
    <div class="f" data-when="paid"${paid ? "" : " hidden"}><label for="paidOn">Date paid</label><input id="paidOn" name="paidOn" type="date" value="${esc(rec.paidOn || "")}"><span class="help">Leave blank if the same day.</span></div>`;
}

function orderForm(rec, isNew, s) {
  return `<h3>${isNew ? "Add purchase" : "Edit purchase"}</h3><div class="fields">
    ${F("date", "Purchase date", rec.date, 'type="date"')}
    ${S("line", "Group", lineOptions(rec.line))}
    ${F("item", "What you bought", rec.item, 'placeholder="e.g. Spring stock, 40 units"', "", true)}
    ${F("supplier", "Supplier", rec.supplier, 'placeholder="Who you bought from"')}
    ${F("ref", "Invoice / order no.", rec.ref, 'placeholder="Optional"')}
    ${F("units", "Number of units", rec.units, 'type="number" step="1" min="0" inputmode="numeric" placeholder="0"', "Leave at 0 for non-stock purchases")}
    ${group("Cost to get it to you")}
    ${F("product", "Product cost (total)", rec.product, M, "What you paid the supplier")}
    ${F("shipping", "Shipping & freight", rec.shipping, M)}
    ${F("duties", "Import duties", rec.duties, M, s.dutyRate !== "" ? `Estimate uses ${s.dutyRate}% of product cost` : "Set a usual duty rate in Settings to estimate", false, est("duty"))}
    ${F("importTax", `${esc(s.taxName)} paid`, rec.importTax, M, s.registered ? "Recoverable, so kept out of the unit cost" : "Counted as a cost while you’re not registered", false, est("tax"))}
    ${F("brokerage", "Customs broker / courier fees", rec.brokerage, M)}
    ${F("other", "Other costs", rec.other, M, "Bank fees, currency exchange, insurance")}
    ${group("Pricing")}
    ${F("price", "Your selling price per unit", rec.price, M, "Before tax. Optional, used for margin")}
    <div class="preview" id="preview"></div>
    ${paymentBlock(rec, "order")}
    ${notesField(rec)}
  </div>`;
}

function saleForm(rec, isNew, s) {
  const left = Object.fromEntries(stockRows(items(), s).map(x => [x.o.id, x.left]));
  const orders = listOf(items(), "order").filter(o => num(o.units) > 0);
  return `<h3>${isNew ? "Add sale" : "Edit sale"}</h3><div class="fields">
    ${F("date", "Sale date", rec.date, 'type="date"')}
    ${S("line", "Group", lineOptions(rec.line))}
    ${F("desc", "What sold", rec.desc, 'placeholder="e.g. 2 × large tote"', "", true)}
    ${F("party", "Customer", rec.party, 'placeholder="Optional"')}
    ${F("ref", "Invoice / receipt no.", rec.ref, 'placeholder="Optional"')}
    ${F("channel", "Where it sold", rec.channel, 'placeholder="Website, shop, market, Instagram…"')}
    ${F("units", "Units sold", rec.units, 'type="number" step="1" min="0" inputmode="numeric" placeholder="0"')}
    ${S("orderId", "From which purchase", `<option value="">Not linked</option>` + orders.map(o => opt(o.id, `${o.date} · ${o.item || "Purchase"} (${money(orderCalc(o, s).unitCost)} each, ${left[o.id] ?? 0} left)`, rec.orderId)).join(""), "Linking uses that purchase’s true cost per unit and tracks stock.", true)}
    <div class="f" id="ucWrap"${rec.orderId ? " hidden" : ""}><label for="unitCost">Cost per unit</label><input id="unitCost" name="unitCost" ${M} value="${esc(rec.unitCost ?? "")}"><span class="help">What each unit cost you, if not linked. 0 for services.</span></div>
    ${group("Money")}
    ${F("amount", "Amount charged (before tax)", rec.amount, M)}
    ${s.registered ? F("taxCollected", `${esc(s.taxName)} charged`, rec.taxCollected, M, `${s.salesTax}% of amount`, false, est("saletax")) : ""}
    ${F("fees", "Payment & platform fees", rec.fees, M, "Card processor, marketplace, PayPal…")}
    ${F("shipping", "Delivery cost you paid", rec.shipping, M)}
    <div class="preview" id="preview"></div>
    ${paymentBlock(rec, "sale")}
    ${notesField(rec)}
  </div>`;
}

function costForm(rec, isNew, s) {
  const cats = s.expenseCats.includes(rec.category) || !rec.category ? s.expenseCats : [...s.expenseCats, rec.category];
  return `<h3>${isNew ? "Add expense" : "Edit expense"}</h3><div class="fields">
    ${F("date", "Date", rec.date, 'type="date"')}
    ${F("amount", "Amount", rec.amount, M, "Total, including any tax")}
    ${S("category", "Category", `<option value="">Choose…</option>` + cats.map(c => opt(c, c, rec.category)).join(""))}
    ${S("line", "For", lineOptions(rec.line, true))}
    ${F("desc", "Description", rec.desc, 'placeholder="e.g. Website plan, October"', "", true)}
    ${F("party", "Paid to", rec.party, 'placeholder="Vendor or person"')}
    ${F("ref", "Receipt / bill no.", rec.ref, 'placeholder="Optional"')}
    ${S("repeat", "Repeats", ["One-time", "Monthly", "Quarterly", "Yearly"].map(r => opt(r, r, rec.repeat || "One-time")).join(""), "A reminder only. Add each renewal as you pay it.")}
    ${s.registered ? F("taxPaid", `${esc(s.taxName)} included`, rec.taxPaid, M, "Recoverable, so kept out of the expense", false, est("costtax")) : ""}
    ${paymentBlock(rec, "cost")}
    ${notesField(rec)}
  </div>`;
}

function transferForm(rec, isNew) {
  const type = rec.type || "owner_in";
  return `<h3>${isNew ? "Record transfer" : "Edit transfer"}</h3><div class="fields">
    ${S("type", "Type", Object.entries(TRANSFER_TYPES).map(([k, v]) => opt(k, v, type)).join(""), "Money that moves without being a sale or expense. Doesn’t affect profit.", true)}
    ${F("date", "Date", rec.date, 'type="date"')}
    ${F("amount", "Amount", rec.amount, M)}
    <div class="f" data-type="single"${type === "transfer" ? " hidden" : ""}><label for="account">Account</label><select id="account" name="account">${accountOptions(rec.account || settings().accounts[0].id)}</select></div>
    <div class="f" data-type="pair"${type === "transfer" ? "" : " hidden"}><label for="from">From</label><select id="from" name="from">${accountOptions(rec.from || settings().accounts[0].id)}</select></div>
    <div class="f" data-type="pair"${type === "transfer" ? "" : " hidden"}><label for="to">To</label><select id="to" name="to">${accountOptions(rec.to || settings().accounts[1]?.id || settings().accounts[0].id)}</select></div>
    ${F("desc", "Description", rec.desc, 'placeholder="Optional"', "", true)}
    ${notesField(rec)}
  </div>`;
}

const builders = { order: orderForm, sale: saleForm, cost: costForm, transfer: transferForm };

export function openForm(kind, rec) {
  const s = settings();
  const isNew = !rec;
  if (isNew && !allowNewEntry()) return;
  const firstLine = s.lines.find(l => l.active)?.id || s.lines[0]?.id || "all";
  rec = rec || {
    kind, id: uid(kind[0]), date: today(), line: kind === "cost" ? "all" : firstLine,
    account: s.accounts[0].id, status: "paid"
  };
  const form = $("#dlgForm");
  const markPaid = !isNew && rec.kind !== "transfer" && !isPaid(rec) ? `<button type="button" class="btn" id="markPaidBtn">Mark paid today</button>` : "";
  form.innerHTML = builders[kind](rec, isNew, s) +
    `<div class="dlgfoot">${isNew ? "" : `<button type="button" class="btn danger" id="delBtn">Delete</button>`}${markPaid}<span class="sp"></span><button type="button" class="btn" id="cancelBtn">Cancel</button><button type="submit" class="btn primary">${isNew ? "Save" : "Save changes"}</button></div>`;
  form.dataset.kind = kind; form.dataset.id = rec.id; form._rec = rec;
  $("#dlg").showModal(); updatePreview();
  if (isNew) form.querySelector("#item, #desc, #amount")?.focus();
}

function readForm() {
  const form = $("#dlgForm");
  const rec = { ...form._rec };
  form.querySelectorAll("input[name],select[name],textarea[name]").forEach(el => { rec[el.name] = el.value; });
  if (rec.status === "paid") delete rec.due; else delete rec.paidOn;
  return rec;
}

function updatePreview() {
  const form = $("#dlgForm"), s = settings();
  const r = readForm();
  const st = form.querySelector("#status");
  if (st) form.querySelectorAll("[data-when]").forEach(el => { el.hidden = el.dataset.when !== st.value; });
  const ty = form.querySelector("#type");
  if (ty) form.querySelectorAll("[data-type]").forEach(el => { el.hidden = (el.dataset.type === "pair") !== (ty.value === "transfer"); });
  const p = form.querySelector("#preview"); if (!p) return;
  if (form.dataset.kind === "order") {
    const c = orderCalc(r, s);
    p.innerHTML = `<div>Landed cost<b>${money(c.landed)}</b></div>` + (c.units ? `<div>Cost per unit<b>${money(c.unitCost)}</b></div>` : "") +
      (c.price && c.units ? `<div>Profit per unit<b class="${c.unitProfit < 0 ? "neg" : ""}">${money(c.unitProfit)}</b></div><div>Margin<b>${pct(c.margin)}</b></div><div>If all sell<b>${money(c.unitProfit * c.units)}</b></div>` : "");
  } else {
    const c = saleCalc(r, items(), s);
    const uc = form.querySelector("#ucWrap"); if (uc) uc.hidden = !!r.orderId;
    p.innerHTML = `<div>Customer pays<b>${money(c.total)}</b></div><div>Cost of goods<b>${money(c.cogs)}</b></div><div>Fees & delivery<b>${money(c.fees + c.ship)}</b></div><div>Profit<b class="${c.profit < 0 ? "neg" : ""}">${money(c.profit)}</b></div><div>Margin<b>${pct(c.margin)}</b></div>`;
  }
}

function validate(r) {
  if (!r.date) return "Add a date.";
  if (r.kind === "cost" && !num(r.amount)) return "Add the amount.";
  if (r.kind === "cost" && !r.category) return "Choose a category.";
  if (r.kind === "transfer" && !num(r.amount)) return "Add the amount.";
  if (r.kind === "transfer" && r.type === "transfer" && r.from === r.to) return "Pick two different accounts.";
  if (r.kind === "sale" && !num(r.amount)) return "Add the amount charged.";
  if (r.kind === "order" && !num(r.product) && !num(r.other)) return "Add the product cost.";
  if (r.kind === "cost" && num(r.taxPaid) > num(r.amount)) return "Tax included can’t be more than the amount.";
  return "";
}

export function initForms() {
  const form = $("#dlgForm");
  form.addEventListener("input", updatePreview);
  form.addEventListener("change", updatePreview);
  form.addEventListener("submit", e => {
    e.preventDefault();
    const r = readForm();
    const err = validate(r);
    if (err) { toast(err); return; }
    $("#dlg").close();
    persist(() => store.save(r), "Saved");
  });
  form.addEventListener("click", e => {
    const s = settings(), v = id => num(form.querySelector("#" + id)?.value);
    const set = (id, val) => { form.querySelector("#" + id).value = val.toFixed(2); };
    const k = e.target.closest("[data-est]")?.dataset.est;
    if (k) {
      if (k === "duty") { if (s.dutyRate === "") { toast("Set a usual duty rate in Settings first."); return; } set("duties", v("product") * num(s.dutyRate) / 100); }
      if (k === "tax") set("importTax", (v("product") + v("shipping") + v("duties")) * num(s.importTax) / 100);
      if (k === "saletax") set("taxCollected", v("amount") * num(s.salesTax) / 100);
      if (k === "costtax") { const rate = num(s.salesTax) / 100; set("taxPaid", v("amount") - v("amount") / (1 + rate)); }
      updatePreview(); return;
    }
    if (e.target.id === "cancelBtn") { $("#dlg").close(); return; }
    if (e.target.id === "markPaidBtn") {
      const r = { ...readForm(), status: "paid", paidOn: today() }; delete r.due;
      $("#dlg").close(); persist(() => store.save(r), "Marked as paid"); return;
    }
    if (e.target.id === "delBtn") {
      if (e.target.dataset.confirm) { const id = form.dataset.id; $("#dlg").close(); persist(() => store.remove(id), "Deleted"); }
      else { e.target.dataset.confirm = "1"; e.target.textContent = "Tap again to delete"; }
    }
  });
}
