// The linked cards under the hero: the two products, then the smaller repos.
import { SANS, MONO, esc, type Look } from "../shared/theme";
import { measure, wrap, f2, svgDoc } from "./svg";

const arrow = (x: number, y: number, c: string) =>
  `<path d="M${x + 1} ${y + 4}l7.5-7.5M${x + 3} ${y - 3.5}h5.5v5.5" stroke="${c}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

// The meta line under a card: groups of words set apart by space.
function metaLine(groups: string[], x: number, y: number): string {
  let out = "";
  for (const g of groups) {
    out += `<text x="${f2(x)}" y="${y}" class="m">${esc(g)}</text>`;
    x += measure(g, "mono-400", 12) + 20;
  }
  return out;
}

export type Product = { slug: string; name: string; line: string; body: string; meta: string[]; art: string; href: string; alt: string };

export function productSvg(l: Look, c: Product): string {
  const W = 418;
  const H = 350;
  const pic = { x: 10, y: 10, w: W - 20, h: Math.round(((W - 20) * 300) / 802) };
  let body = `<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="16" fill="${l.surface}" stroke="${l.border}"/>`;
  body +=
    `<clipPath id="pic"><rect x="${pic.x}" y="${pic.y}" width="${pic.w}" height="${pic.h}" rx="9"/></clipPath>` +
    `<image href="data:image/jpeg;base64,${c.art}" x="${pic.x}" y="${pic.y}" width="${pic.w}" height="${pic.h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#pic)"/>` +
    `<rect x="${pic.x + 0.5}" y="${pic.y + 0.5}" width="${pic.w - 1}" height="${pic.h - 1}" rx="8.5" fill="none" stroke="${l.border}"/>`;
  const ty = pic.y + pic.h + 40;
  body += `<text x="20" y="${ty}" class="n">${esc(c.name)}</text>`;
  const by = c.line ? ty + 50 : ty + 28;
  if (c.line) body += `<text x="20" y="${ty + 24}" class="l">${esc(c.line)}</text>`;
  wrap(c.body, "inter-400", 14, W - 44).forEach((line, i) => (body += `<text x="20" y="${by + i * 20}" class="b">${esc(line)}</text>`));
  body += metaLine(c.meta, 20, H - 22);
  body += arrow(W - 34, H - 26, l.accent);
  const css =
    `.n{font:600 21px ${SANS};letter-spacing:-.3px;fill:${l.ink}}` +
    `.l{font:400 13px ${MONO};fill:${l.faint}}.b{font:400 14px ${SANS};fill:${l.muted}}.m{font:400 12px ${MONO};fill:${l.faint}}`;
  return svgDoc(W, H, c.alt, ["inter-400", "inter-500", "inter-600", "mono-400"], css, body);
}

export type Repo = { slug: string; name: string; body: string; meta: string[] };

// The smaller open-source projects, two to a row under the two big cards.
export function repoSvg(l: Look, c: Repo): string {
  const W = 418;
  const H = 124;
  let body = `<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="12" fill="${l.surface}" stroke="${l.border}"/>`;
  body += `<text x="20" y="34" class="n">${esc(c.name)}</text>`;
  wrap(c.body, "inter-400", 13.5, W - 64).forEach((line, i) => (body += `<text x="20" y="${59 + i * 19}" class="b">${esc(line)}</text>`));
  body += metaLine(c.meta, 20, H - 20);
  body += arrow(W - 34, H - 26, l.accent);
  const css =
    `.n{font:600 16px ${SANS};letter-spacing:-.2px;fill:${l.ink}}.m{font:400 12px ${MONO};fill:${l.faint}}.b{font:400 13.5px ${SANS};fill:${l.muted}}`;
  return svgDoc(W, H, `${c.name}: ${c.body}`, ["inter-400", "inter-600", "mono-400"], css, body);
}
