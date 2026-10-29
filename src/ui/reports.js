import {
  profitAndLoss, monthlyPL, taxSummary, openItems, stockRows, accountBalances, periodRange, periodLabel,
  fiscalYearOf, fyLabel, lineName, saleCalc
} from "../calc.js";
import { $, esc, items, settings, money, pct, sign, fmtDate, today } from "./util.js";
import { fillPeriodSelect } from "./views.js";

const line = (label, value, cls = "", extra = "") => `<tr class="${cls}"><td class="${cls.includes("sub") || cls.includes("total") ? "" : "indent"}">${label}</td><td class="n">${extra}</td><td class="n ${cls === "total" ? sign(value) : ""}">${money(value)}</td></tr>`;

function header(title, sub) {
  const s = settings();
  return `<header><div><h3>${title}</h3><p>${esc(s.name || "Your business")}</p></div><p>${sub}</p></header>`;
}

function plReport(it, s, key, range) {
  const p = profitAndLoss(it, s, range);
  const share = v => p.revenue ? pct(v / p.revenue) : "";
  return `<article class="report">${header("Profit &amp; loss", esc(periodLabel(key, s.fyStart)))}
    <table><thead><tr><th></th><th class="n">% of revenue</th><th class="n">Amount</th></tr></thead><tbody>
      ${line("Sales revenue", p.revenue, "", "")}
      ${line("Cost of goods sold", -p.cogs, "", share(p.cogs))}
      ${line("Gross profit", p.gross, "subtotal", share(p.gross))}
      ${line("Payment &amp; platform fees", -p.fees, "", share(p.fees))}
      ${line("Delivery costs", -p.shipping, "", share(p.shipping))}
      ${p.byCat.map(([c, v]) => line(esc(c), -v, "", share(v))).join("")}
      ${line("Total operating expenses", -(p.selling + p.expenses), "subtotal", share(p.selling + p.expenses))}
      ${line("Net profit", p.net, "total", share(p.net))}
    </tbody></table>
    <p class="note" style="margin-top:10px">Revenue is shown before ${esc(s.taxName)}. Cost of goods sold uses the landed cost of the stock each sale came from. Stock you haven’t sold yet is an asset, not a cost.</p>
  </article>`;
}

