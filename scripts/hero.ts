// The hero: name, tagline and a Kodosi terminal tile that types a short session once.
// Dosi sits under the tagline, watches the terminal, then looks down at its game.
import { terminal as T, SANS, MONO, esc, type Palette } from "../shared/theme";
import { measure, wrap, f2, liftFilter, rims, squircle, dosiEyes, svgDoc } from "./svg";

export const NAME = "John Kozaris";
export const TAGLINE = "I build memory and orchestration for AI agents.";
export const ROLE = "ML lead at Microsoft";

type Seg = [text: string, color: string];
const plan = (t: string): Seg[] => [[t, T.muted]];
const dirs = (...names: string[]): Seg[] => names.flatMap((n, i) => [[n, T.link], ...(i < names.length - 1 ? [["  ", T.muted] as Seg] : [])]);

const SESSION: { cmd: string; out: Seg[][] }[] = [
  {
    cmd: "cat .plan",
    out: [
      plan("agents that remember people and past work"),
      plan("runtimes where agents hand work to agents"),
      plan("terminals shared by people and agents"),
    ],
  },
  { cmd: "ls ~/Repos", out: [dirs("Kodosi", "BoBe", "tebis", "mcpHomeManager"), dirs("jko-claude-plugins")] },
];

// Timing, in ms from the moment the image loads.
const CHAR = 55;
const START = 500;

type Timeline = { prompt: number; typeStart: number; typeEnd: number; enter: number; out: number[] }[];

function timeline(): { steps: Timeline; final: number; total: number } {
  let t = START;
  const steps: Timeline = [];
  for (const s of SESSION) {
    const prompt = t;
    const typeStart = prompt + 300;
    const typeEnd = typeStart + s.cmd.length * CHAR;
    const enter = typeEnd + 220;
    const out = s.out.map((_, j) => enter + 100 + 40 * j);
    steps.push({ prompt, typeStart, typeEnd, enter, out });
    t = out[out.length - 1] + 480;
  }
  return { steps, final: t, total: t + 1200 };
}

