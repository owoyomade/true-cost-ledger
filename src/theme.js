// Colour themes. Pure functions only (no DOM), so the contrast rules are unit-tested.
// Plum is the default and lives in styles.css; other themes override the same CSS variables.

export const DEFAULT_APPEARANCE = { palette: "plum", custom: "#4A2545", mode: "auto", font: "modern" };

const SYSTEM_SANS = 'system-ui,-apple-system,"Segoe UI",sans-serif';

/**
 * Font pairings. `text` is for body copy, forms and tables; `display` is for headings and
 * the big money figures. Serif headings look heavy at bold, so each pairing sets its own weight.
 */
export const FONTS = {
  modern: {
    name: "Modern", text: `"Hanken Grotesk Variable",${SYSTEM_SANS}`,
    display: `"Hanken Grotesk Variable",${SYSTEM_SANS}`, weight: 700
  },
  boutique: {
    name: "Boutique", text: `"Hanken Grotesk Variable",${SYSTEM_SANS}`,
    display: `"Newsreader Variable",Georgia,"Times New Roman",serif`, weight: 550
  },
  friendly: {
    name: "Friendly", text: `"Plus Jakarta Sans Variable",${SYSTEM_SANS}`,
    display: `"Plus Jakarta Sans Variable",${SYSTEM_SANS}`, weight: 700
  }
};

// Neutral greys shared by Graphite and by custom colours, so any brand colour sits on a calm base.
const GREY_LIGHT = {
  "--bg": "#F7F7F6", "--surface": "#FFFFFF", "--sunk": "#EEEEEC", "--ink": "#1A1A19", "--muted": "#62625E",
  "--line": "#E3E3E0", "--line-strong": "#CFCFCB"
};
const GREY_DARK = {
  "--bg": "#111110", "--surface": "#1A1A19", "--sunk": "#232322", "--ink": "#EDEDEA", "--muted": "#A9A9A4",
  "--line": "#2C2C2A", "--line-strong": "#3B3B38"
};

/**
 * Ready-made themes. Each lists the variables it changes in light and dark mode, plus
 * the two logo colours (the logo keeps its light-mode colours in both modes).
 * `swatch` is what the picker shows: brand colour, soft tint, background.
 */
