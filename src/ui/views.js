import {
  num, listOf, orderCalc, saleCalc, costCalc, profitAndLoss, monthlyPL, spending, ledgerEntries, withRunningBalance,
  accountBalances, openItems, stockRows, lineRows, periodRange, periodOptions, periodLabel, fiscalYearOf, fyLabel,
  accountName, accountOf, isPaid, inRange, lineName
} from "../calc.js";
import { $, $$, esc, items, settings, money, pct, sign, fmtDate, lineTag, statusBadge, today, cardify } from "./util.js";

export function fillPeriodSelect(sel, fallback = "all") {
  const s = settings(), cur = sel.value || fallback;
  const opts = periodOptions(items(), s, today());
  sel.innerHTML = opts.map((k, i) => `${i === 1 ? `<optgroup label="Recent">` : ""}${i === 4 ? `</optgroup><optgroup label="Financial years">` : ""}<option value="${k}">${esc(periodLabel(k, s.fyStart))}</option>`).join("") + "</optgroup>";
  sel.value = opts.includes(cur) ? cur : fallback;
  if (!sel.value) sel.value = "all";
}

const kpi = (label, value, sub = "", cls = "", goto = "", tile = "") =>
  `<${goto ? `button type="button" data-goto="${goto}"` : "div"} class="kpi ${tile}"><span class="lbl">${label}</span><span class="val ${cls}">${value}</span>${sub ? `<span class="sub">${sub}</span>` : ""}</${goto ? "button" : "div"}>`;

const emptyRow = (cols, text, kind, btn) =>
  `<tr><td colspan="${cols}" class="empty">${text}${kind ? `<br><button class="btn primary small" data-new="${kind}">${btn}</button>` : ""}</td></tr>`;

