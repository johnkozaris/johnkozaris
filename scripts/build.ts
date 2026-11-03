// Renders every SVG in assets/. The daily Action runs it with GITHUB_TOKEN to refresh releases.
import { looks } from "../shared/theme";
import { heroSvg } from "./hero";
import { PROOFS, proofSvg, productSvg, repoSvg, type Product, type Repo } from "./cards";

const root = new URL("..", import.meta.url).pathname;
const write = (name: string, svg: string) => Bun.write(`${root}assets/${name}`, svg);
const art = async (name: string) => Buffer.from(await Bun.file(`${root}art/${name}`).bytes()).toString("base64");

const token = process.env.GITHUB_TOKEN ?? (await Bun.$`gh auth token`.text()).trim();

type Release = { tag: string; at: string } | null;

const REPOS = {
  kodosi: ["johnkozaris", "Kodosi"],
  bobe: ["Sombrace", "BoBe"],
  webInteract: ["johnkozaris", "web-interact"],
  plugins: ["johnkozaris", "jko-claude-plugins"],
  tebis: ["johnkozaris", "tebis"],
  home: ["johnkozaris", "mcpHomeManager"],
} as const;

async function releases(): Promise<Record<keyof typeof REPOS, Release>> {
  const fields = Object.entries(REPOS)
    .map(([k, [owner, name]]) => `${k}: repository(owner: "${owner}", name: "${name}") { latestRelease { tagName publishedAt } }`)
    .join(" ");
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "user-agent": "johnkozaris-profile" },
    body: JSON.stringify({ query: `query { ${fields} }` }),
  });
  const { data, errors } = (await res.json()) as any;
  if (errors) throw new Error(JSON.stringify(errors));
  const pick = (r: any): Release => (r.latestRelease ? { tag: r.latestRelease.tagName, at: r.latestRelease.publishedAt } : null);
  return Object.fromEntries(Object.keys(REPOS).map((k) => [k, pick(data[k])])) as Record<keyof typeof REPOS, Release>;
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
const meta = (langs: string, r: Release) => (r ? [langs, `${r.tag}, ${ago(r.at)}`] : [langs]);

for (const [mode, look] of Object.entries(looks)) {
  await write(`hero-wide-${mode}.svg`, heroSvg(look, false));
  await write(`hero-narrow-${mode}.svg`, heroSvg(look, true));
  for (const c of PROOFS) await write(`proof-${c.slug}-${mode}.svg`, proofSvg(look, c));
  const products: Product[] = [
    {
      slug: "kodosi",
      name: "Kodosi",
      line: "terminals, agents and friends. together.",
      body: "People and coding agents working together through shared terminals, rooms and tasks, with end-to-end encryption.",
      meta: meta("Rust, Swift, Qt", rel.kodosi),
      art: await art(`kodosi-${mode}.jpg`),
      href: "https://github.com/johnkozaris/Kodosi",
      alt: "Kodosi: people and coding agents working together through shared terminals, rooms and tasks, with end-to-end encryption.",
    },
    {
      slug: "bobe",
      name: "BoBe",
      line: "",
      body: "A local-first proactive AI companion for macOS, with an iPhone app and an ESP32 body.",
      meta: meta("Rust, Swift", rel.bobe),
      art: await art(`bobe-${mode}.jpg`),
      href: "https://github.com/Sombrace/BoBe",
      alt: "BoBe: a local-first proactive AI companion for macOS, with an iPhone app and an ESP32 body.",
    },
  ];
  const repos: Repo[] = [
    { slug: "web-interact", name: "web-interact", body: "Browser automation CLI for AI agents: navigate, discover, click, fill, screenshot, extract.", meta: meta("TypeScript, Rust", rel.webInteract) },
    { slug: "plugins", name: "jko-claude-plugins", body: "Claude Code plugin marketplace: Rust, ESP32 C++, Python backend, SwiftUI, dead code detection.", meta: meta("Rust, Python", rel.plugins) },
    { slug: "tebis", name: "tebis", body: "Drive AI coding agents running in tmux from Telegram. Rust, single binary, local-only.", meta: meta("Rust", rel.tebis) },
    { slug: "home", name: "mcpHomeManager", body: "Self-hosted MCP gateway for homelab services.", meta: meta("Python", rel.home) },
  ];
  for (const c of repos) await write(`repo-${c.slug}-${mode}.svg`, repoSvg(look, c));
  for (const c of products) await write(`project-${c.slug}-${mode}.svg`, productSvg(look, c));
}
console.log("built assets", JSON.stringify(rel));
