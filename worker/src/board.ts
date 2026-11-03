// The Orbit board as a pixel-art SVG, in the style of the profile's film. Each layer is painted
// like a canvas, then written as rectangles, one path per colour, and the image is scaled up
// without smoothing. Light comes from the top left. When the last step happened a moment ago, the
// board replays it: the swarm slides in, shots fly, debris breaks up. Small loops (lights, stars,
// pickups) always run.
import { COLS, ROWS, MAX_HP, MAX_LEVEL, CAPS, dronesAt, type Cap, type Cell, type Run, type State } from "./orbit";

const CELL = 16;
const HUD = 22;
const W = COLS * CELL;
const H = HUD + ROWS * CELL;
const SCALE = 4;
const RECENT_MS = 6000;

// The canvas each layer is painted on while it is written out.
const canvas = new Uint16Array(W * H);

class Layer {
  private ops: number[] = [];
  private colors: string[] = [];
  private index = new Map<string, number>();
  rect(x: number, y: number, w: number, h: number, c: string) {
    if (w <= 0 || h <= 0) return;
    let k = this.index.get(c);
    if (k === undefined) this.index.set(c, (k = this.colors.push(c)));
    this.ops.push(Math.round(x), Math.round(y), Math.round(w), Math.round(h), k);
  }
  px(x: number, y: number, c: string) {
    this.rect(x, y, 1, 1, c);
  }
  // A sprite from rows of letters, each letter a colour in the palette; "." is empty.
  sprite(rows: string[], pal: Record<string, string>, x: number, y: number, flip = false) {
    rows.forEach((row, j) => {
      const r = flip ? [...row].reverse().join("") : row;
      for (let i = 0; i < r.length; ) {
        let k = i + 1;
        while (k < r.length && r[k] === r[i]) k++;
        if (pal[r[i]]) this.rect(x + i, y + j, k - i, 1, pal[r[i]]);
        i = k;
      }
    });
  }
  disc(cx: number, cy: number, r: number, c: string) {
    for (let y = Math.ceil(cy - r); y <= Math.floor(cy + r); y++) {
      const half = Math.sqrt(Math.max(0, r * r - (y - cy) ** 2)) + 0.35;
      const [a, b] = [Math.ceil(cx - half), Math.floor(cx + half)];
      this.rect(a, y, b - a + 1, 1, c);
    }
  }
  ring(cx: number, cy: number, r: number, c: string, every = 1) {
    const n = Math.max(12, Math.round(r * 7));
    for (let i = 0; i < n; i += every) {
      const a = (i / n) * Math.PI * 2;
      this.px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), c);
    }
  }
  // Paints the layer, then covers each colour with few rectangles: runs along each row, joined
  // with the same run on the rows below.
  svg(attrs = ""): string {
    const ops = this.ops;
    let [x0, y0, x1, y1] = [W, H, 0, 0];
    for (let i = 0; i < ops.length; i += 5) {
      const ax = Math.max(0, ops[i]);
      const ay = Math.max(0, ops[i + 1]);
      const bx = Math.min(W, ops[i] + ops[i + 2]);
      const by = Math.min(H, ops[i + 1] + ops[i + 3]);
      if (ax >= bx || ay >= by) continue;
      for (let y = ay; y < by; y++) canvas.fill(ops[i + 4], y * W + ax, y * W + bx);
      [x0, y0, x1, y1] = [Math.min(x0, ax), Math.min(y0, ay), Math.max(x1, bx), Math.max(y1, by)];
    }
    const d = this.colors.map(() => "");
    const emit = (r: number[]) => (d[r[4] - 1] += `M${r[0]} ${r[1]}h${r[2]}v${r[3]}h${-r[2]}z`);
    let open = new Map<number, number[]>();
    for (let y = y0; y < y1; y++) {
      const next = new Map<number, number[]>();
      for (let x = x0; x < x1; ) {
        const k = canvas[y * W + x];
        let e = x + 1;
        while (e < x1 && canvas[y * W + e] === k) e++;
        if (k) {
          const key = (x * 1024 + e) * 1024 + k;
          const r = open.get(key);
          if (r) {
            r[3]++;
            open.delete(key);
            next.set(key, r);
          } else next.set(key, [x, y, e - x, 1, k]);
        }
        x = e;
      }
      open.forEach(emit);
      open = next;
    }
    open.forEach(emit);
    for (let y = y0; y < y1; y++) canvas.fill(0, y * W + x0, y * W + x1);
    const out = this.colors.map((c, i) => (d[i] ? `<path fill="${c}" d="${d[i]}"/>` : "")).join("");
    return attrs ? `<g ${attrs}>${out}</g>` : out;
  }
}

