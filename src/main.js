import "./styles.css";
import * as store from "./store.js";
import { TABS } from "./constants.js";
import { $, $$, items, settings, toast } from "./ui/util.js";
import { openForm, initForms } from "./ui/forms.js";
import { renderViews, initViews, renderLedger } from "./ui/views.js";
import { renderReports, initReports } from "./ui/reports.js";
import { renderSettings, initSettings } from "./ui/settings.js";
import { initShell } from "./ui/shell.js";

function render() {
  const name = settings().name;
  $("#bizName").textContent = name || "Ledger";
  document.title = name ? `${name} · Ledger` : "Ledger";
  renderViews(); renderReports(); renderSettings();
}

function showTab() {
  const h = (location.hash || "").slice(1);
  const tab = TABS.includes(h) ? h : "overview";
  TABS.forEach(t => $("#v-" + t).classList.toggle("on", t === tab));
  $$("nav.tabs a").forEach(a => a.setAttribute("aria-current", a.dataset.tab === tab ? "page" : "false"));
}
function goTo(tab) { history.replaceState(null, "", "#" + tab); showTab(); window.scrollTo(0, 0); }
$$("nav.tabs a").forEach(a => a.addEventListener("click", e => { e.preventDefault(); goTo(a.dataset.tab); }));
window.addEventListener("hashchange", showTab);

document.addEventListener("click", e => {
  const nb = e.target.closest("[data-new]"); if (nb) { openForm(nb.dataset.new); return; }
  const ed = e.target.closest("[data-edit]"); if (ed) { const r = items()[ed.dataset.edit]; if (r) openForm(r.kind, r); return; }
  const ac = e.target.closest("[data-account]");
  if (ac) { $("#lgAccount").value = ac.dataset.account; renderLedger(); goTo("ledger"); return; }
  const go = e.target.closest("[data-goto]"); if (go) { e.preventDefault(); goTo(go.dataset.goto); }
});
document.addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches("tr[data-edit], tr[data-account]")) { e.preventDefault(); e.target.click(); }
});

// Home-screen shortcuts open straight into a form: /?new=sale#sales
function handleShortcut() {
  const kind = new URLSearchParams(location.search).get("new");
  if (["order", "sale", "cost", "transfer"].includes(kind)) {
    history.replaceState(null, "", location.pathname + location.hash);
    openForm(kind);
  }
}

initForms(); initViews(); initReports(); initSettings(); initShell();
showTab();
store.subscribe(render);
store.load()
  .then(() => {
    $("#saveStatus").innerHTML = `<span class="dot ok"></span>Saved on this device`;
    handleShortcut();
  })
  .catch(err => {
    console.error(err);
    $("#saveStatus").innerHTML = `<span class="dot warn"></span>Storage unavailable`;
    toast("This browser is blocking storage, so changes won’t be kept. Try a normal (non-private) window.");
    render();
  });
