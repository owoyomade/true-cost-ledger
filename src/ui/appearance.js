// The Appearance panel in Settings: colour theme, font and light/dark mode.
// The choice is a per-device preference, so it lives in localStorage, not in the records.
import { PALETTES, FONTS, THEME_VARS, cleanAppearance, customPalette, resolveTheme } from "../theme.js";
import { $, esc } from "./util.js";

const KEY = "ledger-appearance";
const systemDark = matchMedia("(prefers-color-scheme: dark)");

function load() {
  try { return cleanAppearance(JSON.parse(localStorage.getItem(KEY))); }
  catch { return cleanAppearance(null); }
}
function save(appearance) {
  try { localStorage.setItem(KEY, JSON.stringify(appearance)); } catch {}
}

let appearance = load();

/** Puts the current theme on the page. Safe to call before the rest of the app starts. */
export function applyAppearance() {
  const root = document.documentElement;
  const { dark, vars } = resolveTheme(appearance, systemDark.matches);
  // "auto" leaves the attribute off so styles.css follows the device on its own.
  if (appearance.mode === "auto") root.removeAttribute("data-theme");
  else root.dataset.theme = appearance.mode;
  THEME_VARS.forEach(name => root.style.removeProperty(name));
  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  // Match the phone's status bar to the page background.
  const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.content = bg || (dark ? "#171115" : "#FAF7F5"); });
}

function swatch(key, palette, selected) {
  const [brand, soft, bg] = palette.swatch;
  return `<button type="button" class="themeopt" role="radio" aria-checked="${selected}" data-palette="${key}">
    <span class="themechip" style="background:${bg}"><i style="background:${brand}"></i><i style="background:${soft}"></i></span>
    <span>${esc(palette.name)}</span></button>`;
}

// Each font option is set in its own pairing: a money figure in the display font, the name in the text font.
function fontOption(key, font, selected) {
  return `<button type="button" class="fontopt" role="radio" aria-checked="${selected}" data-font="${key}">
    <b style="font-family:${esc(font.display)};font-weight:${font.weight}">$1,762</b>
    <span style="font-family:${esc(font.text)}">${esc(font.name)}</span></button>`;
}

function renderPicker() {
  const options = Object.entries(PALETTES).map(([key, p]) => swatch(key, p, appearance.palette === key));
  // The custom option only appears once a colour has been picked, so the list starts tidy.
  if (appearance.palette === "custom") options.push(swatch("custom", customPalette(appearance.custom), true));
  $("#themePicker").innerHTML = options.join("");
  $("#fontPicker").innerHTML = Object.entries(FONTS).map(([key, f]) => fontOption(key, f, appearance.font === key)).join("");
  $("#customColour").value = appearance.custom.toLowerCase();
  $("#themeMode").value = appearance.mode;
}

function update(patch) {
  appearance = cleanAppearance({ ...appearance, ...patch });
  save(appearance);
  applyAppearance();
  renderPicker();
}

export function initAppearance() {
  renderPicker();
  $("#themePicker").addEventListener("click", e => {
    const opt = e.target.closest("[data-palette]");
    if (opt) update({ palette: opt.dataset.palette });
  });
  $("#fontPicker").addEventListener("click", e => {
    const opt = e.target.closest("[data-font]");
    if (opt) update({ font: opt.dataset.font });
  });
  // "input" fires while dragging in the colour picker, so the page previews the colour live.
  $("#customColour").addEventListener("input", e => update({ palette: "custom", custom: e.target.value }));
  $("#themeMode").addEventListener("change", e => update({ mode: e.target.value }));
  systemDark.addEventListener("change", applyAppearance);
}
