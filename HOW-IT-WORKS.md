# How this profile works

- **The film.** A pixel-art film drawn in code, in `story/`. `seek(t)` draws any moment on a
  320×136 canvas, scaled 3× without smoothing. A headless browser renders it frame by frame
  (`story/render.ts`); the README shows it as an animated WebP, and the same code plays live in
  `story/index.html`.
- **Cards.** Every card is an SVG in `assets/`, drawn by `scripts/` (Bun and TypeScript). Each one
  carries small subsets of Inter and JetBrains Mono, because an SVG shown as an image can't load
  fonts. A daily Action redraws them so release versions stay current.
- **Themes and phones.** `<picture>` sources pick the dark or light version by GitHub theme, and the
  name block has its own phone layout.

Run it locally:

```sh
bun install
bun run build          # draw assets/
bun run preview        # the profile on localhost:8790, rendered by GitHub's Markdown API
bun story/render.ts    # the film: story/out/story.webp and story.mp4
```
