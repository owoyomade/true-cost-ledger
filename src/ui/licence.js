// Free-trial status, unlocking, the sample-data banner, and the About panel.
import * as store from "../store.js";
import { FREE_LIMIT, SHOP_URLS, buyUrlFor, SUPPORT_EMAIL, isValidCode, normaliseCode, countEntries, canAddEntry } from "../licence.js";
import { sampleRecords, sampleSettings } from "../sample.js";
import { DEFAULT_SETTINGS } from "../constants.js";
import { version } from "../../package.json";
import { $, esc, items, settings, toast, persist, today } from "./util.js";

let unlocked = false;
let checkedCode = null; // the saved code that `unlocked` was worked out from

// Which shop's listing brought this visitor here, remembered on this device so the Buy link keeps
// pointing back to that shop on later visits, when the ?from= part of the link is gone.
const FROM_KEY = "truecost-from";
let buyUrl = buyUrlFor("");

function rememberShop() {
  const params = new URLSearchParams(location.search);
  const from = params.get("from");
  if (from !== null) {
    params.delete("from");
    history.replaceState(null, "", location.pathname + (params.size ? "?" + params : "") + location.hash);
    if (SHOP_URLS[from]) try { localStorage.setItem(FROM_KEY, from); } catch {}
  }
  let saved = "";
  try { saved = localStorage.getItem(FROM_KEY) || ""; } catch {}
  buyUrl = buyUrlFor(saved);
}

export const isUnlocked = () => unlocked;
const hasSamples = () => Object.values(items()).some(r => r.sample);

/** Re-checks the saved code only when it changes. Resolves true if the unlocked state changed. */
export async function refreshLicence() {
  const code = settings().licence || "";
  if (code === checkedCode) return false;
  checkedCode = code;
  const was = unlocked;
  unlocked = await isValidCode(code);
  return was !== unlocked;
}

async function unlock(code) {
  if (!(await isValidCode(code))) return false;
  await persist(() => store.save({ ...settings(), licence: normaliseCode(code), id: "settings", kind: "settings" }));
  return true;
}

function showLicencePanel() {
  const reveal = () => {
    $("#licencePanel").scrollIntoView({ block: "start" });
    if (!$("#unlockForm").hidden) $("#unlockCode").focus({ preventScroll: true });
  };
  // Settings only becomes visible once the hashchange handler runs, and an input can't take focus while hidden.
  if (location.hash === "#setup") { reveal(); return; }
  window.addEventListener("hashchange", () => setTimeout(reveal), { once: true });
  location.hash = "setup";
}

/** Called before a new entry form opens. Returns false (and explains why) once the trial is used up. */
export function allowNewEntry() {
  if (canAddEntry(items(), unlocked)) return true;
  const form = $("#dlgForm");
  form.innerHTML = `<h3>You’ve used all ${FREE_LIMIT} free entries</h3>
    <p class="hint">Thanks for trying TrueCost Ledger. Your records are safe and you can still view, edit, export and back them up.
    To keep adding entries, unlock the full version with the code from your purchase.</p>
    <div class="dlgfoot"><button type="button" class="btn" id="cancelBtn">Not now</button><span class="sp"></span>
    ${buyUrl ? `<a class="btn" href="${esc(buyUrl)}" target="_blank" rel="noopener">Buy the full version</a>` : ""}
    <button type="button" class="btn primary" id="limitUnlock">Enter unlock code</button></div>`;
  form.dataset.kind = "limit"; form._rec = {};
  $("#dlg").showModal();
  return false;
}

export function renderLicence() {
  const n = countEntries(items());
  const trialText = n >= FREE_LIMIT
    ? `You’ve used all ${FREE_LIMIT} free entries. Unlock the full version to keep adding.`
    : `Free trial: ${n} of ${FREE_LIMIT} entries used.`;

  $("#licenceStatus").innerHTML = unlocked
    ? "<b>Full version unlocked.</b> Thank you for buying TrueCost Ledger! Unlimited entries on this device. Your unlock carries over when you restore a backup on another device."
    : `${esc(trialText)} Enter the unlock code from your purchase to remove the limit.`;
  $("#unlockForm").hidden = unlocked;
  $("#buyLink").hidden = !buyUrl;
  if (buyUrl) $("#buyLink").href = buyUrl;

  const welcomeShowing = !$("#welcome").hidden;
  $("#trialBanner").hidden = unlocked || welcomeShowing || n === 0;
  $("#trialText").textContent = trialText;
  $("#sampleBanner").hidden = !hasSamples();

  $("#appVersion").textContent = version;
  $("#supportLine").hidden = !SUPPORT_EMAIL;
  if (SUPPORT_EMAIL) $("#supportLine").innerHTML = `<b>Need help?</b> Email <a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a>.`;
}

async function loadSamples() {
  await persist(async () => {
    await store.save({ ...settings(), ...sampleSettings(), currency: $("#w-cur").value, id: "settings", kind: "settings" });
    await store.saveMany(sampleRecords(today()));
  }, "Sample shop loaded. Look around, then clear it when you’re ready.");
}

async function clearSamples() {
  if (!confirm("Remove all the sample records? Anything you’ve added yourself stays.")) return;
  await persist(async () => {
    for (const r of Object.values(items()).filter(r => r.sample)) await store.remove(r.id);
    // With nothing of their own left, reset the sample shop's name and groups so the welcome setup shows again.
    if (!countEntries(items())) {
      const s = settings();
      await store.save({ ...s, name: "", lines: DEFAULT_SETTINGS.lines, onboarded: false, id: "settings", kind: "settings" });
    }
  }, "Sample data cleared");
}

// Buyers can unlock in one tap from the link in their PDF: /?unlock=TC-XXXX-XXXX-XXXX
export async function handleUnlockLink() {
  const params = new URLSearchParams(location.search);
  const code = params.get("unlock");
  if (code === null) return;
  params.delete("unlock");
  history.replaceState(null, "", location.pathname + (params.size ? "?" + params : "") + location.hash);
  if (unlocked) { toast("TrueCost Ledger is already unlocked"); return; }
  toast(await unlock(code) ? "Full version unlocked. Thank you!" : "That unlock link didn’t work. Enter the code in Settings instead.");
}

export function initLicence() {
  rememberShop();
  $("#unlockBtn").addEventListener("click", async () => {
    const code = $("#unlockCode").value;
    if (!normaliseCode(code)) { toast("Enter the unlock code from your purchase."); return; }
    if (await unlock(code)) { $("#unlockCode").value = ""; toast("Full version unlocked. Thank you!"); }
    else toast("That code didn’t work. Check it matches the one in your PDF.");
  });
  $("#unlockCode").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("#unlockBtn").click(); } });
  $("#trySample").addEventListener("click", loadSamples);
  $("#clearSample").addEventListener("click", clearSamples);
  document.addEventListener("click", e => {
    if (e.target.closest("[data-show-licence]")) { e.preventDefault(); showLicencePanel(); }
    if (e.target.id === "limitUnlock") { $("#dlg").close(); showLicencePanel(); }
  });
}
