// The scenes. Each draws one moment of the story on the 320x136 pixel canvas, given seconds since
// the scene began. A scene may return the door John leaves through, for the door transition.
import { W, H, art, g, rect, px, hash, bands, disc, ease, lerp, span, clamp, text, textWidth, glow, noise } from "./pixel.js";
import { person, john } from "./sprites.js";

// --- props, at the scale of a 24px person ---

function desk(x, y, w, floor = 130, top = "#8a5a35", front = "#6b4428") {
  rect(x, y, w, 2, top);
  rect(x, y + 2, w, 3, front);
  rect(x + 2, y + 5, 2, floor - y - 5, front);
  rect(x + w - 4, y + 5, 2, floor - y - 5, front);
}

function chair(x, floor, c = "#3a3346") {
  rect(x, floor - 6, 9, 2, c);
  rect(x, floor - 15, 2, 11, c);
  rect(x + 6, floor - 4, 2, 4, c);
}

function laptop(x, y, screen = "#0d1220", t = 0, code = false) {
  rect(x, y - 7, 10, 7, "#4a515c");
  rect(x + 1, y - 6, 8, 5, screen);
  if (code) for (let i = 0; i < 2; i++) rect(x + 2, y - 5 + i * 2, 2 + ((Math.floor(t * 4) + i) % 5), 1, "#7fb3ff");
  rect(x - 2, y, 14, 1, "#9aa3ad");
}

function plant(x, y) {
  rect(x, y - 6, 8, 6, "#b5653e");
  rect(x + 1, y - 7, 6, 1, "#c9784d");
  for (const [dx, dy] of [[3, -12], [0, -10], [6, -11], [2, -15], [5, -14], [-1, -13], [7, -9]]) rect(x + dx, y + dy, 2, 3, dx % 2 ? "#3f8a52" : "#58a868");
}

// The 3U CubeSat, standing up: solar cells in a gold frame. open: 0..1 unfolds the wings.
function cubesat(x, y, open = 0, led = false, small = false) {
  const w = small ? 6 : 8;
  const h = small ? 16 : 22;
  const cell = small ? 5 : 7;
  rect(x, y, w, h, "#c9a24a");
  rect(x + 1, y + 1, w - 2, h - 2, "#1c2a4e");
  for (let j = 0; j < 3; j++) {
    rect(x + 1, y + 1 + j * cell, w - 2, cell - 1, "#22356a");
    rect(x + 1, y + 1 + j * cell + Math.floor(cell / 2), w - 2, 1, "#34508c");
  }
  if (led) px(x + w - 2, y + 2, "#ff5a4f");
  const wing = Math.round(open * 16);
  if (wing > 0) {
    for (const side of [-1, 1]) {
      const wx = side < 0 ? x - wing - 1 : x + w + 1;
      rect(wx, y + 2, wing, h - 4, "#c9a24a");
      rect(wx + (side < 0 ? 1 : 0), y + 3, Math.max(0, wing - 1), h - 6, "#22356a");
      for (let k = 3; k < wing - 1; k += 4) rect(wx + (side < 0 ? wing - 1 - k : k), y + 3, 1, h - 6, "#34508c");
      rect(wx, y + Math.floor(h / 2), wing, 1, "#34508c");
    }
  }
}

// The same satellite lying on its side, for carrying.
function cubesatFlat(x, y, led = false) {
  rect(x, y, 16, 6, "#c9a24a");
  rect(x + 1, y + 1, 14, 4, "#1c2a4e");
  for (let i = 0; i < 3; i++) {
    rect(x + 1 + i * 5, y + 1, 4, 4, "#22356a");
    rect(x + 3 + i * 5, y + 1, 1, 4, "#34508c");
  }
  if (led) px(x + 14, y + 1, "#ff5a4f");
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

// A small agent: a dark squircle with a screen face and copper eyes, hovering a little.
export function agent(x, y, t, seed = 0, eye = "#DB8A62", body = "#262c36") {
  const yy = y + Math.round(Math.sin(t * 3 + seed * 1.7));
  rect(x + 1, yy, 8, 8, body);
  rect(x, yy + 1, 10, 6, body);
  rect(x + 1, yy + 1, 7, 1, "#3b4350");
  rect(x + 1, yy + 1, 1, 5, "#3b4350");
  rect(x + 2, yy + 2, 6, 4, "#11151b");
  if (Math.floor(t * 2 + seed * 3.1) % 9 !== 0) {
    rect(x + 3, yy + 3, 1, 2, eye);
    rect(x + 6, yy + 3, 1, 2, eye);
  }
  px(x + 5, yy - 1, "#4b535d");
  px(x + 5, yy - 2, eye);
  rect(x + 3, yy + 8, 4, 2, body);
}

// A speech balloon with a symbol, shown from t0 for len seconds.
const ICONS = {
  "!": ["..O..", "..O..", "..O..", ".....", "..O.."],
  "?": [".OOO.", "....O", "..OO.", ".....", "..O.."],
  note: ["..OOO", "..O.O", "..O..", "OOO..", "OOO.."],
  heart: [".O.O.", "OOOOO", "OOOOO", ".OOO.", "..O.."],
  idea: [".OOO.", "OYYYO", "OYYYO", ".OYO.", "..O.."],
  star: ["..O..", ".OOO.", "OOOOO", ".OOO.", ".O.O."],
};
function balloon(x, y, kind, t0, t, len = 1.6) {
  const k = t - t0;
  if (k < 0 || k > len) return;
  const bx = Math.round(x - 5);
  const by = Math.round(y - 12 + (k < 0.1 ? 1 : 0));
  rect(bx + 1, by, 9, 9, "#2a2230");
  rect(bx, by + 1, 11, 7, "#2a2230");
  rect(bx + 1, by + 1, 9, 7, "#ffffff");
  px(bx + 4, by + 9, "#2a2230");
  px(bx + 5, by + 9, "#2a2230");
  px(bx + 4, by + 8, "#ffffff");
  const color = kind === "heart" ? "#e8486a" : kind === "note" ? "#3f7fd0" : kind === "!" ? "#e05a3a" : kind === "star" ? "#e6a83a" : "#2a2230";
  ICONS[kind].forEach((row, j) => {
    for (let i = 0; i < 5; i++) {
      if (row[i] === "O") px(bx + 3 + i, by + 2 + j, color);
      if (row[i] === "Y") px(bx + 3 + i, by + 2 + j, "#ffd75e");
    }
  });
}

// Speech gets a slightly wider face than the 3x5 signs, so a name reads at a glance. Each glyph is
// five rows of its own width; letters without one fall back to the sign font.
const SPEECH = {
  A: ["0110", "1001", "1111", "1001", "1001"],
  B: ["1110", "1001", "1110", "1001", "1110"],
  C: ["0111", "1000", "1000", "1000", "0111"],
  D: ["1110", "1001", "1001", "1001", "1110"],
  E: ["1111", "1000", "1110", "1000", "1111"],
  F: ["1111", "1000", "1110", "1000", "1000"],
  G: ["0111", "1000", "1011", "1001", "0111"],
  H: ["1001", "1001", "1111", "1001", "1001"],
  I: ["111", "010", "010", "010", "111"],
  J: ["0011", "0001", "0001", "1001", "0110"],
  K: ["1001", "1010", "1100", "1010", "1001"],
  L: ["1000", "1000", "1000", "1000", "1111"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  N: ["1001", "1101", "1011", "1001", "1001"],
  O: ["0110", "1001", "1001", "1001", "0110"],
  P: ["1110", "1001", "1110", "1000", "1000"],
  R: ["1110", "1001", "1110", "1010", "1001"],
  S: ["0111", "1000", "0110", "0001", "1110"],
  T: ["11111", "00100", "00100", "00100", "00100"],
  U: ["1001", "1001", "1001", "1001", "0110"],
  V: ["10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10101", "11011", "10001"],
  Y: ["10001", "01010", "00100", "00100", "00100"],
  "!": ["1", "1", "1", "0", "1"],
  "?": ["0110", "1001", "0010", "0000", "0010"],
  "'": ["1", "1", "0", "0", "0"],
  " ": ["00", "00", "00", "00", "00"],
};
const speechWidth = (str) => [...str].reduce((w, ch) => w + (SPEECH[ch] ? SPEECH[ch][0].length : 3) + 1, -1);

// A speech bubble, typed out letter by letter, its tail on the speaker's head.
function say(x, y, str, t0, t, len = 1.4) {
  const k = t - t0;
  if (k < 0 || k > len) return;
  const shown = str.slice(0, Math.ceil(clamp(k / (0.12 + str.length * 0.03)) * str.length));
  const w = speechWidth(str) + 8;
  const bx = Math.round(x - w / 2);
  const by = Math.round(y - 13);
  rect(bx + 1, by, w - 2, 11, "#2a2230");
  rect(bx, by + 1, w, 9, "#2a2230");
  rect(bx + 1, by + 1, w - 2, 9, "#ffffff");
  rect(x - 1, by + 11, 2, 1, "#2a2230");
  px(x - 1, by + 12, "#2a2230");
  rect(x - 1, by + 10, 2, 1, "#ffffff");
  let cx = bx + 4;
  for (const ch of shown) {
    const glyph = SPEECH[ch];
    if (!glyph) {
      cx += text(ch, cx, by + 3, "#2a2230") + 2;
      continue;
    }
    glyph.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === "1") px(cx + i, by + 3 + j, "#2a2230");
    });
    cx += glyph[0].length + 1;
  }
}

// Where someone is along [time, x, facing?] keyframes, and whether they are walking.
function walkPath(keys, t) {
  if (t <= keys[0][0]) return { x: keys[0][1], moving: false, dir: keys[0][2] ?? "right" };
  for (let i = 1; i < keys.length; i++) {
    const [t1, x1, d] = keys[i];
    const [t0, x0] = keys[i - 1];
    if (t <= t1) return { x: lerp(x0, x1, (t - t0) / (t1 - t0)), moving: x1 !== x0, dir: d ?? (x1 >= x0 ? "right" : "left") };
  }
  const last = keys[keys.length - 1];
  return { x: last[1], moving: false, dir: last[2] ?? "right" };
}

// --- 1. Greece: the waterfront at sunset ---

export function greece(t) {
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
  // A street sign on the promenade.
  const nx = Math.round(150 - cam * 0.95);
  rect(nx, 81, 1, 25, "#3a2f43");
  rect(nx - 26, 72, 53, 9, "#f2efe8");
  rect(nx - 25, 73, 51, 7, "#2f5fb0");
  text("THESSALONIKI", nx - 23, 74, "#ffffff");
  const stroll = (x, y, c) => {
    const step = Math.floor(t * 6 + x) % 2;
    rect(x + 1, y - 13, 3, 3, c);
    rect(x, y - 10, 5, 6, c);
    rect(x + (step ? 0 : 1), y - 4, 2, 4, c);
    rect(x + (step ? 3 : 2), y - 4, 2, 4, c);
  };
  stroll(Math.round(260 - t * 3 - cam * 0.9), 124, "#4b3c4c");
  stroll(Math.round(118 - t * 2 - cam * 0.9), 123, "#544351");
  // A friend coming the other way calls out to him; John turns to wave, then hurries on.
  const f = walkPath([[0, 240, "left"], [1.0, 170, "left"], [2.2, 170, "left"], [4.0, 30, "left"]], t);
  person(0, Math.round(f.x), 124, "left", f.moving ? f.x / 48 : t, f.moving ? "walk" : "stand");
  say(170, 97, "HEY JOHN!", 1.0, t, 1.3);
  const me = walkPath([[0, 30], [1.0, 100], [1.05, 100, "front"], [2.05, 100, "front"], [2.1, 100], [4.0, greece.exit[0]]], t);
  const pose = me.moving ? "walk" : me.dir === "front" && t > 1.15 ? "wave" : "stand";
  john(Math.round(me.x), greece.exit[1], me.dir, me.moving ? me.x / 64 : t, pose);
}
// Where John leaves a scene and enters the next, for the push between them: [x, y, speed].
greece.exit = [290, 131, 100];

// --- 2. The lab at SpaceDot, and the throw ---

