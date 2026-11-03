// The scenes. Each draws one moment of the story on the pixel canvas, given seconds since the
// scene began.
import { W, H, g, rect, px, hash, bands, disc, ease, lerp, span, clamp, text, textWidth, glow, noise } from "./pixel.js";
import { person, john, agent } from "./cast.js";

// --- props ---

function desk(x, y, w, top = "#8a5a35", front = "#6b4428") {
  rect(x, y, w, 3, top);
  rect(x, y + 3, w, 4, front);
  rect(x + 3, y + 7, 3, H - y - 7, front);
  rect(x + w - 6, y + 7, 3, H - y - 7, front);
}

function chair(x, y, c = "#3a3346") {
  rect(x, y, 10, 2, c);
  rect(x - 1, y - 12, 2, 14, c);
  rect(x + 4, y + 2, 2, H - y - 6, c);
  rect(x + 1, H - 5, 8, 1, c);
}

function plant(x, y) {
  rect(x, y - 6, 8, 6, "#b5653e");
  rect(x + 1, y - 7, 6, 1, "#c9784d");
  const leaves = [[3, -12], [0, -10], [6, -11], [2, -15], [5, -14], [-1, -13], [7, -9]];
  for (const [dx, dy] of leaves) rect(x + dx, y + dy, 2, 3, dx % 2 ? "#3f8a52" : "#58a868");
}

// Lines of code on a dark screen, scrolling up.
function code(x, y, w, h, t, speed = 5) {
  const colors = ["#7fb3ff", "#e6c35c", "#9bd18a", "#e9a582", "#c792ea", "#9198a1"];
  const off = (t * speed) % 3;
  for (let i = 0; i < Math.floor(h / 3) + 1; i++) {
    const row = i + Math.floor(t * speed / 3);
    const yy = y + i * 3 - off;
    if (yy < y || yy > y + h - 2) continue;
    const indent = Math.floor(hash(row, 1) * 3) * 2;
    let xx = x + 1 + indent;
    for (let k = 0; k < 3; k++) {
      const len = 2 + Math.floor(hash(row, k) * 6);
      if (xx + len > x + w - 1) break;
      rect(xx, yy, len, 1, colors[Math.floor(hash(row, k + 5) * colors.length)]);
      xx += len + 1;
    }
  }
}

// The 3U CubeSat, standing up: solar cells in a gold frame. open: 0..1 unfolds the wings.
function cubesat(x, y, open = 0, led = false) {
  rect(x, y, 8, 22, "#c9a24a");
  rect(x + 1, y + 1, 6, 20, "#1c2a4e");
  for (let j = 0; j < 3; j++) {
    rect(x + 1, y + 1 + j * 7, 6, 6, "#22356a");
    rect(x + 1, y + 4 + j * 7, 6, 1, "#34508c");
    rect(x + 4, y + 1 + j * 7, 1, 6, "#34508c");
  }
  if (led) px(x + 6, y + 2, "#ff5a4f");
  const wing = Math.round(open * 16);
  if (wing > 0) {
    for (const side of [-1, 1]) {
      const wx = side < 0 ? x - wing - 1 : x + 9;
      rect(wx, y + 2, wing, 18, "#c9a24a");
      rect(wx + (side < 0 ? 1 : 0), y + 3, Math.max(0, wing - 1), 16, "#22356a");
      for (let k = 3; k < wing - 1; k += 4) rect(wx + (side < 0 ? wing - 1 - k : k), y + 3, 1, 16, "#34508c");
      rect(wx, y + 11, wing, 1, "#34508c");
      rect(side < 0 ? x - 1 : x + 8, y + 10, 1, 2, "#c9a24a");
    }
  }
}

function earth(cx, cy, r, t) {
  const top = Math.max(0, Math.floor(cy - r - 4));
  for (let y = top; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > r + 4) continue;
      if (d > r) {
        px(x, y, d < r + 1.5 ? "#9fd0ff" : d < r + 3 ? "#4f86d8" : "#24407a");
        continue;
      }
      const u = (x + t * 2.5) / 26;
      const v = y / 18;
      const land = noise(u, v, 1) * 0.7 + noise(u * 2.3, v * 2.3, 2) * 0.3;
      let c = land > 0.6 ? (land > 0.72 ? "#a08f5c" : "#55925a") : land > 0.56 ? "#3f78c0" : "#2c5fae";
      const cloud = noise((x + t * 4) / 14, y / 7, 3) * 0.75 + noise((x + t * 4) / 5, y / 3, 4) * 0.25;
      if (cloud > 0.7) c = cloud > 0.78 ? "#f1f5fb" : "#c9d6ea";
      const night = x < cx - r * 0.58 + (y - cy) * 0.22;
      if (night) c = c === "#f1f5fb" || c === "#c9d6ea" ? "#4c5674" : land > 0.6 && hash(x, y, 9) > 0.9 ? "#ffd27a" : "#13213f";
      if (d > r - 2) c = d > r - 1 ? "#cfe6ff" : c;
      px(x, y, c);
    }
}

function stars(t, seed = 1, density = 70) {
  for (let i = 0; i < density; i++) {
    const x = Math.floor(hash(i, seed) * W);
    const y = Math.floor(hash(i, seed + 1) * H);
    const tw = hash(i, Math.floor(t * 3 + i));
    px(x, y, tw > 0.85 ? "#ffffff" : tw > 0.4 ? "#b8c4e6" : "#56608a");
  }
}

