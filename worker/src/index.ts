// play.johnkozaris.com: Orbit, played from the GitHub profile README. Everyone flies the same
// CubeSat. Each arrow in the README is a link here; a click moves the satellite one step and the
// visitor goes straight back to the README, whose board image now shows that step.
import { DurableObject } from "cloudflare:workers";
import { freshState, newRun, step, type Dir, type State } from "./orbit";
import { boardSvg } from "./board";

// BACK_URL is only set by `wrangler dev`, to come back to the local preview.
type Env = { GAME: DurableObjectNamespace<Game>; BACK_URL?: string };

// Back to the README on the profile repository's page rather than the profile itself: the repo
// page scrolls to the anchor again once its images have loaded, so the visitor lands on the
// board. On the profile page the images above push the board down after the jump.
const BACK = "https://github.com/johnkozaris/johnkozaris#user-content-orbit";
const THROTTLE_MS = 600;

export class Game extends DurableObject<Env> {
  private state: State | null = null;
  private lastByIp = new Map<string, number>();

  private async load(): Promise<State> {
    if (!this.state) this.state = (await this.ctx.storage.get<State>("state")) ?? freshState(Date.now());
    return this.state;
  }

  async snapshot(): Promise<State> {
    return this.load();
  }

  async move(dir: Dir, ip: string): Promise<void> {
    const now = Date.now();
    if (now - (this.lastByIp.get(ip) ?? 0) < THROTTLE_MS) return;
    this.lastByIp.set(ip, now);
    if (this.lastByIp.size > 5000) this.lastByIp.clear();

    const s = await this.load();
    s.moves++;
    if (s.run.over) {
      s.runs++;
      s.run = newRun(s.run.id + 1, now);
    } else {
      const before = s.run.kills;
      s.run = step(s.run, dir, Math.random, now);
      s.kills += s.run.kills - before;
      if (s.run.tick > s.best.ticks) s.best = { ticks: s.run.tick, kills: s.run.kills, at: now };
    }
    this.state = s;
    await this.ctx.storage.put("state", s);
  }
}

const svg = (body: string) =>
  new Response(body, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "no-cache, no-store, must-revalidate, max-age=0",
      expires: "0",
      "x-robots-tag": "noindex",
    },
  });

const redirect = (to: string) =>
  new Response(null, { status: 302, headers: { location: to, "cache-control": "no-store", "x-robots-tag": "noindex" } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (req.method !== "GET" && req.method !== "HEAD") return new Response(null, { status: 405 });
    if (pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n");

    const game = env.GAME.getByName("orbit");
    const m = pathname.match(/^\/move\/(up|down|left|right)$/);
    if (m) {
      await game.move(m[1] as Dir, req.headers.get("cf-connecting-ip") ?? "unknown");
      return redirect(env.BACK_URL ?? BACK);
    }
    if (pathname === "/board.svg") return svg(boardSvg((await game.snapshot()) as State, Date.now()));
    if (pathname === "/") return redirect(env.BACK_URL ?? BACK);
    return new Response("Not found", { status: 404 });
  },
};
