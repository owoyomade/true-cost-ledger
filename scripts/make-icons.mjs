// Draws the four-leaf clover mark as PNG app icons with no image dependencies.
// Run with `npm run icons`; output goes to public/.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const GREEN = [0x2f, 0x6b, 0x47];
const CREAM = [0xf2, 0xf5, 0xf1];
const SS = 4; // supersampling per axis

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))
  ]);
}

// Shape in a 0..40 unit box, matching the in-app SVG mark.
const leaves = [[14, 14], [26, 14], [14, 26], [26, 26]];
function sample(u, v, { rounded, scale }) {
  // background: rounded square (or full bleed)
  let bg = true;
  if (rounded) {
    const r = 9, x = Math.min(u, 40 - u), y = Math.min(v, 40 - v);
    if (x < r && y < r) bg = (r - x) ** 2 + (r - y) ** 2 <= r * r;
  }
  if (!bg) return null;
  // map into the scaled clover area around the centre
  const cu = 20 + (u - 20) / scale, cv = 20 + (v - 20) / scale;
  if ((cu - 20) ** 2 + (cv - 20) ** 2 <= 2.4 ** 2) return GREEN;
  for (const [x, y] of leaves) if ((cu - x) ** 2 + (cv - y) ** 2 <= 7.5 ** 2) return CREAM;
  return GREEN;
}
function draw(size, opts) {
  const out = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const u = ((px + (sx + 0.5) / SS) / size) * 40, v = ((py + (sy + 0.5) / SS) / size) * 40;
      const c = sample(u, v, opts);
      if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
    }
    const i = (py * size + px) * 4, n = SS * SS;
    if (a) { out[i] = r / a; out[i + 1] = g / a; out[i + 2] = b / a; }
    out[i + 3] = Math.round((a / n) * 255);
  }
  return png(size, out);
}

mkdirSync("public", { recursive: true });
const files = {
  "icon-192.png": draw(192, { rounded: true, scale: 0.78 }),
  "icon-512.png": draw(512, { rounded: true, scale: 0.78 }),
  "icon-maskable-512.png": draw(512, { rounded: false, scale: 0.6 }),
  "apple-touch-icon.png": draw(180, { rounded: false, scale: 0.72 })
};
for (const [name, buf] of Object.entries(files)) writeFileSync(`public/${name}`, buf);
console.log("Wrote", Object.keys(files).join(", "));