// The 3x5 font of the film's signs, with wider letters where three columns can't draw a diagonal.
const GLYPHS: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", O: "010101101101010", P: "110101110100100", Q: "010101101110011",
  R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010",
  X: "101101010101101", Y: "101101010010010", Z: "111001010100111", 0: "111101101101111", 1: "010110010010111",
  2: "110001010100111", 3: "110001010001110", 4: "101101111001001", 5: "111100110001110", 6: "011100110101010",
  7: "111001010010010", 8: "010101010101010", 9: "010101011001110", ".": "000000000000010", ",": "000000000010100",
  ":": "000010000010000", "!": "010010010000010", " ": "000000000000000",
};
const WIDE: Record<string, string[]> = {
  M: ["10001", "11011", "10101", "10001", "10001"],
  N: ["1001", "1101", "1011", "1001", "1001"],
  W: ["10001", "10001", "10101", "11011", "10001"],
};
const glyphWidth = (ch: string) => (WIDE[ch] ? WIDE[ch][0].length : 3);
const textWidth = (s: string, k = 1) => [...s.toUpperCase()].reduce((w, ch) => w + (glyphWidth(ch) + 1) * k, -k);
function text(L: Layer, s: string, x: number, y: number, c: string, k = 1) {
  let at = Math.round(x);
  for (const ch of s.toUpperCase()) {
    if (WIDE[ch]) {
      WIDE[ch].forEach((row, j) => {
        for (let i = 0; i < row.length; i++) if (row[i] === "1") L.rect(at + i * k, y + j * k, k, k, c);
      });
    } else {
      const bits = GLYPHS[ch] ?? GLYPHS[" "];
      for (let i = 0; i < 15; i++) if (bits[i] === "1") L.rect(at + (i % 3) * k, y + Math.floor(i / 3) * k, k, k, c);
    }
    at += (glyphWidth(ch) + 1) * k;
  }
}

// Bigger 5x7 digits for the numbers on the panel, with a drop shadow.
const DIGITS: Record<string, string[]> = {
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};
function number(L: Layer, n: number, x: number, y: number, c: string, shade: string) {
  [...String(n)].forEach((digit, k) => {
    for (const [dx, col] of [[1, shade], [0, c]] as const)
      DIGITS[digit].forEach((row, j) => {
        for (let i = 0; i < 5; i++) if (row[i] === "1") L.px(x + k * 6 + i + dx, y + j + dx, col);
      });
  });
}

