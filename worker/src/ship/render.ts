// The pictures of Ship it: the scene, the three cards, the button under them and the live
// strip near the top of the profile. Dark in both appearances, like a game console, so one
// image serves both themes and only the phone layout needs its own version.
import { fontFaces, SANS, MONO, esc } from "../../../shared/theme";
import { textWidth, wrapText } from "../../../shared/text";
import { CARDS, ENEMIES, LAST_FLOOR, type CardId, type Intent, type Run, type Event } from "./engine";

export type Stats = { runs: number; wins: number; best: number; clicks: number };

const G = {
  bg: "#0d1117",
  panel: "#151b23",
  raised: "#1c232c",
  well: "#262c36",
  border: "#3d444d",
  ink: "#f0f6fc",
  muted: "#9198a1",
  faint: "#6e7681",
  accent: "#DB8A62",
  accentSoft: "#2f221b",
  accentText: "#E9A582",
  ok: "#7DBB99",
  okSoft: "#1c2e25",
  caution: "#DDB866",
  danger: "#E77A75",
  dangerSoft: "#3b1d1d",
  blue: "#79A7E0",
  blueSoft: "#1b2636",
  onAccent: "#160E0A",
};

const RECENT_MS = 10_000;
const f2 = (n: number) => Number(n.toFixed(2)).toString();
const reduced = "@media (prefers-reduced-motion:reduce){*{animation:none!important}}";

function doc(w: number, h: number, label: string, css: string, body: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">` +
    `<title>${esc(label)}</title><style>${fontFaces(["inter-400", "inter-600", "mono-400"])}` +
    `.h{font:600 15px ${SANS};fill:${G.ink}}.m{font:400 12.5px ${MONO};fill:${G.faint}}.b{font:400 13.5px ${SANS};fill:${G.muted}}` +
    `${css}${reduced}</style>${body}</svg>`
  );
}

function chip(x: number, y: number, text: string, fg: string, bg: string): { svg: string; w: number } {
  const w = textWidth(text, "mono-400", 11.5) + 18;
  return {
    svg: `<rect x="${f2(x)}" y="${y}" width="${f2(w)}" height="20" rx="10" fill="${bg}"/><text x="${f2(x + 9)}" y="${y + 14}" style="font:400 11.5px ${MONO};fill:${fg}">${esc(text)}</text>`,
    w,
  };
}

function chips(x: number, y: number, items: [string, string, string][], maxX: number): string {
  let out = "";
  let cx = x;
  let cy = y;
  for (const [text, fg, bg] of items) {
    const w = textWidth(text, "mono-400", 11.5) + 18;
    if (cx + w > maxX && cx > x) {
      cx = x;
      cy += 26;
    }
    out += chip(cx, cy, text, fg, bg).svg;
    cx += w + 6;
  }
  return out;
}

function squircle(x: number, y: number, s: number): string {
  const h = s / 2;
  const c = h * 0.09;
  return (
    `M${f2(x - h)} ${f2(y)}C${f2(x - h)} ${f2(y - h + c)} ${f2(x - h + c)} ${f2(y - h)} ${f2(x)} ${f2(y - h)}` +
    `C${f2(x + h - c)} ${f2(y - h)} ${f2(x + h)} ${f2(y - h + c)} ${f2(x + h)} ${f2(y)}` +
    `C${f2(x + h)} ${f2(y + h - c)} ${f2(x + h - c)} ${f2(y + h)} ${f2(x)} ${f2(y + h)}` +
    `C${f2(x - h + c)} ${f2(y + h)} ${f2(x - h)} ${f2(y + h - c)} ${f2(x - h)} ${f2(y)}Z`
  );
}

// What each incident looks like: a short terminal glyph on a dark squircle.
const GLYPH: Record<string, string> = {
  flaky: "?!",
  typo: "pr0d",
  envvar: "$?",
  merge: "<<<",
  inject: "{{ }}",
  halluc: "/v2",
  leak: "OOM",
  pager: "3am",
  deps: "^1.x",
  demo: "LIVE",
};

function intentChip(it: Intent): [string, string, string] {
  switch (it.kind) {
    case "attack":
      return [`${it.label} · ${it.dmg}${it.times > 1 ? ` × ${it.times}` : ""}`, G.danger, G.dangerSoft];
    case "shield":
      return [`${it.label} · shield ${it.amount}`, G.blue, G.blueSoft];
    case "heal":
      return [`${it.label} · heals ${it.amount}`, G.ok, G.okSoft];
    case "inject":
      return [it.label, G.accentText, G.accentSoft];
    case "polish":
      return [`${it.label} · hides again`, G.accentText, G.accentSoft];
    default:
      return [it.label, G.muted, G.well];
  }
}

