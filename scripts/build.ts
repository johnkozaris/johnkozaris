// Renders every SVG in assets/. The daily Action runs it with GITHUB_TOKEN to refresh releases.
import { dark, light } from "../shared/theme";
import { heroSvg } from "./hero";
import { PROOFS, proofSvg, productSvg, type Product } from "./cards";

const root = new URL("..", import.meta.url).pathname;
const write = (name: string, svg: string) => Bun.write(`${root}assets/${name}`, svg);
const art = async (name: string) => Buffer.from(await Bun.file(`${root}art/${name}`).bytes()).toString("base64");

const token = process.env.GITHUB_TOKEN ?? (await Bun.$`gh auth token`.text()).trim();

async function releases(): Promise<Record<string, { tag: string; at: string } | null>> {
  const query = `fragment R on Repository { latestRelease { tagName publishedAt } }
    query { kodosi: repository(owner: "johnkozaris", name: "Kodosi") { ...R } bobe: repository(owner: "Sombrace", name: "BoBe") { ...R } }`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "user-agent": "johnkozaris-profile" },
    body: JSON.stringify({ query }),
  });
  const { data, errors } = (await res.json()) as any;
  if (errors) throw new Error(JSON.stringify(errors));
  const pick = (r: any) => (r.latestRelease ? { tag: r.latestRelease.tagName, at: r.latestRelease.publishedAt } : null);
  return { kodosi: pick(data.kodosi), bobe: pick(data.bobe) };
}

function ago(iso: string, now = Date.now()): string {
  const days = Math.floor((now - Date.parse(iso)) / 86_400_000);
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

const rel = await releases();
const meta = (langs: string, r: { tag: string; at: string } | null) => (r ? `${langs} · ${r.tag} · ${ago(r.at)}` : langs);

for (const [mode, p] of [["dark", dark], ["light", light]] as const) {
  await write(`hero-wide-${mode}.svg`, heroSvg(p, "wide"));
  await write(`hero-narrow-${mode}.svg`, heroSvg(p, "narrow"));
  for (const c of PROOFS) await write(`proof-${c.slug}-${mode}.svg`, proofSvg(p, c));
  const products: [string, Product][] = [
    [
      "kodosi",
      {
        name: "Kodosi",
        line: "terminals, agents and friends",
        body: "All your terminals and your friends' in one window, with each agent's state. End-to-end encrypted.",
        meta: meta("Rust · Swift · Qt", rel.kodosi),
        art: await art(`kodosi-${mode}.jpg`),
      },
    ],
    [
      "bobe",
      {
        name: "BoBe",
        line: "a proactive AI companion",
        body: "Notices what you work on, remembers what matters and helps before you ask. Local-first, open source.",
        meta: meta("Rust · Swift", rel.bobe),
        art: await art(`bobe-${mode}.jpg`),
      },
    ],
  ];
  for (const [slug, c] of products) await write(`project-${slug}-${mode}.svg`, productSvg(p, c));
}
console.log("built assets", JSON.stringify(rel));
