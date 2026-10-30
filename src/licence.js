// Free trial and unlock codes. Pure logic with no DOM, so it is unit-tested directly.
//
// Anyone can use the app with up to FREE_LIMIT entries. Buyers get an unlock code in the PDF
// that Etsy or Gumroad delivers after purchase. Only SHA-256 hashes of valid codes live here,
// so reading the source doesn't reveal a working code.
// Run `npm run unlock-code` to make a new code; it prints the code and the hash to add below.

export const FREE_LIMIT = 25;

// Link to the Gumroad or Etsy listing. Leave empty until the listing is live; the Buy button stays hidden.
export const BUY_URL = "https://appnook.gumroad.com/l/truecostledger";

// Shown in Settings so buyers know where to get help. Leave empty to hide the line.
export const SUPPORT_EMAIL = "appnookstudio@gmail.com";

// Keep old hashes when adding a new one, so people who bought earlier versions stay unlocked.
export const CODE_HASHES = [
  "5d46db6bf4771f8c4c375b27431835121088e4b83c4bb64494245e63f9c94b8a",
  // Microsoft Store certification testers only. Remove this line to switch that code off.
  "c936ec753314b95adf0d5153dd9b2a17697868ed41b73990ab6f8e83604addbd"
];

/** Uppercases and strips spaces and dashes, so "tc-ab12 cd34" and "TCAB12CD34" match. */
export const normaliseCode = code => String(code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** SHA-256 of the normalised code, as lowercase hex. */
export async function hashCode(code) {
  const bytes = new TextEncoder().encode(normaliseCode(code));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function isValidCode(code, hashes = CODE_HASHES) {
  if (!normaliseCode(code)) return false;
  return hashes.includes(await hashCode(code));
}

// Sample records and settings don't count towards the trial.
export const countEntries = items => Object.values(items).filter(r => r.kind !== "settings" && !r.sample).length;

export const canAddEntry = (items, unlocked) => unlocked || countEntries(items) < FREE_LIMIT;
