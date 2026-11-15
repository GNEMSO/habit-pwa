// Dev-only: generates icon PNGs from a shared drawing.
// Not part of the shipped app. Requires no dependencies (Node zlib only).
import { writeFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';

const NAVY = [13, 19, 28];       // #0D131C
const AMBER = [240, 160, 48];   // #F0A030
const CHECK = [43, 26, 0];      // #2B1A00

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(width, height, rgb) {
  // rgb: Uint8Array length width*height*3
  const scanlines = [];
  for (let y = 0; y < height; y++) {
    const line = new Uint8Array(width * 3 + 1);
    line[0] = 0; // filter: none
    line.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), 1);
    scanlines.push(line);
  }
  const raw = Buffer.concat(scanlines.map((b) => Buffer.from(b)));
  const idat = deflateRawSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), iend]);
}

function createImage(size) {
  const n = size * size;
  const rgb = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) {
    rgb[i * 3] = NAVY[0];
    rgb[i * 3 + 1] = NAVY[1];
    rgb[i * 3 + 2] = NAVY[2];
  }
  const set = (x, y, c) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 3;
    rgb[i] = c[0]; rgb[i + 1] = c[1]; rgb[i + 2] = c[2];
  };
  const fillCircle = (cx, cy, r, c) => {
    const r2 = r * r;
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) set(x, y, c);
      }
    }
  };
  const drawLine = (x1, y1, x2, y2, width, c) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) { set(Math.round(x1), Math.round(y1), c); return; }
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const half = width / 2;
    const steps = Math.max(1, Math.ceil(len / (width / 2)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = x1 + ux * len * t;
      const cy = y1 + uy * len * t;
      fillCircle(cx, cy, half, c);
    }
  };

  return { size, set, fillCircle, drawLine, getRGB: () => rgb };
}

function buildIcon(size, maskable) {
  const img = createImage(size);
  const cx = size / 2;
  const cy = size / 2;
  // amber circle: diameter fills 80% of the safe zone -> radius 0.40*size
  img.fillCircle(cx, cy, 0.40 * size, AMBER);
  // check mark: thick rounded check
  const w = 0.105 * size;
  const p1 = [0.31 * size, 0.52 * size];
  const p2 = [0.46 * size, 0.675 * size];
  const p3 = [0.70 * size, 0.40 * size];
  img.drawLine(p1[0], p1[1], p2[0], p2[1], w, CHECK);
  img.drawLine(p2[0], p2[1], p3[0], p3[1], w, CHECK);
  if (maskable) {
    // maskable: keep circle+check inside central 80% safe zone (already true),
    // full-bleed navy background is the default.
  }
  return encodePNG(size, size, img.getRGB());
}

function buildFavicon(size) {
  // Simplified: circle and check only on navy.
  const img = createImage(size);
  const cx = size / 2;
  const cy = size / 2;
  img.fillCircle(cx, cy, 0.34 * size, AMBER);
  const w = 0.13 * size;
  img.drawLine(0.28 * size, 0.50 * size, 0.44 * size, 0.66 * size, w, CHECK);
  img.drawLine(0.44 * size, 0.66 * size, 0.66 * size, 0.36 * size, w, CHECK);
  return encodePNG(size, size, img.getRGB());
}

function write(path, buf) { writeFileSync(path, buf); }

const out = 'icons/';
write(out + 'icon-192.png', buildIcon(192, false));
write(out + 'icon-512.png', buildIcon(512, false));
write(out + 'icon-maskable-512.png', buildIcon(512, true));
write(out + 'apple-touch-icon-180.png', buildIcon(180, false));
write(out + 'favicon-32.png', buildFavicon(32));
console.log('icons written');
