// The linked cards under the hero: open-source work first, then what shipped at Microsoft.
import { SANS, MONO, esc, type Look } from "../shared/theme";
import { measure, wrap, f2, svgDoc } from "./svg";

const play = (x: number, y: number, c: string) =>
  `<path d="M${x} ${y - 5}v10a.75.75 0 0 0 1.15.63l7.8-5a.75.75 0 0 0 0-1.26l-7.8-5a.75.75 0 0 0-1.15.63z" fill="${c}"/>`;
const arrow = (x: number, y: number, c: string) =>
  `<path d="M${x + 1} ${y + 4}l7.5-7.5M${x + 3} ${y - 3.5}h5.5v5.5" stroke="${c}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

export type Proof = { slug: string; kicker: string; title: string; body: string; action: string; kind: "watch" | "read"; href: string; alt: string };

export const PROOFS: Proof[] = [
  {
    slug: "memory",
    kicker: "Agents",
    title: "Agentic memory",
    body: "Long-term memory for AI agents. Primary inventor.",
    action: "Demo video · 47:41",
    kind: "watch",
    href: "https://youtu.be/8OviTSFqucI?t=2861",
    alt: "Agentic memory: long-term memory for AI agents. Primary inventor. Demo video at 47:41.",
  },
  {
    slug: "orchestration",
    kicker: "Agents",
    title: "Multi-agent orchestration",
    body: "Agents hand work to other agents. Co-architect.",
    action: "Demo video · 27:09",
    kind: "watch",
    href: "https://youtu.be/ceV3RsG946s?t=1629",
    alt: "Multi-agent orchestration: agents hand work to other agents. Co-architect. Demo video at 27:09.",
  },
  {
    slug: "patent",
    kicker: "Patent",
    title: "Memory for AI agents",
    body: "Memory Management of AI Agents. Primary inventor.",
    action: "Patent EP4651035",
    kind: "read",
    href: "https://patents.google.com/patent/EP4651035A2/en",
    alt: "Patent EP4651035, Memory Management of AI Agents. Primary inventor.",
  },
];

export function proofSvg(l: Look, c: Proof): string {
  const W = 284;
  const H = 168;
  let body = `<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="12" fill="${l.surface}" stroke="${l.border}"/>`;
  body += `<text x="18" y="36" class="k">${esc(c.kicker)}</text>`;
  body += `<text x="18" y="66" class="t">${esc(c.title)}</text>`;
  wrap(c.body, "inter-400", 13.5, W - 40).forEach((line, i) => (body += `<text x="18" y="${92 + i * 19.5}" class="b">${esc(line)}</text>`));
  body += c.kind === "watch" ? play(19, 145, l.accent) : arrow(18, 145, l.accent);
  body += `<text x="36" y="149.5" class="a">${esc(c.action)}</text>`;
  const css =
    `.k{font:500 12.5px ${SANS};fill:${l.faint}}.t{font:600 18px ${SANS};letter-spacing:-.25px;fill:${l.ink}}` +
    `.b{font:400 13.5px ${SANS};fill:${l.muted}}.a{font:500 13px ${SANS};fill:${l.accentText}}`;
  return svgDoc(W, H, c.alt, ["inter-400", "inter-500", "inter-600"], css, body);
}

export type Product = { slug: string; name: string; line: string; body: string; meta: string; art: string; href: string; alt: string };

export function productSvg(l: Look, c: Product): string {
  const W = 428;
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
  body += `<text x="20" y="${H - 22}" class="m">${esc(c.meta)}</text>`;
  body += arrow(W - 34, H - 26, l.accent);
  const css =
    `.n{font:600 21px ${SANS};letter-spacing:-.3px;fill:${l.ink}}` +
    `.l{font:400 13px ${MONO};fill:${l.faint}}.b{font:400 14px ${SANS};fill:${l.muted}}.m{font:400 12px ${MONO};fill:${l.faint}}`;
  return svgDoc(W, H, c.alt, ["inter-400", "inter-500", "inter-600", "mono-400"], css, body);
}

export type Repo = { slug: string; name: string; body: string; meta: string };

// The smaller open-source projects, two to a row under the two big cards.
export function repoSvg(l: Look, c: Repo): string {
  const W = 428;
  const H = 124;
  let body = `<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="12" fill="${l.surface}" stroke="${l.border}"/>`;
  body += `<text x="20" y="34" class="n">${esc(c.name)}</text>`;
  wrap(c.body, "inter-400", 13.5, W - 64).forEach((line, i) => (body += `<text x="20" y="${59 + i * 19}" class="b">${esc(line)}</text>`));
  body += `<text x="20" y="${H - 20}" class="m">${esc(c.meta)}</text>`;
  body += arrow(W - 34, H - 26, l.accent);
  const css =
    `.n{font:600 16px ${SANS};letter-spacing:-.2px;fill:${l.ink}}.m{font:400 12px ${MONO};fill:${l.faint}}.b{font:400 13.5px ${SANS};fill:${l.muted}}`;
  return svgDoc(W, H, `${c.name}: ${c.body}`, ["inter-400", "inter-600", "mono-400"], css, body);
}