function renderOverview() {
  const s = settings(), it = items();
  fillPeriodSelect($("#period"));
  const lf = $("#lineFilter"), lcur = lf.value || "any";
  lf.innerHTML = `<option value="any">All groups</option>` + s.lines.map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join("");
  lf.value = s.lines.some(l => l.id === lcur) ? lcur : "any";

  const key = $("#period").value, line = lf.value, range = periodRange(key, s.fyStart);
  const pl = profitAndLoss(it, s, range, line);
  const open = openItems(it, s, today());
  const cash = accountBalances(it, s).reduce((a, x) => a + x.balance, 0);
  const stockValue = stockRows(it, s, line).reduce((a, x) => a + x.value, 0);

  $("#kpis").innerHTML =
    // Net profit leads: it's the number the app exists to tell you.
    kpi("Net profit", money(pl.net), Number.isFinite(pl.netMargin) ? `${pct(pl.netMargin)} of revenue` : "after all costs", sign(pl.net), "reports", "hero") +
    kpi("Revenue", money(pl.revenue), periodLabel(key, s.fyStart), "", "reports") +
    kpi("Cash in accounts", money(cash), `${s.accounts.length} account${s.accounts.length === 1 ? "" : "s"}`, sign(cash), "ledger") +
    kpi("Owed to you", money(open.totalReceivable), `${open.receivable.length} unpaid sale${open.receivable.length === 1 ? "" : "s"}`, "", "sales") +
    kpi("You owe", money(open.totalPayable), `${open.payable.length} unpaid bill${open.payable.length === 1 ? "" : "s"}`, open.totalPayable ? "neg" : "", "costs") +
    kpi("Stock on hand", money(stockValue), "at landed cost", "", "orders");

  // monthly chart for the selected fiscal year (or the current one)
  const fy = key.startsWith("y:") ? +key.slice(2) : fiscalYearOf(range?.from || today(), s.fyStart);
  const months = monthlyPL(it, s, fy);
  const costOf = m => m.cogs + m.selling + m.expenses;
  const max = Math.max(1, ...months.map(m => Math.max(m.revenue, costOf(m))));
  $("#chartLabel").textContent = fyLabel(fy, s.fyStart);
  $("#chart").innerHTML = months.map(m =>
    `<div class="col" title="${esc(m.label)}: revenue ${money(m.revenue)}, costs ${money(costOf(m))}, net ${money(m.net)}"><div class="bars"><i class="r" style="height:${(m.revenue / max * 100).toFixed(1)}%"></i><i class="c" style="height:${(costOf(m) / max * 100).toFixed(1)}%"></i></div></div>`).join("");
  let labels = $("#chartLabels");
  if (!labels) { labels = Object.assign(document.createElement("div"), { id: "chartLabels", className: "chartlabels" }); $("#chart").after(labels); }
  labels.innerHTML = months.map(m => `<span>${esc(m.label.split(" ")[0])}</span>`).join("");

  // where money went (cash basis)
  const t = spending(it, s, range, line);
  const parts = [
    ["Stock & materials", t.product, "--c-product"], ["Shipping & delivery", t.ship, "--c-ship"], ["Import duties", t.duty, "--c-duty"],
    ["Fees (broker, platform, other)", t.fees, "--c-fees"], [`${s.taxName} paid (not recoverable)`, t.tax, "--c-tax"], ["Operating expenses", t.biz, "--c-biz"]
  ];
  $("#stack").innerHTML = t.total ? parts.filter(p => p[1] > 0).map(p => `<span title="${esc(p[0])}: ${money(p[1])}" style="width:${(p[1] / t.total * 100).toFixed(2)}%;background:var(${p[2]})"></span>`).join("") : "";
  $("#legend").innerHTML = parts.map(p => `<div><span class="sw" style="background:var(${p[2]})"></span>${esc(p[0])}<b>${money(p[1])}</b></div>`).join("");
  $("#moneyHint").textContent = t.total ? `${money(t.total)} paid out in ${periodLabel(key, s.fyStart).toLowerCase() === "all time" ? "total" : periodLabel(key, s.fyStart)}.` : "Nothing recorded yet.";

  const be = t.total > 0 ? Math.min(t.revenue / t.total, 1) : 0;
  $("#beBig").textContent = money(t.revenue - t.total);
  $("#beBig").className = "big " + sign(t.revenue - t.total);
  $("#beMeter").style.width = (be * 100).toFixed(1) + "%";
  $("#beText").textContent = t.total > 0
    ? (t.revenue >= t.total ? "Revenue has covered everything you’ve paid out." : `${pct(be)} of the way to earning back what you’ve paid out. ${money(t.total - t.revenue)} to go.`)
    : "Shows once you record purchases or expenses.";

  const rows = lineRows(it, s, range);
  $("#lineTable").innerHTML = `<thead><tr><th class="main">Group</th><th class="n">Revenue</th><th class="n">Gross profit</th><th class="n">Expenses</th><th class="n">Net</th></tr></thead><tbody>` +
    (rows.length ? rows.map(r => `<tr><td>${lineTag(r.id, s)}</td><td class="n">${money(r.revenue)}</td><td class="n">${money(r.gross)}</td><td class="n">${money(r.expenses)}</td><td class="n ${sign(r.net)}">${money(r.net)}</td></tr>`).join("")
      : `<tr><td colspan="5" class="empty">No activity yet.</td></tr>`) + `</tbody>`;

  const bal = accountBalances(it, s);
  $("#acctTable").innerHTML = `<thead><tr><th>Account</th><th class="n">Balance</th></tr></thead><tbody>` +
    bal.map(a => `<tr class="click" data-account="${esc(a.id)}" tabindex="0"><td>${esc(a.name)}</td><td class="n ${sign(a.balance) === "neg" ? "neg" : ""}">${money(a.balance)}</td></tr>`).join("") +
    `<tr class="total"><td>Total</td><td class="n">${money(cash)}</td></tr></tbody>`;

  const recent = ledgerEntries(it, s).slice(-8).reverse();
  $("#recentTable").innerHTML = recent.length ? ledgerHead(false) + recent.map(e => ledgerRow(e, s, false)).join("") + "</tbody>"
    : `<tbody>${emptyRow(1, "Nothing recorded yet. Start with a sale, a purchase or an expense.", "sale", "Add sale")}</tbody>`;
  cardify($("#lineTable")); cardify($("#recentTable"));
}

function ledgerHead(withBalance) {
  return `<thead><tr><th>Date</th><th>Type</th><th class="main">Description</th><th>Ref</th><th>Account</th><th class="n">In</th><th class="n">Out</th>${withBalance ? `<th class="n">Balance</th>` : ""}</tr></thead><tbody>`;
}
function ledgerRow(e, s, withBalance) {
  const r = e.rec;
  const acct = r.kind === "transfer" && (r.type || "transfer") === "transfer"
    ? `${esc(accountName(s, r.from))} → ${esc(accountName(s, r.to))}` : esc(accountName(s, accountOf(s, r)));
  return `<tr class="click${e.paid ? "" : " unpaid"}" data-edit="${esc(e.id)}" tabindex="0">
    <td>${esc(fmtDate(e.date))}</td><td>${esc(e.typeLabel)}</td>
    <td>${esc(e.desc)}${e.party ? `<br><span class="note">${esc(e.party)}</span>` : ""}${statusBadge(r)}</td>
    <td>${esc(e.ref)}</td><td>${acct}</td>
    <td class="n">${e.inAmt ? money(e.inAmt) : ""}</td><td class="n">${e.outAmt ? money(e.outAmt) : ""}</td>
    ${withBalance ? `<td class="n ${e.balance < 0 ? "neg" : ""}">${e.paid ? money(e.balance) : "–"}</td>` : ""}</tr>`;
}

