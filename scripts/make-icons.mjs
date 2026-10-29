// Draws the swing-tag mark as PNG app icons with no image dependencies.
// Run with `npm run icons`; output goes to public/.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const PLUM = [0x4a, 0x25, 0x45];
const BLUSH = [0xf1, 0xd7, 0xdb];
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

// Shape in a 0..40 unit box, matching the in-app SVG mark (index.html and public/favicon.svg):
// a blush swing tag with a punched hole and two "price" lines, on a plum square.
const TAG_TOP = [20, 6.5], TAG_SHOULDER_Y = 14.2, TAG_LEFT = 10.5, TAG_RIGHT = 29.5, TAG_BOTTOM = 33;
const HOLE = [20, 14.6, 2.4];
const LINES = [[14.5, 21, 11, 2.6], [14.5, 26, 7, 2.6]];
const LINE_RADIUS = 1.3;
function inRoundedRect(u, v, [x, y, w, h], r) {
  if (u < x || u > x + w || v < y || v > y + h) return false;
  const dx = Math.max(x + r - u, 0, u - (x + w - r)), dy = Math.max(y + r - v, 0, v - (y + h - r));
  return dx * dx + dy * dy <= r * r;
}
function inTag(u, v) {
  if (u < TAG_LEFT || u > TAG_RIGHT || v > TAG_BOTTOM) return false;
  if (v >= TAG_SHOULDER_Y) return true;
  // The pointed top: how far the sloping edge reaches out from the centre at this height.
  const reach = ((v - TAG_TOP[1]) / (TAG_SHOULDER_Y - TAG_TOP[1])) * (TAG_RIGHT - TAG_TOP[0]);
  return v >= TAG_TOP[1] && Math.abs(u - TAG_TOP[0]) <= reach;
}
function sample(u, v, { rounded, scale }) {
  // background: rounded square (or full bleed)
  if (rounded && !inRoundedRect(u, v, [0, 0, 40, 40], 10)) return null;
  // map into the scaled mark area around the centre
  const cu = 20 + (u - 20) / scale, cv = 20 + (v - 20) / scale;
  if (!inTag(cu, cv)) return PLUM;
  const [hx, hy, hr] = HOLE;
  if ((cu - hx) ** 2 + (cv - hy) ** 2 <= hr * hr) return PLUM;
  return LINES.some(l => inRoundedRect(cu, cv, l, LINE_RADIUS)) ? PLUM : BLUSH;
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
  "icon-192.png": draw(192, { rounded: true, scale: 1 }),
  "icon-512.png": draw(512, { rounded: true, scale: 1 }),
  "icon-maskable-512.png": draw(512, { rounded: false, scale: 0.6 }),
  "apple-touch-icon.png": draw(180, { rounded: false, scale: 0.85 })
};
for (const [name, buf] of Object.entries(files)) writeFileSync(`public/${name}`, buf);
console.log("Wrote", Object.keys(files).join(", "));