export const PALETTES = {
  plum: {
    name: "Plum", swatch: ["#4A2545", "#E3C6CB", "#FAF7F5"],
    light: {}, dark: {}, mark: ["#4A2545", "#F1D7DB"]
  },
  cobalt: {
    name: "Cobalt", swatch: ["#2F4BE0", "#E8ECFD", "#F7F7F8"],
    light: {
      "--bg": "#F7F7F8", "--surface": "#FFFFFF", "--sunk": "#EFEFF1", "--ink": "#0B1220", "--muted": "#5B6472",
      "--line": "#E4E4E7", "--line-strong": "#D1D1D6",
      "--brand": "#2F4BE0", "--brand-ink": "#FFFFFF", "--brand-soft": "#E8ECFD",
      "--hero": "#0B1220", "--hero-ink": "#F7F7F8", "--hero-muted": "#B9C0CC",
      "--chart-rev": "#2F4BE0", "--chart-cost": "#7F8FE3", "--c-product": "#2F4BE0", "--c-biz": "#7F8FE3", "--all": "#7A8290"
    },
    dark: {
      "--bg": "#0E1117", "--surface": "#161B22", "--sunk": "#1E242C", "--ink": "#EEF1F5", "--muted": "#A3ACB9",
      "--line": "#2A313B", "--line-strong": "#3A424E",
      "--brand": "#8FA2FF", "--brand-ink": "#0B1220", "--brand-soft": "#1F2950",
      "--hero": "#1F2950", "--hero-ink": "#EEF1F5", "--hero-muted": "#B9C3E6",
      "--chart-rev": "#8FA2FF", "--chart-cost": "#4E5FB0", "--c-product": "#8FA2FF", "--c-biz": "#4E5FB0", "--all": "#98A2B0"
    },
    mark: ["#2F4BE0", "#E8ECFD"]
  },
  green: {
    name: "Money green", swatch: ["#0E7A4F", "#DDF3E7", "#F6F8F7"],
    light: {
      "--bg": "#F6F8F7", "--surface": "#FFFFFF", "--sunk": "#EDF1EF", "--ink": "#10231B", "--muted": "#56665F",
      "--line": "#E1E7E4", "--line-strong": "#CCD6D1",
      "--brand": "#0E7A4F", "--brand-ink": "#FFFFFF", "--brand-soft": "#DDF3E7",
      "--hero": "#0B4A31", "--hero-ink": "#F0F7F3", "--hero-muted": "#A8D5BF",
      "--chart-rev": "#0E7A4F", "--chart-cost": "#5E9F7F", "--c-product": "#0E7A4F", "--c-biz": "#5E9F7F", "--all": "#75857E"
    },
    dark: {
      "--bg": "#0E1512", "--surface": "#151E1A", "--sunk": "#1C2723", "--ink": "#E8F1EC", "--muted": "#A3B5AC",
      "--line": "#26332D", "--line-strong": "#34443C",
      "--brand": "#6FD3A0", "--brand-ink": "#0B241A", "--brand-soft": "#173A2A",
      "--hero": "#173A2A", "--hero-ink": "#E8F1EC", "--hero-muted": "#A8D5BF",
      "--chart-rev": "#6FD3A0", "--chart-cost": "#3F8564", "--c-product": "#6FD3A0", "--c-biz": "#3F8564", "--all": "#93A59C"
    },
    mark: ["#0E7A4F", "#DDF3E7"]
  },
  petrol: {
    name: "Petrol", swatch: ["#0E5560", "#F2B33D", "#F3F4F1"],
    light: {
      "--bg": "#F3F4F1", "--surface": "#FFFFFF", "--sunk": "#E9ECE8", "--ink": "#172326", "--muted": "#57666A",
      "--line": "#DCE1DE", "--line-strong": "#C3CCC9",
      "--brand": "#0E5560", "--brand-ink": "#FFFFFF", "--brand-soft": "#DCECEB",
      "--hero": "#0B3A40", "--hero-ink": "#F3F4F1", "--hero-muted": "#B7CDCB",
      "--chart-rev": "#0E5560", "--chart-cost": "#B7791F", "--c-product": "#0E5560", "--c-biz": "#B7791F", "--all": "#5F6E72"
    },
    dark: {
      "--bg": "#0D1719", "--surface": "#142226", "--sunk": "#1B2C31", "--ink": "#E7EEEC", "--muted": "#9AACAE",
      "--line": "#26383D", "--line-strong": "#364C52",
      "--brand": "#5CC2C4", "--brand-ink": "#08262A", "--brand-soft": "#173A3E",
      "--hero": "#12454C", "--hero-ink": "#EEF4F2", "--hero-muted": "#A9C6C4",
      "--chart-rev": "#5CC2C4", "--chart-cost": "#E0A845", "--c-product": "#5CC2C4", "--c-biz": "#E0A845", "--all": "#A3B2B4"
    },
    mark: ["#0E5560", "#F2B33D"]
  },
  graphite: {
    name: "Graphite", swatch: ["#1A1A19", "#EBEBE8", "#F7F7F6"],
    light: {
      ...GREY_LIGHT,
      "--brand": "#1A1A19", "--brand-ink": "#FFFFFF", "--brand-soft": "#EBEBE8",
      "--hero": "#1A1A19", "--hero-ink": "#F7F7F6", "--hero-muted": "#BDBDB8",
      "--chart-rev": "#1A1A19", "--chart-cost": "#8F8F89", "--c-product": "#1A1A19", "--c-biz": "#8F8F89", "--all": "#8F8F89"
    },
    dark: {
      ...GREY_DARK,
      "--brand": "#EDEDEA", "--brand-ink": "#111110", "--brand-soft": "#2C2C2A",
      "--hero": "#2C2C2A", "--hero-ink": "#EDEDEA", "--hero-muted": "#BDBDB8",
      "--chart-rev": "#EDEDEA", "--chart-cost": "#6F6F6A", "--c-product": "#EDEDEA", "--c-biz": "#6F6F6A", "--all": "#8F8F89"
    },
    mark: ["#1A1A19", "#EBEBE8"]
  }
};

/** Every variable a theme may set, so switching themes can clear the previous one first. */
export const THEME_VARS = [...new Set(Object.values(PALETTES).flatMap(p => [...Object.keys(p.light), ...Object.keys(p.dark)])),
  "--mark-bg", "--mark-tag", "--font", "--font-display", "--display-weight"];

/** "#abc", "abc" or "#AABBCC" → "#AABBCC". Returns null for anything else. */
export function normaliseHex(value) {
  const m = String(value || "").trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map(c => c + c).join("") : m[1];
  return "#" + h.toUpperCase();
}
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const toHex = parts => "#" + parts.map(v => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

/** Blends `a` towards `b`. amount 0 gives a, 1 gives b. */
export function mix(a, b, amount) {
  const x = rgb(a), y = rgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * amount));
}

