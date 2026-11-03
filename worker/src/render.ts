// SVGs for the board: seven column tracks the visitor clicks, and a status tile above them.
// The board is dark in both appearances, like a terminal, so one image serves both themes.
import { ROWS, HUMAN, DOSI, at, height } from "./c4";
import { dark as P, terminal as T, fontFaces, SANS, MONO, esc } from "../../shared/theme";
import type { State } from "./state";

const W = 100;
const CELL = 95;
const TOP = 6;
const H = TOP + ROWS * CELL + 10;
const R_HOLE = 34;
const R_PIECE = 29;
const RECENT_MS = 12_000;

const cy = (row: number) => TOP + CELL / 2 + (ROWS - 1 - row) * CELL;

// An arc on a circle, angles in degrees clockwise from +x.
function arc(x: number, y: number, r: number, from: number, to: number): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  const sweep = (((to - from) % 360) + 360) % 360;
  const [x1, y1] = [x + r * Math.cos(rad(from)), y + r * Math.sin(rad(from))];
  const [x2, y2] = [x + r * Math.cos(rad(to)), y + r * Math.sin(rad(to))];
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function hole(y: number): string {
  return (
    `<circle cx="50" cy="${y}" r="${R_HOLE}" fill="${P.well}"/>` +
    `<path d="${arc(50, y, R_HOLE - 1.5, 150, 300)}" stroke="#000" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/>` +
    `<path d="${arc(50, y, R_HOLE - 0.75, 340, 100)}" stroke="#2F2520" stroke-width="1.5" stroke-linecap="round" fill="none"/>`
  );
}

function human(y: number): string {
  return (
    `<circle cx="51.5" cy="${y + 2.5}" r="${R_PIECE}" fill="#000" opacity=".5"/>` +
    `<circle cx="50" cy="${y}" r="${R_PIECE}" fill="${P.accent}"/>` +
    `<path d="${arc(50, y, R_PIECE - 1, 165, 285)}" stroke="#F4BE9F" stroke-width="2" stroke-linecap="round" fill="none"/>` +
    `<path d="${arc(50, y, R_PIECE - 1, 345, 105)}" stroke="#A65B38" stroke-width="2" stroke-linecap="round" fill="none"/>`
  );
}

// A continuous-corner square, close to the squircles Kodosi uses for agents.
// Returns its four quarters, starting at the left middle and going clockwise.
function squircleQuarters(x: number, y: number, s: number): string[] {
  const h = s / 2;
  const c = h * 0.09;
  return [
    `M${x - h} ${y}C${x - h} ${y - h + c} ${x - h + c} ${y - h} ${x} ${y - h}`,
    `M${x} ${y - h}C${x + h - c} ${y - h} ${x + h} ${y - h + c} ${x + h} ${y}`,
    `M${x + h} ${y}C${x + h} ${y + h - c} ${x + h - c} ${y + h} ${x} ${y + h}`,
    `M${x} ${y + h}C${x - h + c} ${y + h} ${x - h} ${y + h - c} ${x - h} ${y}`,
  ];
}

function squircle(x: number, y: number, s: number): string {
  const [a, b, c, d] = squircleQuarters(x, y, s);
  return a + b.replace(/^M[^C]+/, "") + c.replace(/^M[^C]+/, "") + d.replace(/^M[^C]+/, "") + "Z";
}

function eyes(x: number, y: number, color: string, cls = ""): string {
  const e = (ex: number) => `<rect x="${ex - 4}" y="${y - 8.5}" width="8" height="17" rx="2.5" fill="${color}"/>`;
  return `<g class="${cls}">${e(x - 9.5)}${e(x + 9.5)}</g>`;
}