const toneColor: Record<Event["tone"], string> = { you: G.ink, them: G.danger, good: G.ok, bad: G.accentText, info: G.muted };

function bar(x: number, y: number, w: number, ratio: number, before: number | null, color: string, cls: string): { svg: string; css: string } {
  const r = Math.max(0, Math.min(1, ratio));
  let css = "";
  let svg = `<rect x="${x}" y="${y}" width="${w}" height="8" rx="4" fill="${G.well}"/>`;
  if (r > 0) svg += `<rect class="${cls}" x="${x}" y="${y}" width="${f2(w * r)}" height="8" rx="4" fill="${color}"/>`;
  if (before !== null && before > r && r > 0) {
    const from = Math.min(before / r, 1 / r);
    css += `.${cls}{transform-box:fill-box;transform-origin:0 50%;animation:${cls} 700ms 350ms cubic-bezier(.23,1,.32,1) both}@keyframes ${cls}{from{transform:scaleX(${f2(from)})}to{transform:none}}`;
  }
  return { svg, css };
}

function floater(x: number, y: number, text: string, color: string, cls: string, delay: number): { svg: string; css: string } {
  return {
    svg: `<text class="${cls}" x="${x}" y="${y}" style="font:600 22px ${SANS};fill:${color}">${esc(text)}</text>`,
    css: `.${cls}{opacity:0;animation:${cls} 1100ms ${delay}ms cubic-bezier(.23,1,.32,1) both}@keyframes ${cls}{0%{opacity:0;transform:translateY(6px)}20%{opacity:1;transform:none}75%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}`,
  };
}

function pips(x: number, y: number, floor: number, phase: Run["phase"]): string {
  let out = "";
  for (let i = 1; i <= LAST_FLOOR; i++) {
    const cx = x + (i - 1) * 18;
    const done = i < floor || (phase === "won" && i === floor) || (phase === "reward" && i === floor);
    const here = i === floor && !done;
    const color = done ? G.accent : here ? G.accent : G.faint;
    if (i === LAST_FLOOR) {
      const d = `M${cx} ${y - 6}L${cx + 6} ${y}L${cx} ${y + 6}L${cx - 6} ${y}Z`;
      out += done ? `<path d="${d}" fill="${color}"/>` : `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.6"/>`;
    } else if (done) out += `<circle cx="${cx}" cy="${y}" r="5" fill="${color}"/>`;
    else out += `<circle cx="${cx}" cy="${y}" r="4.5" fill="none" stroke="${color}" stroke-width="1.6"/>${here ? `<circle cx="${cx}" cy="${y}" r="1.8" fill="${color}"/>` : ""}`;
  }
  return out;
}