/** WCAG contrast ratio between two colours, from 1 (none) to 21 (black on white). */
export function contrast(a, b) {
  const lum = hex => {
    const [r, g, bl] = rgb(hex).map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

// Nudges a colour towards black or white in small steps until `ok` passes.
function shiftUntil(color, toward, ok) {
  for (let step = 0; step <= 20; step++) {
    const c = mix(color, toward, step / 20);
    if (ok(c)) return c;
  }
  return toward;
}

/**
 * Builds a full light and dark theme from any colour the owner picks. The colour is
 * darkened (light mode) or lightened (dark mode) only as far as needed for text on it,
 * and text in it, to meet WCAG AA (4.5:1). Chart colours only need 3:1.
 */
export function customPalette(value) {
  const base = normaliseHex(value) || DEFAULT_APPEARANCE.custom;

  const softL = mix(base, "#FFFFFF", 0.88);
  const brandL = shiftUntil(base, "#000000", c => contrast(c, softL) >= 4.5 && contrast(c, "#FFFFFF") >= 4.5);
  const heroL = mix(brandL, "#000000", 0.25);
  const costL = shiftUntil(mix(base, "#FFFFFF", 0.5), "#000000", c => contrast(c, "#FFFFFF") >= 3);

  const surfaceD = GREY_DARK["--surface"];
  const softD = mix(base, surfaceD, 0.75);
  const brandD = shiftUntil(base, "#FFFFFF", c => contrast(c, softD) >= 4.5 && contrast(c, surfaceD) >= 4.5);

  return {
    name: "Your colour", swatch: [base, softL, GREY_LIGHT["--bg"]],
    light: {
      ...GREY_LIGHT,
      "--brand": brandL, "--brand-ink": "#FFFFFF", "--brand-soft": softL,
      "--hero": heroL, "--hero-ink": "#FFFFFF",
      "--hero-muted": shiftUntil(mix(base, "#FFFFFF", 0.7), "#FFFFFF", c => contrast(c, heroL) >= 4.5),
      "--chart-rev": brandL, "--chart-cost": costL, "--c-product": brandL, "--c-biz": costL, "--all": "#8F8F89"
    },
    dark: {
      ...GREY_DARK,
      "--brand": brandD, "--brand-ink": contrast(brandD, "#111110") >= 4.5 ? "#111110" : "#FFFFFF", "--brand-soft": softD,
      "--hero": softD, "--hero-ink": GREY_DARK["--ink"],
      "--hero-muted": shiftUntil(mix(base, "#FFFFFF", 0.6), "#FFFFFF", c => contrast(c, softD) >= 4.5),
      "--chart-rev": brandD, "--chart-cost": mix(brandD, surfaceD, 0.45), "--c-product": brandD, "--c-biz": mix(brandD, surfaceD, 0.45), "--all": "#8F8F89"
    },
    mark: [brandL, mix(base, "#FFFFFF", 0.82)]
  };
}

/** Fills in defaults and drops anything unrecognised, e.g. from an older saved preference. */
export function cleanAppearance(raw) {
  const a = { ...DEFAULT_APPEARANCE, ...(raw && typeof raw === "object" ? raw : {}) };
  if (a.palette !== "custom" && !PALETTES[a.palette]) a.palette = DEFAULT_APPEARANCE.palette;
  a.custom = normaliseHex(a.custom) || DEFAULT_APPEARANCE.custom;
  if (!["auto", "light", "dark"].includes(a.mode)) a.mode = "auto";
  if (!FONTS[a.font]) a.font = DEFAULT_APPEARANCE.font;
  return a;
}

/**
 * Works out what to put on the page: whether it's dark, and which CSS variables (colours and fonts) to set.
 * `systemDark` is whether the device itself is in dark mode.
 */
export function resolveTheme(appearance, systemDark) {
  const a = cleanAppearance(appearance);
  const dark = a.mode === "dark" || (a.mode === "auto" && systemDark);
  const palette = a.palette === "custom" ? customPalette(a.custom) : PALETTES[a.palette];
  const font = FONTS[a.font];
  const vars = {
    ...(dark ? palette.dark : palette.light), "--mark-bg": palette.mark[0], "--mark-tag": palette.mark[1],
    "--font": font.text, "--font-display": font.display, "--display-weight": String(font.weight)
  };
  return { dark, vars };
}