function monthlyReport(it, s, fy) {
  const rows = monthlyPL(it, s, fy);
  const sum = k => rows.reduce((a, r) => a + r[k], 0);
  return `<article class="report">${header("Monthly breakdown", esc(fyLabel(fy, s.fyStart)))}
    <div class="tablewrap"><table><thead><tr><th>Month</th><th class="n">Revenue</th><th class="n">Cost of goods</th><th class="n">Gross profit</th><th class="n">Expenses &amp; fees</th><th class="n">Net profit</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${esc(r.label)}</td><td class="n">${money(r.revenue)}</td><td class="n">${money(r.cogs)}</td><td class="n">${money(r.gross)}</td><td class="n">${money(r.selling + r.expenses)}</td><td class="n ${sign(r.net)}">${money(r.net)}</td></tr>`).join("")}
    <tr class="total"><td>Total</td><td class="n">${money(sum("revenue"))}</td><td class="n">${money(sum("cogs"))}</td><td class="n">${money(sum("gross"))}</td><td class="n">${money(sum("selling") + sum("expenses"))}</td><td class="n ${sign(sum("net"))}">${money(sum("net"))}</td></tr>
    </tbody></table></div></article>`;
}

function taxReport(it, s, key, range) {
  const t = taxSummary(it, s, range);
  if (!t) return `<article class="report">${header(`${esc(s.taxName)} summary`, esc(periodLabel(key, s.fyStart)))}<p class="hint" style="margin:0">You’re not registered to charge sales tax, so tax you pay is counted as part of your costs. Turn this on in Settings once you register.</p></article>`;
  return `<article class="report">${header(`${esc(s.taxName)} summary`, esc(periodLabel(key, s.fyStart)))}
    <table><tbody>
      ${line(`${esc(s.taxName)} charged on sales`, t.collected)}
      ${line(`${esc(s.taxName)} paid on purchases &amp; expenses (recoverable)`, -t.paid)}
      ${line(t.owing >= 0 ? "Estimated amount to pay" : "Estimated refund due", Math.abs(t.owing), "total")}
    </tbody></table>
    <p class="note" style="margin-top:10px">An estimate from what’s recorded here. Your tax return or accountant has the final word.</p></article>`;
}

function agingTable(list, s, kind) {
  if (!list.length) return `<p class="hint" style="margin:0">Nothing outstanding.</p>`;
  const bucket = a => a <= 0 ? "Not yet due" : a <= 30 ? "1–30 days late" : a <= 60 ? "31–60 days late" : "Over 60 days late";
  return `<div class="tablewrap"><table><thead><tr><th>Date</th><th>${kind === "sale" ? "Customer" : "Supplier"}</th><th>Description</th><th>Due</th><th>Status</th><th class="n">Amount</th></tr></thead><tbody>
    ${list.map(x => { const r = x.rec; return `<tr class="click" data-edit="${esc(r.id)}" tabindex="0"><td>${esc(fmtDate(r.date))}</td><td>${esc(r.party || r.supplier || "")}</td><td>${esc(r.desc || r.item || r.category || "")}${r.ref ? ` <span class="note">#${esc(r.ref)}</span>` : ""}</td><td>${esc(fmtDate(r.due || ""))}</td><td class="${x.age > 0 ? "neg" : ""}">${bucket(x.age)}</td><td class="n">${money(x.amount)}</td></tr>`; }).join("")}
    <tr class="total"><td colspan="5">Total</td><td class="n">${money(list.reduce((a, x) => a + x.amount, 0))}</td></tr></tbody></table></div>`;
}

function openReport(it, s) {
  const o = openItems(it, s, today());
  return `<article class="report">${header("Owed to you (receivables)", `As of ${esc(fmtDate(today()))}`)}${agingTable(o.receivable, s, "sale")}</article>
    <article class="report">${header("You owe (payables)", `As of ${esc(fmtDate(today()))}`)}${agingTable(o.payable, s, "bill")}</article>`;
}

function positionReport(it, s) {
  const accts = accountBalances(it, s);
  const o = openItems(it, s, today());
  const stock = stockRows(it, s).reduce((a, x) => a + x.value, 0);
  const cash = accts.reduce((a, x) => a + x.balance, 0);
  const t = taxSummary(it, s, null);
  const taxOwed = t ? Math.max(t.owing, 0) : 0;
  const assets = cash + o.totalReceivable + stock;
  const liabilities = o.totalPayable + taxOwed;
  return `<article class="report">${header("Financial position", `As of ${esc(fmtDate(today()))}`)}
    <table><tbody>
      ${accts.map(a => line(esc(a.name), a.balance)).join("")}
      ${line("Owed to you", o.totalReceivable)}
      ${line("Stock on hand (at cost)", stock)}
      ${line("What the business has", assets, "subtotal")}
      ${line("Unpaid bills", o.totalPayable)}
      ${t ? line(`${esc(s.taxName)} to pay`, taxOwed) : ""}
      ${line("What the business owes", liabilities, "subtotal")}
      ${line("Net worth of the business", assets - liabilities, "total")}
    </tbody></table>
    <p class="note" style="margin-top:10px">Loans recorded as transfers are included in cash but not tracked as a balance owed. A simplified statement, not an audited balance sheet.</p></article>`;
}

function stockReport(it, s) {
  const rows = stockRows(it, s);
  if (!rows.length) return "";
  return `<article class="report">${header("Inventory valuation", `As of ${esc(fmtDate(today()))}`)}
    <div class="tablewrap"><table><thead><tr><th>Purchase</th><th>Group</th><th class="n">Bought</th><th class="n">Sold</th><th class="n">On hand</th><th class="n">Cost each</th><th class="n">Value</th></tr></thead><tbody>
    ${rows.map(x => `<tr><td>${esc(x.o.item || "Purchase")}<br><span class="note">${esc(fmtDate(x.o.date))}</span></td><td>${esc(lineName(s, x.o.line))}</td><td class="n">${x.c.units}</td><td class="n">${x.sold}</td><td class="n ${x.left < 0 ? "neg" : ""}">${x.left}</td><td class="n">${money(x.c.unitCost)}</td><td class="n">${money(x.value)}</td></tr>`).join("")}
    <tr class="total"><td colspan="6">Total</td><td class="n">${money(rows.reduce((a, x) => a + x.value, 0))}</td></tr></tbody></table></div></article>`;
}

function topCustomers(it, s, key, range) {
  const by = {};
  Object.values(it).filter(r => r.kind === "sale" && (!range || (r.date >= range.from && r.date < range.to))).forEach(r => {
    const k = r.party || r.channel || "Unnamed";
    by[k] = (by[k] || 0) + saleCalc(r, it, s).revenue;
  });
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (!rows.length) return "";
  return `<article class="report">${header("Top customers &amp; channels", esc(periodLabel(key, s.fyStart)))}
    <table><tbody>${rows.map(([k, v]) => line(esc(k), v)).join("")}</tbody></table></article>`;
}

export function renderReports() {
  const s = settings(), it = items(), sel = $("#rpPeriod");
  const fy = fiscalYearOf(today(), s.fyStart);
  fillPeriodSelect(sel, `y:${fy}`);
  const key = sel.value, range = periodRange(key, s.fyStart);
  const reportFy = key.startsWith("y:") ? +key.slice(2) : fiscalYearOf(range?.from || today(), s.fyStart);
  $("#reports").innerHTML =
    `<div class="printhead"><h2>${esc(s.name || "Your business")}: financial reports</h2><p class="note">Prepared ${esc(fmtDate(today()))} · amounts in ${esc(s.currency)}</p></div>` +
    plReport(it, s, key, range) + monthlyReport(it, s, reportFy) + positionReport(it, s) +
    taxReport(it, s, key, range) + openReport(it, s) + stockReport(it, s) + topCustomers(it, s, key, range);
}

export function initReports() {
  $("#rpPeriod").addEventListener("change", renderReports);
  $("#printBtn").addEventListener("click", () => window.print());
}