export function filteredLedger() {
  const s = settings();
  const range = periodRange($("#lgPeriod").value, s.fyStart);
  const account = $("#lgAccount").value || "any";
  const type = $("#lgType").value;
  const q = $("#lgSearch").value.trim().toLowerCase();
  const all = withRunningBalance(ledgerEntries(items(), s), s, account);
  // opening balance for the period = balance carried in from before it
  const before = range ? all.rows.filter(e => e.date < range.from) : [];
  const opening = before.length ? before[before.length - 1].balance : all.opening;
  const rows = all.rows.filter(e => inRange({ date: e.date }, range)).filter(e =>
    (type === "any" || (type === "unpaid" ? !e.paid : e.kind === type)) &&
    (!q || [e.desc, e.party, e.ref, e.typeLabel, e.rec.notes, e.rec.channel, e.rec.category, lineName(s, e.line)].some(x => String(x || "").toLowerCase().includes(q))));
  return { s, rows, opening, account };
}

function renderLedger() {
  const s = settings();
  fillPeriodSelect($("#lgPeriod"));
  const a = $("#lgAccount"), acur = a.value || "any";
  a.innerHTML = `<option value="any">All accounts</option>` + s.accounts.map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("");
  a.value = s.accounts.some(x => x.id === acur) ? acur : "any";

  const { rows, opening } = filteredLedger();
  const paidRows = rows.filter(e => e.paid);
  const moneyIn = paidRows.reduce((t, e) => t + Math.max(e.delta, 0), 0);
  const moneyOut = paidRows.reduce((t, e) => t + Math.max(-e.delta, 0), 0);
  const closing = paidRows.length ? paidRows[paidRows.length - 1].balance : opening;
  $("#lgSummary").innerHTML = kpi("Opening balance", money(opening)) + kpi("Money in", money(moneyIn), "", "pos") +
    kpi("Money out", money(moneyOut), "", moneyOut ? "neg" : "") + kpi("Closing balance", money(closing), "", sign(closing) === "neg" ? "neg" : "");
  $("#ledgerTable").innerHTML = ledgerHead(true) +
    (rows.length ? rows.slice().reverse().map(e => ledgerRow(e, s, true)).join("")
      : emptyRow(8, "No entries match.", "", "")) + "</tbody>";
  cardify($("#ledgerTable"));
}

const statusFilter = kind => $(`[data-status-filter="${kind}"]`)?.value || "any";
const byStatus = kind => r => { const f = statusFilter(kind); return f === "any" || (f === "paid") === isPaid(r); };

function renderSales() {
  const s = settings(), it = items();
  const rows = listOf(it, "sale").filter(byStatus("sale"));
  let tot = { rev: 0, cost: 0, profit: 0 };
  $("#salesTable").innerHTML = `<thead><tr><th>Date</th><th>Group</th><th class="main">What sold</th><th>Customer / channel</th><th class="n">Units</th><th class="n">Amount</th><th class="n">Costs</th><th class="n">Profit</th></tr></thead><tbody>` +
    (rows.length ? rows.map(x => {
      const c = saleCalc(x, it, s);
      tot.rev += c.revenue; tot.cost += c.cogs + c.fees + c.ship; tot.profit += c.profit;
      return `<tr class="click" data-edit="${esc(x.id)}" tabindex="0"><td>${esc(fmtDate(x.date))}</td><td>${lineTag(x.line, s)}</td><td>${esc(x.desc || (c.order ? c.order.item : "Sale"))}${x.ref ? `<br><span class="note">#${esc(x.ref)}</span>` : ""}${statusBadge(x)}</td><td>${[x.party && esc(x.party), x.channel && `<span class="note">${esc(x.channel)}</span>`].filter(Boolean).join("<br>")}</td><td class="n">${c.units || ""}</td><td class="n">${money(c.revenue)}</td><td class="n">${money(c.cogs + c.fees + c.ship)}</td><td class="n ${sign(c.profit)}">${money(c.profit)}<br><span class="note">${pct(c.margin)}</span></td></tr>`;
    }).join("") + `<tr class="total"><td colspan="5">Total</td><td class="n">${money(tot.rev)}</td><td class="n">${money(tot.cost)}</td><td class="n ${sign(tot.profit)}">${money(tot.profit)}</td></tr>`
      : emptyRow(8, statusFilter("sale") === "any" ? "No sales yet. Log your first one here." : "Nothing here.", "sale", "Add sale")) + `</tbody>`;
  cardify($("#salesTable"));
}

