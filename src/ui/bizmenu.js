// The business menu: tap the shop's badge (top right) for licence status, backups and settings.
// TrueCost has no accounts, so this is the "you" place in the app, and it's about the shop on this device.
import { FREE_LIMIT, countEntries } from "../licence.js";
import { isUnlocked } from "./licence.js";
import { $, esc, items, settings, today } from "./util.js";

/** localStorage key for the date (YYYY-MM-DD) of the last backup saved on this device. */
export const LAST_BACKUP = "ledger-last-backup";

// After two weeks without a backup the badge gets a dot. Records live only in this
// browser, so anything added since the last backup is lost if its data is cleared.
const BACKUP_NUDGE_DAYS = 14;

/** "Juniper Candle Co." → "JC". Empty when the shop has no name yet. */
function initials(name) {
  const words = String(name || "").replace(/\(.*?\)/g, "").match(/[\p{L}\p{N}]+/gu) || [];
  return words.slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function lastBackup() {
  try { return localStorage.getItem(LAST_BACKUP) || ""; } catch { return ""; }
}

/** Whole days between two YYYY-MM-DD dates. */
const daysBetween = (from, to) => Math.round((new Date(to + "T00:00:00") - new Date(from + "T00:00:00")) / 86400000);

function backupState(entryCount) {
  const last = lastBackup();
  if (!entryCount) return { text: "Nothing to back up yet", due: false };
  if (!last) return { text: "Not backed up on this device yet", due: true };
  const days = daysBetween(last, today());
  const text = days <= 0 ? "Last backup: today" : days === 1 ? "Last backup: yesterday" : `Last backup: ${days} days ago`;
  return { text, due: days >= BACKUP_NUDGE_DAYS };
}

export function renderBizMenu() {
  const s = settings(), it = items();
  const entries = countEntries(it);
  const sample = Object.values(it).some(r => r.sample);
  const unlocked = isUnlocked();
  const name = s.name || "Your business";

  const ini = initials(s.name);
  const badge = ini ? esc(ini) : `<svg class="ico"><use href="#i-store"/></svg>`;
  $("#bizInitials").innerHTML = badge;
  $("#menuBadge").innerHTML = badge;
  $("#menuName").textContent = name;

  const licence = unlocked ? "Full version" : `Free trial · ${Math.min(entries, FREE_LIMIT)} of ${FREE_LIMIT} entries used`;
  $("#menuStatus").textContent = sample ? `Sample shop · ${licence.toLowerCase()}` : licence;
  $("#menuUnlock").hidden = unlocked;
  $("#menuClearSample").hidden = !sample;

  const backup = backupState(entries);
  $("#menuBackup").textContent = backup.text;
  $("#menuBackupItem").classList.toggle("due", backup.due);
  $("#bizMenuBtn").classList.toggle("nudge", backup.due);
  $("#bizMenuBtn").setAttribute("aria-label", `Business menu for ${name}${backup.due ? ", backup due" : ""}`);
}

/** Opens Settings and scrolls to one panel in it. */
function showSettingsPanel(selector) {
  const reveal = () => $(selector).scrollIntoView({ block: "start" });
  // Settings only becomes visible once the hashchange handler in main.js runs.
  if (location.hash === "#setup") { reveal(); return; }
  window.addEventListener("hashchange", () => setTimeout(reveal), { once: true });
  location.hash = "setup";
}

const ACTIONS = {
  // "unlock" is handled by the [data-show-licence] listener in ui/licence.js; "install" by ui/shell.js.
  backup: () => $("#backupBtn").click(),
  clearSample: () => $("#clearSample").click(),
  appearance: () => showSettingsPanel("#appearancePanel"),
  settings: () => showSettingsPanel("#v-setup"),
  help: () => showSettingsPanel("#aboutPanel")
};

export function initBizMenu() {
  const menu = $("#bizMenu");
  $("#bizMenuBtn").addEventListener("click", () => { renderBizMenu(); menu.showModal(); });
  menu.addEventListener("click", e => {
    // A click on the dialog itself (not its contents) is a click on the backdrop.
    if (e.target === menu) { menu.close(); return; }
    const item = e.target.closest("[data-menu]");
    if (!item) return;
    menu.close();
    ACTIONS[item.dataset.menu]?.();
  });
}