export function lab(t) {
  rect(0, 0, W, 100, "#232b40");
  for (let x = 0; x < W; x += 24) rect(x, 0, 1, 100, "#283149");
  rect(0, 100, W, 36, "#1b2133");
  for (let x = 0; x < W; x += 16) rect(x, 100, 1, 36, "#20273a");
  rect(0, 100, W, 1, "#2c3550");
  for (const x of [60, 160, 260]) {
    glow(x, 6, 18, "#9fb8ff", 0.25);
    rect(x - 12, 0, 24, 2, "#cfe0ff");
  }
  disc(160, 34, 17, "#c9a24a");
  disc(160, 34, 15, "#1c2a4e");
  for (let i = 0; i < 14; i++) px(147 + Math.floor(hash(i, 50) * 26), 22 + Math.floor(hash(i, 51) * 24), "#cfd8f2");
  cubesat(157, 27, 0.7, false, true);
  text("ACUBESAT", 160 - textWidth("ACUBESAT") / 2, 56, "#c9a24a");
  rect(16, 62, 60, 2, "#3a4560");
  for (let i = 0; i < 5; i++) rect(20 + i * 11, 52, 8, 10, ["#3f6fb5", "#c9784d", "#4f8b5a", "#d9a441", "#8a5cc0"][i]);
  rect(250, 76, 44, 22, "#3a4560");
  rect(254, 80, 22, 13, "#0d1a14");
  for (let x = 0; x < 21; x++) px(255 + x, 86 + Math.round(Math.sin(x * 0.6 + t * 6) * 3), "#5ee08a");
  for (let i = 0; i < 3; i++) disc(282, 82 + i * 5, 2, "#8a96b0");
  // The whiteboard: the flight software, layer by layer.
  rect(204, 16, 94, 50, "#3a4560");
  rect(205, 17, 92, 48, "#e9edf4");
  text("FLIGHT SOFTWARE", 251 - textWidth("FLIGHT SOFTWARE") / 2, 20, "#1c2a4e");
  [["C++", "#c9784d"], ["FREERTOS", "#3f6fb5"], ["CORTEX-M7", "#5a6478"]].forEach(([label, c], i) => {
    rect(215, 29 + i * 11, 72, 9, c);
    text(label, 251 - textWidth(label) / 2, 31 + i * 11, "#ffffff");
  });
  rect(18, 98, 44, 2, "#3a4560");
  laptop(24, 98, "#0d1220", t, true);
  laptop(46, 98, "#0d1220", t + 1, true);
  // The team behind the table, the satellite lying on it. John walks in behind them, takes his
  // place, lifts the satellite over his head and throws it.
  const grab = 3.2;
  const toss = 3.8;
  const cheer = t > 3.0;
  const [x0, y0] = lab.entry;
  const me = walkPath([[1.0, x0], [2.9, 166], [2.95, 166, "front"]], t);
  const pose = me.moving ? "walk" : t < grab ? "stand" : t < toss + 0.15 ? "lift" : "cheer";
  john(Math.round(me.x), y0, me.dir, me.moving ? me.x / 48 : t, pose);
  for (const [who, x, dt] of [[1, 92, 0], [2, 112, 0.3], [0, 134, 1.2], [3, 190, 0.6], [4, 212, 0.9]]) person(who, x, 132, "front", t + dt, cheer ? "cheer" : "stand");
  rect(84, 127, 154, 2, "#dfe5ee");
  rect(84, 129, 154, 4, "#b8c2d2");
  rect(84, 133, 154, 1, "#9aa6ba");
  rect(90, 134, 3, 2, "#9aa6ba");
  rect(229, 134, 3, 2, "#9aa6ba");
  const blink = Math.floor(t * 3) % 2 === 0;
  if (t < grab) cubesatFlat(142, 121, blink);
  else if (t < toss) {
    const k = ease(span(t, grab, grab + 0.4));
    cubesatFlat(Math.round(lerp(142, 158, k)), Math.round(lerp(121, y0 - 24 - 7, k)), true);
  } else {
    const k = span(t, toss, toss + 0.7);
    const y = lerp(y0 - 31, -30, ease(k));
    cubesatFlat(Math.round(158 + k * 6), Math.round(y), true);
    for (let i = 1; i < 5; i++) px(166 + k * 6, Math.round(y) + 6 + i * 4, "#ffd88f");
  }
  say(190, 105, "SOFTWARE READY?", 1.3, t, 1.3);
  say(Math.round(me.x), 101, "READY!", 2.6, t, 0.85);
}
lab.entry = [40, 128, 66];

// --- 3. Orbit, and inside the satellite: yeast on a chip, lit, imaged and compressed ---

const zoomBuf = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(W, H) : Object.assign(document.createElement("canvas"), { width: W, height: H });
const zg = zoomBuf.getContext("2d");

function orbitView(t) {
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
  return [x + 4, y + 11];
}

function payload(t) {
  rect(0, 0, W, H, "#10141d");
  for (let x = 0; x < W; x += 20) rect(x, 0, 1, H, "#161b26");
  for (let y = 0; y < H; y += 20) rect(0, y, W, 1, "#161b26");
  // The blue light above the chip.
  const led = span(t, 0.3, 0.6);
  rect(70, 32, 180, 4, "#2a3550");
  for (let i = 0; i < 12; i++) rect(74 + i * 15, 33, 6, 2, led > 0 ? "#9fc0ff" : "#3a4560");
  if (led > 0) {
    g.globalAlpha = 0.16 * led;
    g.fillStyle = "#5a8cff";
    g.fillRect(64, 36, 192, 76);
    g.globalAlpha = 1;
  }
  // The chip: rows of wells on microfluidic channels, a port at each end.
  for (const x of [58, 262]) {
    disc(x, 77, 5, "#4b5a70");
    disc(x, 77, 2.5, "#0e1b26");
  }
  rect(64, 42, 192, 70, "#4b5a70");
  rect(65, 43, 190, 68, "#1a2836");
  rect(66, 52, 2, 49, "#2c4a60");
  rect(252, 52, 2, 49, "#2c4a60");
  rect(58, 76, 8, 2, "#2c4a60");
  rect(254, 76, 8, 2, "#2c4a60");
  const glowK = ease(span(t, 0.6, 1.8));
  for (let r = 0; r < 4; r++) {
    const wy = 47 + r * 16;
    rect(66, wy + 5, 188, 2, "#2c4a60");
    for (let c = 0; c < 12; c++) {
      const wx = 70 + c * 15;
      rect(wx + 1, wy, 9, 12, "#0e1b26");
      rect(wx, wy + 1, 11, 10, "#0e1b26");
      const expr = hash(c, r, 5);
      if (glowK > 0) {
        g.globalAlpha = glowK * (0.2 + expr * 0.55);
        g.fillStyle = "#3cff8a";
        g.fillRect(wx + 1, wy + 1, 9, 10);
        g.globalAlpha = 1;
      }
      // Yeast: round cells, some budding a daughter cell.
      const cells = 2 + Math.floor(hash(c, r, 6) * 2);
      for (let i = 0; i < cells; i++) {
        const cx = wx + 1 + Math.floor(hash(c, r, i + 10) * 6);
        const cy = wy + 1 + Math.floor(hash(c, r, i + 20) * 7);
        const lit = glowK > 0.3 && hash(c, r, i) < expr + 0.2;
        const body = lit ? "#b8ffcf" : "#d9d4b0";
        rect(cx + 1, cy, 2, 4, body);
        rect(cx, cy + 1, 4, 2, body);
        px(cx + 1, cy + 1, lit ? "#ffffff" : "#f4efd2");
        if (t > 1.2 && hash(c, r, i + 30) > 0.6) {
          rect(cx + 4, cy + 2, 2, 2, body);
        }
      }
    }
  }
  text("YEAST LAB ON A CHIP", 160 - textWidth("YEAST LAB ON A CHIP") / 2, 24, "#5a6a8a");
  // The camera, and the flash when it takes the picture.
  rect(268, 62, 26, 18, "#2a3140");
  rect(268, 62, 26, 1, "#3a4252");
  disc(268, 71, 7, "#3a4252");
  disc(268, 71, 4, "#0b0f16");
  px(267, 69, "#9fb8ff");
  const flash = span(t, 1.9, 2.1);
  if (flash > 0 && flash < 1) {
    g.globalAlpha = (1 - flash) * 0.8;
    rect(0, 0, W, H, "#ffffff");
    g.globalAlpha = 1;
  }
  // The picture is the chip itself: it comes off the camera, gets smaller and coarser until it is
  // small enough to send, and leaves by the antenna.
  if (t > 2.1) {
    const k = ease(span(t, 2.4, 3.2));
    const w = Math.round(lerp(54, 27, k));
    const h = Math.round((w * 70) / 192);
    const x = Math.round(lerp(256, 286, k));
    const y = Math.round(lerp(12, 8, k));
    const src = Math.max(3, Math.round(w / lerp(1, 3, k)));
    zg.clearRect(0, 0, W, H);
    zg.imageSmoothingEnabled = false;
    zg.drawImage(art, 65, 43, 190, 68, 0, 0, src, Math.max(1, Math.round((src * 70) / 192)));
    if (t < 3.3) {
      rect(x - 1, y - 1, w + 2, h + 2, "#e9edf5");
      g.imageSmoothingEnabled = false;
      g.drawImage(zoomBuf, 0, 0, src, Math.max(1, Math.round((src * 70) / 192)), x, y, w, h);
    } else {
      const p = ease(span(t, 3.3, 3.8));
      rect(Math.round(lerp(x, 322, p)), Math.round(lerp(y, -8, p)), 4, 3, "#7dffaa");
      for (let i = 1; i < 4; i++) px(Math.round(lerp(x, 322, p)) - i * 3, Math.round(lerp(y, -8, p)) + 2 + i * 2, "#3a9a6a");
    }
  }
  const status = t < 0.6 ? "" : t < 1.9 ? "> IMAGING" : t < 2.4 ? "> IMAGE OK" : t < 3.2 ? "> COMPRESSING" : "> SENDING TO EARTH";
  if (status) {
    rect(104, 118, 112, 11, "#0a0e14");
    rect(104, 118, 112, 1, "#2a3550");
    const w = text(status, 108, 121, "#7dffaa");
    if (Math.floor(t * 4) % 2 === 0) rect(110 + w, 121, 3, 5, "#7dffaa");
  }
}

export function orbit(t) {
  if (t >= 3.8 && t < 7.6) return payload(t - 3.8);
  const [fx, fy] = orbitView(t >= 7.6 ? 3.0 + (t - 7.6) : t);
  // The picture goes down to Earth.
  if (t > 8.2) {
    for (let i = 0; i < 4; i++) {
      const p = (t - 8.2 - i * 0.18) / 1.2;
      if (p <= 0 || p >= 1) continue;
      const r = 6 + p * 44;
      for (let a = Math.PI * 0.15; a < Math.PI * 0.55; a += 1.5 / r) px(fx + Math.cos(a) * r, fy + Math.sin(a) * r, p < 0.5 ? "#9fe0ff" : "#4f8fc0");
    }
  }
  // Zoom into the satellite, and back out of it.
  const z = t < 3.8 ? ease(span(t, 3.0, 3.8)) : 1 - ease(span(t, 7.6, 8.4));
  if (z > 0) {
    zg.clearRect(0, 0, W, H);
    zg.drawImage(art, 0, 0);
    const s = 1 + z * 7;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    g.drawImage(zoomBuf, fx - fx / s, fy - fy / s, W / s, H / s, 0, 0, W, H);
  }
}

// --- 4. Skiing to Ireland ---

const SLOPE = (x) => (x < 200 ? 38 + x * 0.32 : 110);
// Green hills by the coast, easing into the flat street of the terrace and the office.
const HILLS = (x) => 104 - Math.round((Math.max(0, Math.sin((x - 430) * 0.045)) * 6 + Math.sin((x - 430) * 0.13) * 1.5) * clamp((520 - x) / 40));
const STREET = 506;
const WALK_Y = (x) => HILLS(x) + Math.round(4 * clamp((x - 496) / 12));
const TERRACE = 512;
const OFFICE = 610;
const OFFICE_DOOR = OFFICE + 32;

