// The Orbit board as a pixel-art SVG, in the style of the profile's film. Every pixel is a 1x1
// unit, merged into one path per colour, and the image is scaled up without smoothing. When the
// last step happened a moment ago, the board animates it: the swarm slides in, shots fly,
// debris breaks up.
import { COLS, ROWS, MAX_HP, MAX_LEVEL, CAPS, dronesAt, type Cap, type Cell, type Enemy, type Run, type State } from "./orbit";

const CELL = 12;
const HUD = 16;
const W = COLS * CELL;
const H = HUD + ROWS * CELL;
const SCALE = 5;
const RECENT_MS = 6000;

// A layer of pixels: one path per colour.
class Layer {
  private paths = new Map<string, string[]>();
  rect(x: number, y: number, w: number, h: number, c: string) {
    if (w <= 0 || h <= 0) return;
    const p = this.paths.get(c) ?? [];
    p.push(`M${x} ${y}h${w}v${h}h${-w}z`);
    this.paths.set(c, p);
  }
  px(x: number, y: number, c: string) {
    this.rect(x, y, 1, 1, c);
  }
  // A sprite from rows of letters, each letter a colour in the palette; "." is empty.
  sprite(rows: string[], pal: Record<string, string>, x: number, y: number) {
    rows.forEach((row, j) => {
      let i = 0;
      while (i < row.length) {
        const ch = row[i];
        let k = i;
        while (k < row.length && row[k] === ch) k++;
        if (ch !== "." && pal[ch]) this.rect(x + i, y + j, k - i, 1, pal[ch]);
        i = k;
      }
    });
  }
  svg(attrs = ""): string {
    let out = "";
    for (const [c, p] of this.paths) out += `<path fill="${c}" d="${p.join("")}"/>`;
    return attrs ? `<g ${attrs}>${out}</g>` : out;
  }
}

// The 3x5 pixel font of the film's signs.
const GLYPHS: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
  P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
  Z: "111001010100111", 0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110",
  4: "101101111001001", 5: "111100110001110", 6: "011100110101010", 7: "111001010010010", 8: "010101010101010",
  9: "010101011001110", ".": "000000000000010", ",": "000000000010100", ":": "000010000010000", "!": "010010010000010",
  " ": "000000000000000",
};
// Three columns can't draw a diagonal, so these letters get wider rows.
const WIDE: Record<string, string[]> = {
  M: ["10001", "11011", "10101", "10001", "10001"],
  N: ["1001", "1101", "1011", "1001", "1001"],
  W: ["10001", "10001", "10101", "11011", "10001"],
};
const glyphWidth = (ch: string) => (WIDE[ch] ? WIDE[ch][0].length : 3);
const textWidth = (s: string, k = 1) => [...s.toUpperCase()].reduce((w, ch) => w + (glyphWidth(ch) + 1) * k, -k);
function text(L: Layer, s: string, x: number, y: number, c: string, k = 1) {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    if (WIDE[ch]) {
      WIDE[ch].forEach((row, j) => {
        for (let i = 0; i < row.length; i++) if (row[i] === "1") L.rect(cx + i * k, y + j * k, k, k, c);
      });
    } else {
      const bits = GLYPHS[ch] ?? GLYPHS[" "];
      for (let i = 0; i < 15; i++) if (bits[i] === "1") L.rect(cx + (i % 3) * k, y + Math.floor(i / 3) * k, k, k, c);
    }
    cx += (glyphWidth(ch) + 1) * k;
  }
}