// --- 1. Thessaloniki: the waterfront at sunset ---

export function thessaloniki(t) {
  const cam = t * 4;
  bands(0, 80, ["#1c2a55", "#2c3c70", "#4a4f88", "#755f96", "#a76d92", "#d4808a", "#eb9b80", "#f6bd86"]);
  const sx = 268;
  const sy = 60;
  disc(sx, sy, 13, "#f7c78d55");
  disc(sx, sy, 11, "#fbd69b88");
  disc(sx, sy, 8, "#ffe8b0");
  const ridge = (offset, color, peaks) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, 80);
    for (let x = 0; x <= W; x += 2) {
      const wx = x + offset;
      let y = 80;
      for (const [p0, h, w] of peaks) y = Math.min(y, 80 - h * Math.max(0, 1 - Math.abs(wx - p0) / w));
      g.lineTo(x, y + Math.round(hash(Math.floor(wx / 3)) * 1.5));
    }
    g.lineTo(W, 80);
    g.closePath();
    g.fill();
  };
  ridge(cam * 0.08, "#7a5f86", [[150, 9, 70], [236, 26, 64], [300, 14, 60], [380, 10, 80]]);
  ridge(cam * 0.08, "#685077", [[120, 6, 60], [250, 18, 40], [330, 9, 50]]);
  const peak = 236 - cam * 0.08;
  rect(peak - 3, 55, 6, 1, "#e6d6e4");
  rect(peak - 1, 54, 3, 1, "#f1e6ee");
  rect(peak - 5, 56, 3, 1, "#cdb9d0");
  bands(80, 105, ["#3b3f74", "#45457a", "#57508a", "#4a4a80"]);
  for (let y = 81; y < 104; y += 2) {
    const spread = 1.5 + (y - 80) * 0.45;
    for (let x = Math.floor(sx - spread); x < sx + spread; x += 2) {
      const n = hash(x, y, Math.floor(t * 4 + x * 0.3));
      if (n > 0.8) rect(x, y, n > 0.93 ? 3 : 2, 1, n > 0.95 ? "#ffe8b0" : "#f0ad7c");
    }
  }
  for (let i = 0; i < 26; i++) {
    const x = (hash(i, 7) * W + t * 3 * (0.5 + hash(i, 9))) % W;
    if (hash(i, Math.floor(t * 2)) > 0.4) rect(x, 84 + Math.floor(hash(i, 8) * 19), 2, 1, "#6a64a0");
  }
  rect(0, 104, W, 2, "#e3b28a");
  rect(0, 106, W, 30, "#7d6a6c");
  for (let y = 108; y < H; y += 5) rect(0, y, W, 1, "#8c7778");
  for (let x = -(cam % 14); x < W; x += 14) for (let y = 108; y < H; y += 10) rect(x + (y % 20 ? 7 : 0), y, 1, 5, "#6f5e60");
  rect(0, 128, W, 8, "#6a585b");
  for (let i = 0; i < 6; i++) {
    const x = Math.round(i * 70 + 30 - ((cam * 0.95) % 70));
    rect(x, 84, 1, 22, "#3a2f43");
    rect(x - 1, 83, 3, 2, "#3a2f43");
    px(x, 85, "#ffd88f");
    px(x, 86, "#f0b46e");
  }
  // The White Tower.
  const tx = Math.round(46 - cam * 0.6);
  const ty = 104;
  for (let x = 0; x < 26; x++) {
    const k = x / 25;
    rect(tx + x, ty - 44, 1, 44, k < 0.25 ? "#c9b199" : k < 0.55 ? "#dccab3" : k < 0.85 ? "#efdfc8" : "#f7ead6");
  }
  for (const y of [ty - 30, ty - 16]) rect(tx, y, 26, 1, "#c6ae95");
  for (let i = 0; i < 4; i++) {
    rect(tx + 5 + i * 6, ty - 26, 1, 3, "#6a5444");
    rect(tx + 6 + i * 6, ty - 12, 1, 3, "#6a5444");
  }
  for (let x = 0; x < 26; x += 4) rect(tx + x, ty - 46, 2, 2, x < 10 ? "#cdb59c" : "#f1e2cb");
  const cx = tx + 8;
  for (let x = 0; x < 10; x++) rect(cx + x, ty - 56, 1, 10, x < 3 ? "#cbb39a" : x < 7 ? "#e5d3bc" : "#f4e6d1");
  for (let x = 0; x < 10; x += 3) rect(cx + x, ty - 58, 2, 2, "#ead9c2");
  rect(cx + 4, ty - 53, 1, 3, "#6a5444");
  rect(cx + 5, ty - 66, 1, 8, "#4a3a3a");
  const wave = Math.floor(t * 4) % 2;
  rect(cx + 6, ty - 66 + wave, 5, 3, "#3f6fb5");
  rect(cx + 6, ty - 65 + wave, 5, 1, "#f2efe8");
  // The Umbrellas.
  const ux = Math.round(196 - cam * 0.6);
  for (const [dx, h, r] of [[0, 34, 9], [7, 44, 11], [15, 28, 8], [22, 40, 10], [30, 31, 9]]) {
    rect(ux + dx, 104 - h, 1, h, "#3b2f45");
    g.fillStyle = "#3b2f45";
    g.beginPath();
    g.moveTo(ux + dx - r, 104 - h + 3);
    g.quadraticCurveTo(ux + dx, 104 - h - r * 0.7, ux + dx + r + 1, 104 - h + 3);
    g.closePath();
    g.fill();
  }
  for (let i = 0; i < 4; i++) {
    const x = ((hash(i, 3) * W + t * (10 + i * 3)) % (W + 20)) - 10;
    const y = 18 + hash(i, 4) * 30 + Math.sin(t * 2 + i) * 2;
    const up = Math.floor(t * 5 + i) % 2;
    px(x, y + up, "#2a2342");
    px(x + 1, y + 1 - up, "#2a2342");
    px(x + 2, y + up, "#2a2342");
  }
  const stroll = (x, y, c) => {
    const step = Math.floor(t * 6 + x) % 2;
    rect(x + 1, y - 13, 3, 3, c);
    rect(x, y - 10, 5, 6, c);
    rect(x + (step ? 0 : 1), y - 4, 2, 4, c);
    rect(x + (step ? 3 : 2), y - 4, 2, 4, c);
  };
  stroll(Math.round(260 - t * 3 - cam * 0.9), 124, "#4b3c4c");
  stroll(Math.round(118 - t * 2 - cam * 0.9), 123, "#544351");
  john(Math.round(lerp(40, 172, ease(t / 6.2))), 131, t, "walk");
}