const hash = (a: number, b = 0, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const cx = (x: number) => x * CELL;
const cy = (y: number) => HUD + y * CELL;

// CSS for this board: each animation gets its own class.
let css: string[] = [];
const anim = (name: string, frames: string, ms: number, delay = 0, extra = "") => {
  css.push(`@keyframes ${name}{${frames}}.${name}{animation:${name} ${ms}ms ${delay}ms both${extra}}`);
  return `class="${name}"`;
};
const blink = (name: string, ms: number, delay = 0) => anim(name, "0%,49%{opacity:1}50%,100%{opacity:0}", ms, delay, " infinite steps(1)");
const CENTRED = ";transform-box:fill-box;transform-origin:center";

// --- Sprites -----------------------------------------------------------------------------

// The CubeSat: a 3U body in a gold frame, two solar wings, an antenna and the payload's lens.
function satellite(L: Layer, x: number, y: number) {
  for (const wx of [x, x + 11]) {
    L.rect(wx, y + 5, 5, 7, "#5a4418");
    L.rect(wx + 1, y + 6, 3, 5, "#1e3a7a");
    L.rect(wx + 1, y + 8, 3, 1, "#33589f");
    L.px(wx + 1, y + 6, "#8fc0ff");
    L.px(wx + 2, y + 9, "#3d6cc4");
  }
  L.rect(x + 5, y + 2, 6, 14, "#c9a24a");
  L.rect(x + 10, y + 3, 1, 13, "#8a6a2a");
  L.rect(x + 6, y + 15, 5, 1, "#8a6a2a");
  L.rect(x + 5, y + 2, 1, 13, "#f0d48e");
  L.rect(x + 5, y + 2, 5, 1, "#f0d48e");
  L.rect(x + 6, y + 3, 4, 11, "#172a5c");
  for (const u of [3, 7, 11]) {
    L.rect(x + 6, y + u, 4, 1, "#27468f");
    L.px(x + 6, y + u, "#8fc0ff");
    L.px(x + 7, y + u + 1, "#3a62b8");
  }
  L.rect(x + 6, y + 6, 4, 1, "#a8832e");
  L.rect(x + 6, y + 10, 4, 1, "#a8832e");
  L.rect(x + 7, y + 14, 2, 1, "#0b0f16");
  L.px(x + 7, y + 14, "#5a7ab0");
  L.px(x + 5, y + 8, "#ecd08a");
  L.px(x + 10, y + 8, "#6a5020");
  L.rect(x + 7, y, 1, 2, "#c4ccd6");
}

// Debris in three kinds: a cratered rock, a broken solar panel, a small rock.
const ROCK = [
  "....oooo....",
  "..oommmmoo..",
  ".omllllmmmo.",
  ".omllmmmmmdo",
  "omllmmcmmmdo",
  "omlmmccmmddo",
  "ommmmmmmmddo",
  "ommcmmmmdddo",
  ".ommmmmddddo",
  ".oodmmddddo.",
  "...oodddoo..",
  ".....ooo....",
];
const ROCK_PAL = { o: "#23262e", l: "#c3c6cf", m: "#8d919d", d: "#5a5e6a", c: "#474b56" };
const PANEL = [
  "..........oo",
  "........ooGo",
  "......oobbBo",
  "....oobBBbo.",
  "..oobBBbBo..",
  "oobBBbBBo...",
  "oGBbBBbo....",
  ".oGBBbo.....",
  "..oGBo......",
  "...oo.......",
];
const PANEL_PAL = { o: "#1a1e28", G: "#b08a3a", B: "#22408a", b: "#4a72c4" };
const PEBBLE = ["..oooo..", ".ollmmo.", "olmmmmdo", "olmcmmdo", "ommmmddo", "ommmdddo", ".oddddo.", "..oooo.."];
const PEBBLE_PAL = { o: "#2a2018", l: "#d2ac82", m: "#9a7650", d: "#6a4e34", c: "#58402a" };

function debris(L: Layer, x: number, y: number, kind: number, flip: boolean) {
  if (kind === 0) L.sprite(ROCK, ROCK_PAL, x + 2, y + 2, flip);
  else if (kind === 1) L.sprite(PANEL, PANEL_PAL, x + 2, y + 3, flip);
  else L.sprite(PEBBLE, PEBBLE_PAL, x + 4, y + 4, flip);
}

// A rogue drone: a gunmetal body on two rotors, with a red visor and a red light underneath.
const DRONE = [
  "................",
  "..s..........s..",
  "..skk......kks..",
  "....kkkkkkkk....",
  "...khhhhhhhhk...",
  "..kh11111111dk..",
  "..kh1RRRRRR1dk..",
  "..km1RRRRRR1dk..",
  "..km11111111dk..",
  "...kmmmmmmmmk...",
  "....kddddddk....",
  "......kRRk......",
];
const DRONE_PAL = { k: "#0c0f16", h: "#8a93a8", m: "#5a6278", d: "#3a4152", s: "#5a6278", 1: "#07090d", R: "#c4183a" };
const ROTOR = [["bbbbb......bbbbb"], [".bbb........bbb."]];

// A solar storm: plasma with flares, in two frames that swap.
function storm(L: Layer, x: number, y: number, frame: number) {
  const [ox, oy] = [x + 8, y + 8];
  for (let j = -10; j <= 10; j++)
    for (let i = -10; i <= 10; i++) {
      const d = Math.hypot(i, j);
      const edge = 7.5 + hash(i + 20, j + 20, frame * 7) * 2.5;
      if (d > edge) continue;
      L.px(ox + i, oy + j, d < 2.4 ? "#ffffff" : d < 4 ? "#fff1b8" : d < 5.6 ? "#ffc24a" : d < edge - 1.2 ? "#f2712a" : "#a3261a");
    }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + frame * 0.5;
    for (let r = 9; r < 12; r++) L.px(Math.round(ox + Math.cos(a) * r), Math.round(oy + Math.sin(a) * r), r < 10 ? "#ffb03a" : "#d04a22");
  }
}

// Capability icons, 10x10, for pickups and the panel.
const ICONS: Record<Cap, [string[], Record<string, string>]> = {
  search: [
    ["..yyyy....", ".y....y...", "y.bbbb.y..", "y.bwbb.y..", "y.bbbb.y..", "y.bbbb.y..", ".y....y...", "..yyyyhh..", "......hhh.", ".......hhh"],
    { y: "#f0c85a", b: "#5aa8e8", w: "#ffffff", h: "#a8743e" },
  ],
  drones: [
    ["..........", "...kkkk...", "...krrk...", "...kkkk...", "....ll....", "...l..l...", "kkkk..kkkk", "krrk..krrk", "kkkk..kkkk", ".........."],
    { k: "#3a4458", r: "#f0a070", l: "#DB8A62" },
  ],
  memory: [
    [".y.y..y.y.", ".kkkkkkkk.", "ykddddddky", ".kdggggdk.", "ykdgmmgdky", "ykdgmmgdky", ".kdggggdk.", "ykddddddky", ".kkkkkkkk.", ".y.y..y.y."],
    { k: "#4a5466", d: "#1c232c", g: "#7DBB99", m: "#d4f2e0", y: "#e6c35c" },
  ],
  tools: [
    ["....gg....", ".gg.gg.gg.", ".gggggggs.", "..gg..gs..", "ggg....sss", "ggg....sss", "..gs..ss..", ".gssssss..", ".ss.ss.ss.", "....ss...."],
    { g: "#e4e9f0", s: "#8a939e" },
  ],
  vision: [
    ["..........", "...kkkk...", "kkkkkkkkkk", "klllbbllyk", "kllbwbbllk", "kllbbbbllk", "klllbblllk", "kkkkkkkkkk", "..........", ".........."],
    { k: "#3a4458", l: "#5a6478", b: "#5a9ae0", w: "#eaf6ff", y: "#ffd86b" },
  ],
};
const CAP_COLOR: Record<Cap, string> = { search: "#f0c85a", drones: "#DB8A62", memory: "#7DBB99", tools: "#c4ccd6", vision: "#5a9ae0" };
const CAP_NAME: Record<Cap, string> = { search: "search", drones: "orchestration", memory: "memory", tools: "tools", vision: "vision" };