const SAT = [
  "....yyyy....",
  "....yBRy....",
  "....ybby....",
  "yyyyyBByyyyy",
  "yBbByBBybBbB",
  "yBbBybbybBbB",
  "yBbByBBybBbB",
  "yyyyyBByyyyy",
  "....ybby....",
  "....yBBy....",
  "....yyyy....",
];
const SAT_PAL = { y: "#c9a24a", B: "#2e55a0", b: "#1c2a4e", R: "#ff5a4f" };
const DEBRIS = [
  "...oooo...",
  "..oggGgo..",
  ".ogGGggdo.",
  "oggGgddggo",
  "ogdggggGgo",
  "oggggdgggo",
  ".oGgggddo.",
  "..ogdggo..",
  "...oooo...",
];
const DEBRIS_PAL = { o: "#3a3f4a", g: "#8a8f9c", G: "#b5b9c2", d: "#5f6470" };
const DRONE = [
  ".kkkkkkkk.",
  "kllllllllk",
  "kl111111lk",
  "kl1rr1rr1k",
  "kl1rr1rr1k",
  "kl111111lk",
  "kkkkkkkkkk",
  "...k..k...",
];
const DRONE_PAL = { k: "#1d2230", l: "#3b4350", 1: "#11151b", r: "#ff4d5e" };
const STORM = [
  "...oo.oo....",
  "..orrooroo..",
  ".orryyyrro..",
  "orryyWWyyro.",
  "oryyWWWWyyro",
  "oryWWWWWWyro",
  "oryyWWWWyyro",
  ".oryyWWyyro.",
  ".orryyyyrro.",
  "..orrrrrro..",
  "...oo.ooo...",
];
const STORM_PAL = { o: "#9a2f1c", r: "#e2552c", y: "#f6b43a", W: "#fff1c4" };
const AGENT = ["kkkkkk", "kllllk", "k1r1rk", "k1111k", "kkkkkk"];
const AGENT_PAL = { k: "#2a3140", l: "#4a5466", 1: "#11151b", r: "#DB8A62" };

// Capability icons, 8x8, for pickups and the panel.
const ICONS: Record<Cap, [string[], Record<string, string>]> = {
  search: [["..yyy...", ".y...y..", "y.bbb.y.", "y.bwb.y.", "y.bbb.y.", ".y...y..", "..yyyhh.", "......hh"], { y: "#e6c35c", b: "#7fb8e8", w: "#ffffff", h: "#a8743e" }],
  drones: [[".kkkkkk.", "kllllllk", "k1r11r1k", "k111111k", ".kkkkkk.", "........", "k.k..k.k", "........"], { k: "#2a3140", l: "#5a6476", 1: "#11151b", r: "#DB8A62" }],
  memory: [["cccccccc", "kkkkkkkk", "kggkllll", "kggkllll", "kkkkmmmk", "kkkkkkkk", "........", "........"], { c: "#DB8A62", k: "#1c232c", g: "#7DBB99", l: "#9198a1", m: "#6e7681" }],
  tools: [[".w...w..", ".w...w..", ".wwwww..", "..www...", "...h....", "...h....", "...h....", "...h...."], { w: "#c4ccd6", h: "#8a919c" }],
  vision: [["..kk....", "kkkkkkkk", "kllbbllk", "klbwbblk", "klbbbblk", "kllbbllk", "kkkkkkkk", "........"], { k: "#2a3140", l: "#4a5466", b: "#5a9ae0", w: "#e8f4ff" }],
};
const CAP_COLOR: Record<Cap, string> = { search: "#e6c35c", drones: "#DB8A62", memory: "#7DBB99", tools: "#c4ccd6", vision: "#5a9ae0" };
export const CAP_NAME: Record<Cap, string> = { search: "Search", drones: "Orchestration", memory: "Memory", tools: "Tools", vision: "Vision" };

const hash = (a: number, b = 0) => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const cx = (x: number) => x * CELL;
const cy = (y: number) => HUD + y * CELL;

function background(L: Layer, twinkle: Layer) {
  const bands = ["#03050c", "#050818", "#070b20", "#0a1028"];
  bands.forEach((c, i) => L.rect(0, HUD + (i * ROWS * CELL) / 4, W, (ROWS * CELL) / 4 + 1, c));
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(hash(i, 1) * W);
    const y = HUD + Math.floor(hash(i, 2) * ROWS * CELL);
    (i % 5 === 0 ? twinkle : L).px(x, y, hash(i, 3) > 0.7 ? "#ffffff" : "#5a6690");
  }
  // The edge of the Earth along the bottom, as in the film.
  for (let x = 0; x < W; x++) {
    const d = x - W / 2;
    const top = Math.round(H - 7 + (d * d) / 1400);
    if (top >= H) continue;
    L.rect(x, top, 1, 1, "#9fd0ff");
    L.rect(x, top + 1, 1, H - top - 1, hash(Math.floor(x / 5), 9) > 0.55 ? "#3f8f5a" : "#2c5fae");
  }
  for (let y = 0; y <= ROWS; y++) for (let x = 0; x <= COLS; x++) L.px(cx(x), cy(y), "#151b30");
}