// A Georgian house of Dublin: red brick, white sash windows, a coloured door under a fanlight.
function georgian(x, base, door) {
  const top = base - 56;
  rect(x, top, 24, 56, "#a5533f");
  for (let y = top + 2; y < base; y += 3) rect(x, y, 24, 1, "#924736");
  for (let y = top; y < base; y += 3) for (let bx = x + ((y - top) % 6 ? 1 : 4); bx < x + 24; bx += 6) px(bx, y + 1, "#924736");
  for (let i = 0; i < 14; i++) px(x + Math.floor(hash(i, x, 1) * 24), top + Math.floor(hash(i, x, 2) * 56), "#b9614a");
  rect(x - 1, top - 2, 26, 2, "#e4dccd");
  rect(x + 16, top - 9, 6, 7, "#9a4b39");
  rect(x + 16, top - 9, 6, 1, "#7a3a2c");
  rect(x + 17, top - 11, 1, 2, "#c9784d");
  rect(x + 20, top - 11, 1, 2, "#c9784d");
  const sash = (wx, wy, h) => {
    rect(wx, wy, 7, h, "#f4f1ea");
    rect(wx + 1, wy + 1, 5, h - 2, "#3d4d60");
    rect(wx + 1, wy + Math.floor(h / 2), 5, 1, "#f4f1ea");
    rect(wx + 1, wy + 1, 2, 1, "#5f7590");
  };
  for (const wx of [x + 3, x + 14]) {
    sash(wx, top + 4, 7);
    sash(wx, top + 15, 11);
    for (let i = 0; i < 7; i += 2) px(wx + i, top + 25, "#1f1f24");
    rect(wx, top + 26, 7, 1, "#1f1f24");
  }
  sash(x + 14, base - 17, 9);
  // The door, its fanlight and frame.
  rect(x + 2, base - 21, 9, 21, "#f4f1ea");
  rect(x + 3, base - 20, 7, 3, "#cfe0ff");
  px(x + 3, base - 20, "#f4f1ea");
  px(x + 9, base - 20, "#f4f1ea");
  px(x + 6, base - 20, "#f4f1ea");
  px(x + 4, base - 19, "#f4f1ea");
  px(x + 8, base - 19, "#f4f1ea");
  rect(x + 3, base - 16, 7, 15, door);
  rect(x + 4, base - 15, 2, 5, "#00000022");
  rect(x + 7, base - 15, 2, 5, "#00000022");
  rect(x + 4, base - 8, 2, 5, "#00000022");
  rect(x + 7, base - 8, 2, 5, "#00000022");
  px(x + 8, base - 9, "#e6c35c");
  rect(x + 1, base - 1, 11, 1, "#bdb6a9");
  for (let i = 0; i < 11; i += 2) rect(x + 13 + i, base - 5, 1, 5, "#1f1f24");
  rect(x + 13, base - 5, 11, 1, "#1f1f24");
}

function sheep(x, y, t, seed) {
  const graze = Math.floor(t * 1.5 + seed) % 3 === 0 ? 1 : 0;
  rect(x, y - 5, 8, 4, "#f4f2ea");
  rect(x + 1, y - 6, 6, 1, "#f4f2ea");
  px(x + 2, y - 6, "#ffffff");
  rect(x + 7, y - 5 + graze, 3, 3, "#2a2a2e");
  rect(x + 1, y - 1, 1, 2, "#2a2a2e");
  rect(x + 6, y - 1, 1, 2, "#2a2a2e");
}

export function ski(t) {
  const world = 690;
  let jx;
  let jy;
  let pose = "ski";
  let dir = "right";
  if (t < 2.1) {
    jx = lerp(16, 196, ease(span(t, 0, 2.1)) * 0.6 + span(t, 0, 2.1) * 0.4);
    jy = SLOPE(jx);
  } else if (t < 3.7) {
    const k = span(t, 2.1, 3.7);
    jx = lerp(196, 456, k);
    jy = lerp(SLOPE(196), HILLS(456), k) - Math.sin(k * Math.PI) * 62;
  } else {
    // Landed in Ireland: he walks past the terrace to the office, and goes in when the door opens.
    jx = lerp(456, OFFICE_DOOR, span(t, 3.9, 6.4));
    jy = WALK_Y(jx);
    pose = t > 3.9 && t < 6.4 ? "walk" : t >= 6.4 ? "stand" : "ski";
    if (t >= 6.4) dir = "back";
  }
  const cam = Math.round(clamp(jx - 130, 0, world - W));
  bands(0, 112, ["#4f84cf", "#679ad9", "#86b1e4", "#a9c9ee", "#cde0f5"]);
  disc(250 - cam * 0.1, 26, 7, "#fff4d0");
  g.fillStyle = "#b9c9de";
  g.beginPath();
  g.moveTo(0, 112);
  for (let x = 0; x <= W; x += 2) g.lineTo(x, 70 + Math.sin((x + cam * 0.2) * 0.05) * 10 + Math.sin((x + cam * 0.2) * 0.013) * 14);
  g.lineTo(W, 112);
  g.fill();
  // A rainbow over Dublin as he lands.
  if (t > 3.6) {
    const grow = ease(span(t, 3.6, 4.4));
    const cx = 560 - cam;
    const R = 78;
    ["#e8486a", "#f39a3a", "#f6d44a", "#5fbf6a", "#4a8fe0", "#8a6ad0"].forEach((c, k) => {
      const r = R - k * 1.5;
      for (let x = Math.ceil(cx - r); x <= cx - r + 2 * r * grow; x++) {
        const y = Math.round(106 - Math.sqrt(Math.max(0, r * r - (x - cx) ** 2)));
        px(x, y, c);
        px(x, y + 1, c);
      }
    });
  }
  // The sea, and the red and white chimneys of Poolbeg on the far shore.
  for (let x = 0; x < W; x++) {
    const wx = x + cam;
    if (wx < 200 || wx > 450) continue;
    rect(x, 110, 1, 26, "#3d6fb0");
    if ((wx + Math.floor(t * 8)) % 9 < 3) px(x, 110 + ((wx * 7) % 5) * 4, "#7fa8dc");
  }
  for (const cx of [436, 447]) {
    const x = cx - cam;
    for (let y = 46; y < 104; y++) rect(x, y, 5, 1, Math.floor((y - 46) / 6) % 2 ? "#f2efe8" : "#d23b2f");
    rect(x - 1, 44, 7, 2, "#3a3a42");
  }
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
  if (t < 2.1)
    for (let i = 0; i < 8; i++) {
      const age = (t * 10 + i) % 8;
      px(jx - cam - 6 - age * 2, jy - 2 - Math.round(age * 0.6 * hash(i, 4)), age < 4 ? "#ffffff" : "#dfe8f4");
    }
  // Ireland: green hills with a stone wall and sheep, then the street.
  for (let x = 0; x < W; x++) {
    const wx = x + cam;
    if (wx < 430) continue;
    if (wx < STREET) {
      const y = HILLS(wx);
      rect(x, y, 1, H - y, wx % 13 < 7 ? "#4f9a4a" : "#489043");
      rect(x, y + 8, 1, H, "#3d7d3c");
      if (hash(wx, 61) > 0.85) px(x, y, "#6cb85a");
    } else {
      rect(x, 104, 1, 8, (wx - STREET) % 12 ? "#c4c0b8" : "#aba79f");
      rect(x, 112, 1, 1, "#8f8b84");
      rect(x, 113, 1, H - 113, "#6c7078");
      if ((wx - STREET) % 20 < 10) px(x, 124, "#d9d6cc");
    }
  }
  for (let wx = 462; wx < 504; wx += 4) {
    const x = wx - cam;
    const y = HILLS(wx) - 3;
    rect(x, y, 4, 3, (wx / 4) % 2 ? "#b8b4ac" : "#a29e96");
    px(x + 3, y + 2, "#7f7b74");
  }
  sheep(474 - cam, HILLS(474) - 2, t, 0);
  sheep(488 - cam, HILLS(488) - 3, t, 2);
  const fx = 465 - cam;
  rect(fx, 74, 1, HILLS(465) - 74, "#d9dde4");
  px(fx, 73, "#f4d35e");
  for (let c = 0; c < 9; c++) rect(fx + 1 + c, 74 + Math.round(Math.sin(t * 5 - c * 0.7) * 0.8), 1, 6, c < 3 ? "#169b62" : c < 6 ? "#f4f4f0" : "#ff883e");
  ["#c2453a", "#2f6fd0", "#2f7a4a", "#e8b83a"].forEach((c, i) => georgian(TERRACE + i * 24 - cam, 104, c));
  // The office: glass on a concrete frame, a sign, and the door John goes in by.
  const ox = OFFICE - cam;
  rect(ox, 50, 64, 54, "#8a96a6");
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 7; c++) {
      const gx = ox + 2 + c * 9;
      const gy = 53 + r * 8;
      rect(gx, gy, 8, 6, "#9fc1dd");
      if ((r + c) % 4 === 0) rect(gx + 1, gy + 1, 3, 1, "#d8ebf8");
    }
  rect(ox - 2, 48, 68, 2, "#6c7888");
  const signX = Math.round(ox + 32 - textWidth("MICROSOFT") / 2);
  text("MICROSOFT", signX, 41, "#3a4656");
  rect(signX - 7, 41, 2, 2, "#f25022");
  rect(signX - 4, 41, 2, 2, "#7fba00");
  rect(signX - 7, 44, 2, 2, "#00a4ef");
  rect(signX - 4, 44, 2, 2, "#ffb900");
  const dx = OFFICE_DOOR - cam - 8;
  const open = t > 6.6;
  rect(ox + 18, 74, 28, 2, "#6c7888");
  rect(dx, 77, 16, 27, "#4f5c6c");
  rect(dx + 1, 78, 14, 26, open ? "#1e2a36" : "#a9c6de");
  if (!open) {
    rect(dx + 8, 78, 1, 26, "#4f5c6c");
    rect(dx + 2, 79, 2, 1, "#d8ebf8");
  }
  // Irish weather: a rain cloud over the terrace.
  const cloudX = 530 - cam;
  for (const [cx2, cy2, r] of [[0, 0, 8], [10, -4, 10], [22, 0, 8], [14, 3, 7]]) disc(cloudX + cx2, 22 + cy2, r, "#9aa4b5");
  for (let i = 0; i < 18; i++) rect(cloudX - 6 + Math.floor(hash(i, 70) * 36), 30 + ((t * 60 + hash(i, 71) * 60) % 18), 1, 2, "#7f9bc4");
  if (t < 6.9) john(Math.round(jx - cam), Math.round(jy), dir, pose === "walk" ? jx / 48 : t, pose);
  return { door: [dx, 77, 16, 27] };
}

// --- 5. Real-time collaborative editing, in the Dublin office ---

export function coauthor(t) {
  rect(0, 0, W, 104, "#e9ecf1");
  rect(0, 104, W, 32, "#c7c2ba");
  for (let x = 0; x < W; x += 24) rect(x, 104, 1, 32, "#bcb6ad");
  rect(230, 14, 76, 56, "#9aa3ad");
  bands(16, 68, ["#8b98ab", "#9aa7b8", "#aab5c4"], 232, 304);
  for (let i = 0; i < 9; i++) {
    const bh = 10 + Math.floor(hash(i, 3) * 18);
    rect(232 + i * 8, 68 - bh, 7, bh, "#7d8a9c");
  }
  for (let i = 0; i < 26; i++) rect(232 + Math.floor(hash(i, 8) * 72), 16 + ((t * 70 + hash(i, 9) * 52) % 52), 1, 3, "#c9d3e0");
  rect(267, 14, 1, 56, "#9aa3ad");
  // The shared document on the wall screen, with three people's cursors in it.
  const sx = 136;
  const sy = 20;
  const cols = 8;
  const rows = 5;
  const cw = 8;
  const ch = 6;
  rect(sx - 3, sy - 3, cols * cw + 6, rows * ch + 6, "#1e232b");
  rect(sx, sy, cols * cw, rows * ch, "#f8f9fb");
  rect(sx, sy, cols * cw, ch, "#eef1f5");
  for (let c = 0; c <= cols; c++) rect(sx + c * cw, sy, 1, rows * ch, "#e1e5eb");
  for (let r = 0; r <= rows; r++) rect(sx, sy + r * ch, cols * cw, 1, "#e1e5eb");
  rect(sx + 1, sy + 1, cols * cw - 1, ch - 1, "#eef1f5");
  text("SUPPLY PLAN", sx + 2, sy + 1, "#5b6470");
  rect(sx + (cols * cw) / 2 - 2, sy + rows * ch + 3, 4, 8, "#9aa3ad");
  const people = [["#4a8fe0", "#dbe8f9"], ["#DB8A62", "#f8e4d7"], ["#3fae74", "#d8f1e3"]];
  const STEP = 0.36;
  const steps = Math.floor(Math.max(0, t - 1.8) / STEP);
  const cell = (i, s) => [Math.floor(hash(i, s, 80) * cols), 1 + Math.floor(hash(i, s, 81) * (rows - 1))];
  people.forEach(([color, tint], i) => {
    for (let s = 0; s < steps; s++) {
      const [c, r] = cell(i, s);
      rect(sx + c * cw + 1, sy + r * ch + 1, cw - 1, ch - 1, tint);
      rect(sx + c * cw + 2, sy + r * ch + 3, 2 + Math.floor(hash(i, s, 82) * 4), 1, "#5b6470");
    }
    if (t > 1.8) {
      const [c, r] = cell(i, steps);
      rect(sx + c * cw + 1, sy + r * ch, 1, ch, color);
      rect(sx + c * cw + 1, sy + r * ch - 2, 3, 2, color);
    }
  });
  if (t > 1.8) {
    rect(184, 13, 19, 7, "#d93a3a");
    text("LIVE", 186, 14, "#ffffff");
  }
  rect(18, 46, 82, 40, "#c9ced6");
  rect(19, 47, 80, 38, "#fbfcfd");
  rect(18, 86, 82, 2, "#aab1bb");
  text("REAL-TIME EDITING", 59 - textWidth("REAL-TIME EDITING") / 2, 50, "#3a4048");
  for (let i = 0; i < 12; i++) {
    const nx = 24 + (i % 6) * 12 + Math.floor(hash(i, 40) * 3);
    const ny = 57 + Math.floor(i / 6) * 12 + Math.floor(hash(i, 41) * 2);
    rect(nx, ny, 9, 9, ["#ffe08a", "#f8b4c6", "#a8dcf0", "#c4ecb0"][i % 4]);
    rect(nx + 2, ny + 3, 5, 1, "#8a8070");
    rect(nx + 2, ny + 5, 3, 1, "#8a8070");
  }
  for (let i = 0; i < 3; i++) rect(80 + i * 5, 82, 4, 1, ["#4a8fe0", "#DB8A62", "#3fae74"][i]);
  plant(300, 104);
  plant(96, 104);
  // Three desks: a colleague, John, a colleague, each flagged in their cursor's colour.
  const me = walkPath([[0.6, 16], [2.4, 142], [4.5, 142], [6.4, coauthor.exit[0]]], t);
  const seated = t >= 2.4 && t < 4.5;
  for (const [x, who, color] of [[56, 1, "#4a8fe0"], [142, "john", "#DB8A62"], [228, 2, "#3fae74"]]) {
    chair(x - 6, 130, "#6b7380");
    desk(x + 2, 120, 26, 130, "#cfd3da", "#b3b9c2");
    laptop(x + 9, 120, color);
    if (who !== "john" || seated) {
      person(who, x, 130, "right", t + (who === "john" ? 0 : x), "type");
      rect(x - 1, 98, 1, 5, "#5b6470");
      rect(x, 98, 4, 3, color);
    }
  }
  if (!seated) john(Math.round(me.x), 130, me.dir, me.x / 48, me.moving ? "walk" : "stand");
  say(56, 97, "SEE MY EDIT?", 2.8, t, 1.3);
  say(142, 97, "GOT IT LIVE!", 3.5, t, 1.0);
}
coauthor.exit = [250, 130, 58];