// --- 2. First code: Android, MQTT and ESP8266 boards, at night ---

export function firstCode(t) {
  rect(0, 0, W, 112, "#2a2236");
  for (let x = 4; x < W; x += 8) rect(x, 0, 1, 112, "#30283c");
  rect(0, 112, W, 24, "#3a2c2a");
  for (let y = 116; y < H; y += 6) rect(0, y, W, 1, "#33262a");
  // Window onto the city at night.
  rect(222, 16, 72, 56, "#5a4636");
  bands(19, 69, ["#121a38", "#18214a", "#212b58"], 225, 291);
  disc(278, 30, 5, "#f3ead0");
  disc(281, 28, 4, "#18214a");
  for (let i = 0; i < 30; i++) {
    const x = 226 + Math.floor(hash(i, 21) * 64);
    const y = 56 + Math.floor(hash(i, 22) * 12);
    if (hash(i, Math.floor(t * 1.5)) > 0.25) px(x, y, hash(i, 23) > 0.5 ? "#ffd27a" : "#f6b35f");
  }
  rect(257, 19, 1, 50, "#5a4636");
  rect(225, 43, 66, 1, "#5a4636");
  // Shelf with books.
  rect(30, 44, 74, 2, "#5a4030");
  const spines = ["#b5543c", "#3f6fb5", "#d9a441", "#4f8b5a", "#8a5cc0", "#c9784d", "#2f8aa0"];
  for (let i = 0, x = 34; x < 90; i++) {
    const w = 3 + Math.floor(hash(i, 30) * 3);
    const h = 9 + Math.floor(hash(i, 31) * 6);
    rect(x, 44 - h, w, h, spines[i % spines.length]);
    x += w + 1;
  }
  plant(92, 44);
  // Desk lamp and its light.
  glow(84, 96, 26, "#f5c98a", 0.32);
  rect(70, 94, 10, 2, "#2c2b33");
  rect(74, 76, 1, 18, "#2c2b33");
  rect(74, 75, 9, 1, "#2c2b33");
  rect(80, 75, 6, 4, "#c9784d");
  px(83, 79, "#ffe3a3");
  desk(56, 96, 180);
  chair(88, 108);
  // Laptop with code.
  rect(124, 74, 30, 21, "#4a515c");
  rect(126, 76, 26, 17, "#0d1220");
  code(126, 76, 26, 17, t, 6);
  rect(120, 95, 38, 2, "#9aa3ad");
  // The phone flips a switch; a message crosses to the board; the LED lights.
  const period = 1.6;
  const k = (t % period) / period;
  const on = Math.floor(t / period) % 2 === 0;
  rect(162, 80, 9, 16, "#1b1d22");
  rect(163, 82, 7, 12, "#f2f2f2");
  rect(164, 86, 5, 3, on ? "#3fae74" : "#b9bec7");
  px(on ? 167 : 165, 87, "#ffffff");
  text("LED", 164, 90, "#6e7681");
  const fly = span(k, 0.05, 0.35);
  if (fly > 0 && fly < 1) {
    const mx = lerp(170, 196, fly);
    const my = 82 - Math.sin(fly * Math.PI) * 14;
    rect(mx, my, 2, 2, on ? "#3fae74" : "#e9a582");
  }
  rect(184, 92, 34, 4, "#e9e3d2");
  for (let x = 186; x < 216; x += 3) px(x, 93, "#c9c2ae");
  rect(190, 86, 12, 6, "#1f3557");
  for (let x = 191; x < 201; x += 2) px(x, 91, "#c9a24a");
  px(192, 88, "#9aa3ad");
  const lit = on ? k > 0.35 : k < 0.35;
  px(210, 90, lit ? "#ff5a4f" : "#5a2a2a");
  px(210, 89, lit ? "#ff8a7f" : "#5a2a2a");
  if (lit) glow(210, 89, 6, "#ff5a4f", 0.5);
  rect(202, 89, 8, 1, "#e05a4f");
  rect(202, 91, 3, 1, "#4a90e2");
  john(96, 120, t, "type");
}

// --- 3. Healthcare: VIDAVO ---