export function sceneSvg(r: Run, s: Stats, now: number, narrow: boolean): string {
  const W = narrow ? 360 : 700;
  const css: string[] = [];
  let body = "";
  const recent = !!r.last && now - r.last.at < RECENT_MS;
  const pad = 20;

  // Header: title, run and floor, the floors as pips.
  body += `<text x="${pad}" y="30" class="h">Ship it</text>`;
  body += `<text x="${f2(pad + textWidth("Ship it", "inter-600", 15) + 12)}" y="30" class="m">run #${r.id} · floor ${Math.min(r.floor, LAST_FLOOR)} of ${LAST_FLOOR}</text>`;
  body += pips(W - pad - (LAST_FLOOR - 1) * 18 - 6, 25, r.floor, r.phase);
  body += `<path d="M1 46H${W - 1}" stroke="${G.border}"/>`;

  let y = 64;
  const e = r.fight?.enemy;
  if (r.phase === "fight" && e) {
    const def = ENEMIES[e.id];
    const px = pad + 42;
    const py = y + 42;
    body += `<g class="por"><path d="${squircle(px, py, 84)}" fill="${G.well}" stroke="${G.border}"/>`;
    body += `<text x="${px}" y="${py + 6}" text-anchor="middle" style="font:400 ${GLYPH[e.id].length > 3 ? 15 : 19}px ${MONO};fill:${G.accent}">${esc(GLYPH[e.id])}</text></g>`;
    const tx = pad + 100;
    const tw = narrow ? W - tx - pad : 300;
    body += `<text x="${tx}" y="${y + 18}" style="font:600 20px ${SANS};fill:${G.ink};letter-spacing:-.25px">${esc(def.name)}</text>`;
    wrapText(def.blurb, "inter-400", 13.5, tw).slice(0, 2).forEach((l, i) => (body += `<text x="${tx}" y="${y + 40 + i * 18}" class="b">${esc(l)}</text>`));
    const by = y + (narrow ? 70 : 56);
    const sev = bar(tx, by, tw, e.hp / e.maxHp, recent && r.last!.dealt ? r.last!.enemyHpBefore / e.maxHp : null, G.danger, "eb");
    body += sev.svg;
    css.push(sev.css);
    body += `<text x="${tx}" y="${by + 24}" class="m">severity ${e.hp} / ${e.maxHp}</text>`;
    const st: [string, string, string][] = [];
    if (e.shield) st.push([`shield ${e.shield}`, G.blue, G.blueSoft]);
    if (e.hidden) st.push(e.id === "demo" ? ["looks great: can't be hurt", G.accentText, G.accentSoft] : ["looks fine: takes half", G.accentText, G.accentSoft]);
    body += chips(tx + textWidth(`severity ${e.hp} / ${e.maxHp}`, "mono-400", 12.5) + 10, by + 10, st, tx + tw);
    const iy = by + 40;
    body += `<text x="${tx}" y="${iy + 14}" class="m">next</text>`;
    body += chips(tx + 38, iy, [intentChip(e.intent)], tx + tw);
    if (recent && r.last!.dealt) {
      const fl = floater(px + 30, py - 30, `−${r.last!.dealt}`, G.danger, "fe", 250);
      body += fl.svg;
      css.push(fl.css, `.por{animation:shake 320ms 250ms both}@keyframes shake{0%,100%{transform:none}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}`);
    }
    y = narrow ? iy + 42 : y;
  } else {
    // Between fights, and at the end of a run.
    const title =
      r.phase === "reward" ? `${r.fight ? ENEMIES[r.fight.enemy.id].name : "Incident"} is fixed.` : r.phase === "won" ? `Shipped. Run #${r.id} beat The Demo.` : `Production is down. Run #${r.id} is over.`;
    const sub =
      r.phase === "reward"
        ? "Pick a card to add to your deck, or skip it and rest."
        : `${r.phase === "won" ? "It took" : "It lasted"} ${r.turns} clicks. Humans have shipped ${s.wins} of ${s.runs} runs. Best: floor ${s.best} of ${LAST_FLOOR}.`;
    body += `<text x="${pad}" y="${y + 22}" style="font:600 21px ${SANS};fill:${r.phase === "lost" ? G.danger : r.phase === "won" ? G.ok : G.ink};letter-spacing:-.25px">${esc(title)}</text>`;
    wrapText(sub, "inter-400", 14, W - 2 * pad).forEach((l, i) => (body += `<text x="${pad}" y="${y + 48 + i * 20}" class="b" style="font-size:14px">${esc(l)}</text>`));
    if (r.phase !== "reward") body += `<text x="${pad}" y="${y + 100}" class="m">Click any card to start run #${r.id + 1}.</text>`;
    y = narrow ? y + 116 : y;
  }

  // You.
  const ux = narrow ? pad : 430;
  const uw = narrow ? W - 2 * pad : W - ux - pad;
  const uy = narrow ? y + 8 : 64;
  if (r.phase !== "won" && r.phase !== "lost") {
    body += `<text x="${ux}" y="${uy + 14}" class="h">Uptime</text>`;
    body += `<text x="${ux + uw}" y="${uy + 14}" class="m" text-anchor="end">${r.hp} / ${r.maxHp}</text>`;
    const ratio = r.hp / r.maxHp;
    const color = ratio > 0.5 ? G.ok : ratio > 0.25 ? G.caution : G.danger;
    const up = bar(ux, uy + 26, uw, ratio, recent && r.last!.took ? r.last!.hpBefore / r.maxHp : null, color, "ub");
    body += up.svg;
    css.push(up.css);
    const f = r.fight;
    const st: [string, string, string][] = [];
    if (r.phase === "fight" && f) {
      if (f.cover) st.push([`cover ${f.cover}`, G.blue, G.blueSoft]);
      if (f.injected) st.push(["next card is hijacked", G.danger, G.dangerSoft]);
      if (f.scoped) st.push(["scoped key", G.ok, G.okSoft]);
      if (f.worktree) st.push(["worktrees", G.ok, G.okSoft]);
      if (f.delayed) st.push([`a human answers: ${f.delayed}`, G.ok, G.okSoft]);
    }
    if (r.memory) st.push([`+${r.memory} attack, written down`, G.accentText, G.accentSoft]);
    body += chips(ux, uy + 48, st, ux + uw);
    if (recent && (r.last!.took || r.last!.healed)) {
      const fl = r.last!.took ? floater(ux + uw - 40, uy - 2, `−${r.last!.took}`, G.danger, "fu", 650) : floater(ux + uw - 40, uy - 2, `+${r.last!.healed}`, G.ok, "fu", 350);
      body += fl.svg;
      css.push(fl.css);
    }
    if (r.phase === "fight" && f) {
      const noise = r.deck.filter((c) => c === "noise").length;
      body += `<text x="${ux}" y="${uy + (narrow ? 100 : 128)}" class="m">deck ${r.deck.length} · draw ${f.draw.length} · discard ${f.discard.length}${noise ? ` · noise ${noise}` : ""}</text>`;
    }
  }

  // The last few things that happened.
  const ly = narrow ? uy + 120 : 232;
  body += `<path d="M1 ${ly}H${W - 1}" stroke="${G.border}"/>`;
  const lines = r.log.slice(narrow ? -3 : -3);
  lines.forEach((ev, i) => {
    const max = W - 2 * pad;
    let text = ev.text;
    while (textWidth(text, "mono-400", 12) > max && text.length > 4) text = text.slice(0, -2).trimEnd() + "…";
    body += `<text x="${pad}" y="${ly + 24 + i * 21}" style="font:400 12px ${MONO};fill:${toneColor[ev.tone]}">${esc(text.replace(/……$/, "…"))}</text>`;
  });
  const H = ly + 24 + 3 * 21 + 4;
  body = `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="${G.panel}" stroke="${G.border}"/>` + body;
  return doc(W, H, sceneLabel(r), css.join(""), body);
}