// --- 6. Talks: Berlin in 2023, Vienna in 2025 ---

export function talks(t) {
  const vienna = t > 3.3;
  rect(0, 0, W, H, "#0e1322");
  for (let x = 0; x < W; x += 22) rect(x, 0, 1, 100, "#121a2c");
  for (const [ox, phase] of [[60, 0], [250, 1.7]]) {
    const a = Math.sin(t * 0.8 + phase) * 0.3;
    g.fillStyle = "rgba(160,190,255,0.05)";
    g.beginPath();
    g.moveTo(ox, 0);
    g.lineTo(126 + a * 120 - 24, 104);
    g.lineTo(126 + a * 120 + 24, 104);
    g.closePath();
    g.fill();
  }
  // The conference's banner, and the slide with the city and the year.
  const banner = vienna ? "EUROPEAN POWER PLATFORM" : "GENAI GURUS";
  rect(14, 10, 110, 16, "#26304a");
  rect(15, 11, 108, 14, vienna ? "#6c2f4a" : "#1f4f7a");
  text(banner, Math.round(69 - textWidth(banner) / 2), 16, "#ffffff");
  const sx = 150;
  const sy = 10;
  rect(sx - 2, sy - 2, 156, 72, "#1c2230");
  rect(sx, sy, 152, 68, "#f4f1ea");
  text(vienna ? "VIENNA 2025" : "BERLIN 2023", sx + 8, sy + 8, "#25160e", 2);
  agent(sx + 14, sy + 36, t, 3);
  for (let i = 0; i < 3; i++) {
    rect(sx + 30, sy + 39, 14, 1, "#9aa3ad");
    rect(sx + 46 + i * 34, sy + 32, 28, 16, ["#f4dec8", "#dbe8f9", "#d8f1e3"][i]);
    rect(sx + 50 + i * 34, sy + 37, 12 + i * 4, 2, ["#b85a26", "#3d73c7", "#2f7d54"][i]);
    rect(sx + 50 + i * 34, sy + 41, 8, 2, "#9aa3ad");
  }
  for (let i = 0; i < 3; i++) rect(sx + 14, sy + 54 + i * 4, 40 + i * 22, 2, "#d9d2c4");
  // The stage, the speaker, the lectern in front of him, the room.
  rect(0, 100, W, 10, "#1c2230");
  rect(0, 100, W, 1, "#DB8A62");
  const lx = 126;
  const [x0, y0] = talks.entry;
  const me = walkPath([[1.0, x0], [2.1, lx], [2.15, lx, "front"], [5.0, lx, "front"], [5.05, lx], [6.4, talks.exit[0]]], t);
  const pose = me.moving ? "walk" : me.dir === "front" && ((t > 2.3 && t < 2.9) || (t > 3.6 && t < 4.2)) ? "wave" : "stand";
  john(Math.round(me.x), y0, me.dir, me.moving ? me.x / 48 : t, pose);
  rect(lx - 9, 101, 18, 9, "#2a3040");
  rect(lx - 9, 101, 18, 1, "#4a5878");
  rect(lx - 6, 103, 12, 5, vienna ? "#6c2f4a" : "#1f4f7a");
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 30; i++) {
      const x = i * 11 + (row % 2) * 5 - 4;
      const y = 114 + row * 8 + Math.round(Math.sin(t * 3 + i + row) * (t > 4.4 && t < 5.4 ? 1 : 0));
      const c = row === 0 ? "#1a2134" : row === 1 ? "#151b2b" : "#0f1422";
      rect(x, y, 7, 6, c);
      rect(x - 1, y + 5, 9, 4, c);
    }
  say(lx, 85, "HELLO BERLIN!", 2.3, t, 1.0);
  say(lx, 85, "HELLO VIENNA!", 3.6, t, 1.0);
  for (const [x, i] of [[60, 0], [182, 1], [248, 2]]) balloon(x, 112, "heart", 4.5 + i * 0.2, t, 1.0);
}
talks.entry = [40, 112, 52];
talks.exit = [210, 112];

// --- 7. A hackathon: building something that helps people, and winning ---

function trophy(x, y) {
  rect(x, y, 11, 6, "#e6c35c");
  rect(x + 1, y + 1, 3, 3, "#fff1b8");
  rect(x - 2, y + 1, 2, 3, "#c9a24a");
  rect(x + 11, y + 1, 2, 3, "#c9a24a");
  rect(x + 4, y + 6, 3, 3, "#c9a24a");
  rect(x + 2, y + 9, 7, 2, "#a8832e");
}

export function hackathon(t) {
  const won = t > 3.4;
  rect(0, 0, W, 104, "#2b2440");
  for (let x = 0; x < W; x += 20) rect(x, 0, 1, 104, "#30294a");
  rect(0, 104, W, 32, "#3a3346");
  for (let x = 0; x < W; x += 24) rect(x, 104, 1, 32, "#40394f");
  // String lights, the banner, and the winner's banner under it.
  rect(0, 5, W, 1, "#4a4260");
  for (let i = 0; i < 27; i++) px(6 + i * 12, 6 + (i % 2), Math.floor(t * 3 + i) % 3 === 0 ? "#fff1b8" : ["#e8486a", "#e6c35c", "#5ec77a", "#5fc8ff"][i % 4]);
  rect(76, 14, 168, 22, "#1b1730");
  rect(76, 14, 168, 1, "#4a4260");
  text("HACKATHON", Math.round(160 - textWidth("HACKATHON", 2) / 2), 20, "#e8955f", 2);
  if (won) {
    rect(124, 40, 72, 12, "#e6c35c");
    text("WINNER", Math.round(160 - textWidth("WINNER") / 2), 43, "#3a2a10");
  }
  // Sticky notes on the wall, and the demo on a screen: an app for helping people.
  rect(14, 44, 58, 40, "#efe8d8");
  for (let i = 0; i < 8; i++) rect(18 + (i % 4) * 13, 48 + Math.floor(i / 4) * 16, 10, 10, ["#ffe08a", "#f8b4c6", "#a8dcf0", "#c4ecb0"][i % 4]);
  rect(240, 42, 64, 44, "#1c2230");
  rect(242, 44, 60, 40, "#f8f9fb");
  [".O.O.", "OOOOO", "OOOOO", ".OOO.", "..O.."].forEach((row, j) => {
    for (let i = 0; i < 5; i++) if (row[i] === "O") rect(258 + i * 2, 50 + j * 2, 2, 2, "#e8486a");
  });
  rect(250, 66, 44, 6, "#3fae74");
  rect(250, 75, 30, 2, "#c4ccd6");
  // The team behind the table: laptops, a pizza, then the trophy.
  for (const [who, x] of [[2, 112], [6, 136], [1, 186], [4, 210]]) person(who, x, 132, "front", t + x, won ? "cheer" : "stand");
  const [x0, y0] = hackathon.entry;
  const me = walkPath([[0, x0, "front"], [5.0, x0, "front"], [5.05, x0], [6.0, hackathon.exit[0]]], t);
  john(Math.round(me.x), y0, me.dir, me.moving ? me.x / 48 : t, me.moving ? "walk" : won ? "cheer" : "stand");
  rect(96, 127, 152, 2, "#8a5a36");
  rect(96, 129, 152, 4, "#6b4428");
  rect(100, 133, 3, 3, "#5a3a22");
  rect(241, 133, 3, 3, "#5a3a22");
  laptop(104, 127, "#0d1220", t, true);
  laptop(128, 127, "#0d1220", t + 1, true);
  laptop(200, 127, "#0d1220", t + 2, true);
  rect(170, 124, 18, 3, "#c9a46a");
  rect(172, 123, 14, 1, "#e8b04a");
  for (const x of [174, 179, 183]) px(x, 123, "#c2453a");
  if (won) trophy(150, 116 - Math.round(ease(span(t, 3.4, 3.7)) * 4));
  if (won)
    for (let i = 0; i < 40; i++) {
      const x = (hash(i, 61) * W + Math.sin(t * 2 + i) * 4) % W;
      const y = ((t - 3.4) * 40 + hash(i, 62) * 60) % 110;
      rect(x, y, 2, 1, ["#e8486a", "#e6c35c", "#5ec77a", "#5fc8ff", "#f4f1e8"][i % 5]);
    }
  balloon(136, 104, "idea", 0.9, t, 1.2);
  balloon(210, 104, "!", 2.0, t, 1.0);
  say(186, 105, "WE WON!", 3.6, t, 1.3);
}
hackathon.entry = [160, 132];
hackathon.exit = [262, 132, 70];

// --- 8. Teaching: an online class on using AI that broke the attendance record ---

export function teach(t) {
  rect(0, 0, W, 104, "#e4e8ee");
  rect(0, 104, W, 32, "#c9c3ba");
  for (let x = 0; x < W; x += 24) rect(x, 104, 1, 32, "#bdb6ac");
  // The call on the wall screen: the slide on the left, everyone who joined on the right.
  rect(112, 8, 198, 88, "#1c2230");
  rect(114, 10, 194, 84, "#0f1626");
  rect(118, 14, 72, 76, "#f4f1ea");
  text("HOW TO", 122, 18, "#25160e", 2);
  text("USE AI", 122, 31, "#b85a26", 2);
  for (let i = 0; i < 4; i++) {
    rect(122, 48 + i * 9, 4, 4, ["#b85a26", "#3d73c7", "#2f7d54", "#c9a24a"][i]);
    rect(129, 49 + i * 9, 26 + ((i * 11) % 30), 2, "#9aa3ad");
  }
  const COLS = 12;
  const shown = Math.floor(lerp(4, 72, ease(span(t, 1.6, 4.4))));
  for (let i = 0; i < shown; i++) {
    const x = 196 + (i % COLS) * 9;
    const y = 14 + Math.floor(i / COLS) * 10;
    rect(x, y, 8, 9, ["#2a3550", "#2f2a44", "#26403a", "#3a2f2a"][i % 4]);
    rect(x + 2, y + 2, 4, 4, ["#f8d6b8", "#cf9268", "#ecc09a", "#ad7450", "#f2cbab"][Math.floor(hash(i, 71) * 5)]);
    rect(x + 2, y + 2, 4, 1, ["#3a2214", "#141010", "#8a6a2a", "#6e6a66"][Math.floor(hash(i, 72) * 4)]);
    rect(x + 1, y + 7, 6, 2, ["#3d73c7", "#b85a26", "#2f7d54", "#8f6cc8"][Math.floor(hash(i, 73) * 4)]);
  }
  // How many joined, against the old record.
  const mark = 196 + Math.round(108 * 0.8);
  rect(196, 80, 108, 4, "#2a3550");
  rect(196, 80, Math.round(108 * (shown / 72)), 4, shown / 72 > 0.8 ? "#5ec77a" : "#5fc8ff");
  for (let y = 77; y < 87; y += 2) px(mark, y, "#e6c35c");
  text("RECORD", mark - 25, 87, "#e6c35c");
  if (t > 3.9) {
    rect(210, 38, 82, 16, "#ffffff");
    rect(211, 39, 80, 14, "#d93a3a");
    text("NEW RECORD", Math.round(251 - textWidth("NEW RECORD") / 2), 44, "#ffffff");
  }
  // John at his desk, teaching, then on his way.
  plant(14, 104);
  const [x0, y0] = teach.entry;
  const me = walkPath([[1.0, x0], [1.6, 62], [4.8, 62], [6.0, teach.exit[0]]], t);
  const seated = t >= 1.6 && t < 4.8;
  chair(56, 130, "#6b7380");
  desk(64, 120, 30, 130, "#cfd3da", "#b3b9c2");
  laptop(72, 120, "#3d73c7", t, true);
  if (seated) john(62, 130, "right", t * 1.4, "type");
  else john(Math.round(me.x), y0, me.dir, me.x / 48, me.moving ? "walk" : "stand");
  say(66, 102, "LET'S TRY IT!", 2.3, t, 1.3);
  if (t > 3.9) balloon(66, 103, "heart", 4.0, t, 0.8);
}
teach.entry = [40, 130, 60];
teach.exit = [250, 130, 64];