// A drone of the orchestration capability: a small friendly agent with copper eyes.
const AGENT = ["..kkkkkk..", ".khhhhhhk.", "kh111111mk", "kh1r11r1mk", "km111111mk", ".kmmmmmmk.", "..kttttk..", "...t..t..."];
const AGENT_PAL = { k: "#141821", h: "#d3dbe8", m: "#8a96ad", 1: "#0d1016", r: "#ffb48a", t: "#DB8A62" };

// --- The scene ---------------------------------------------------------------------------

function background(L: Layer, twinkle: Layer) {
  const bands = ["#03040b", "#050716", "#070a1e", "#090d26", "#0b1130"];
  bands.forEach((c, i) => L.rect(0, HUD + (i * ROWS * CELL) / bands.length, W, (ROWS * CELL) / bands.length + 1, c));
  // A faint nebula across the top left.
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(hash(i, 31) * W * 0.7);
    const y = HUD + Math.floor(hash(i, 32) * 70) + Math.floor(x * 0.18);
    if (hash(i, 33) > 0.5) L.px(x, y, hash(i, 34) > 0.5 ? "#1a1240" : "#10213a");
  }
  for (let i = 0; i < 110; i++) L.px(Math.floor(hash(i, 1) * W), HUD + Math.floor(hash(i, 2) * (ROWS * CELL - 14)), hash(i, 3) > 0.75 ? "#5a6896" : "#2c3660");
  for (let i = 0; i < 30; i++) L.px(Math.floor(hash(i, 4) * W), HUD + Math.floor(hash(i, 5) * (ROWS * CELL - 16)), "#c8d4f4");
  for (let i = 0; i < 7; i++) {
    const [x, y] = [Math.floor(hash(i, 6) * (W - 4)) + 2, HUD + 3 + Math.floor(hash(i, 7) * (ROWS * CELL - 30))];
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) twinkle.px(x + dx, y + dy, "#8aa0d8");
    twinkle.px(x, y, "#ffffff");
  }
  // The Moon, small and far, top right.
  const [mx, my] = [W - 26, HUD + 18];
  L.disc(mx, my, 6, "#8d93a6");
  L.disc(mx - 1, my - 1, 5, "#c3c8d6");
  L.disc(mx - 2, my - 2, 3, "#dde1ea");
  for (const [dx, dy] of [[1, 1], [-2, 2], [2, -2]]) L.px(mx + dx, my + dy, "#9a9fb0");
  // The edge of the Earth along the bottom: the atmosphere's glow, sea, land and clouds, and city
  // lights on the night side to the left.
  for (let x = 0; x < W; x++) {
    const d = x - W / 2;
    const top = Math.round(H - 11 + (d * d) / 2600);
    const dusk = W * 0.28 + hash(x, 13) * 6 - 3;
    const night = x < dusk;
    const dawn = Math.abs(x - dusk) < 5;
    L.px(x, top - 3, night ? "#081633" : "#0f2a5a");
    L.px(x, top - 2, dawn ? "#7a3a3a" : night ? "#10295a" : "#1f4f9a");
    L.px(x, top - 1, dawn ? "#f08a4a" : night ? "#2a5a9a" : "#5ab0f0");
    L.px(x, top, dawn ? "#ffd8a0" : night ? "#6a90c8" : "#bfe6ff");
    for (let y = top + 1; y < H; y++) {
      const [u, v] = [(x + 3) / 9, (y - top) / 2.5];
      const land = hash(Math.floor(u), Math.floor(v), 9) * 0.6 + hash(Math.floor(u / 2), Math.floor(v / 2), 10) * 0.4;
      const cloud = hash(Math.floor((x + 1) / 6), Math.floor(y / 2), 11) > 0.72;
      let c = cloud ? "#e8eef8" : land > 0.62 ? (land > 0.8 ? "#8a7a4a" : "#3d8a4e") : "#1d4f9e";
      if (night) c = cloud ? "#3a4462" : land > 0.62 ? (hash(x, y, 12) > 0.82 ? "#ffd27a" : "#16253a") : "#0d1a33";
      L.px(x, y, c);
    }
  }
  for (let y = 0; y <= ROWS; y++) for (let x = 0; x <= COLS; x++) L.px(cx(x), cy(y), "#141a30");
}

