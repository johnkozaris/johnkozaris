// play.johnkozaris.com: Connect Four against a bot, played from the GitHub profile README.
// Everyone who visits plays the same board. Each column in the README is a link here; a click
// drops a piece, the bot answers, and the visitor goes straight back to the profile, whose
// images now show the new board.
import { DurableObject } from "cloudflare:workers";
import { ROWS, COLS, VISITOR, BOT, at, height, winLine, botMove } from "./c4";
import { fresh, type State } from "./state";
import { columnSvg, statusSvg } from "./render";

// BACK_URL is only set by `wrangler dev`, to come back to the local preview.
type Env = { GAME: DurableObjectNamespace<Game>; BACK_URL?: string };

const PROFILE = "https://github.com/johnkozaris";
const BACK = `${PROFILE}#user-content-play`;
const THROTTLE_MS = 1200;

export class Game extends DurableObject<Env> {
  private state: State | null = null;
  private lastByIp = new Map<string, number>();

  private async load(): Promise<State> {
    if (!this.state) this.state = (await this.ctx.storage.get<State>("state")) ?? fresh();
    return this.state;
  }

  async snapshot(): Promise<State> {
    return this.load();
  }

  async move(col: number, ip: string): Promise<void> {
    const now = Date.now();
    if (now - (this.lastByIp.get(ip) ?? 0) < THROTTLE_MS) return;
    this.lastByIp.set(ip, now);
    if (this.lastByIp.size > 5000) this.lastByIp.clear();

    let s = await this.load();
    if (s.status !== "playing") s = fresh(s);
    const row = height(s.board, col);
    if (row === ROWS) return;

    const place = (c: number, r: number, by: 1 | 2): boolean => {
      s.board[at(c, r)] = by;
      s.moves.push({ col: c, row: r, by, at: Date.now() });
      s.totalMoves++;
      const line = winLine(s.board, c, r);
      if (line) {
        s.status = by === VISITOR ? "visitors" : "bot";
        s.winLine = line;
        if (by === VISITOR) s.score.visitors++;
        else s.score.bot++;
        return true;
      }
      if (s.moves.length === COLS * ROWS) {
        s.status = "draw";
        s.score.draws++;
        return true;
      }
      return false;
    };

    if (!place(col, row, VISITOR)) {
      const reply = botMove(s.board, 5, 25_000);
      if (reply >= 0) place(reply, height(s.board, reply), BOT);
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
    const { pathname, searchParams } = new URL(req.url);
    if (req.method !== "GET" && req.method !== "HEAD") return new Response(null, { status: 405 });
    if (pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n");

    const game = env.GAME.getByName("shared");
    let m: RegExpMatchArray | null;

    if ((m = pathname.match(/^\/drop\/([0-6])$/))) {
      await game.move(Number(m[1]), req.headers.get("cf-connecting-ip") ?? "unknown");
      return redirect(env.BACK_URL ?? BACK);
    }
    if ((m = pathname.match(/^\/col\/([0-6])\.svg$/))) {
      return svg(columnSvg(await game.snapshot(), Number(m[1]), Date.now()));
    }
    if (pathname === "/status.svg") return svg(statusSvg(await game.snapshot(), Date.now(), searchParams.has("narrow")));
    if (pathname === "/") return redirect(env.BACK_URL ?? BACK);
    return new Response("Not found", { status: 404 });
  },
};