// --- 9. With customers: their problem, an agent for it ---

export function customers(t) {
  rect(0, 0, W, 104, "#dfe6ee");
  rect(0, 104, W, 32, "#c2c8d2");
  for (let x = 0; x < W; x += 20) rect(x, 104, 1, 32, "#b6bdc8");
  rect(110, 12, 200, 60, "#a9b4c2");
  bands(14, 70, ["#8fc0ea", "#a8d0f0", "#c6e2f6"], 112, 308);
  for (let i = 0; i < 16; i++) {
    const bx = 112 + i * 12;
    const bh = 14 + Math.floor(hash(i, 31) * 28);
    rect(bx, 70 - bh, 10, bh, hash(i, 32) > 0.5 ? "#9fb0c4" : "#8ea2b8");
    for (let wy = 70 - bh + 3; wy < 68; wy += 4) rect(bx + 2, wy, 6, 1, "#c9d8e8");
  }
  rect(210, 12, 2, 60, "#a9b4c2");
  // John's slides on a screen stand.
  rect(16, 48, 58, 38, "#2a2f38");
  rect(18, 50, 54, 34, "#f8f9fb");
  text("CUSTOMER", 45 - textWidth("CUSTOMER") / 2, 53, "#2a2f38");
  text("WORKSHOP", 45 - textWidth("WORKSHOP") / 2, 60, "#DB8A62");
  for (let i = 0; i < 3; i++) rect(24, 69 + i * 4, 10 + i * 8, 2, ["#DB8A62", "#4a8fe0", "#3fae74"][i]);
  rect(44, 86, 2, 44, "#4a515c");
  rect(38, 128, 14, 2, "#4a515c");
  // The customers behind the table, a cabinet of documents by the wall.
  const happy = t > 4.9;
  const folks = [[150, 3], [190, 5], [230, 6]];
  for (const [x, who] of folks) person(who, x, 132, "front", t + x, happy ? "cheer" : "stand");
  rect(118, 127, 156, 2, "#8a5a36");
  rect(118, 129, 156, 4, "#6b4428");
  rect(122, 133, 3, 3, "#5a3a22");
  rect(267, 133, 3, 3, "#5a3a22");
  laptop(124, 127, "#0d1220", t, true);
  rect(286, 82, 28, 48, "#9aa3ad");
  for (let i = 0; i < 4; i++) {
    rect(288, 85 + i * 11, 24, 9, "#b8c0ca");
    rect(298, 88 + i * 11, 4, 2, "#6b7380");
  }
  // They have a problem; John has an answer; three agents fetch what each of them needs.
  say(190, 105, "CAN AN AGENT DO THIS?", 1.2, t, 1.6);
  const [x0, y0] = customers.entry;
  const me = walkPath([[1.0, x0], [1.8, customers.exit[0]]], t);
  john(Math.round(me.x), y0, "right", me.x / 48, me.moving ? "walk" : t > 2.3 && t < 3.0 ? "point" : "stand");
  say(Math.round(me.x), 104, "LET'S BUILD ONE!", 2.4, t, 1.3);
  folks.forEach(([x], i) => {
    const t0 = 2.9 + i * 0.15;
    if (t < t0) return;
    const out = ease(span(t, t0, t0 + 0.8));
    const back = ease(span(t, t0 + 1.0, t0 + 1.8));
    let ax = lerp(124, 292, out);
    let ay = lerp(114, 90 + i * 11, out) - Math.sin(out * Math.PI) * 18;
    if (back > 0) {
      ax = lerp(292, x - 5, back);
      ay = lerp(90 + i * 11, 114, back) - Math.sin(back * Math.PI) * 22;
    }
    if (back < 1) {
      agent(Math.round(ax), Math.round(ay), t, i);
      if (back > 0) rect(Math.round(ax) + 10, Math.round(ay) + 3, 5, 6, "#f4f1e8");
    } else {
      rect(x - 4, 124, 8, 3, "#f4f1e8");
      rect(x - 3, 125, 5, 1, "#9aa3ad");
    }
  });
  folks.forEach(([x], i) => balloon(x, 103, "heart", 5.0 + i * 0.12, t, 1.2));
}
customers.entry = [40, 131, 55];
customers.exit = [84, 131];

// --- 10. Agent memory, the patent ---

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
  // The shelf where kept memories settle.
  glow(271, 52, 40, "#3a4f7a", 0.35);
  rect(228, 4, 86, 88, "#121822");
  rect(228, 4, 86, 1, "#2a3444");
  text("AGENT MEMORY", 271 - textWidth("AGENT MEMORY") / 2, 7, "#DB8A62");
  rect(232, 14, 78, 1, "#2a3444");
  for (let i = 0; i < 6; i++) {
    const lane = 96 + (i % 3) * 10;
    const x = Math.round(((((hash(i, 90) * 200 + t * (14 + i * 3) * (i % 2 ? 1 : -1)) % 200) + 200) % 200) + 90);
    agent(x, lane, t, i);
    if (i % 2) rect(x + 10, lane + 4, 3, 4, "#e9e3d2");
  }
  for (let i = 0; i < 10; i++) {
    const born = i * 0.42;
    const k = span(t, born, born + 1.6);
    if (k <= 0) continue;
    const startX = 110 + hash(i, 91) * 110;
    const slot = i % 5;
    const dropped = i === 2 || i === 7;
    const x = Math.round(lerp(startX, 234 + (i > 4 ? 40 : 0), ease(k)));
    const y = Math.round(lerp(92, 20 + slot * 14, ease(k)));
    if (dropped && t > born + 2.0) {
      const age = t - born - 2.0;
      if (age < 0.8) for (let p = 0; p < 6; p++) px(x + 4 + p * 3, Math.round(y + 5 - age * 12 - p), "#3d444d");
      continue;
    }
    const promoted = !dropped && t > born + 1.6 && i % 3 === 0;
    const edge = promoted ? "#DB8A62" : "#3d444d";
    if (promoted) glow(x + 17, y + 5, 12, "#DB8A62", 0.15);
    rect(x, y, 34, 11, "#1c232c");
    rect(x, y, 34, 1, edge);
    rect(x, y + 10, 34, 1, edge);
    rect(x, y, 1, 11, edge);
    rect(x + 33, y, 1, 11, edge);
    disc(x + 5, y + 5, 2.5, ["#6C9BD2", "#B58BD6", "#7DBB99", "#E9A582"][i % 4]);
    rect(x + 10, y + 3, 15, 1, "#9198a1");
    rect(x + 10, y + 6, 9, 1, "#6e7681");
    rect(x + 27, y + 6, 4, 1, "#4f5864");
  }
  // John at the console, tuning what gets kept.
  rect(30, 84, 44, 26, "#1c232c");
  rect(30, 84, 44, 1, "#3d444d");
  for (let i = 0; i < 4; i++) {
    rect(36 + i * 9, 88, 1, 14, "#3d444d");
    const level = 0.5 + Math.sin(t * 1.3 + i * 1.7) * 0.4;
    rect(34 + i * 9, 88 + Math.round(level * 12), 5, 2, i === 1 ? "#DB8A62" : "#9198a1");
  }
  const [x0, y0] = memory.entry;
  const me = walkPath([[0, x0, "left"], [3.8, x0, "left"], [3.85, x0, "right"], [6.2, memory.exit[0]]], t);
  john(Math.round(me.x), y0, me.dir, me.x / 48, me.moving ? "walk" : me.dir === "left" ? "point" : "stand");
  if (t > 2.4 && t < 3.8) {
    const p = ease(span(t, 2.4, 2.8));
    glow(86, 86, Math.round(9 * p), "#ffd86b", 0.6);
    disc(86, 86, 3 * p, "#ffe58a");
    rect(85, 89, 3, 2, "#c9a24a");
  }
  if (t > 2.8) {
    const k = ease(span(t, 2.8, 3.3));
    const dx = Math.round(lerp(330, 132, k));
    rect(dx, 14, 46, 60, "#f2efe6");
    rect(dx, 14, 46, 1, "#ffffff");
    for (let i = 0; i < 9; i++) rect(dx + 5, 24 + i * 5, 30 + Math.floor(hash(i, 95) * 8), 1, "#b7b0a2");
    text("PATENT", dx + 5, 17, "#5b5348");
    if (t > 3.5) {
      const w = textWidth("EP4651035") + 6;
      const s = 1 + Math.max(0, 1 - span(t, 3.5, 3.75)) * 0.6;
      g.save();
      g.translate(dx + 23 - (w * s) / 2, 52);
      g.scale(s, s);
      g.strokeStyle = "#c2453a";
      g.strokeRect(0.5, 0.5, w, 10);
      g.restore();
      text("EP4651035", Math.round(dx + 23 - (w - 6) / 2), 55, "#c2453a");
    }
  }
}
memory.entry = [88, 130];
memory.exit = [250, 130, 69];

// --- 11. On stage: the work shown in the CEO's keynotes of 2024 and 2025 ---

export function build(t) {
  rect(0, 0, W, H, "#06070d");
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
  const sx = 124;
  const sy = 8;
  rect(sx - 2, sy - 2, 196, 78, "#1c2230");
  rect(sx, sy, 192, 74, "#0f1626");
  const second = t > 2.6;
  text(second ? "2025" : "2024", sx + 8, sy + 7, "#f0f6fc", 2);
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
      if (i === 0) return;
      const [px0, py0] = nodes[i < 3 ? 0 : i < 5 ? i - 2 : 3];
      g.strokeStyle = k > i / 6 ? "#DB8A62" : "#3d444d";
      g.beginPath();
      g.moveTo(sx + px0 + 5, sy + py0 + 4);
      g.lineTo(sx + nx + 5, sy + ny + 4);
      g.stroke();
    });
    nodes.forEach(([nx, ny], i) => agent(sx + nx, sy + ny, t, i));
    text("ORCHESTRATION", sx + 80, sy + 7, "#E9A582", 2);
  }
  rect(0, 100, W, 10, "#1c2230");
  rect(0, 100, W, 1, "#4a8fe0");
  text("MICROSOFT BUILD KEYNOTE", Math.round(209 - textWidth("MICROSOFT BUILD KEYNOTE") / 2), 103, "#6c9be0");
  // The CEO's keynote: the presenter at a lectern in the spotlight.
  glow(209, 86, 18, "#9fb8ff", 0.35);
  person(1, 209, 100, "front", t, "stand");
  rect(201, 86, 16, 14, "#2a3040");
  rect(201, 86, 16, 1, "#4a5878");
  text("CEO", Math.round(209 - textWidth("CEO") / 2), 90, "#9fc0ff");
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 30; i++) {
      const x = i * 11 + (row % 2) * 5 - 4;
      const y = 114 + row * 8 + Math.round(Math.sin(t * 3 + i + row) * (t > 1.2 && t < 2.2 ? 1 : 0));
      const c = row === 0 ? "#151a26" : row === 1 ? "#11151f" : "#0c0f17";
      rect(x, y, 7, 6, c);
      rect(x - 1, y + 5, 9, 4, c);
      if (hash(i, row, Math.floor(t * 2)) > 0.93) px(x + 3, y + 2, "#cfe0ff");
    }
  // John at the side of the stage, watching the screen.
  const [x0, y0] = build.entry;
  const me = walkPath([[1.0, x0], [1.4, 60], [1.45, 60, "back"]], t);
  john(Math.round(me.x), y0, me.dir, me.moving ? me.x / 48 : t, me.moving ? "walk" : t > 1.8 && t < 2.6 ? "cheer" : "stand");
}
build.entry = [40, 112, 50];
build.exit = [60, 112];

