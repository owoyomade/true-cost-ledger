import { describe, it, expect } from "vitest";
import { PALETTES, FONTS, customPalette, contrast, normaliseHex, cleanAppearance, resolveTheme, mix } from "../src/theme.js";

// Pairs of [text, background] that must stay readable (WCAG AA, 4.5:1) in every theme.
const TEXT_PAIRS = [
  ["--ink", "--bg"], ["--ink", "--surface"], ["--muted", "--bg"], ["--muted", "--surface"],
  ["--brand-ink", "--brand"], ["--brand", "--brand-soft"], ["--brand", "--surface"],
  ["--hero-ink", "--hero"], ["--hero-muted", "--hero"]
];

function expectReadable(vars, label) {
  for (const [fg, bg] of TEXT_PAIRS) {
    if (!vars[fg] || !vars[bg]) continue;
    const ratio = contrast(vars[fg], vars[bg]);
    expect(ratio, `${label}: ${fg} on ${bg} is ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  }
}

describe("colour helpers", () => {
  it("tidies hex colours and rejects anything else", () => {
    expect(normaliseHex("abc")).toBe("#AABBCC");
    expect(normaliseHex("#4a2545")).toBe("#4A2545");
    expect(normaliseHex("plum")).toBe(null);
  });

  it("measures contrast like WCAG does", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrast("#FFFFFF", "#FFFFFF")).toBe(1);
  });

  it("mixes two colours", () => {
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });
});

describe("ready-made themes", () => {
  for (const [key, palette] of Object.entries(PALETTES)) {
    if (key === "plum") continue; // plum's values live in styles.css
    it(`${palette.name} keeps text readable in light and dark`, () => {
      expectReadable(palette.light, `${key} light`);
      expectReadable(palette.dark, `${key} dark`);
    });
  }
});

describe("custom colours", () => {
  // Deliberately awkward picks: too light, too dark, too bright.
  const picks = ["#4A2545", "#FFE600", "#FFFFFF", "#000000", "#00FF00", "#FF69B4", "#7FDBFF"];
  for (const pick of picks) {
    it(`builds a readable theme from ${pick}`, () => {
      const p = customPalette(pick);
      expectReadable(p.light, `${pick} light`);
      expectReadable(p.dark, `${pick} dark`);
      expect(contrast(p.light["--chart-cost"], "#FFFFFF")).toBeGreaterThanOrEqual(3);
    });
  }

  it("falls back to plum for a broken colour", () => {
    expect(customPalette("not a colour").light["--brand"]).toBe(customPalette("#4A2545").light["--brand"]);
  });
});

describe("choosing light or dark", () => {
  it("follows the device when set to auto", () => {
    expect(resolveTheme({ mode: "auto" }, true).dark).toBe(true);
    expect(resolveTheme({ mode: "auto" }, false).dark).toBe(false);
  });

  it("lets the owner override the device", () => {
    expect(resolveTheme({ mode: "light" }, true).dark).toBe(false);
    expect(resolveTheme({ mode: "dark" }, false).dark).toBe(true);
  });

  it("ignores unknown saved values", () => {
    expect(cleanAppearance({ palette: "neon", mode: "dim", custom: "x", font: "comic" }))
      .toEqual({ palette: "plum", custom: "#4A2545", mode: "auto", font: "modern" });
    expect(cleanAppearance(null).palette).toBe("plum");
  });

  it("always sets the logo colours", () => {
    const { vars } = resolveTheme({ palette: "cobalt" }, false);
    expect(vars["--mark-bg"]).toBe("#2F4BE0");
    expect(vars["--brand"]).toBe("#2F4BE0");
  });
});

describe("fonts", () => {
  it("defaults to the modern pairing, including for preferences saved before fonts existed", () => {
    expect(cleanAppearance({ palette: "cobalt" }).font).toBe("modern");
    expect(resolveTheme({}, false).vars["--font"]).toBe(FONTS.modern.text);
  });

  it("uses the serif only for headings and money in the boutique pairing", () => {
    const { vars } = resolveTheme({ font: "boutique" }, false);
    expect(vars["--font-display"]).toContain("Newsreader");
    expect(vars["--font"]).toContain("Hanken");
  });
});
