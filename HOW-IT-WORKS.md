# How this profile works

- **Pictures.** Every picture is an SVG in `assets/`, drawn by `scripts/` (Bun and TypeScript) in
  [Kodosi](https://github.com/johnkozaris/Kodosi)'s palette. Each one carries small subsets of Inter and
  JetBrains Mono, because an SVG shown as an image can't load fonts. A daily Action redraws them so
  release versions stay current.
- **Motion.** The terminal types once when the page loads, then rests. With reduced motion on, it shows
  the final text at once.
- **Layout.** `<picture>` media queries give phones their own hero and follow your GitHub theme.
- **Connect Four.** A Cloudflare Worker at `play.johnkozaris.com` runs the game (`worker/`). Each column of
  the board is a link: a click drops your piece, Dosi looks five moves ahead and answers, and you land
  back on the profile, whose images now show the new board. One Durable Object holds the shared game.

Run it locally:

```sh
bun install
bun run build          # draw assets/
bun run worker:dev     # the game on localhost:8787
bun run preview        # the profile on localhost:8790, rendered by GitHub's Markdown API
```