// --- 12. Open source, at home in the evening: Kodosi on the screen, BoBe on the desk ---

// BoBe's ESP32 body: a yellow capsule with stubby arms, a ring antenna and a face on its screen.
// (x, y) is the bottom left corner, on the desk.
function bobe(x, y, t, awake, happy) {
  rect(x + 5, y - 19, 3, 1, "#f07a2a");
  px(x + 5, y - 18, "#f07a2a");
  px(x + 7, y - 18, "#f07a2a");
  rect(x + 5, y - 17, 3, 1, "#f07a2a");
  px(x + 6, y - 16, "#c9611f");
  rect(x + 2, y - 15, 9, 15, "#f4b630");
  rect(x + 1, y - 14, 11, 13, "#f4b630");
  rect(x + 10, y - 13, 2, 11, "#dc9b22");
  rect(x + 2, y - 14, 2, 6, "#ffd46a");
  rect(x, y - 9, 1, 4, "#e2a42a");
  rect(x + 12, y - 9, 1, 4, "#d0931c");
  rect(x + 3, y - 13, 7, 7, "#fffaf0");
  rect(x + 4, y - 12, 5, 5, "#f3e3c6");
  const blink = Math.floor(t * 2.5) % 7 === 0;
  if (!awake || blink) {
    px(x + 4, y - 10, "#3a2a20");
    px(x + 8, y - 10, "#3a2a20");
  } else if (happy) {
    px(x + 4, y - 10, "#3a2a20");
    px(x + 8, y - 10, "#3a2a20");
    px(x + 5, y - 11, "#3a2a20");
    px(x + 7, y - 11, "#3a2a20");
  } else {
    rect(x + 4, y - 11, 1, 2, "#3a2a20");
    rect(x + 7, y - 11, 1, 2, "#3a2a20");
  }
  if (awake) {
    px(x + 3, y - 9, "#f4a0a0");
    px(x + 9, y - 9, "#f4a0a0");
    rect(x + 5, y - 8, 2, 1, "#3a2a20");
  }
}

// Kodosi on a small monitor: a sidebar of terminals, one terminal open, and the copper mark of an
// agent waiting for input.
function kodosi(sx, sy, t, waiting) {
  rect(sx, sy, 26, 16, "#1c1917");
  rect(sx, sy, 26, 2, "#2a2522");
  px(sx + 1, sy, "#e0605a");
  px(sx + 3, sy, "#e6b84a");
  px(sx + 5, sy, "#5ec77a");
  rect(sx, sy + 2, 7, 14, "#24201d");
  rect(sx + 1, sy + 3, 5, 2, "#d08a5f");
  for (let i = 0; i < 4; i++) {
    rect(sx + 1, sy + 7 + i * 2, 3, 1, "#6a625b");
    px(sx + 5, sy + 7 + i * 2, waiting === i ? (Math.floor(t * 4) % 2 ? "#e8955f" : "#7a4a32") : "#5ec77a");
  }
  const scroll = Math.floor(t * 3);
  for (let r = 0; r < 6; r++) {
    const n = scroll + r;
    px(sx + 9, sy + 4 + r * 2, hash(n, 8) > 0.4 ? "#5ec77a" : "#d08a5f");
    rect(sx + 11, sy + 4 + r * 2, 3 + Math.floor(hash(n, 7) * 11), 1, "#d9d2ca");
  }
  if (waiting >= 0 && Math.floor(t * 4) % 2 === 0) rect(sx + 22, sy + 3, 2, 2, "#e8955f");
}

export function openSource(t) {
  rect(0, 0, W, 104, "#1d2233");
  for (let x = 0; x < W; x += 16) rect(x, 0, 1, 104, "#21273b");
  rect(0, 104, W, 32, "#2a2a3a");
  for (let x = 0; x < W; x += 24) rect(x, 104, 1, 32, "#2f2f40");
  rect(0, 104, W, 1, "#353548");
  // The window: a night sky over rooftops.
  const wx = 186;
  rect(wx, 16, 74, 62, "#3a3f56");
  bands(18, 76, ["#0c1130", "#121a42", "#1b2552"], wx + 2, wx + 72);
  for (let i = 0; i < 22; i++) px(wx + 2 + Math.floor(hash(i, 81) * 70), 18 + Math.floor(hash(i, 82) * 36), hash(i, Math.floor(t * 3)) > 0.3 ? "#cfd8f2" : "#56608a");
  disc(wx + 58, 28, 5, "#f4ecd0");
  disc(wx + 60, 27, 4, "#121a42");
  for (let i = 0; i < 7; i++) {
    const h = 8 + Math.floor(hash(i, 83) * 12);
    rect(wx + 2 + i * 10, 76 - h, 10, h, "#0a0d1c");
    if (hash(i, 84) > 0.4) px(wx + 5 + i * 10, 79 - h, "#f7d48a");
  }
  rect(wx + 36, 16, 2, 62, "#3a3f56");
  rect(wx, 46, 74, 2, "#3a3f56");
  rect(wx - 2, 78, 78, 3, "#4a4f66");
  // A shelf: books, a CubeSat model, a board.
  rect(22, 58, 64, 2, "#5e3e28");
  for (let i = 0; i < 5; i++) rect(24 + i * 5, 46 + (i % 2) * 2, 4, 12 - (i % 2) * 2, ["#3f6fb5", "#c9784d", "#4f8b5a", "#d9a441", "#8a5cc0"][i]);
  cubesat(56, 42, 0, false, true);
  rect(68, 54, 12, 4, "#2f6a4a");
  for (let i = 0; i < 4; i++) px(69 + i * 3, 55, Math.floor(t * 3 + i) % 4 ? "#a8e0b8" : "#ff5a4f");
  // Posters of the two projects on the wall.
  rect(100, 20, 36, 40, "#3a3f56");
  rect(101, 21, 34, 38, "#1c1917");
  text(">", 106, 28, "#e8955f");
  rect(110, 32, 4, 1, "#e8955f");
  for (let i = 0; i < 3; i++) rect(106, 36 + i * 4, 10 + Math.floor(hash(i, 86) * 14), 1, "#6a625b");
  text("KODOSI", 118 - textWidth("KODOSI") / 2, 50, "#e8955f");
  rect(142, 20, 36, 40, "#3a3f56");
  rect(143, 21, 34, 38, "#2a1f3d");
  bobe(153, 44, t, true, false);
  text("BOBE", 160 - textWidth("BOBE") / 2, 50, "#f4b630");
  plant(290, 104);
  // The desk: Kodosi on the monitor, a keyboard, a mug, BoBe and the lamp.
  chair(128, 130, "#3a3346");
  rect(140, 124, 112, 2, "#7a5236");
  rect(140, 126, 112, 2, "#5e3e28");
  rect(142, 128, 2, 2, "#5e3e28");
  rect(248, 128, 2, 2, "#5e3e28");
  const waiting = t > 1.2 && t < 2.2 ? 1 : t > 3.4 && t < 4.0 ? 2 : -1;
  rect(166, 121, 4, 3, "#3a3f4a");
  rect(162, 123, 12, 1, "#3a3f4a");
  rect(154, 103, 28, 18, "#2a2d34");
  kodosi(155, 104, waiting >= 0 ? 1.2 : t, waiting);
  glow(168, 112, 16, "#d08a5f", 0.12);
  rect(142, 123, 12, 1, "#8a919c");
  rect(190, 119, 5, 5, "#e8e2da");
  px(195, 120, "#e8e2da");
  px(195, 122, "#e8e2da");
  glow(238, 116, 18, "#ffd88f", 0.3);
  rect(232, 122, 8, 2, "#c9a46a");
  for (let i = 0; i < 8; i++) px(236 + Math.floor(i / 2), 121 - i * 2, "#a8864e");
  rect(236, 102, 9, 3, "#c9a46a");
  rect(237, 105, 7, 1, "#ffe8b0");
  const awake = t > 2.6;
  const happy = t > 4.2;
  bobe(204, 124, t, awake, happy);
  balloon(168, 100, "star", 2.2, t, 1.0);
  say(210, 101, "HI JOHN!", 2.8, t, 1.3);
  balloon(210, 101, "heart", 4.3, t, 1.4);
  // John at the desk, answering the agents that wait for him; then up and on.
  const [x0, y0] = openSource.entry;
  if (t < 4.6) john(x0, y0, "right", waiting >= 0 ? t * 1.6 : t, "type");
  else {
    const me = walkPath([[4.7, x0], [6.4, openSource.exit[0]]], t);
    john(Math.round(me.x), y0, "right", me.x / 48, me.moving ? "walk" : "stand");
  }
}
openSource.entry = [134, 130];
openSource.exit = [250, 130, 68];

// --- 13. The homelab, and BoBe running it ---

export function homelab(t) {
  rect(0, 0, W, 104, "#1d2233");
  for (let x = 0; x < W; x += 16) rect(x, 0, 1, 104, "#21273b");
  rect(0, 104, W, 32, "#2a2a3a");
  for (let x = 0; x < W; x += 24) rect(x, 104, 1, 32, "#2f2f40");
  rect(0, 104, W, 1, "#353548");
  // A rack of shelves: the router and the switch up top, BoBe beside them; the mini PC, the
  // drives and a small screen with the dashboard below.
  rect(166, 30, 2, 74, "#5e3e28");
  rect(298, 30, 2, 74, "#5e3e28");
  rect(166, 60, 134, 3, "#7a5236");
  rect(166, 100, 134, 4, "#7a5236");
  rect(166, 28, 134, 3, "#7a5236");
  rect(213, 18, 40, 10, "#2a2f38");
  text("HOMELAB", Math.round(233 - textWidth("HOMELAB") / 2), 21, "#5ec77a");
  const blink = (i, rate = 6) => Math.floor(t * rate + i * 1.7) % 3 !== 0;
  rect(176, 50, 24, 10, "#2a2f38");
  rect(179, 42, 1, 8, "#4a515c");
  rect(196, 42, 1, 8, "#4a515c");
  for (let i = 0; i < 4; i++) px(180 + i * 4, 53, blink(i) ? "#5ec77a" : "#1f3a2a");
  rect(206, 54, 28, 6, "#2a2f38");
  for (let i = 0; i < 8; i++) px(208 + i * 3, 56, blink(i + 4, 9) ? "#e6c35c" : "#3a3020");
  bobe(248, 60, t, true, t > 4.0);
  rect(176, 86, 24, 14, "#1c2027");
  rect(176, 86, 24, 1, "#3a414c");
  px(179, 90, "#5ec77a");
  px(182, 90, blink(9, 4) ? "#7fb3ff" : "#1c2a44");
  rect(206, 76, 28, 24, "#2a2f38");
  for (let i = 0; i < 4; i++) {
    rect(208, 78 + i * 5, 24, 4, "#3a414c");
    px(229, 79 + i * 5, blink(i + 12, 8) ? "#5ec77a" : "#22312a");
  }
  rect(242, 70, 50, 30, "#1c2230");
  rect(244, 72, 46, 26, "#0f1626");
  for (let i = 0; i < 6; i++) {
    const x = 247 + (i % 3) * 15;
    const y = 75 + Math.floor(i / 3) * 11;
    rect(x, y, 12, 8, "#1c2a44");
    rect(x + 2, y + 3, 2, 2, t > 2.8 + i * 0.15 ? "#5ec77a" : "#5a6270");
    rect(x + 5, y + 3, 5, 1, "#3a4a66");
  }
  for (const [x1, x2, y] of [[188, 220, 63], [200, 242, 99]]) rect(x1, y, x2 - x1, 1, "#3a3f56");
  // John asks; BoBe answers.
  const [x0, y0] = homelab.entry;
  const me = walkPath([[1.0, x0], [2.0, 130], [5.0, 130], [6.0, homelab.exit[0]]], t);
  john(Math.round(me.x), y0, "right", me.moving ? me.x / 48 : t, me.moving ? "walk" : t > 2.0 && t < 2.6 ? "point" : "stand");
  say(130, 103, "STATUS?", 2.0, t, 0.9);
  say(254, 38, "ALL SERVICES UP", 2.7, t, 1.3);
  say(254, 38, "BACKUPS DONE", 4.1, t, 1.0);
}
homelab.entry = [40, 130, 60];
homelab.exit = [250, 130, 64];

// --- 14. Building agents with the team: a brain, then tools, then it wakes up; then the red team tries to break it ---