function hud(L: Layer, run: Run) {
  L.rect(0, 0, W, HUD, "#0b0f1a");
  L.rect(0, HUD - 1, W, 1, "#1d2438");
  // The battery, then the shield's charges.
  L.rect(3, 4, 28, 9, "#3a4562");
  L.rect(31, 6, 2, 5, "#3a4562");
  L.rect(4, 5, 26, 7, "#0b0f1a");
  for (let i = 0; i < MAX_HP; i++) L.rect(5 + i * 5, 6, 4, 5, i < run.hp ? (run.hp <= 2 ? "#ff6a4f" : "#5ee08a") : "#1a2030");
  for (let i = 0; i < run.shield; i++) L.rect(37 + i * 4, 6, 3, 5, "#7fd4ff");
  text(L, `STEP ${run.tick}`, 56, 3, "#cfd8f2");
  text(L, `SHOT DOWN ${run.kills}`, 56, 9, "#8a96c0");
  // The capabilities collected so far, each with its level.
  let x = W - CAPS.length * 12;
  for (const cap of CAPS) {
    const [rows, pal] = ICONS[cap];
    const lvl = run.caps[cap];
    if (lvl) L.sprite(rows, pal, x + 1, 2);
    else L.rect(x + 2, 3, 6, 6, "#151b2a");
    for (let i = 0; i < MAX_LEVEL; i++) L.rect(x + 1 + i * 2, 12, 1, 1, i < lvl ? CAP_COLOR[cap] : "#232a3c");
    x += 12;
  }
}

const css: string[] = [];
const anim = (name: string, frames: string, ms: number, delay = 0, extra = "") => {
  css.push(`@keyframes ${name}{${frames}}.${name}{animation:${name} ${ms}ms ${delay}ms both${extra}}`);
  return `class="${name}"`;
};

function line(L: Layer, a: Cell, b: Cell, c: string) {
  let [x0, y0] = [cx(a[0]) + 6, cy(a[1]) + 6];
  const [x1, y1] = [cx(b[0]) + 6, cy(b[1]) + 6];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let n = 0; n < 400; n++) {
    L.px(x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) [err, x0] = [err + dy, x0 + sx];
    if (e2 <= dx) [err, y0] = [err + dx, y0 + sy];
  }
}