export function healthcare(t) {
  rect(0, 0, W, 104, "#e4e7ec");
  for (let x = 0; x < W; x += 16) rect(x, 0, 1, 104, "#dce0e6");
  rect(0, 104, W, 32, "#b9b2a8");
  for (let x = 0; x < W; x += 20) rect(x, 104, 1, 32, "#aea69b");
  // Window: Thessaloniki by day, the White Tower small on the water.
  rect(14, 12, 108, 70, "#c9ced6");
  bands(15, 64, ["#8ec0ec", "#a8d0f1", "#c4e0f6"], 17, 119);
  rect(17, 64, 102, 6, "#5b8fc7");
  rect(17, 66, 102, 1, "#7aa8d6");
  for (let i = 0; i < 12; i++) {
    const bx = 17 + i * 9;
    const bh = 6 + Math.floor(hash(i, 40) * 12);
    rect(bx, 70 - bh - 6, 8, bh, hash(i, 41) > 0.5 ? "#e8dcc8" : "#d9cbb4");
    for (let wy = 70 - bh - 4; wy < 62; wy += 3) px(bx + 2, wy, "#9fb3c8");
  }
  rect(62, 56, 3, 8, "#f4ead9");
  rect(17, 70, 102, 9, "#c9ced6");
  rect(66, 15, 1, 64, "#c9ced6");
  // Whiteboard with sticky notes.
  rect(196, 14, 100, 48, "#f7f8fa");
  rect(196, 14, 100, 1, "#c9ced6");
  rect(196, 61, 100, 2, "#aab1bb");
  const notes = ["#ffe58a", "#ffb3c1", "#b9f0c9", "#bfe0ff"];
  for (let i = 0; i < 8; i++) rect(204 + (i % 4) * 22, 20 + Math.floor(i / 4) * 18, 12, 11, notes[(i * 3) % 4]);
  for (let i = 0; i < 5; i++) rect(204, 54 - i, 40 + i * 6, 1, "#3f6fb5");
  plant(296, 104);
  desk(120, 98, 170, "#cfd3da", "#b3b9c2");
  // The monitor: a heartbeat, a pulsing heart, the rate.
  const mx = 170;
  const my = 56;
  rect(mx, my, 70, 42, "#2a2f38");
  rect(mx + 2, my + 2, 66, 36, "#0f1720");
  rect(mx + 33, my + 42, 4, 4, "#2a2f38");
  rect(mx + 26, my + 46, 18, 2, "#2a2f38");
  const beat = (x) => {
    const p = ((x + t * 30) % 22) / 22;
    if (p < 0.05) return -1;
    if (p < 0.08) return -9;
    if (p < 0.11) return 5;
    if (p < 0.16) return 0;
    if (p > 0.5 && p < 0.6) return -2;
    return 0;
  };
  let prev = beat(0);
  for (let x = 1; x < 62; x++) {
    const y = beat(x);
    const y0 = Math.min(prev, y);
    const y1 = Math.max(prev, y);
    rect(mx + 4 + x, my + 16 + y0, 1, y1 - y0 + 1, x > 54 ? "#2f7d54" : "#5ee08a");
    prev = y;
  }
  const big = (t * 1.25) % 1 < 0.18;
  const hx = mx + 6;
  const hy = my + 25;
  const heart = big ? ["01101100", "11111110", "11111110", "01111100", "00111000", "00010000"] : ["0101000", "1111100", "0111000", "0010000"];
  heart.forEach((row, j) => [...row].forEach((b, i) => b === "1" && px(hx + i - (big ? 1 : 0), hy + j - (big ? 1 : 0), "#ff5d6c")));
  text(`${72 + Math.round(Math.sin(t * 0.7) * 2)} BPM`, mx + 18, my + 26, "#f0f6fc");
  for (let i = 0; i < 6; i++) rect(mx + 46 + i * 3, my + 34 - (2 + Math.floor(hash(i, 44) * 6)), 2, 2 + Math.floor(hash(i, 44) * 6), "#79a7e0");
  john(146, 122, t, "type");
  chair(138, 110, "#6b7380");
  person(0, 246, 130, t, t > 1.5 ? "point" : "stand", true);
}

// --- 4. The lab at SpaceDot, and the throw ---