function tool(kind, x, y) {
  x = Math.round(x);
  y = Math.round(y);
  if (kind === "wrench") {
    rect(x + 1, y, 1, 2, "#c4ccd6");
    rect(x + 4, y, 1, 2, "#c4ccd6");
    rect(x + 1, y + 2, 4, 2, "#c4ccd6");
    rect(x + 2, y + 4, 2, 5, "#9aa3ad");
  } else if (kind === "lens") {
    rect(x + 1, y, 4, 1, "#e6c35c");
    rect(x, y + 1, 1, 4, "#e6c35c");
    rect(x + 5, y + 1, 1, 4, "#e6c35c");
    rect(x + 1, y + 5, 4, 1, "#e6c35c");
    rect(x + 1, y + 1, 4, 4, "#bfe2fa");
    px(x + 2, y + 2, "#ffffff");
    rect(x + 5, y + 6, 2, 2, "#8a5a36");
  } else if (kind === "doc") {
    rect(x, y, 6, 8, "#f4f1e8");
    px(x + 5, y, "#c9c4b8");
    for (let i = 0; i < 3; i++) rect(x + 1, y + 2 + i * 2, 4 - (i % 2), 1, "#7f8a99");
  } else {
    rect(x, y, 9, 5, "#1c232c");
    rect(x, y, 9, 1, "#DB8A62");
    rect(x + 1, y + 2, 2, 2, "#7DBB99");
    rect(x + 4, y + 2, 4, 1, "#9198a1");
  }
}

const BRAIN = [".PPPPPP.", "PPpPPpPP", "PpPPPPpP", "PPPpPPPP", "PPpPPpPP", ".PPPPPP."];
function brain(x, y, small = false) {
  const rows = small ? ["PPpPPp", "pPPpPP", "PPPPpP"] : BRAIN;
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== ".") px(Math.round(x) + i, Math.round(y) + j, row[i] === "P" ? "#f28fb4" : "#c2577f");
  });
}

// The agent: a glass dome for its brain, a screen face, and the tools it is given.
function robot(x, y, t, { hasBrain, on, tools, happy }) {
  const l = Math.round(x - 9);
  const top = Math.round(y - 24) - (happy ? Math.round(Math.abs(Math.sin(t * 7)) * 2) : 0);
  rect(l + 5, top, 8, 4, "#cfe3f4");
  rect(l + 4, top + 1, 10, 3, "#cfe3f4");
  px(l + 5, top + 1, "#ffffff");
  if (hasBrain) brain(l + 6, top + 1, true);
  rect(l + 2, top + 4, 14, 9, "#2f3642");
  rect(l + 2, top + 4, 14, 1, "#465062");
  rect(l + 4, top + 6, 10, 5, "#11151b");
  if (on) {
    if (happy) {
      for (const ex of [l + 6, l + 10]) {
        px(ex, top + 8, "#DB8A62");
        px(ex + 1, top + 7, "#DB8A62");
        px(ex + 2, top + 8, "#DB8A62");
      }
    } else if (Math.floor(t * 2) % 7 !== 0) {
      rect(l + 6, top + 7, 2, 3, "#DB8A62");
      rect(l + 10, top + 7, 2, 3, "#DB8A62");
    }
  }
  rect(l + 1, top + 7, 1, 3, "#465062");
  rect(l + 16, top + 7, 1, 3, "#465062");
  rect(l + 4, top + 13, 10, 7, "#2f3642");
  rect(l + 4, top + 13, 10, 1, "#465062");
  rect(l + 7, top + 15, 4, 3, on ? "#3cd27a" : "#1b2028");
  rect(l + 2, top + 14, 2, 5, "#465062");
  const wave = happy && Math.floor(t * 5) % 2;
  rect(l + 14, top + (wave ? 10 : 14), 2, 5, "#465062");
  rect(l + 5, top + 20, 3, 3, "#465062");
  rect(l + 10, top + 20, 3, 3, "#465062");
  rect(l + 4, top + 23, 4, 1, "#20252e");
  rect(l + 10, top + 23, 4, 1, "#20252e");
  const bob = Math.round(Math.sin(t * 3));
  if (tools > 0) tool("wrench", l + 14, top + (wave ? 2 : 6));
  if (tools > 1) tool("lens", l - 5, top + 10);
  if (tools > 2) tool("doc", l - 7, top - 2 + bob);
  if (tools > 3) tool("card", l + 17, top - 1 - bob);
}

// Where each tool goes on the robot, relative to its feet, for the flight.
const SLOTS = [["wrench", 5, -18], ["lens", -14, -14], ["doc", -16, -26], ["card", 8, -25]];

// A rounded block with a light top-left edge, for the close-up robot.
function block(x, y, w, h, face, light, edge) {
  rect(x + 1, y, w - 2, h, edge);
  rect(x, y + 1, w, h - 2, edge);
  rect(x + 1, y + 1, w - 2, h - 2, face);
  rect(x + 2, y + 1, w - 4, 1, light);
  rect(x + 1, y + 2, 1, h - 4, light);
}

const BIG_BRAIN = [
  "....PPPPPPPPPPPPPP....",
  "..PPPpPPPPPpPPPPPPPP..",
  ".PPpPPPPpPPPPPpPPPpPP.",
  "PPPPPpPPPPpPPPPPpPPPPP",
  "PpPPPPPpPPPPpPPPPPPpPP",
  "PPPpPPPPPPpPPPPpPPPPPP",
  "PPPPPPpPPPPPPpPPPPpPPP",
  ".PPpPPPPpPPPPPPPpPPPP.",
  "..PPPPpPPPPpPPPPPPPP..",
  "....PPPPPPPPPPPPPP....",
];

// The close-up: the brain goes into the dome, the eyes come on, the tools arrive one by one and
// each lights the wire back to the brain.
function robotClose(c, t) {
  rect(0, 0, W, 116, "#e4e8ee");
  rect(0, 14, 104, 90, "#d8c39a");
  for (let y = 20; y < 100; y += 8) for (let x = 6; x < 100; x += 8) rect(x, y, 2, 2, "#b9a477");
  rect(232, 18, 88, 62, "#c9ced6");
  rect(234, 20, 86, 58, "#fbfcfd");
  for (let i = 0; i < 4; i++) rect(244, 30 + i * 11, 40 + (i % 2) * 18, 2, "#d5dae2");
  rect(0, 116, W, 3, "#9aa6ba");
  rect(0, 119, W, 17, "#7f8a9c");
  rect(0, 119, W, 1, "#a9b4c6");
  const cx = 168;
  const on = c > 0.6;
  const happy = c > 2.4;
  const dark = "#262c36";
  const light = "#3b4350";
  const edge = "#151a21";
  // Legs, body, neck, head.
  block(cx - 17, 102, 12, 14, dark, light, edge);
  block(cx + 5, 102, 12, 14, dark, light, edge);
  block(cx - 21, 70, 42, 34, dark, light, edge);
  rect(cx - 5, 66, 10, 4, "#3b4350");
  block(cx - 24, 38, 48, 30, dark, light, edge);
  // The face, the chest screen and the slots for the tools.
  rect(cx - 18, 43, 36, 19, "#11151b");
  if (on) {
    const blink = !happy && Math.floor(t * 2) % 9 === 0;
    for (const ex of [cx - 11, cx + 5]) {
      if (happy) {
        rect(ex, 52, 2, 2, "#DB8A62");
        rect(ex + 2, 50, 2, 2, "#DB8A62");
        rect(ex + 4, 52, 2, 2, "#DB8A62");
      } else if (blink) rect(ex, 52, 6, 2, "#DB8A62");
      else {
        rect(ex + 1, 47, 4, 11, "#DB8A62");
        rect(ex, 48, 6, 9, "#DB8A62");
        rect(ex + 1, 48, 2, 3, "#f4c2a6");
      }
    }
    if (c < 0.9) glow(cx, 52, Math.round(26 * (1 - span(c, 0.6, 0.9))) + 4, "#ffd8b8", 0.5);
  }
  rect(cx - 9, 76, 18, 11, "#11151b");
  if (on) {
    const done = LAUNCH_C.filter((s) => c > s + 0.3).length;
    for (let i = 0; i < 4; i++) rect(cx - 7 + i * 4, 80, 3, 3, i < done ? "#3cd27a" : "#2a3340");
  }
  rect(cx - 8, 92, 16, 2, "#0b0e13");
  rect(cx + 24, 46, 2, 12, "#0b0e13");
  // Arms, out to the hands that will hold the tools.
  block(cx - 29, 72, 8, 8, dark, light, edge);
  block(cx + 21, 72, 8, 8, dark, light, edge);
  rect(cx - 33, 80, 6, 14, dark);
  rect(cx - 33, 80, 1, 14, light);
  rect(cx + 27, 80, 6, 14, dark);
  rect(cx + 27, 80, 1, 14, light);
  block(cx - 35, 93, 9, 6, "#465062", "#5a6474", edge);
  block(cx + 26, 93, 9, 6, "#465062", "#5a6474", edge);
  // The glass dome, and the brain lowered into it.
  for (let j = 0; j < 18; j++) {
    const half = Math.round(Math.sqrt(Math.max(0, 1 - ((17 - j) / 18) ** 2)) * 17);
    rect(cx - half, 21 + j, half * 2, 1, "#cfe3f4");
    px(cx - half, 21 + j, "#8fb3d6");
    px(cx + half - 1, 21 + j, "#8fb3d6");
  }
  rect(cx - 17, 38, 34, 1, "#8fb3d6");
  const by = Math.round(lerp(-14, 26, ease(span(c, 0, 0.6))));
  BIG_BRAIN.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== ".") px(cx - 11 + i, by + j, row[i] === "P" ? "#f28fb4" : "#c2577f");
  });
  for (let j = 0; j < 7; j++) px(cx - 10 + Math.round(j * 0.6), 25 + j, "#ffffff");
  // The tools, each brought in from the side, and the wire from the brain to it.
  const SPOT = [
    ["wrench", cx + 23, 70, W + 10, 60],
    ["lens", cx - 47, 86, -20, 86],
    ["doc", cx - 6, 84, cx - 60, 130],
    ["card", cx + 22, 49, W + 10, 40],
  ];
  SPOT.forEach(([kind, x, y, fromX, fromY], i) => {
    const s = LAUNCH_C[i];
    if (c < s) return;
    const k = ease(span(c, s, s + 0.3));
    const tx = Math.round(lerp(fromX, x, k));
    const ty = Math.round(lerp(fromY, y, k));
    bigTool(kind, tx, ty, k);
    const pulse = span(c, s + 0.3, s + 0.8);
    if ((pulse > 0 && pulse < 1) || happy) {
      const [ax, ay] = [cx, by + 10];
      const [bx, by2] = [x + 4, y + 4];
      for (let d = 0; d <= 1; d += 0.04) {
        const wx = Math.round(lerp(ax, bx, d));
        const wy = Math.round(lerp(ay, by2, d) - Math.sin(d * Math.PI) * 6);
        const hot = happy ? (d * 10 + t * 6) % 2 < 0.6 : Math.abs(d - pulse) < 0.12;
        if (hot) px(wx, wy, "#ffd8b8");
        else if (d % 0.12 < 0.04) px(wx, wy, "#DB8A62");
      }
    }
  });
  if (happy) balloon(cx + 34, 30, "heart", 2.45, c, 1.0);
}

const LAUNCH_C = [0.8, 1.2, 1.6, 2.0];

// The tools at close-up size.
function bigTool(kind, x, y, k) {
  if (kind === "wrench") {
    rect(x + 2, y, 3, 6, "#c4ccd6");
    rect(x + 9, y, 3, 6, "#c4ccd6");
    rect(x + 2, y + 5, 10, 5, "#c4ccd6");
    rect(x + 3, y + 6, 8, 1, "#e9edf2");
    rect(x + 5, y + 10, 4, 16, "#9aa3ad");
    rect(x + 5, y + 10, 1, 16, "#c4ccd6");
  } else if (kind === "lens") {
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      px(x + 8 + Math.round(Math.cos(a) * 7), y + 8 + Math.round(Math.sin(a) * 7), "#e6c35c");
      px(x + 8 + Math.round(Math.cos(a) * 6), y + 8 + Math.round(Math.sin(a) * 6), "#c9a24a");
    }
    disc(x + 8, y + 8, 5, "#bfe2fa");
    rect(x + 5, y + 5, 3, 2, "#ffffff");
    for (let i = 0; i < 7; i++) rect(x + 13 + i, y + 13 + i, 3, 3, "#8a5a36");
  } else if (kind === "doc") {
    // It slides into the chest slot: only the part above the slot shows once it arrives.
    const h = Math.round(lerp(16, 6, span(k, 0.7, 1)));
    rect(x, y + 8 - h, 12, h, "#f4f1e8");
    for (let i = 0; i < 3; i++) if (y + 10 - h + i * 4 < y + 8) rect(x + 2, y + 10 - h + i * 4, 8 - (i % 2) * 3, 1, "#7f8a99");
    rect(x - 2, y + 8, 16, 2, "#0b0e13");
  } else {
    rect(x, y, 16, 9, "#1c232c");
    rect(x, y, 16, 1, "#DB8A62");
    rect(x + 2, y + 3, 4, 4, "#7DBB99");
    rect(x + 8, y + 3, 6, 1, "#9198a1");
    rect(x + 8, y + 5, 4, 1, "#6e7681");
  }
}