export function boardSvg(s: State, now: number): string {
  css.length = 0;
  const run = s.run;
  const live = now - run.at < RECENT_MS && run.tick > 0;
  const base = new Layer();
  const twinkle = new Layer();
  background(base, twinkle);
  let body = base.svg() + twinkle.svg(anim("tw", "0%,100%{opacity:1}50%{opacity:.2}", 2400, 0, " infinite"));

  // Pickups, each with a slow pulse.
  for (const p of run.pickups) {
    const L = new Layer();
    const [rows, pal] = ICONS[p.cap];
    L.rect(cx(p.x) + 1, cy(p.y) + 1, 10, 10, "#141c30");
    L.rect(cx(p.x) + 1, cy(p.y) + 1, 10, 1, CAP_COLOR[p.cap]);
    L.rect(cx(p.x) + 1, cy(p.y) + 10, 10, 1, CAP_COLOR[p.cap]);
    L.sprite(rows, pal, cx(p.x) + 2, cy(p.y) + 2);
    body += L.svg(anim(`pk${p.x}_${p.y}`, "0%,100%{opacity:1}50%{opacity:.55}", 1400, 0, " infinite"));
  }

  // The swarm, sliding in from where each enemy was.
  const enemySvg = (e: Enemy) => {
    const L = new Layer();
    if (e.kind === "debris") L.sprite(DEBRIS, DEBRIS_PAL, cx(e.x) + 1, cy(e.y) + 2);
    else if (e.kind === "drone") L.sprite(DRONE, DRONE_PAL, cx(e.x) + 1, cy(e.y) + 2);
    else L.sprite(STORM, STORM_PAL, cx(e.x), cy(e.y) + 1);
    const moved = live && (e.px !== e.x || e.py !== e.y);
    const spawned = live && run.events.some((ev) => ev.t === "spawn" && ev.at[0] === e.x && ev.at[1] === e.y);
    if (moved) {
      const [mx, my] = [(e.px - e.x) * CELL, (e.py - e.y) * CELL];
      return L.svg(anim(`e${e.id}`, `0%{transform:translate(${mx}px,${my}px)}100%{transform:translate(0,0)}`, 320, 380));
    }
    if (spawned) return L.svg(anim(`e${e.id}`, "0%{opacity:0}100%{opacity:1}", 300, 600));
    return L.svg();
  };
  for (const e of run.enemies) body += enemySvg(e);

  // The orchestration drones on their orbit.
  for (const [x, y] of dronesAt(run)) {
    const L = new Layer();
    L.sprite(AGENT, AGENT_PAL, cx(x) + 3, cy(y) + 3);
    body += L.svg();
  }

  // The satellite, its shield, and a flash of red when something got through.
  const sat = new Layer();
  sat.sprite(SAT, SAT_PAL, cx(run.x), cy(run.y));
  if (run.shield > 0) {
    for (let a = 0; a < 32; a++) {
      const ang = (a / 32) * Math.PI * 2;
      sat.px(Math.round(cx(run.x) + 6 + Math.cos(ang) * 8), Math.round(cy(run.y) + 6 + Math.sin(ang) * 8), "#7fd4ff");
    }
  }
  const satMoved = live && (run.px !== run.x || run.py !== run.y);
  body += satMoved
    ? sat.svg(anim("sat", `0%{transform:translate(${(run.px - run.x) * CELL}px,${(run.py - run.y) * CELL}px)}100%{transform:translate(0,0)}`, 220))
    : sat.svg();

  // What the last step did: zaps, the tool, the camera flash, drone hits, debris breaking up.
  if (live) {
    run.events.forEach((ev, i) => {
      const L = new Layer();
      if (ev.t === "zap") {
        line(L, ev.from, ev.to, "#9fe8ff");
        body += L.svg(anim(`z${i}`, "0%{opacity:0}10%{opacity:1}100%{opacity:0}", 420, 200));
      } else if (ev.t === "tool") {
        const [rows, pal] = ICONS.tools;
        L.sprite(rows, pal, cx(ev.from[0]) + 2, cy(ev.from[1]) + 2);
        const [mx, my] = [(ev.to[0] - ev.from[0]) * CELL, (ev.to[1] - ev.from[1]) * CELL];
        body += L.svg(anim(`t${i}`, `0%{transform:translate(0,0);opacity:1}90%{opacity:1}100%{transform:translate(${mx}px,${my}px);opacity:0}`, 300, 220));
      } else if (ev.t === "flash") {
        const r = ev.r * CELL + 6;
        const [x0, y0] = [cx(ev.at[0]) + 6 - r, cy(ev.at[1]) + 6 - r];
        L.rect(x0, y0, 2 * r, 1, "#fff6d8");
        L.rect(x0, y0 + 2 * r - 1, 2 * r, 1, "#fff6d8");
        L.rect(x0, y0, 1, 2 * r, "#fff6d8");
        L.rect(x0 + 2 * r - 1, y0, 1, 2 * r, "#fff6d8");
        body += L.svg(anim(`f${i}`, "0%{opacity:0}15%{opacity:1}100%{opacity:0}", 500, 200));
      } else if (ev.t === "boom" || ev.t === "drone") {
        const [x, y] = [cx(ev.at[0]) + 6, cy(ev.at[1]) + 6];
        const c = ev.t === "boom" ? (ev.kind === "storm" ? "#f6b43a" : "#ffb070") : "#DB8A62";
        L.rect(x - 1, y - 1, 3, 3, "#fff1c4");
        for (const [dx, dy] of [[-4, -3], [4, -4], [-3, 4], [4, 3], [0, -5], [-5, 0]]) L.rect(x + dx, y + dy, 2, 2, c);
        body += L.svg(anim(`b${i}`, "0%{opacity:0;transform:scale(.4)}20%{opacity:1}100%{opacity:0;transform:scale(1.3)}", 460, 480, ";transform-box:fill-box;transform-origin:center"));
      } else if (ev.t === "hit") {
        L.rect(cx(ev.at[0]) - 1, cy(ev.at[1]) - 1, 14, 14, "#ff4d5e");
        body += L.svg(anim(`h${i}`, "0%,100%{opacity:0}20%,60%{opacity:.75}40%,80%{opacity:.2}", 600, 650));
      } else if (ev.t === "pickup") {
        const c = CAP_COLOR[ev.cap];
        const [x, y] = [cx(ev.at[0]), cy(ev.at[1])];
        L.rect(x - 2, y - 2, 16, 1, c);
        L.rect(x - 2, y + 13, 16, 1, c);
        L.rect(x - 2, y - 2, 1, 16, c);
        L.rect(x + 13, y - 2, 1, 16, c);
        body += L.svg(anim(`p${i}`, "0%{opacity:1}100%{opacity:0}", 700, 200));
      }
    });
  }

  const top = new Layer();
  hud(top, run);
  body += top.svg();
  // Messages sit on their own panel, drawn after everything else.
  const panel = new Layer();
  const words = new Layer();
  if (run.tick === 0 && !run.over) {
    const msg = s.runs ? `RUN ${s.runs + 1}. PRESS AN ARROW TO FLY` : "PRESS AN ARROW TO FLY";
    panel.rect(W / 2 - textWidth(msg) / 2 - 4, H - 22, textWidth(msg) + 8, 11, "#0b0f1a");
    text(words, msg, W / 2 - textWidth(msg) / 2, H - 19, "#cfd8f2");
  }
  if (run.over) {
    panel.rect(0, HUD, W, ROWS * CELL, "#05070fd9");
    const t1 = "BATTERY EMPTY";
    const t2 = `LASTED ${run.tick} STEPS, SHOT DOWN ${run.kills}`;
    const t3 = `BEST RUN ${s.best.ticks} STEPS`;
    const t4 = "PRESS AN ARROW TO LAUNCH AGAIN";
    text(words, t1, W / 2 - textWidth(t1, 2) / 2, HUD + 26, "#ff8a6a", 2);
    text(words, t2, W / 2 - textWidth(t2) / 2, HUD + 48, "#e8ecf6");
    text(words, t3, W / 2 - textWidth(t3) / 2, HUD + 58, "#e6c35c");
    text(words, t4, W / 2 - textWidth(t4) / 2, HUD + 76, "#9aa6cc");
  }
  body += panel.svg() + words.svg();

  const label = run.over
    ? `Orbit: the battery ran out after ${run.tick} steps. Press an arrow to launch again.`
    : `Orbit, step ${run.tick}: battery ${run.hp} of ${MAX_HP}, ${run.enemies.length} enemies nearby, ${run.kills} destroyed.`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * SCALE}" height="${H * SCALE}" shape-rendering="crispEdges" role="img" aria-label="${label}">` +
    `<style>${css.join("")}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>${body}</svg>`
  );
}

// The arrow keys under the board.
export function keySvg(dir: "up" | "down" | "left" | "right"): string {
  const L = new Layer();
  L.rect(1, 2, 14, 13, "#05070f");
  L.rect(1, 1, 14, 13, "#1d2438");
  L.rect(2, 1, 12, 1, "#3a4562");
  L.rect(1, 2, 1, 11, "#3a4562");
  L.rect(2, 2, 12, 11, "#141a2b");
  const arrow = ["...c...", "..ccc..", ".ccccc.", "ccccccc", "..ccc..", "..ccc..", "..ccc.."];
  const rot = (i: number, j: number): Cell => (dir === "up" ? [i, j] : dir === "down" ? [i, 6 - j] : dir === "left" ? [j, i] : [6 - j, i]);
  arrow.forEach((row, j) => {
    for (let i = 0; i < 7; i++) if (row[i] === "c") {
      const [x, y] = rot(i, j);
      L.px(4 + x, 4 + y, "#DB8A62");
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="64" height="64" shape-rendering="crispEdges">${L.svg()}</svg>`;
}