export function heroSvg(p: Palette, layout: "wide" | "narrow"): string {
  const wide = layout === "wide";
  const W = wide ? 860 : 420;
  const { steps, final, total } = timeline();
  const pct = (ms: number) => `${((ms / total) * 100).toFixed(3)}%`;
  const eps = total / 10000;
  const css: string[] = [];
  let body = "";

  // Name, tagline, role
  const lx = wide ? 48 : 28;
  const nameSize = wide ? 54 : 44;
  const nameY = wide ? 104 : 84;
  body += `<text x="${lx - 2}" y="${nameY}" class="name">${esc(NAME)}</text>`;
  const tagSize = wide ? 21 : 19;
  const tagLines = wrap(TAGLINE, "inter-400", tagSize, wide ? 330 : 360);
  const tagY = nameY + (wide ? 44 : 40);
  const lead = tagSize * 1.38;
  tagLines.forEach((l, i) => (body += `<text x="${lx}" y="${f2(tagY + i * lead)}" class="tag">${esc(l)}</text>`));
  const lastW = measure(tagLines[tagLines.length - 1], "inter-400", tagSize);
  const curY = tagY + (tagLines.length - 1) * lead;
  body += `<rect x="${f2(lx + lastW + 5)}" y="${f2(curY - tagSize * 0.8)}" width="${f2(tagSize * 0.5)}" height="${f2(tagSize * 1.02)}" rx="2" fill="${p.accent}"/>`;
  const roleY = curY + (wide ? 44 : 40);
  body += `<text x="${lx}" y="${f2(roleY)}" class="role">${esc(ROLE)}</text>`;

  // Terminal tile, dark in both appearances.
  const tx = wide ? 424 : 20;
  const ty = wide ? 36 : roleY + 34;
  const tw = wide ? 400 : W - 40;
  const th = 308;
  const band = 38;
  const r = 12;
  body += `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="${r}" fill="${T.face}" filter="url(#lift)"/>`;
  body += `<path d="M${tx} ${ty + band}V${ty + r}A${r} ${r} 0 0 1 ${tx + r} ${ty}H${tx + tw - r}A${r} ${r} 0 0 1 ${tx + tw} ${ty + r}V${ty + band}Z" fill="${T.band}"/>`;
  body += rims({ ...p, rimLight: "#4A3B33", rimDark: "#050403" }, tx, ty, tw, th, r);
  // Header: computer › folder, then the status sign (done).
  const hy = ty + band / 2;
  body +=
    `<g transform="translate(${tx + 16} ${hy - 6})" fill="none" stroke="${T.faint}" stroke-width="1.3" stroke-linejoin="round">` +
    `<rect x="1.5" y="0" width="13" height="9" rx="1.6"/><path d="M0 11.5H16" stroke-linecap="round"/></g>` +
    `<text x="${tx + 40}" y="${hy + 4.5}" class="hd">mac</text>` +
    `<text x="${tx + 40 + measure("mac", "mono-400", 12.5) + 8}" y="${hy + 4.5}" class="hd">›</text>` +
    `<text x="${tx + 40 + measure("mac ›", "mono-400", 12.5) + 12}" y="${hy + 4.5}" class="hb">~/johnkozaris</text>` +
    `<g transform="translate(${tx + tw - 30} ${hy - 7})"><circle cx="7" cy="7" r="7" fill="${T.ready}"/>` +
    `<path d="M3.8 7.2l2.2 2.2 4.4-4.6" stroke="${T.face}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;

  // Session
  const mono = wide ? 13 : 12.5;
  const adv = mono * 0.6;
  const lh = mono * 1.7;
  const ix = tx + 20;
  let y = ty + band + 30;
  const promptW = measure("› ", "mono-400", mono);
  SESSION.forEach((s, i) => {
    const st = steps[i];
    const textX = ix + promptW;
    const cw = s.cmd.length * adv;
    body +=
      `<g class="p${i}"><text x="${ix}" y="${f2(y)}" class="pr">›</text><text x="${f2(textX)}" y="${f2(y)}" class="cmd">${esc(s.cmd)}</text>` +
      `<rect class="k${i}" x="${f2(textX - 0.5)}" y="${f2(y - mono)}" width="${f2(cw + 1)}" height="${f2(mono * 1.4)}" fill="${T.face}"/>` +
      `<rect class="c${i}" x="${f2(textX)}" y="${f2(y - mono * 0.86)}" width="${f2(adv)}" height="${f2(mono * 1.12)}" rx="1" fill="${T.accent}"/></g>`;
    css.push(
      `.p${i}{animation:p${i} ${total}ms linear both}@keyframes p${i}{0%,${pct(st.prompt - eps)}{opacity:0}${pct(st.prompt)},100%{opacity:1}}`,
      `.k${i}{transform-box:fill-box;transform-origin:100% 50%;transform:scaleX(0);animation:k${i} ${total}ms linear both}` +
        `@keyframes k${i}{0%{transform:scaleX(1)}${pct(st.typeStart)}{transform:scaleX(1);animation-timing-function:steps(${s.cmd.length},end)}${pct(st.typeEnd)},100%{transform:scaleX(0)}}`,
      `.c${i}{opacity:0;animation:c${i} ${total}ms linear both}` +
        `@keyframes c${i}{0%,${pct(st.typeStart)}{opacity:1;transform:translateX(0);animation-timing-function:steps(${s.cmd.length},end)}` +
        `${pct(st.typeEnd)},${pct(st.enter)}{opacity:1;transform:translateX(${f2(cw)}px)}${pct(st.enter + eps)},100%{opacity:0;transform:translateX(${f2(cw)}px)}}`,
    );
    y += lh;
    s.out.forEach((segs, j) => {
      let x = ix;
      let line = "";
      for (const [text, color] of segs) {
        line += `<tspan x="${f2(x)}" fill="${color}">${esc(text)}</tspan>`;
        x += text.length * adv;
      }
      body += `<text y="${f2(y)}" class="out o${i}_${j}" xml:space="preserve">${line}</text>`;
      css.push(`.o${i}_${j}{animation:o${i}_${j} ${total}ms linear both}@keyframes o${i}_${j}{0%,${pct(st.out[j] - eps)}{opacity:0}${pct(st.out[j])},100%{opacity:1}}`);
      y += lh;
    });
    y += lh * 0.6;
  });
  body +=
    `<g class="pf"><text x="${ix}" y="${f2(y)}" class="pr">›</text>` +
    `<rect x="${f2(ix + promptW)}" y="${f2(y - mono * 0.86)}" width="${f2(adv)}" height="${f2(mono * 1.12)}" rx="1" fill="${T.accent}"/></g>`;
  css.push(`.pf{animation:pf ${total}ms linear both}@keyframes pf{0%,${pct(final - eps)}{opacity:0}${pct(final)},100%{opacity:1}}`);

  // Dosi, under the tagline: looks at the terminal while it types, then down at the game.
  const ds = wide ? 46 : 44;
  const dx = lx + ds / 2;
  const dy = wide ? ty + th - ds / 2 - 4 : ty + th + 44 + ds / 2;
  body += `<path d="${squircle(dx, dy, ds)}" fill="${T.face}" filter="url(#lift)"/>`;
  body +=
    `<g class="look"><g class="blink">${dosiEyes(dx, dy, ds, T.accent)}</g></g>` +
    `<text x="${f2(dx + ds / 2 + 14)}" y="${f2(dy - 4)}" class="dn">Dosi, the agent in Kodosi</text>` +
    `<text x="${f2(dx + ds / 2 + 14)}" y="${f2(dy + 16)}" class="dc">Beat it at Connect Four, below ↓</text>`;
  const look = (x: number, y: number) => `transform:translate(${x}px,${y}px)`;
  const ease = "animation-timing-function:cubic-bezier(.23,1,.32,1)";
  css.push(
    `.look{${look(0.6, 2.2)};animation:look ${total}ms linear both}` +
      `@keyframes look{0%,${pct(steps[0].prompt)}{${look(0, 0)};${ease}}${pct(steps[0].prompt + 320)},${pct(final)}{${look(2.6, -0.6)};${ease}}${pct(final + 320)},100%{${look(0.6, 2.2)}}}`,
    `.blink{transform-box:fill-box;transform-origin:50% 50%;animation:blink ${total}ms linear both}` +
      `@keyframes blink{0%,${pct(final + 600)}{transform:scaleY(1)}${pct(final + 690)}{transform:scaleY(.12)}${pct(final + 780)},100%{transform:scaleY(1)}}`,
  );

  const H = wide ? 380 : Math.ceil(dy + ds / 2 + 34);
  body = `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="22" fill="${p.surface}" stroke="${p.hairline}"/>` + body;

  const style =
    `.name{font:600 ${nameSize}px ${SANS};letter-spacing:${f2(-nameSize * 0.028)}px;fill:${p.ink}}` +
    `.tag{font:400 ${tagSize}px ${SANS};letter-spacing:-.1px;fill:${p.inkMuted}}` +
    `.role{font:500 15px ${SANS};fill:${p.inkFaint}}` +
    `.hd{font:400 12.5px ${MONO};fill:${T.faint}}.hb{font:400 12.5px ${MONO};fill:${T.ink}}` +
    `.pr{font:400 ${mono}px ${MONO};fill:${T.accent}}.cmd{font:400 ${mono}px ${MONO};fill:${T.ink}}.out{font:400 ${mono}px ${MONO}}` +
    `.dn{font:600 15px ${SANS};fill:${p.ink}}.dc{font:400 14px ${SANS};fill:${p.inkMuted}}` +
    css.join("");

  return svgDoc(
    W,
    H,
    `${NAME}. ${TAGLINE} ${ROLE}. A terminal shows his plan: agents that remember people and past work, runtimes where agents hand work to agents, and terminals shared by people and agents.`,
    ["inter-400", "inter-500", "inter-600", "mono-400"],
    style,
    `<defs>${liftFilter(p)}</defs>${body}`,
  );
}
