// Drawing on the 320x136 pixel canvas: rectangles, noise, bands, sprites, a 3x5 font and the
// dithered fade between scenes.

export const W = 320;
export const H = 136;

export const art = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(W, H) : Object.assign(document.createElement("canvas"), { width: W, height: H });
export const g = art.getContext("2d");

export const rect = (x, y, w, h, c) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
export const px = (x, y, c) => rect(x, y, 1, 1, c);

// Deterministic noise, so every render of a frame is identical.
export function hash(a, b = 0, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const span = (t, a, b) => clamp((t - a) / (b - a));

// Horizontal bands from y0 to y1, with a dithered row between each pair.
export function bands(y0, y1, colors, x0 = 0, x1 = W) {
  const step = (y1 - y0) / colors.length;
  colors.forEach((c, i) => rect(x0, y0 + i * step, x1 - x0, step + 1, c));
  for (let i = 1; i < colors.length; i++) {
    const y = Math.round(y0 + i * step);
    for (let x = x0; x < x1; x += 2) px(x + (y % 2), y, colors[i - 1]);
  }
}

export function disc(x, y, r, c) {
  g.fillStyle = c;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

// One character per pixel; "." is empty. flip mirrors it to face left.
export function sprite(rows, palette, x, y, flip = false) {
  const w = rows[0].length;
  rows.forEach((row, j) => {
    for (let i = 0; i < w; i++) {
      const ch = row[flip ? w - 1 - i : i];
      if (ch && ch !== "." && palette[ch]) px(x + i, y + j, palette[ch]);
    }
  });
}

// A 3x5 pixel font for signs and screens. Each glyph is five rows of three bits.
const GLYPHS = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
  P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
  Z: "111001010100111", 0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110",
  4: "101101111001001", 5: "111100110001110", 6: "011100110101010", 7: "111001010010010", 8: "010101010101010",
  9: "010101011001110", ".": "000000000000010", "-": "000000111000000", ":": "000010000010000", "/": "001001010100100",
  "!": "010010010000010", "+": "000010111010000", " ": "000000000000000",
};

export function text(str, x, y, c, scale = 1) {
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const bits = GLYPHS[ch] ?? GLYPHS[" "];
    for (let i = 0; i < 15; i++) if (bits[i] === "1") rect(cx + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale, c);
    cx += 4 * scale;
  }
  return cx - x - scale;
}
export const textWidth = (str, scale = 1) => str.length * 4 * scale - scale;

// Ordered dithering toward a colour: amount 0 leaves the frame, 1 covers it.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function fade(amount, c = "#06070d") {
  if (amount <= 0) return;
  g.fillStyle = c;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (BAYER[(y % 4) * 4 + (x % 4)] < amount * 16) g.fillRect(x, y, 1, 1);
}

// A soft pool of light: a few faint discs, brightest in the middle.
export function glow(x, y, r, c, strength = 0.5) {
  for (let i = 3; i >= 1; i--) {
    g.globalAlpha = strength * 0.22;
    disc(x, y, (r * i) / 3, c);
  }
  g.globalAlpha = 1;
}

// Smooth value noise in 0..1, for coastlines and clouds.
export function noise(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