function dosi(y: number, awake: boolean, blink: boolean): string {
  return (
    `<path d="${squircle(51.5, y + 2.5, 60)}" fill="#000" opacity=".5"/>` +
    `<path d="${squircle(50, y, 60)}" fill="${P.lifted}"/>` +
    `<path d="${squircleQuarters(50, y, 58.5)[0]}" fill="none" stroke="#5A4A40" stroke-width="1.5" stroke-linecap="round"/>` +
    `<path d="${squircleQuarters(50, y, 58.5)[2]}" fill="none" stroke="#120E0C" stroke-width="1.5" stroke-linecap="round"/>` +
    eyes(50, y, awake ? P.accent : P.inkFaint, blink ? "blink" : "")
  );
}

type Anim = { id: string; dist: number; delay: number };

function dropCss(a: Anim): string {
  const ms = Math.round(240 + 11 * Math.sqrt(a.dist));
  const bounce = Math.min(9, a.dist * 0.03).toFixed(1);
  return (
    `@keyframes ${a.id}{0%{transform:translateY(-${a.dist}px);animation-timing-function:cubic-bezier(.55,0,1,.45)}` +
    `72%{transform:translateY(0);animation-timing-function:cubic-bezier(0,.55,.45,1)}` +
    `86%{transform:translateY(-${bounce}px);animation-timing-function:cubic-bezier(.55,0,1,.45)}` +
    `100%{transform:translateY(0)}}` +
    `.${a.id}{animation:${a.id} ${ms}ms ${a.delay}ms both}`
  );
}

const reduced = `@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
const blinkCss = (delay: number) =>
  `.blink{transform-box:fill-box;transform-origin:center;animation:blink 180ms ${delay}ms 1 both}` +
  `@keyframes blink{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.12)}}`;

// Delays line the two drops up across images: the human piece lands, then Dosi answers.
const HUMAN_DELAY = 250;
const DOSI_DELAY = 1050;

export function columnSvg(s: State, col: number, now: number): string {
  const board = s.board;
  const lastHuman = [...s.moves].reverse().find((m) => m.by === HUMAN);
  const lastDosi = [...s.moves].reverse().find((m) => m.by === DOSI);
  const win = new Set(s.winLine);
  const css: string[] = [];
  let body = "";

  for (let row = 0; row < ROWS; row++) body += hole(cy(row));

  const next = height(board, col);
  if (s.status === "playing" && next < ROWS) {
    body += `<circle cx="50" cy="${cy(next)}" r="${R_PIECE}" fill="none" stroke="${P.accent}" stroke-width="2" stroke-dasharray="5.5 5.9"/>`;
  }

  for (let row = 0; row < ROWS; row++) {
    const who = board[at(col, row)];
    if (!who) continue;
    const y = cy(row);
    const isLastHuman = lastHuman && lastHuman.col === col && lastHuman.row === row;
    const isLastDosi = lastDosi && lastDosi.col === col && lastDosi.row === row;
    const recent = (isLastHuman && now - lastHuman!.at < RECENT_MS) || (isLastDosi && now - lastDosi!.at < RECENT_MS);
    let piece = who === HUMAN ? human(y) : dosi(y, !!isLastDosi, !!(isLastDosi && recent));
    if (win.has(at(col, row))) {
      piece += `<circle cx="50" cy="${y}" r="${R_HOLE + 2}" fill="none" stroke="${P.ink}" stroke-width="2.5"/>`;
    }
    if (recent) {
      const id = `d${row}`;
      css.push(dropCss({ id, dist: y + 40, delay: isLastHuman ? HUMAN_DELAY : DOSI_DELAY }));
      if (isLastDosi) css.push(blinkCss(DOSI_DELAY + 700));
      body += `<g class="${id}">${piece}</g>`;
    } else body += piece;
  }

  const track =
    `<rect x="9" y="${TOP + 3}" width="86" height="${ROWS * CELL}" rx="22" fill="#000" opacity=".35"/>` +
    `<rect x="7" y="${TOP}" width="86" height="${ROWS * CELL}" rx="22" fill="${P.raised}"/>` +
    `<path d="M7.75 ${TOP + ROWS * CELL - 22}V${TOP + 22}A21.25 21.25 0 0 1 29 ${TOP + 0.75}H71" stroke="${P.rimLight}" stroke-width="1.5" fill="none" stroke-linecap="round"/>` +
    `<path d="M92.25 ${TOP + 22}V${TOP + ROWS * CELL - 22}A21.25 21.25 0 0 1 71 ${TOP + ROWS * CELL - 0.75}H29" stroke="${P.rimDark}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<style>${css.join("")}${reduced}</style>${track}${body}</svg>`
  );
}