export function lab(t) {
  rect(0, 0, W, 100, "#232b40");
  for (let x = 0; x < W; x += 24) rect(x, 0, 1, 100, "#283149");
  rect(0, 100, W, 36, "#1b2133");
  for (let x = 0; x < W; x += 16) rect(x, 100, 1, 36, "#20273a");
  rect(0, 100, W, 1, "#2c3550");
  // Mission poster.
  disc(160, 34, 17, "#c9a24a");
  disc(160, 34, 15, "#1c2a4e");
  for (let i = 0; i < 14; i++) px(147 + Math.floor(hash(i, 50) * 26), 22 + Math.floor(hash(i, 51) * 24), "#cfd8f2");
  cubesat(156, 25, 0.7);
  text("ACUBESAT", 160 - textWidth("ACUBESAT") / 2, 56, "#c9a24a");
  // Benches: an oscilloscope, shelves of parts.
  rect(16, 60, 60, 2, "#3a4560");
  for (let i = 0; i < 5; i++) rect(20 + i * 11, 50, 8, 10, ["#3f6fb5", "#c9784d", "#4f8b5a", "#d9a441", "#8a5cc0"][i]);
  rect(250, 72, 44, 26, "#3a4560");
  rect(254, 76, 22, 14, "#0d1a14");
  for (let x = 0; x < 21; x++) px(255 + x, 83 + Math.round(Math.sin(x * 0.6 + t * 6) * 4), "#5ee08a");
  for (let i = 0; i < 3; i++) disc(282, 80 + i * 6, 2, "#8a96b0");
  // The team behind the clean table, the satellite on it. John lifts it, then throws it up.
  const grab = 3.0;
  const toss = 3.4;
  const cheer = t > 1.8;
  person(1, 92, 132, t, cheer ? "cheer" : "stand");
  person(2, 112, 132, t + 0.3, cheer ? "cheer" : "stand");
  person(0, 134, 132, t + 1.2, cheer ? "cheer" : "stand");
  john(166, 132, t, t > grab - 0.2 ? "cheer" : "stand", true);
  person(3, 190, 132, t + 0.6, cheer ? "cheer" : "stand", true);
  person(4, 212, 132, t + 0.9, cheer ? "cheer" : "stand", true);
  rect(84, 121, 154, 3, "#dfe5ee");
  rect(84, 124, 154, 6, "#b8c2d2");
  rect(84, 130, 154, 1, "#9aa6ba");
  rect(90, 131, 3, 5, "#9aa6ba");
  rect(229, 131, 3, 5, "#9aa6ba");
  if (t < grab) cubesat(150, 99, 0, Math.floor(t * 3) % 2 === 0);
  else if (t < toss) cubesat(168, Math.round(lerp(99, 80, ease(span(t, grab, toss)))), 0, true);
  else {
    const k = span(t, toss, toss + 0.7);
    const y = lerp(80, -40, ease(k));
    cubesat(Math.round(168 + k * 10), Math.round(y), 0, true);
    for (let i = 1; i < 5; i++) px(171 + k * 10, Math.round(y) + 22 + i * 4, "#ffd88f");
  }
}

// --- 5. Orbit ---

export function orbit(t) {
  bands(0, H, ["#03040a", "#05071a", "#080c22", "#0b112b"]);
  stars(t, 3, 90);
  glow(286, 20, 16, "#fff2c6", 0.6);
  disc(286, 20, 4, "#fff6dc");
  earth(250, 430, 345, t);
  const k = ease(span(t, 0, 1.6));
  const x = Math.round(lerp(60, 150, k));
  const y = Math.round(lerp(150, 46, k));
  cubesat(x, y, ease(span(t, 1.8, 2.6)), true);
  const ant = Math.round(ease(span(t, 2.6, 3.0)) * 8);
  if (ant) rect(x + 4, y - ant, 1, ant, "#e8edf5");
  for (let i = 0; i < 4; i++) {
    const p = (t - 3.1 - i * 0.55) / 1.6;
    if (p <= 0 || p >= 1) continue;
    const r = 6 + p * 40;
    g.strokeStyle = `rgba(127,212,255,${(1 - p) * 0.9})`;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(x + 4, y + 11, r, Math.PI * 0.15, Math.PI * 0.55);
    g.stroke();
  }
}

// --- 6. Skiing to Ireland ---

const SLOPE = (x) => (x < 200 ? 38 + x * 0.32 : 110);
const HILLS = (x) => 104 - Math.round(Math.sin((x - 430) * 0.03) * 4 + Math.sin((x - 430) * 0.07) * 2);

