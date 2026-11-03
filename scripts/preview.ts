// Local preview of the profile: README.md goes through GitHub's own Markdown renderer, so
// what the sanitizer strips is stripped here too, then sits in a mock of the profile page.
//   bun scripts/preview.ts            http://localhost:8790
//   ?w=343                            README column width in px (343 is a phone)
//   ?live=1                           use play.johnkozaris.com instead of wrangler dev
const PORT = 8790;
const root = new URL("..", import.meta.url).pathname;
const token = (await Bun.$`gh auth token`.text()).trim();

let cache = { mtime: 0, html: "" };

async function rendered(): Promise<string> {
  const file = Bun.file(`${root}README.md`);
  const mtime = file.lastModified;
  if (cache.mtime === mtime) return cache.html;
  const res = await fetch("https://api.github.com/markdown", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" },
    body: JSON.stringify({ text: await file.text(), mode: "gfm", context: "johnkozaris/johnkozaris" }),
  });
  if (!res.ok) throw new Error(`markdown API ${res.status}: ${await res.text()}`);
  cache = { mtime, html: await res.text() };
  return cache.html;
}

function localize(html: string, live: boolean): string {
  html = html.replace(/(src|srcset)="https:\/\/camo\.githubusercontent\.com\/[^"]+"([^>]*?)data-canonical-src="([^"]+)"/g, '$1="$3"$2');
  html = html.replace(/https:\/\/github\.com\/johnkozaris\/johnkozaris\/(?:raw|blob)\/(?:HEAD|main)\//g, "/");
  html = html.replace(/https:\/\/raw\.githubusercontent\.com\/johnkozaris\/johnkozaris\/(?:HEAD|main)\//g, "/");
  if (!live) html = html.replaceAll("https://play.johnkozaris.com", "http://localhost:8787");
  return html;
}

const css = await Bun.file(`${root}node_modules/github-markdown-css/github-markdown.css`).text();

function page(body: string, w: number): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preview: github.com/johnkozaris</title><style>${css}
body{margin:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
@media (prefers-color-scheme:dark){body{background:#0d1117}.box{border-color:#3d444d!important}.side .n{color:#f0f6fc!important}.side .l{color:#9198a1!important}}
.wrap{display:flex;gap:24px;justify-content:center;padding:24px 16px}
.note{font:500 13px -apple-system,BlinkMacSystemFont,sans-serif;text-align:center;padding:8px;background:#fff8c5;color:#3b2300;border-bottom:1px solid #d4a72c66}
.side{width:296px;flex:none}.side .a{width:296px;height:296px;border-radius:50%;border:1px solid #d1d9e0}
.side .n{font-size:24px;font-weight:600;color:#1f2328;margin-top:16px}.side .l{color:#59636e;font-size:20px;font-weight:300}
.box{border:1px solid #d1d9e0;border-radius:6px;padding:24px;width:${w}px;box-sizing:content-box}
.box .markdown-body{background:transparent}
/* GitHub hides these links by theme; the preview follows the system setting instead. */
@media (prefers-color-scheme:dark){[href$="#gh-light-mode-only"]{display:none}}
@media (prefers-color-scheme:light){[href$="#gh-dark-mode-only"]{display:none}}
@media (max-width:${w + 400}px){.side{display:none}}
</style></head><body><div class="note">Local preview of github.com/johnkozaris, not published. GitHub renders the README the same way.</div>
<div class="wrap"><div class="side"><img class="a" src="https://avatars.githubusercontent.com/u/11858294?v=4" alt=""><div class="n">John Kozaris</div><div class="l">johnkozaris</div></div>
<div class="box"><article class="markdown-body">${body}</article></div></div></body></html>`;
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/") {
      try {
        const w = Number(url.searchParams.get("w") ?? 870);
        return new Response(page(localize(await rendered(), url.searchParams.has("live")), w), {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      } catch (e) {
        return new Response(String(e), { status: 500 });
      }
    }
    if (url.pathname === "/raw.html") return new Response(await rendered(), { headers: { "content-type": "text/plain" } });
    const file = Bun.file(`${root}${decodeURIComponent(url.pathname).replace(/^\/+/, "").replace(/\.\.+/g, "")}`);
    if (await file.exists()) return new Response(file, { headers: { "cache-control": "no-store" } });
    return new Response("Not found", { status: 404 });
  },
});
console.log(`preview on http://localhost:${PORT}`);