// The tile above the board. `narrow` is the phone layout: two short lines over the score.
export function statusSvg(s: State, now: number, narrow = false): string {
  const lastDosi = [...s.moves].reverse().find((m) => m.by === DOSI);
  const recent = !!lastDosi && now - lastDosi.at < RECENT_MS;
  const n = (x: number) => x.toLocaleString("en-US");
  let lines: [string, string];
  if (s.status === "humans") lines = ["Humans win.", "Pick a column for a new game."];
  else if (s.status === "dosi") lines = ["Dosi wins.", "Pick a column for a new game."];
  else if (s.status === "draw") lines = ["Draw.", "Pick a column for a new game."];
  else if (lastDosi) lines = [`Dosi played column ${lastDosi.col + 1}.`, "Your move."];
  else lines = ["Your move.", "Pick a column to drop a piece."];
  if (narrow && lines[1].startsWith("Pick a column for")) lines[1] = "New game: pick a column.";

  const score = narrow
    ? `humans ${n(s.score.humans)} · dosi ${n(s.score.dosi)} · draws ${n(s.score.draws)}`
    : `humans ${n(s.score.humans)}  ·  dosi ${n(s.score.dosi)}  ·  draws ${n(s.score.draws)}  ·  ${n(s.totalMoves)} moves`;
  const look = lastDosi ? (lastDosi.col - 3) * 1.6 : 0;
  const w = narrow ? 350 : 700;
  const h = narrow ? 150 : 108;
  const tw = w - 14;
  const th = h - 14;
  const face = narrow ? { x: 48, y: 48, s: 52 } : { x: 61, y: 47, s: 58 };
  const text = narrow
    ? `<text x="90" y="42" class="t">${esc(lines[0])}</text><text x="90" y="67" class="t m">${esc(lines[1])}</text>` +
      `<text x="24" y="114" class="s" xml:space="preserve">${esc(score)}</text>`
    : `<text x="112" y="44" class="t">${esc(lines.join(" "))}</text>` +
      `<text x="112" y="72" class="s" xml:space="preserve">${esc(score)}</text>` +
      `<text x="672" y="72" class="f" text-anchor="end">looks 5 moves ahead</text>`;
  const size = narrow ? 19 : 21;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(lines.join(" "))}">` +
    `<style>${fontFaces(["inter-600", "mono-400"])}${recent ? blinkCss(DOSI_DELAY + 900) : ""}${reduced}` +
    `.t{font:600 ${size}px ${SANS};fill:${T.ink};letter-spacing:-.2px}.m{fill:${T.muted}}.s{font:400 13px ${MONO};fill:${T.muted}}.f{font:400 13px ${MONO};fill:${T.faint}}</style>` +
    `<rect x="9" y="5" width="${tw}" height="${th}" rx="18" fill="#000" opacity=".35"/>` +
    `<rect x="7" y="2" width="${tw}" height="${th}" rx="18" fill="${T.band}"/>` +
    `<path d="M7.75 ${th - 16}V20A17.25 17.25 0 0 1 25 2.75H${tw - 11}" stroke="${P.rimLight}" stroke-width="1.5" fill="none" stroke-linecap="round"/>` +
    `<path d="M${tw + 6.25} 20V${th - 16}A17.25 17.25 0 0 1 ${tw - 11} ${th + 1.25}H25" stroke="${P.rimDark}" stroke-width="1.5" fill="none" stroke-linecap="round"/>` +
    `<path d="${squircle(face.x, face.y, face.s)}" fill="${T.face}"/>` +
    `<g transform="translate(${look.toFixed(1)} 2)">${eyes(face.x, face.y - 2, T.accent, recent ? "blink" : "")}</g>` +
    text +
    `</svg>`
  );
}