export function workshop(t) {
  if (t >= 2.6 && t < 5.2) return robotClose(t - 2.6, t);
  rect(0, 0, W, 104, "#e4e8ee");
  rect(0, 104, W, 32, "#c3c7cf");
  for (let x = 0; x < W; x += 20) rect(x, 104, 1, 32, "#b8bcc5");
  for (const x of [70, 160, 250]) {
    rect(x - 14, 0, 28, 2, "#ffffff");
    glow(x, 4, 16, "#ffffff", 0.3);
  }
  // A pegboard of tools on the left, a whiteboard with the plan on the right.
  rect(16, 44, 78, 46, "#d8c39a");
  for (let y = 47; y < 88; y += 4) for (let x = 19; x < 92; x += 4) px(x, y, "#b9a477");
  rect(16, 44, 78, 1, "#c4ad80");
  rect(22, 52, 2, 14, "#7a5236");
  rect(19, 50, 8, 3, "#8a919c");
  rect(32, 50, 1, 18, "#c2453a");
  rect(31, 66, 3, 4, "#3a3a42");
  rect(52, 50, 12, 2, "#8a919c");
  for (let i = 0; i < 5; i++) px(52 + i * 2, 52, "#8a919c");
  for (let i = 0; i < 4; i++) rect(22 + i * 18, 76, 14, 10, ["#3f6fb5", "#c9784d", "#4f8b5a", "#d9a441"][i]);
  rect(222, 22, 82, 44, "#c9ced6");
  rect(223, 23, 80, 42, "#fbfcfd");
  const red = t > 5.9;
  const title = red ? "RED TEAMING" : "BUILDING AGENTS";
  text(title, Math.round(263 - textWidth(title) / 2), 26, red ? "#c2453a" : "#3a4048");
  brain(232, 44);
  for (const [kind, x, y] of [["wrench", 262, 34], ["lens", 262, 48], ["doc", 282, 34], ["card", 280, 50]]) {
    rect(242, 47, kind === "wrench" || kind === "lens" ? 16 : 34, 1, "#9aa3ad");
    tool(kind, x, y);
  }
  rect(222, 66, 82, 2, "#aab1bb");
  // The bench, the team behind it, John walking in to join them.
  const [x0, y0] = workshop.entry;
  const me = walkPath([[1.0, x0], [2.2, 150], [2.25, 150, "front"], [7.3, 150, "front"], [7.35, 150], [8.6, workshop.exit[0]]], t);
  const done = t >= 5.2;
  const pose = me.moving ? "walk" : me.dir === "front" ? (t < 2.6 && t > 2.25 ? "lift" : done && t < 6.0 ? "cheer" : "stand") : "stand";
  john(Math.round(me.x), y0, me.dir, me.moving ? me.x / 48 : t, pose);
  for (const [who, x] of [[1, 112], [3, 132], [2, 206], [6, 228]]) person(who, x, 132, "front", t + x, done && t < 5.9 ? "cheer" : "stand");
  rect(96, 127, 148, 2, "#9aa6ba");
  rect(96, 129, 148, 4, "#7f8a9c");
  rect(100, 133, 3, 3, "#6c7686");
  rect(237, 133, 3, 3, "#6c7686");
  // The agent on the bench: empty before the close-up, finished and waving after it.
  const RX = 172;
  robot(RX, 127, t, { hasBrain: done, on: done, tools: done ? 4 : 0, happy: done });
  if (t < 2.25) brain(146, 121);
  else if (!done) brain(146, lerp(121, 96, ease(span(t, 2.25, 2.55))));
  balloon(RX, 96, "heart", 5.4, t, 1.0);
  say(206, 105, "IT NEEDS A BRAIN!", 1.05, t, 1.4);
  say(112, 105, "IT WORKS!", 5.5, t, 0.9);
  // Then the red team: a poisoned memory card thrown at the agent, which it refuses.
  say(228, 105, "LET'S BREAK IT", 5.95, t, 0.9);
  if (t > 6.2 && t < 7.0) {
    const hit = t < 6.6;
    const k = hit ? ease(span(t, 6.2, 6.6)) : 1 - ease(span(t, 6.6, 7.0)) * 0.6;
    const cx = Math.round(lerp(228, RX + 10, k));
    const cy = Math.round(lerp(104, 112, k) - Math.sin(k * Math.PI) * 10);
    if (hit || t < 6.9) {
      rect(cx - 4, cy - 3, 9, 7, "#c2453a");
      rect(cx - 3, cy - 2, 7, 5, "#f4f1e8");
      px(cx - 1, cy - 1, "#2a2230");
      px(cx + 1, cy - 1, "#2a2230");
      rect(cx - 1, cy + 1, 3, 1, "#2a2230");
    }
  }
  if (t > 6.6 && t < 7.4) {
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      px(Math.round(RX + Math.cos(a) * 16), Math.round(112 + Math.sin(a) * 13), i % 2 ? "#5fc8ff" : "#bfeaff");
    }
    rect(RX - 3, 80, 6, 1, "#9aa3ad");
    rect(RX - 3, 80, 1, 4, "#9aa3ad");
    rect(RX + 2, 80, 1, 4, "#9aa3ad");
    rect(RX - 4, 84, 8, 6, "#e6c35c");
    px(RX, 86, "#2a2230");
    px(RX, 87, "#2a2230");
  }
  say(RX, 78, "BLOCKED!", 6.7, t, 0.8);
}
workshop.entry = [40, 128, 60];
workshop.exit = [250, 128, 70];

// --- 15. Zürich: the lake, the Alps, a coffee, and you ---

export function zurich(t) {
  bands(0, 78, ["#24345f", "#38497c", "#5c6298", "#8f78a8", "#c48ca2", "#e8a48e", "#f4c89a"]);
  // The Alps across the lake, their snow pink with the last light: each column is the highest of a
  // few peaks, the faces turned to the sunset lit, the others in shade.
  const PEAKS = [[18, 24, 30], [64, 36, 34], [104, 28, 26], [148, 44, 38], [196, 32, 30], [236, 40, 32], [284, 30, 34]];
  const ridge = (x) => {
    let h = 0;
    for (const [px0, ph, pw] of PEAKS) h = Math.max(h, ph * (1 - Math.abs(x - px0) / pw));
    return 78 - h - (h > 6 ? Math.round((hash(Math.floor(x / 3), 4) - 0.5) * 3) : 0);
  };
  for (let x = 0; x < W; x++) {
    const y = ridge(x);
    const lit = ridge(x + 1) > y || (ridge(x + 1) === y && ridge(x - 1) < y);
    rect(x, y, 1, 78 - y, lit ? "#8e96c0" : "#6f78a6");
    if (y < 60) {
      const depth = Math.round((60 - y) * 0.7);
      rect(x, y, 1, depth, lit ? "#ffe4dc" : "#e9b9bf");
      px(x, y, lit ? "#fff4ee" : "#f2cdd0");
    }
  }
  g.fillStyle = "#5f6890";
  g.beginPath();
  g.moveTo(0, 78);
  for (let x = 0; x <= W; x += 2) g.lineTo(x, 70 - Math.round(Math.sin(x * 0.035 + 0.6) * 3 + Math.sin(x * 0.09) * 2));
  g.lineTo(W, 78);
  g.fill();
  // The lake, a steamer, swans.
  bands(78, 106, ["#5a5f92", "#6a6aa0", "#7a72a6", "#6a6a9c"]);
  for (let i = 0; i < 30; i++) {
    const x = (hash(i, 7) * W + t * 2 * (0.5 + hash(i, 9))) % W;
    if (hash(i, Math.floor(t * 2)) > 0.4) rect(x, 82 + Math.floor(hash(i, 8) * 22), 3, 1, "#9a8fc0");
  }
  const bx = Math.round(40 + t * 6);
  rect(bx, 88, 34, 5, "#f6f3ea");
  rect(bx + 2, 85, 24, 3, "#f6f3ea");
  rect(bx + 6, 82, 10, 3, "#e6e0d4");
  rect(bx, 92, 34, 1, "#3f6fd0");
  for (let i = 0; i < 6; i++) rect(bx + 4 + i * 4, 86, 2, 1, "#5a6a8a");
  rect(bx + 29, 77, 1, 8, "#3a3346");
  rect(bx + 30, 77, 5, 5, "#d52b1e");
  rect(bx + 32, 78, 1, 3, "#ffffff");
  rect(bx + 31, 79, 3, 1, "#ffffff");
  for (const [sx0, sy0] of [[200, 98], [214, 100], [248, 97]]) {
    const sxw = Math.round(sx0 + Math.sin(t * 0.8 + sx0) * 3);
    rect(sxw, sy0, 6, 3, "#ffffff");
    rect(sxw + 5, sy0 - 4, 1, 4, "#ffffff");
    px(sxw + 6, sy0 - 4, "#e8913a");
  }
  // The old town: the Grossmünster's twin towers, steep roofs.
  for (const tx of [262, 276]) {
    rect(tx, 40, 9, 38, "#d9c7a8");
    rect(tx, 40, 2, 38, "#c4b090");
    rect(tx - 1, 34, 11, 6, "#3a3448");
    rect(tx + 3, 30, 3, 4, "#3a3448");
    rect(tx + 3, 48, 3, 5, "#4a3f3a");
  }
  rect(256, 60, 34, 18, "#cdb89a");
  for (let i = 0; i < 5; i++) {
    const hx = 290 + i * 7;
    rect(hx, 58 + (i % 2) * 3, 7, 20, ["#e2c9a0", "#d7b088", "#ead6b2", "#cfa27a", "#e6cfa8"][i]);
    rect(hx, 56 + (i % 2) * 3, 7, 3, "#8a4a3a");
  }
  // A blue tram crosses the bridge behind.
  rect(0, 70, 120, 6, "#8a7f74");
  for (let x = 6; x < 120; x += 14) rect(x, 76, 3, 6, "#7a7064");
  const tram = Math.round(((t * 18) % 170) - 40);
  rect(tram, 64, 26, 6, "#2f6fd0");
  rect(tram, 68, 26, 1, "#f2efe8");
  for (let i = 0; i < 3; i++) rect(tram + 3 + i * 8, 65, 6, 2, "#cfe0ff");
  rect(tram + 12, 61, 1, 3, "#3a3346");
  // The quay: trees, a lamp, a bench.
  rect(0, 104, W, 2, "#b9a88e");
  rect(0, 106, W, 30, "#8f8378");
  for (let y = 110; y < H; y += 6) rect(0, y, W, 1, "#9a8e82");
  for (const x of [30, 120, 290]) {
    rect(x, 84, 2, 22, "#4a3a32");
    disc(x + 1, 80, 10, "#2f5a3f");
    disc(x - 2, 78, 7, "#3c7350");
  }
  glow(222, 86, 8, "#ffd88f", 0.4);
  rect(222, 84, 1, 22, "#3a3346");
  rect(221, 83, 3, 2, "#3a3346");
  px(222, 85, "#ffd88f");
  rect(146, 92, 2, 12, "#5a6270");
  rect(132, 81, 30, 12, "#f2efe8");
  rect(133, 82, 28, 10, "#2f6fd0");
  const zx = Math.round(147 - textWidth("ZURICH") / 2);
  text("ZURICH", zx, 86, "#ffffff");
  px(zx + 4, 84, "#ffffff");
  px(zx + 6, 84, "#ffffff");
  const a = walkPath([[0.4, 340], [3.0, 40, "left"]], t);
  person(0, Math.round(a.x), 118, "left", a.x / 48, "walk");
  rect(150, 113, 34, 2, "#6b4428");
  rect(152, 115, 2, 9, "#5a3a22");
  rect(180, 115, 2, 9, "#5a3a22");
  rect(150, 124, 34, 2, "#8a5a36");
  rect(150, 126, 34, 1, "#6b4428");
  rect(152, 127, 2, 3, "#5a3a22");
  rect(180, 127, 2, 3, "#5a3a22");
  // John comes along the quay with a coffee and his laptop, turns to you, and the camera comes in.
  const [x0, y0] = zurich.entry;
  const me = walkPath([[1.0, x0], [2.9, 160], [2.95, 160, "front"]], t);
  john(Math.round(me.x), y0, me.dir, me.moving ? me.x / 48 : t, me.dir === "front" ? "coffee" : "carry");
  const b = walkPath([[0, 262], [6.0, 336]], t);
  person(3, Math.round(b.x), 134, "right", b.x / 48, "walk");
  return { zoom: [160, y0 - 16, lerp(1, 8 / 3, ease(span(t, 3.3, 5.3)))] };
}
zurich.entry = [40, 130, 64];
zurich.walkPose = "carry";
