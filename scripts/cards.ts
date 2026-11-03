// The linked cards under the hero: what shipped (two keynotes and a patent) and what he builds now.
import { SANS, MONO, esc, type Palette } from "../shared/theme";
import { measure, wrap, f2, liftFilter, surface, svgDoc } from "./svg";

export type Proof = { kicker: string; title: string; body: string; action: string; kind: "watch" | "read" };

export const PROOFS: (Proof & { href: string; slug: string })[] = [
  {
    slug: "memory",
    kicker: "Build 2024 keynote",
    title: "Agentic memory",
    body: "Long-term memory for Copilot Studio agents. Primary inventor.",
    action: "Watch at 47:41",
    kind: "watch",
    href: "https://youtu.be/8OviTSFqucI?t=2861",
  },
  {
    slug: "orchestration",
    kicker: "Build 2025 keynote",
    title: "Multi-agent orchestration",
    body: "Copilot Studio agents hand work to other agents. Co-architect.",
    action: "Watch at 27:09",
    kind: "watch",
    href: "https://youtu.be/ceV3RsG946s?t=1629",
  },
  {
    slug: "patent",
    kicker: "Patent EP4651035",
    title: "Memory for AI agents",
    body: "Memory Management of AI Agents, Microsoft. Primary inventor.",
    action: "Read the patent",
    kind: "read",
    href: "https://patents.google.com/patent/EP4651035A2/en",
  },
];

const play = (x: number, y: number, c: string) =>
  `<path d="M${x} ${y - 5.5}v11a.8.8 0 0 0 1.2.7l8.6-5.5a.8.8 0 0 0 0-1.4l-8.6-5.5a.8.8 0 0 0-1.2.7z" fill="${c}"/>`;
const arrow = (x: number, y: number, c: string) =>
  `<path d="M${x + 1} ${y + 4.5}l8-8M${x + 3} ${y - 3.5}h6v6" stroke="${c}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

export function proofSvg(p: Palette, c: Proof): string {
  const W = 280;
  const H = 172;
  const x = 4;
  const lines = wrap(c.body, "inter-400", 13.5, 232);
  let body = surface(p, x, 2, W - 10, H - 10, 14, p.raised);
  body += `<text x="${x + 20}" y="34" class="k">${esc(c.kicker)}</text>`;
  body += `<text x="${x + 20}" y="62" class="t">${esc(c.title)}</text>`;
  lines.forEach((l, i) => (body += `<text x="${x + 20}" y="${88 + i * 19.5}" class="b">${esc(l)}</text>`));
  body += c.kind === "watch" ? play(x + 21, 138, p.accent) : arrow(x + 20, 138, p.accent);
  body += `<text x="${x + 40}" y="142.5" class="a">${esc(c.action)}</text>`;
  const css =
    `.k{font:500 12.5px ${SANS};fill:${p.inkFaint}}.t{font:600 18px ${SANS};letter-spacing:-.25px;fill:${p.ink}}` +
    `.b{font:400 13.5px ${SANS};fill:${p.inkMuted}}.a{font:500 13.5px ${SANS};fill:${p.accent}}`;
  return svgDoc(W, H, `${c.title}. ${c.kicker}. ${c.body} ${c.action}.`, ["inter-400", "inter-500", "inter-600"], css, `<defs>${liftFilter(p)}</defs>${body}`);
}

export type Product = {
  name: string;
  line: string;
  body: string;
  meta: string;
  art: string; // base64 JPEG, 802x300
};

export function productSvg(p: Palette, c: Product): string {
  const W = 425;
  const H = 318;
  const x = 4;
  const w = W - 10;
  const pic = { x: x + 8, y: 10, w: w - 16, h: Math.round(((w - 16) * 300) / 802) };
  let body = surface(p, x, 2, w, H - 10, 18, p.raised);
  body +=
    `<clipPath id="pic"><rect x="${pic.x}" y="${pic.y}" width="${pic.w}" height="${pic.h}" rx="11"/></clipPath>` +
    `<image href="data:image/jpeg;base64,${c.art}" x="${pic.x}" y="${pic.y}" width="${pic.w}" height="${pic.h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#pic)"/>` +
    `<rect x="${pic.x + 0.5}" y="${pic.y + 0.5}" width="${pic.w - 1}" height="${pic.h - 1}" rx="10.5" fill="none" stroke="${p.hairline}"/>`;
  const ty = pic.y + pic.h + 38;
  body += `<text x="${x + 20}" y="${ty}" class="n">${esc(c.name)}</text>`;
  body += `<text x="${f2(x + 20 + measure(c.name, "inter-600", 21, -0.3) + 10)}" y="${ty}" class="l">${esc(c.line)}</text>`;
  wrap(c.body, "inter-400", 14, w - 40).forEach((l, i) => (body += `<text x="${x + 20}" y="${ty + 26 + i * 20}" class="b">${esc(l)}</text>`));
  body += `<text x="${x + 20}" y="${H - 26}" class="m">${esc(c.meta)}</text>`;
  body += arrow(x + w - 32, H - 30, p.accent);
  const css =
    `.n{font:600 21px ${SANS};letter-spacing:-.3px;fill:${p.ink}}.l{font:400 13px ${MONO};fill:${p.inkFaint}}` +
    `.b{font:400 14px ${SANS};fill:${p.inkMuted}}.m{font:400 12.5px ${MONO};fill:${p.inkFaint}}`;
  return svgDoc(W, H, `${c.name}: ${c.line}. ${c.body} ${c.meta}.`, ["inter-400", "inter-600", "mono-400"], css, `<defs>${liftFilter(p)}</defs>${body}`);
}