export function ski(t) {
  const world = 660;
  // John's path: down the slope, off the edge, over the sea, onto the hills, then walking.
  let jx;
  let jy;
  let pose = "ski";
  if (t < 2.1) {
    jx = lerp(16, 196, ease(span(t, 0, 2.1)) * 0.6 + span(t, 0, 2.1) * 0.4);
    jy = SLOPE(jx);
  } else if (t < 3.7) {
    const k = span(t, 2.1, 3.7);
    jx = lerp(196, 452, k);
    jy = lerp(SLOPE(196), HILLS(452), k) - Math.sin(k * Math.PI) * 62;
  } else {
    const k = span(t, 3.7, 6);
    jx = lerp(452, 560, ease(k));
    jy = HILLS(jx);
    pose = t > 4.1 ? "walk" : "ski";
  }
  const cam = clamp(jx - 130, 0, world - W);
  bands(0, 112, ["#4f84cf", "#679ad9", "#86b1e4", "#a9c9ee", "#cde0f5"]);
  // Far mountains, and the sun.
  disc(250 - cam * 0.1, 26, 7, "#fff4d0");
  g.fillStyle = "#b9c9de";
  g.beginPath();
  g.moveTo(0, 112);
  for (let x = 0; x <= W; x += 2) g.lineTo(x, 70 + Math.sin((x + cam * 0.2) * 0.05) * 10 + Math.sin((x + cam * 0.2) * 0.013) * 14);
  g.lineTo(W, 112);
  g.fill();
  // The sea.
  for (let x = 0; x < W; x++) {
    const wx = x + cam;
    if (wx < 200 || wx > 470) continue;
    rect(x, 110, 1, 26, "#3d6fb0");
    if ((wx + Math.floor(t * 8)) % 9 < 3) px(x, 110 + ((wx * 7) % 5) * 4, "#7fa8dc");
  }
  // The slope.
  for (let x = 0; x < W; x++) {
    const wx = x + cam;
    if (wx >= 200) continue;
    const y = SLOPE(wx);
    rect(x, y, 1, H - y, "#eef2f7");
    rect(x, y + 6 + Math.round(hash(Math.floor(wx / 6)) * 3), 1, H, "#d6dfea");
    if (hash(wx, 60) > 0.92) px(x, y + 1, "#c9d3e0");
  }
  for (let i = 0; i < 5; i++) {
    const tx = 30 + i * 38 - cam;
    const ty = SLOPE(30 + i * 38) - 1;
    rect(tx, ty - 10, 1, 10, "#4a3a32");
    for (let j = 0; j < 4; j++) rect(tx - 3 + j, ty - 9 + j * 2, 7 - j * 2, 2, "#2f5d47");
  }
  // Ireland: green hills, rain, Dublin, and the office.
  for (let x = 0; x < W; x++) {
    const wx = x + cam;
    if (wx < 430) continue;
    const y = HILLS(wx);
    rect(x, y, 1, H - y, wx % 13 < 7 ? "#4f9a4a" : "#489043");
    rect(x, y + 8, 1, H, "#3d7d3c");
  }
  const houses = ["#c2453a", "#3f6fb5", "#e6c35c", "#4f8b5a", "#8a5cc0"];
  for (let i = 0; i < 5; i++) {
    const hx = 482 + i * 13 - cam;
    const hy = HILLS(482 + i * 13);
    rect(hx, hy - 18, 12, 18, "#a65f45");
    for (let wy = hy - 15; wy < hy - 6; wy += 5) rect(hx + 2, wy, 2, 3, "#f2efe8"), rect(hx + 8, wy, 2, 3, "#f2efe8");
    rect(hx + 4, hy - 5, 4, 5, houses[i]);
  }
  const spire = 548 - cam;
  rect(spire, HILLS(548) - 60, 1, 60, "#c9d1dc");
  const ox = 566 - cam;
  const oy = HILLS(566);
  rect(ox, oy - 40, 52, 40, "#9fb8cf");
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) rect(ox + 3 + c * 8, oy - 37 + r * 6, 6, 4, (r + c) % 3 ? "#c9dbeb" : "#e3edf6");
  text("MICROSOFT", ox + 26 - textWidth("MICROSOFT") / 2, oy - 47, "#3a4656");
  const cloudX = 470 - cam;
  for (const [dx, dy, r] of [[0, 0, 8], [10, -4, 10], [22, 0, 8], [14, 3, 7]]) disc(cloudX + dx, 22 + dy, r, "#9aa4b5");
  for (let i = 0; i < 18; i++) {
    const rx = cloudX - 6 + Math.floor(hash(i, 70) * 36);
    const ry = 30 + ((t * 60 + hash(i, 71) * 60) % 50);
    rect(rx, ry, 1, 2, "#7f9bc4");
  }
  john(Math.round(jx - cam), Math.round(jy), t, pose);
}

// --- 7. Real-time co-authoring ---

export function coauthor(t) {
  rect(0, 0, W, 100, "#e9ecf1");
  rect(0, 100, W, 36, "#c7c2ba");
  for (let x = 0; x < W; x += 24) rect(x, 100, 1, 36, "#bcb6ad");
  for (let x = 8; x < 60; x += 10) rect(x, 10, 6, 70, "#d9dee6");
  for (let x = 260; x < 312; x += 10) rect(x, 10, 6, 70, "#d9dee6");
  // The shared document on the wall, with four people's cursors in it.
  const sx = 90;
  const sy = 10;
  const cw = 14;
  const ch = 7;
  const cols = 10;
  const rows = 9;
  rect(sx - 3, sy - 3, cols * cw + 6, rows * ch + 6, "#1e232b");
  rect(sx, sy, cols * cw, rows * ch, "#f8f9fb");
  rect(sx, sy, cols * cw, ch, "#eef1f5");
  for (let c = 0; c <= cols; c++) rect(sx + c * cw, sy, 1, rows * ch, "#e1e5eb");
  for (let r = 0; r <= rows; r++) rect(sx, sy + r * ch, cols * cw, 1, "#e1e5eb");
  const people = [
    ["#DB8A62", "#f8e4d7", 0.0],
    ["#4a8fe0", "#dbe8f9", 1.7],
    ["#3fae74", "#d8f1e3", 3.1],
    ["#9b6ad8", "#ebdff8", 4.6],
  ];
  const cell = (i, step) => {
    const n = hash(i, step, 80);
    return [Math.floor(n * cols), 1 + Math.floor(hash(i, step, 81) * (rows - 1))];
  };
  const STEP = 0.32;
  const steps = Math.floor(t / STEP);
  people.forEach(([, tint], i) => {
    for (let s = 0; s < steps; s++) {
      const [c, r] = cell(i, s);
      rect(sx + c * cw + 1, sy + r * ch + 1, cw - 1, ch - 1, tint);
      rect(sx + c * cw + 3, sy + r * ch + 3, 3 + Math.floor(hash(i, s, 82) * 7), 1, "#5b6470");
    }
  });
  people.forEach(([color], i) => {
    const [c0, r0] = cell(i, Math.max(0, steps - 1));
    const [c1, r1] = cell(i, steps);
    const k = ease(((t % STEP) / STEP) * 1.6);
    const x = Math.round(sx + lerp(c0, c1, k) * cw + 2);
    const y = Math.round(sy + lerp(r0, r1, k) * ch + 1);
    rect(x, y, 1, ch - 1, color);
    rect(x, y - 3, 6, 3, color);
  });
  // Three of the people, at their laptops.
  const seats = [[46, 1, "#4a8fe0"], [142, "john", "#DB8A62"], [238, 2, "#3fae74"]];
  for (const [x, who, color] of seats) {
    desk(x - 14, 110, 46, "#cfd3da", "#b3b9c2");
    rect(x + 13, 98, 16, 12, "#3a4048");
    rect(x + 14, 99, 14, 10, color);
    rect(x + 11, 110, 20, 1, "#9aa3ad");
    chair(x - 4, 116, "#6b7380");
    person(who, x - 6, 126, t + x, "type");
  }
}