function sceneLabel(r: Run): string {
  if (r.phase === "fight" && r.fight) {
    const e = r.fight.enemy;
    return `Ship it, run ${r.id}, floor ${r.floor} of ${LAST_FLOOR}: ${ENEMIES[e.id].name}, severity ${e.hp} of ${e.maxHp}. Next: ${e.intent.label}. Your uptime ${r.hp} of ${r.maxHp}.`;
  }
  return `Ship it, run ${r.id}: ${r.log[r.log.length - 1]?.text ?? ""}`;
}

// The big number on a card, so it reads at a glance and on a phone.
function cardValue(id: CardId, r: Run): string {
  const m = r.memory;
  const v: Record<CardId, string> = {
    run: `${7 + m}`,
    test: "7",
    check: `${5 + m}`,
    retry: `${12 + m}`,
    context: `${9 + m}`,
    noise: "0",
    worktree: "8",
    logs: `${6 + m}`,
    scoped: "10",
    rollback: "+10",
    bisect: `${3 + m}×t`,
    human: "18",
    remember: "+2",
    parallel: `${4 + m}×3`,
    delete: `${16 + m}`,
    kill: `${20 + m}`,
  };
  return v[id];
}

export function cardSvg(r: Run, s: Stats, slot: number, now: number, narrow: boolean): string {
  const W = 220;
  const H = 300;
  const css: string[] = [];
  let body = "";
  const recent = !!r.last && now - r.last.at < RECENT_MS && r.last.drew;
  const id: CardId | undefined = r.phase === "fight" ? r.fight?.hand[slot] : r.phase === "reward" ? r.reward[slot] : undefined;

  if (r.phase === "won" || r.phase === "lost") {
    const faces = [
      ["New run", `Start run #${r.id + 1}`, G.accent],
      ["Shipped", `${s.wins} of ${s.runs} runs`, G.ok],
      ["Best", `floor ${s.best} of ${LAST_FLOOR}`, G.blue],
    ] as const;
    const [title, sub, color] = faces[slot] ?? faces[0];
    body += `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="${G.raised}" stroke="${color}" stroke-width="1.5"/>`;
    body += `<text x="${W / 2}" y="132" text-anchor="middle" style="font:600 ${narrow ? 30 : 26}px ${SANS};fill:${color}">${esc(title)}</text>`;
    body += `<text x="${W / 2}" y="164" text-anchor="middle" style="font:400 ${narrow ? 18 : 14.5}px ${SANS};fill:${G.muted}">${esc(sub)}</text>`;
    return doc(W, H, `${title}: ${sub}. Click to start a new run.`, "", body);
  }
  if (!id) {
    body += `<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="14" fill="none" stroke="${G.border}" stroke-width="1.5" stroke-dasharray="6 6"/>`;
    return doc(W, H, "Empty slot", "", body);
  }

  const c = CARDS[id];
  const edge = c.kind === "attack" ? G.accent : c.kind === "skill" ? G.blue : G.faint;
  const soft = c.kind === "attack" ? G.accentSoft : c.kind === "skill" ? G.blueSoft : G.well;
  body += `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="${G.raised}" stroke="${edge}" stroke-width="1.5"${c.kind === "junk" ? ` stroke-dasharray="6 5"` : ""}/>`;
  body += chip(16, 16, r.phase === "reward" ? "take" : c.kind === "junk" ? "noise" : c.kind, r.phase === "reward" ? G.ok : edge, r.phase === "reward" ? G.okSoft : soft).svg;
  const value = cardValue(id, r);
  body += `<text x="${W - 16}" y="${narrow ? 50 : 44}" text-anchor="end" style="font:600 ${narrow ? 34 : 28}px ${SANS};fill:${edge}">${esc(value)}</text>`;
  const ts = narrow ? 24 : 19;
  const title = wrapText(c.name, "inter-600", ts, W - 32).slice(0, 2);
  title.forEach((l, i) => (body += `<text x="16" y="${84 + i * (ts + 5)}" style="font:600 ${ts}px ${SANS};fill:${G.ink};letter-spacing:-.25px">${esc(l)}</text>`));
  const textY = 84 + title.length * (ts + 5) + 10;
  const bs = narrow ? 17 : 14;
  wrapText(c.text(r), "inter-400", bs, W - 32)
    .slice(0, narrow ? 4 : 5)
    .forEach((l, i) => (body += `<text x="16" y="${textY + i * (bs + 5)}" style="font:400 ${bs}px ${SANS};fill:${G.muted}">${esc(l)}</text>`));
  if (c.lesson && !narrow) {
    wrapText(c.lesson, "mono-400", 11.5, W - 32)
      .slice(0, 2)
      .reverse()
      .forEach((l, i) => (body += `<text x="16" y="${H - 18 - i * 16}" style="font:400 11.5px ${MONO};fill:${G.accentText}">${esc(l)}</text>`));
  }
  if (recent) {
    const cls = `in${slot}`;
    body = `<g class="${cls}">${body}</g>`;
    css.push(`.${cls}{animation:${cls} 420ms ${700 + slot * 90}ms cubic-bezier(.23,1,.32,1) both}@keyframes ${cls}{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`);
  }
  return doc(W, H, `${c.name}: ${c.text(r)}${c.lesson ? ` ${c.lesson}` : ""}`, css.join(""), body);
}