// The panel along the top: battery, shield, step, shot down, best run, and the capabilities.
function hud(L: Layer, run: Run, s: State) {
  L.rect(0, 0, W, HUD, "#0b0f1a");
  L.rect(0, 0, W, 1, "#262f4a");
  L.rect(0, HUD - 2, W, 1, "#05070c");
  L.rect(0, HUD - 1, W, 1, "#1b2238");
  L.rect(4, 5, 33, 12, "#4a5678");
  L.rect(4, 5, 33, 1, "#6c7aa2");
  L.rect(4, 5, 1, 12, "#6c7aa2");
  L.rect(37, 8, 2, 6, "#4a5678");
  L.rect(5, 6, 31, 10, "#06080e");
  const low = run.hp <= 2;
  for (let i = 0; i < MAX_HP; i++) {
    const on = i < run.hp;
    L.rect(6 + i * 6, 7, 5, 8, on ? (low ? "#e2483a" : "#3fcf78") : "#141a28");
    if (on) L.rect(6 + i * 6, 7, 5, 2, low ? "#ff8a6a" : "#9af5bd");
  }
  for (let i = 0; i < run.shield; i++) {
    const x = 42 + i * 6;
    L.rect(x, 7, 5, 6, "#2f8fd8");
    L.rect(x + 1, 13, 3, 2, "#2f8fd8");
    L.px(x + 2, 15, "#2f8fd8");
    L.rect(x + 1, 8, 2, 2, "#bfeaff");
  }
  for (const x of [67, 94, 141, 168]) {
    L.rect(x, 3, 1, 15, "#05070c");
    L.rect(x + 1, 3, 1, 15, "#1b2238");
  }
  text(L, "STEP", 73, 3, "#6f7aa0");
  number(L, run.tick, 73, 10, "#eef2ff", "#2a3350");
  text(L, "SHOT DOWN", 100, 3, "#6f7aa0");
  number(L, run.kills, 100, 10, "#eef2ff", "#2a3350");
  text(L, "BEST", 147, 3, "#6f7aa0");
  number(L, s.best.ticks, 147, 10, "#f0c85a", "#3a2e10");
  CAPS.forEach((cap, i) => {
    const x = W - (CAPS.length - i) * 13 - 2;
    const lvl = run.caps[cap];
    L.rect(x, 3, 12, 12, "#1b2238");
    L.rect(x, 3, 11, 11, "#03040a");
    L.rect(x + 1, 4, 10, 10, "#070a14");
    const [rows, pal] = ICONS[cap];
    L.sprite(rows, lvl ? pal : Object.fromEntries(Object.keys(pal).map((k) => [k, "#121830"])), x + 1, 4);
    for (let k = 0; k < MAX_LEVEL; k++) L.rect(x + 1 + k * 3, 17, 2, 2, k < lvl ? CAP_COLOR[cap] : "#1b2238");
  });
}

function line(L: Layer, a: Cell, b: Cell, c: string, off = 0) {
  let [x0, y0] = [cx(a[0]) + 8, cy(a[1]) + 8 + off];
  const [x1, y1] = [cx(b[0]) + 8, cy(b[1]) + 8 + off];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let n = 0; n < 600; n++) {
    L.px(x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) [err, x0] = [err + dy, x0 + sx];
    if (e2 <= dx) [err, y0] = [err + dx, y0 + sy];
  }
}

// A dialog box in the style of old handheld games.
function box(L: Layer, x: number, y: number, w: number, h: number) {
  L.rect(x - 2, y - 2, w + 4, h + 4, "#05070c");
  L.rect(x - 1, y - 1, w + 2, h + 2, "#c9cfe0");
  L.rect(x, y, w, h, "#0b1024");
  L.rect(x + 1, y + 1, w - 2, 1, "#1e2848");
}

