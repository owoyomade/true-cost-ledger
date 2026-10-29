// Installability, offline status and service-worker updates.
import { registerSW } from "virtual:pwa-register";
import { $, $$, toast } from "./util.js";

let installEvent = null;
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const DISMISSED = "ledger-install-dismissed";

function refreshInstallUI() {
  const canPrompt = !!installEvent && !isStandalone();
  $$("[data-install]").forEach(b => { b.hidden = !canPrompt; });
  let dismissed = false; try { dismissed = !!localStorage.getItem(DISMISSED); } catch {}
  $("#installBanner").hidden = !canPrompt || dismissed;
  $("#appHint").textContent = isStandalone()
    ? "You’re using the installed app. It works offline and keeps your records on this device."
    : "Install TrueCost Ledger so it opens in its own window, from your home screen or dock, and works without internet.";
  $("#installHelp").textContent = isStandalone() || canPrompt ? ""
    : isIOS ? "On iPhone or iPad: open this page in Safari, tap Share, then “Add to Home Screen”."
    : "In Chrome or Edge, use the install icon in the address bar. In Safari on Mac, choose File → Add to Dock.";
}

async function promptInstall() {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice.catch(() => {});
  installEvent = null; refreshInstallUI();
}

function refreshNetStatus() {
  $("#netStatus").innerHTML = navigator.onLine ? "" : `<span class="dot warn"></span>Offline · still saving`;
}

export function initShell() {
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvent = e; refreshInstallUI(); });
  window.addEventListener("appinstalled", () => { installEvent = null; refreshInstallUI(); toast("TrueCost Ledger installed"); });
  document.addEventListener("click", e => { if (e.target.closest("[data-install]")) promptInstall(); });
  $("#installDismiss").addEventListener("click", () => {
    try { localStorage.setItem(DISMISSED, "1"); } catch {}
    refreshInstallUI();
  });
  window.addEventListener("online", refreshNetStatus);
  window.addEventListener("offline", refreshNetStatus);

  const updateSW = registerSW({
    onNeedRefresh() { $("#updateBanner").hidden = false; },
    onOfflineReady() { toast("Ready to work offline"); }
  });
  $("#updateBtn").addEventListener("click", () => updateSW(true));

  refreshInstallUI(); refreshNetStatus();
}