// --- 8. Agent memory, the patent ---

export function memory(t) {
  rect(0, 0, W, H, "#0d1117");
  for (let x = -160; x < W + 160; x += 20) {
    g.strokeStyle = "#161c26";
    g.beginPath();
    g.moveTo(160 + (x - 160) * 0.25, 92);
    g.lineTo(x, H);
    g.stroke();
  }
  for (const y of [92, 98, 106, 117, 131]) rect(0, y, W, 1, "#161c26");
  // Agents at work across the floor.
  for (let i = 0; i < 6; i++) {
    const lane = 96 + (i % 3) * 10;
    const x = Math.round(((hash(i, 90) * 200 + t * (14 + i * 3) * (i % 2 ? 1 : -1)) % 200 + 200) % 200 + 90);
    agent(x, lane, t, i);
    if (i % 2) rect(x + 10, lane + 4, 3, 4, "#e9e3d2");
  }
  // Memories rise from them, each with a face and what it holds, and settle onto the shelf.
  const shelfX = 236;
  for (let i = 0; i < 9; i++) {
    const born = i * 0.45;
    const k = span(t, born, born + 1.6);
    if (k <= 0) continue;
    const startX = 110 + hash(i, 91) * 110;
    const slot = i % 5;
    const dropped = i === 2 || i === 6;
    const x = Math.round(lerp(startX, shelfX + (i > 4 ? 30 : 0), ease(k)));
    const y = Math.round(lerp(92, 20 + slot * 14, ease(k)));
    if (dropped && t > born + 2.2) continue;
    const promoted = !dropped && t > born + 1.6 && i % 3 === 0;
    rect(x, y, 24, 11, "#1c232c");
    rect(x, y, 24, 1, promoted ? "#DB8A62" : "#3d444d");
    rect(x, y + 10, 24, 1, promoted ? "#DB8A62" : "#3d444d");
    rect(x, y, 1, 11, promoted ? "#DB8A62" : "#3d444d");
    rect(x + 23, y, 1, 11, promoted ? "#DB8A62" : "#3d444d");
    rect(x + 2, y + 3, 4, 4, ["#6C9BD2", "#B58BD6", "#7DBB99", "#E9A582"][i % 4]);
    rect(x + 8, y + 3, 13, 1, "#9198a1");
    rect(x + 8, y + 6, 9, 1, "#6e7681");
  }
  // John at the console, tuning what gets kept.
  rect(30, 84, 44, 26, "#1c232c");
  rect(30, 84, 44, 1, "#3d444d");
  for (let i = 0; i < 4; i++) {
    rect(36 + i * 9, 88, 1, 14, "#3d444d");
    const level = 0.5 + Math.sin(t * 1.3 + i * 1.7) * 0.4;
    rect(34 + i * 9, 88 + Math.round(level * 12), 5, 2, i === 1 ? "#DB8A62" : "#9198a1");
  }
  john(76, 130, t, "point", true);
  // An idea, then the patent.
  if (t > 3.4) {
    const p = ease(span(t, 3.4, 3.8));
    glow(82, 92 - 10, Math.round(8 * p), "#ffd86b", 0.6);
    disc(82, 82, 3 * p, "#ffe58a");
    rect(81, 85, 3, 2, "#c9a24a");
  }
  if (t > 3.9) {
    const k = ease(span(t, 3.9, 4.4));
    const dx = Math.round(lerp(330, 150, k));
    rect(dx, 14, 46, 60, "#f2efe6");
    rect(dx, 14, 46, 1, "#ffffff");
    for (let i = 0; i < 9; i++) rect(dx + 5, 24 + i * 5, 30 + Math.floor(hash(i, 95) * 8), 1, "#b7b0a2");
    text("PATENT", dx + 5, 17, "#5b5348");
    if (t > 4.6) {
      const s = 1 + Math.max(0, 1 - span(t, 4.6, 4.85)) * 0.6;
      const w = textWidth("EP4651035") + 6;
      const sx = dx + 23 - (w * s) / 2;
      g.save();
      g.translate(sx, 52);
      g.scale(s, s);
      g.strokeStyle = "#c2453a";
      g.lineWidth = 1;
      g.strokeRect(0.5, 0.5, w, 10);
      g.restore();
      text("EP4651035", Math.round(dx + 23 - (w - 6) / 2), 55, "#c2453a");
    }
  }
}

// --- 9. Build ---