export function boardSvg(s: State, now: number): string {
  css = [];
  const run = s.run;
  const live = now - run.at < RECENT_MS && run.tick > 0;
  let arena = "";
  const base = new Layer();
  const twinkle = new Layer();
  background(base, twinkle);
  arena += base.svg() + twinkle.svg(anim("tw", "0%,100%{opacity:1}50%{opacity:.15}", 1800, 0, " infinite"));

  // Pickups: capsules that bob, each lit in its capability's colour.
  run.pickups.forEach((p, i) => {
    const L = new Layer();
    const [x, y] = [cx(p.x), cy(p.y)];
    L.disc(x + 7.5, y + 7.5, 8, "#05070c");
    L.disc(x + 7.5, y + 7.5, 7.2, CAP_COLOR[p.cap]);
    L.disc(x + 7.5, y + 7.5, 6.2, "#0a0e1a");
    for (const [dx, dy] of [[3, 2], [2, 3], [4, 1], [1, 4]]) L.px(x + dx, y + dy, "#ffffff");
    const [rows, pal] = ICONS[p.cap];
    L.sprite(rows, pal, x + 3, y + 3);
    arena += L.svg(anim(`pk${i}`, "0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}", 1600, i * 300, " infinite"));
  });

  // The swarm, sliding in from where each enemy was, or warping in.
  for (const e of run.enemies) {
    const moved = live && (e.px !== e.x || e.py !== e.y);
    const spawned = live && run.events.some((ev) => ev.t === "spawn" && ev.at[0] === e.x && ev.at[1] === e.y);
    const [x, y] = [cx(e.x), cy(e.y)];
    let inner: string;
    if (e.kind === "debris") {
      const [a, b] = [new Layer(), new Layer()];
      debris(a, x, y, e.id % 3, false);
      debris(b, x, y, e.id % 3, true);
      inner = a.svg(blink(`da${e.id}`, 1400, -e.id * 170)) + b.svg(blink(`db${e.id}`, 1400, -e.id * 170 - 700));
    } else if (e.kind === "drone") {
      const [L, eye, ra, rb] = [new Layer(), new Layer(), new Layer(), new Layer()];
      L.sprite(DRONE, DRONE_PAL, x, y + 2);
      ra.sprite(ROTOR[0], { b: "#b4bccb" }, x, y + 2);
      rb.sprite(ROTOR[1], { b: "#7a8396" }, x, y + 2);
      eye.rect(x + 5, y + 8, 2, 2, "#ff8a9a");
      eye.px(x + 5, y + 8, "#ffffff");
      inner =
        L.svg() +
        ra.svg(blink(`ra${e.id}`, 180)) +
        rb.svg(blink(`rb${e.id}`, 180, -90)) +
        eye.svg(anim(`ey${e.id}`, "0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}", 1300, -e.id * 90, " infinite steps(4)"));
    } else {
      const [a, b] = [new Layer(), new Layer()];
      storm(a, x, y, 0);
      storm(b, x, y, 1);
      inner = a.svg(blink(`sa${e.id}`, 400)) + b.svg(blink(`sb${e.id}`, 400, -200));
    }
    if (moved) {
      const [mx, my] = [(e.px - e.x) * CELL, (e.py - e.y) * CELL];
      arena += `<g ${anim(`e${e.id}`, `0%{transform:translate(${mx}px,${my}px)}100%{transform:translate(0,0)}`, 320, 380)}>${inner}</g>`;
    } else if (spawned) {
      const ring = new Layer();
      ring.ring(x + 8, y + 8, 7, "#5fd0ff");
      ring.ring(x + 8, y + 8, 5, "#bff4ff");
      arena += ring.svg(anim(`wr${e.id}`, "0%{opacity:0;transform:scale(1.6)}30%{opacity:1}100%{opacity:0;transform:scale(.3)}", 520, 500, CENTRED));
      arena += `<g ${anim(`e${e.id}`, "0%{opacity:0}100%{opacity:1}", 260, 760)}>${inner}</g>`;
    } else arena += inner;
  }

  // The orchestration drones on their orbit.
  dronesAt(run).forEach(([x, y], i) => {
    const L = new Layer();
    L.sprite(AGENT, AGENT_PAL, cx(x) + 3, cy(y) + 4);
    arena += L.svg(anim(`ag${i}`, "0%,100%{transform:translateY(0)}50%{transform:translateY(-1px)}", 900, i * 220, " infinite"));
  });

  // The satellite, its lights, its shield, and the puff of its thruster after a move.
  const [sx, sy] = [cx(run.x), cy(run.y)];
  const [sat, tip, led] = [new Layer(), new Layer(), new Layer()];
  satellite(sat, sx, sy);
  tip.px(sx + 7, sy, "#ff5a4f");
  led.px(sx + 9, sy + 4, "#5ee08a");
  let satSvg = sat.svg() + tip.svg(blink("tip", 1100)) + led.svg(blink("led", 700, 200));
  if (run.shield > 0) {
    const sh = new Layer();
    sh.ring(sx + 8, sy + 8, 10, "#1f6aa8", 3);
    sh.ring(sx + 8, sy + 8, 11, "#5fc8ff", 2);
    satSvg += sh.svg(anim("sh", "0%,100%{opacity:1}50%{opacity:.45}", 1600, 0, " infinite"));
  }
  if (live && (run.px !== run.x || run.py !== run.y)) {
    const puff = new Layer();
    const [dx, dy] = [Math.sign(run.x - run.px), Math.sign(run.y - run.py)];
    const [fx, fy] = [sx + 8 - dx * 11, sy + 8 - dy * 11];
    puff.rect(fx - 1, fy - 1, 3, 3, "#ffb03a");
    puff.px(fx, fy, "#fff1c4");
    puff.px(fx - dx * 2 - dy, fy - dy * 2 - dx, "#f2712a");
    puff.px(fx - dx * 3 + dy, fy - dy * 3 + dx, "#a3261a");
    satSvg += puff.svg(anim("puff", "0%{opacity:1}100%{opacity:0}", 420, 60));
    arena += `<g ${anim("sat", `0%{transform:translate(${(run.px - run.x) * CELL}px,${(run.py - run.y) * CELL}px)}100%{transform:translate(0,0)}`, 240)}>${satSvg}</g>`;
  } else arena += satSvg;

  // What the last step did: beams, the thrown tool, the camera flash, drone hits, debris breaking up.
  let shake = false;
  if (live) {
    run.events.forEach((ev, i) => {
      if (ev.t === "zap") {
        const L = new Layer();
        line(L, ev.from, ev.to, "#2a8ad8", 1);
        line(L, ev.from, ev.to, "#bff4ff");
        const [tx, ty] = [cx(ev.to[0]) + 8, cy(ev.to[1]) + 8];
        for (const [dx, dy] of [[0, -2], [0, 2], [-2, 0], [2, 0]]) L.px(tx + dx, ty + dy, "#ffffff");
        arena += L.svg(anim(`z${i}`, "0%{opacity:0}10%{opacity:1}70%{opacity:1}100%{opacity:0}", 420, 200));
      } else if (ev.t === "tool") {
        const [a, b] = [new Layer(), new Layer()];
        const [rows, pal] = ICONS.tools;
        a.sprite(rows, pal, cx(ev.from[0]) + 3, cy(ev.from[1]) + 3);
        b.sprite([...rows].reverse(), pal, cx(ev.from[0]) + 3, cy(ev.from[1]) + 3, true);
        const [mx, my] = [(ev.to[0] - ev.from[0]) * CELL, (ev.to[1] - ev.from[1]) * CELL];
        const fly = anim(`t${i}`, `0%{transform:translate(0,0);opacity:1}90%{opacity:1}100%{transform:translate(${mx}px,${my}px);opacity:0}`, 320, 220);
        arena += `<g ${fly}>${a.svg(blink(`ta${i}`, 120))}${b.svg(blink(`tb${i}`, 120, -60))}</g>`;
      } else if (ev.t === "flash") {
        const L = new Layer();
        const r = ev.r * CELL + 8;
        L.ring(cx(ev.at[0]) + 8, cy(ev.at[1]) + 8, r, "#fff6d8");
        L.ring(cx(ev.at[0]) + 8, cy(ev.at[1]) + 8, r - 1, "#ffd86b", 2);
        arena += L.svg(anim(`f${i}`, "0%{opacity:0;transform:scale(.3)}20%{opacity:1}100%{opacity:0;transform:scale(1)}", 520, 200, CENTRED));
      } else if (ev.t === "boom" || ev.t === "drone") {
        const [x, y] = [cx(ev.at[0]) + 8, cy(ev.at[1]) + 8];
        const big = ev.t === "boom" && ev.kind === "storm";
        const [flash, fire, bits] = [new Layer(), new Layer(), new Layer()];
        flash.disc(x, y, big ? 6 : 3, "#ffffff");
        fire.disc(x, y, big ? 9 : 6, "#a3261a");
        fire.disc(x, y, big ? 7 : 5, "#f2712a");
        fire.disc(x - 1, y - 1, big ? 5 : 3, "#ffc24a");
        fire.disc(x - 1, y - 1, big ? 2 : 1, "#fff1b8");
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + hash(i, k) * 0.6;
          bits.rect(Math.round(x + Math.cos(a) * 8), Math.round(y + Math.sin(a) * 8), 2, 2, k % 2 ? "#8d919d" : "#ffb070");
        }
        const d = ev.t === "boom" ? 420 : 300;
        arena += flash.svg(anim(`bf${i}`, "0%{opacity:0}10%{opacity:1}40%{opacity:0}100%{opacity:0}", 260, d));
        arena += fire.svg(anim(`bo${i}`, "0%{opacity:0;transform:scale(.4)}25%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.2)}", 520, d + 60, CENTRED));
        arena += bits.svg(anim(`bb${i}`, "0%{opacity:0;transform:scale(.3)}20%{opacity:1}100%{opacity:0;transform:scale(1.6)}", 640, d + 80, CENTRED));
      } else if (ev.t === "hit") {
        shake = true;
        const L = new Layer();
        L.rect(cx(ev.at[0]) - 1, cy(ev.at[1]) - 1, 18, 18, "#ff3d5a");
        arena += L.svg(anim(`h${i}`, "0%,100%{opacity:0}20%,60%{opacity:.7}40%,80%{opacity:.15}", 600, 650));
      } else if (ev.t === "shield") {
        const L = new Layer();
        L.ring(cx(ev.at[0]) + 8, cy(ev.at[1]) + 8, 12, "#bfeaff");
        arena += L.svg(anim(`sp${i}`, "0%,100%{opacity:0}30%{opacity:1}", 500, 650));
      } else if (ev.t === "pickup") {
        const L = new Layer();
        const [x, y] = [cx(ev.at[0]) + 8, cy(ev.at[1]) + 8];
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          const [px, py] = [Math.round(x + Math.cos(a) * 10), Math.round(y + Math.sin(a) * 10)];
          for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) L.px(px + dx, py + dy, CAP_COLOR[ev.cap]);
          L.px(px, py, "#ffffff");
        }
        arena += L.svg(anim(`p${i}`, "0%{opacity:0;transform:scale(.4)}30%{opacity:1}100%{opacity:0;transform:scale(1.2)}", 700, 200, CENTRED));
      }
    });
  }
  const quake = "0%,100%{transform:translate(0,0)}20%{transform:translate(-2px,1px)}40%{transform:translate(2px,-1px)}60%{transform:translate(-1px,2px)}80%{transform:translate(1px,-1px)}";
  let body = shake ? `<g ${anim("quake", quake, 360, 650)}>${arena}</g>` : arena;

  const top = new Layer();
  hud(top, run, s);
  body += top.svg();

  // Messages sit in a dialog box, drawn over everything.
  const [panel, words, prompt] = [new Layer(), new Layer(), new Layer()];
  if (run.tick === 0 && !run.over) {
    const msg = "PRESS AN ARROW TO FLY";
    const w = textWidth(msg) + 14;
    box(panel, W / 2 - w / 2, H - 34, w, 13);
    text(prompt, msg, W / 2 - textWidth(msg) / 2, H - 30, "#eef2ff");
  }
  if (run.over) {
    panel.rect(0, HUD, W, ROWS * CELL, "#03040bcc");
    const [t1, t2, t3, t4] = ["BATTERY EMPTY", `LASTED ${run.tick} STEPS, SHOT DOWN ${run.kills}`, `BEST RUN ${s.best.ticks} STEPS`, "PRESS AN ARROW TO LAUNCH AGAIN"];
    const w = Math.max(textWidth(t1, 2), textWidth(t2), textWidth(t4)) + 24;
    box(panel, W / 2 - w / 2, HUD + 30, w, 74);
    text(words, t1, W / 2 - textWidth(t1, 2) / 2, HUD + 40, "#ff8a6a", 2);
    text(words, t2, W / 2 - textWidth(t2) / 2, HUD + 62, "#eef2ff");
    text(words, t3, W / 2 - textWidth(t3) / 2, HUD + 72, "#f0c85a");
    text(prompt, t4, W / 2 - textWidth(t4) / 2, HUD + 90, "#9fb0dc");
  }
  body += panel.svg() + words.svg() + prompt.svg(blink("pr", 1200));

  const held = CAPS.filter((c) => run.caps[c]).map((c) => `${CAP_NAME[c]} ${run.caps[c]}`);
  const label = run.over
    ? `Orbit: the battery ran out after ${run.tick} steps. Press an arrow to launch again.`
    : `Orbit, step ${run.tick}: battery ${run.hp} of ${MAX_HP}, ${run.enemies.length} enemies nearby, ${run.kills} shot down${held.length ? `, capabilities ${held.join(", ")}` : ""}.`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * SCALE}" height="${H * SCALE}" shape-rendering="crispEdges" role="img" aria-label="${label}">` +
    `<style>${css.join("")}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>${body}</svg>`
  );
}