export function buttonSvg(r: Run): string {
  const W = 700;
  const H = 52;
  const over = r.phase === "won" || r.phase === "lost";
  const label = r.phase === "fight" ? "Revert this hand: draw three new cards, the incident still acts" : r.phase === "reward" ? "Skip the card and rest: heal 12" : `Start run #${r.id + 1}`;
  const body =
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${(H - 2) / 2}" fill="${over ? G.accent : G.panel}" stroke="${over ? G.accent : G.border}"/>` +
    `<text x="${W / 2}" y="${H / 2 + 5}" text-anchor="middle" style="font:500 14.5px ${SANS};fill:${over ? G.onAccent : G.ink}">${esc(label)}</text>`;
  return doc(W, H, label, "", body);
}

// The one-line teaser under the hero: the run is live, right now.
export function stripSvg(r: Run, s: Stats): string {
  const W = 860;
  const H = 44;
  const where =
    r.phase === "won" ? `run #${r.id} shipped` : r.phase === "lost" ? `run #${r.id} went down on floor ${r.floor}` : `run #${r.id}, floor ${r.floor} of ${LAST_FLOOR}, uptime ${r.hp}/${r.maxHp}`;
  const text = `${where} · shipped ${s.wins} of ${s.runs} · everyone plays the same run`;
  let body = `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="${(H - 1) / 2}" fill="${G.panel}" stroke="${G.border}"/>`;
  body += `<circle cx="22" cy="${H / 2}" r="4" fill="${G.ok}"/>`;
  body += `<text x="34" y="${H / 2 + 5}" class="h" style="font-size:14px">Ship it</text>`;
  body += `<text x="${f2(34 + textWidth("Ship it", "inter-600", 14) + 10)}" y="${H / 2 + 4.5}" class="m">${esc(text)}</text>`;
  body += `<text x="${W - 22}" y="${H / 2 + 5}" text-anchor="end" style="font:600 14px ${SANS};fill:${G.accent}">Play it below ↓</text>`;
  return doc(W, H, `Live game: Ship it, ${text}. Play it below.`, "", body);
}