function renderOrders() {
  const s = settings(), it = items();
  const left = Object.fromEntries(stockRows(it, s).map(x => [x.o.id, x.left]));
  const rows = listOf(it, "order").filter(byStatus("order"));
  let total = 0;
  $("#ordersTable").innerHTML = `<thead><tr><th>Date</th><th>Group</th><th class="main">Item / supplier</th><th class="n">Units</th><th class="n">In stock</th><th class="n">Landed cost</th><th class="n">Cost each</th><th class="n">Price</th><th class="n">Profit each</th></tr></thead><tbody>` +
    (rows.length ? rows.map(o => {
      const c = orderCalc(o, s); total += c.landed;
      return `<tr class="click" data-edit="${esc(o.id)}" tabindex="0"><td>${esc(fmtDate(o.date))}</td><td>${lineTag(o.line, s)}</td><td>${esc(o.item)}${o.supplier ? `<br><span class="note">${esc(o.supplier)}${o.ref ? ` · #${esc(o.ref)}` : ""}</span>` : ""}${statusBadge(o)}</td><td class="n">${c.units || ""}</td><td class="n ${left[o.id] < 0 ? "neg" : ""}">${c.units ? left[o.id] : ""}</td><td class="n">${money(c.landed)}</td><td class="n">${c.units ? money(c.unitCost) : "–"}</td><td class="n">${c.price ? money(c.price) : "–"}</td><td class="n ${c.unitProfit < 0 ? "neg" : "pos"}">${c.price && c.units ? money(c.unitProfit) + `<br><span class="note">${pct(c.margin)} margin</span>` : "–"}</td></tr>`;
    }).join("") + `<tr class="total"><td colspan="5">Total</td><td class="n">${money(total)}</td><td colspan="3"></td></tr>`
      : emptyRow(9, statusFilter("order") === "any" ? "No purchases yet. Log your first stock order here." : "Nothing here.", "order", "Add purchase")) + `</tbody>`;
  cardify($("#ordersTable"));
}

function renderCosts() {
  const s = settings();
  const rows = listOf(items(), "cost").filter(byStatus("cost"));
  const total = rows.reduce((a, x) => a + num(x.amount), 0);
  $("#costsTable").innerHTML = `<thead><tr><th>Date</th><th>Category</th><th class="main">Description</th><th>For</th><th>Repeats</th>${s.registered ? `<th class="n">${esc(s.taxName)}</th>` : ""}<th class="n">Amount</th></tr></thead><tbody>` +
    (rows.length ? rows.map(x => `<tr class="click" data-edit="${esc(x.id)}" tabindex="0"><td>${esc(fmtDate(x.date))}</td><td>${esc(x.category)}</td><td>${esc(x.desc)}${x.party ? `<br><span class="note">${esc(x.party)}${x.ref ? ` · #${esc(x.ref)}` : ""}</span>` : ""}${statusBadge(x)}</td><td>${lineTag(x.line, s)}</td><td>${esc(x.repeat || "One-time")}</td>${s.registered ? `<td class="n">${costCalc(x, s).tax ? money(costCalc(x, s).tax) : ""}</td>` : ""}<td class="n">${money(num(x.amount))}</td></tr>`).join("") +
      `<tr class="total"><td colspan="${s.registered ? 6 : 5}">Total</td><td class="n">${money(total)}</td></tr>`
      : emptyRow(s.registered ? 7 : 6, statusFilter("cost") === "any" ? "No expenses yet. Rent, software or your website plan are good first entries." : "Nothing here.", "cost", "Add expense")) + `</tbody>`;
  cardify($("#costsTable"));
}

export function renderViews() {
  renderOverview(); renderLedger(); renderSales(); renderOrders(); renderCosts();
}
export { renderLedger, renderOverview, renderSales, renderOrders, renderCosts };

export function initViews() {
  $("#period").addEventListener("change", renderOverview);
  $("#lineFilter").addEventListener("change", renderOverview);
  ["#lgPeriod", "#lgAccount", "#lgType"].forEach(sel => $(sel).addEventListener("change", renderLedger));
  $("#lgSearch").addEventListener("input", renderLedger);
  $$("[data-status-filter]").forEach(el => el.addEventListener("change", () => ({ sale: renderSales, order: renderOrders, cost: renderCosts })[el.dataset.statusFilter]()));
}