// The arrow keys under the board: pixel keycaps lit from the top left.
export function keySvg(dir: "up" | "down" | "left" | "right"): string {
  const L = new Layer();
  L.rect(1, 3, 15, 13, "#03040b");
  L.rect(0, 0, 15, 14, "#0b0f1a");
  L.rect(1, 1, 13, 12, "#1e2640");
  L.rect(1, 1, 13, 1, "#46557e");
  L.rect(1, 1, 1, 11, "#46557e");
  L.rect(13, 2, 1, 11, "#121829");
  L.rect(2, 12, 12, 1, "#121829");
  L.rect(3, 3, 9, 8, "#232c4a");
  const arrow = ["...c...", "..ccc..", ".ccccc.", "ccccccc", "..ccc..", "..ccc..", "..ccc.."];
  const lit = ["...l...", "..l....", ".l.....", "l......", "..l....", "..l....", "..l...."];
  const turn = (i: number, j: number): Cell => (dir === "up" ? [i, j] : dir === "down" ? [i, 6 - j] : dir === "left" ? [j, i] : [6 - j, i]);
  arrow.forEach((row, j) => {
    for (let i = 0; i < 7; i++) {
      if (row[i] !== "c") continue;
      const [x, y] = turn(i, j);
      L.px(4 + x, 3 + y, lit[j][i] === "l" ? "#f4b48a" : "#DB8A62");
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="64" height="64" shape-rendering="crispEdges">${L.svg()}</svg>`;
}