export function build(t) {
  rect(0, 0, W, H, "#06070d");
  // Spotlights sweeping the stage.
  for (const [ox, phase] of [[40, 0], [280, 2]]) {
    const a = Math.sin(t * 0.9 + phase) * 0.35;
    g.fillStyle = "rgba(160,190,255,0.06)";
    g.beginPath();
    g.moveTo(ox, 0);
    g.lineTo(206 + a * 140 - 26, 104);
    g.lineTo(206 + a * 140 + 26, 104);
    g.closePath();
    g.fill();
  }
  // The big screen: memory first, then agents handing work to agents.
  const sx = 118;
  const sy = 8;
  rect(sx - 2, sy - 2, 200, 78, "#1c2230");
  rect(sx, sy, 196, 74, "#0f1626");
  const second = t > 2.6;
  text(second ? "BUILD 2025" : "BUILD 2024", sx + 8, sy + 7, "#f0f6fc", 2);
  if (!second) {
    agent(sx + 30, sy + 40, t, 1);
    for (let i = 0; i < 4; i++) {
      const y = sy + 28 + i * 11;
      rect(sx + 64, y, 40, 8, "#1c232c");
      rect(sx + 64, y, 40, 1, i === 1 ? "#DB8A62" : "#3d444d");
      rect(sx + 67, y + 3, 3, 3, ["#6C9BD2", "#B58BD6", "#7DBB99", "#E9A582"][i]);
      rect(sx + 73, y + 3, 24, 1, "#9198a1");
    }
    text("MEMORY", sx + 116, sy + 46, "#E9A582", 2);
  } else {
    const nodes = [[30, 44], [80, 28], [80, 58], [130, 28], [130, 58], [170, 44]];
    const k = span(t, 2.7, 4.2);
    nodes.forEach(([nx, ny], i) => {
      if (i > 0) {
        const [px0, py0] = nodes[i < 3 ? 0 : i < 5 ? i - 2 : 3];
        g.strokeStyle = k > i / 6 ? "#DB8A62" : "#3d444d";
        g.beginPath();
        g.moveTo(sx + px0 + 5, sy + py0 + 4);
        g.lineTo(sx + nx + 5, sy + ny + 4);
        g.stroke();
      }
    });
    nodes.forEach(([nx, ny], i) => agent(sx + nx, sy + ny, t, i));
  }
  // The stage, the presenter, the crowd.
  rect(0, 100, W, 10, "#1c2230");
  rect(0, 100, W, 1, "#4a8fe0");
  const pres = ["#2a3040"];
  glow(209, 92, 16, "#9fb8ff", 0.35);
  rect(206, 76, 6, 6, pres[0]);
  rect(204, 82, 10, 12, pres[0]);
  rect(205, 94, 3, 6, pres[0]);
  rect(210, 94, 3, 6, pres[0]);
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 30; i++) {
      const x = i * 11 + (row % 2) * 5 - 4;
      const y = 114 + row * 8 + Math.round(Math.sin(t * 3 + i + row) * (t > 1.2 && t < 2.2 ? 1 : 0));
      rect(x, y, 7, 6, row === 0 ? "#151a26" : row === 1 ? "#11151f" : "#0c0f17");
      rect(x - 1, y + 5, 9, 4, row === 0 ? "#151a26" : row === 1 ? "#11151f" : "#0c0f17");
      if (hash(i, row, Math.floor(t * 2)) > 0.93) px(x + 3, y + 2, "#cfe0ff");
    }
  john(40, 130, t, t > 1.0 && t < 2.4 ? "cheer" : "stand");
}

// --- 10. ML lead: on top of it all ---

export function lead(t) {
  bands(0, 104, ["#1c2a55", "#2c3c70", "#4a4f88", "#755f96", "#a76d92", "#d4808a", "#eb9b80", "#f6bd86"]);
  disc(70, 78, 10, "#ffe8b0");
  g.fillStyle = "#3a3150";
  g.beginPath();
  g.moveTo(0, 104);
  for (let x = 0; x <= W; x += 2) g.lineTo(x, 96 + Math.sin(x * 0.04) * 3);
  g.lineTo(W, 104);
  g.fill();
  rect(0, 104, W, 32, "#2a2440");
  for (let y = 108; y < H; y += 6) rect(0, y, W, 1, "#312a49");
  // Agents fly in and stack into a tower: 7, 5, 3.
  const rowsOf = [7, 5, 3];
  let n = 0;
  const base = 128;
  rowsOf.forEach((count, r) => {
    for (let i = 0; i < count; i++, n++) {
      const x = 160 - (count * 12) / 2 + i * 12 + 1;
      const y = base - 13 - r * 13;
      const k = ease(span(t, n * 0.09, n * 0.09 + 0.5));
      if (k <= 0) continue;
      const wave = span(t, 3.2 + (n % 7) * 0.08, 3.4 + (n % 7) * 0.08) > 0;
      agent(Math.round(x), Math.round(lerp(-20, y, k)), t * (k < 1 ? 0 : 1), n, wave ? "#ffb784" : "#DB8A62");
    }
  });
  // John on top, then the team around the base.
  const up = ease(span(t, 1.8, 2.4));
  if (up > 0) john(154, Math.round(lerp(60, 89, up)), t, t > 3.0 ? "cheer" : "stand");
  const team = [[26, 0, false], [50, 1, false], [74, 2, false], [236, 3, true], [260, 4, true], [284, 5, true]];
  for (const [x, who, flip] of team) {
    const k = ease(span(t, 0.6, 1.6));
    person(who, Math.round(flip ? lerp(330, x, k) : lerp(-20, x, k)), 131, t + x, k < 1 ? "walk" : t > 3.0 ? "cheer" : "stand", flip);
  }
}
