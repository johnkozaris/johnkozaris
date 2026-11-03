// Renders the film to frames with a headless browser, then encodes them.
//   bun story/render.ts            -> story/out/story.webp (README) and story.mp4 (social)
//   bun story/render.ts --fps 6    -> a quick, small draft
import { chromium } from "playwright";
import { mkdirSync, rmSync, readdirSync } from "node:fs";

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i < 0 ? d : process.argv[i + 1];
};
const root = new URL("..", import.meta.url).pathname;
const out = `${root}story/out`;
const FPS = Number(arg("fps", "12"));
const SERVER = arg("server", "http://localhost:8790");

async function frames(dir: string, fps: number) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 408 } });
  page.on("pageerror", (e) => {
    console.error("page error:", e.message);
    process.exitCode = 1;
  });
  await page.goto(`${SERVER}/story/index.html?t=0`);
  const duration: number = await page.evaluate(() => (window as any).FILM.DURATION);
  const total = Math.round(duration * fps);
  for (let f = 0; f < total; f++) {
    const data: string = await page.evaluate((t) => {
      const c = document.getElementById("film") as HTMLCanvasElement;
      (window as any).seek(t);
      return c.toDataURL("image/png").slice(22);
    }, f / fps);
    await Bun.write(`${dir}/${String(f).padStart(5, "0")}.png`, Buffer.from(data, "base64"));
    if (f % 60 === 0) console.log(`frame ${f}/${total}`);
  }
  await browser.close();
  return total;
}

mkdirSync(out, { recursive: true });
const onlyMp4 = process.argv.includes("--only-mp4");
const webDir = `${out}/frames-${FPS}`;
const n = onlyMp4 ? 0 : await frames(webDir, FPS);
// The README loop: animated WebP, frames chosen lossless or lossy one by one.
if (!onlyMp4) {
  const pngs = readdirSync(webDir).filter((f) => f.endsWith(".png")).sort().map((f) => `${webDir}/${f}`);
  await Bun.$`img2webp -loop 0 -mixed -q 80 -m 6 -d ${Math.round(1000 / FPS)} ${pngs} -o ${out}/story.webp`.quiet();
  console.log(`story.webp: ${n} frames at ${FPS} fps`);
}
if (!process.argv.includes("--no-mp4")) {
  const vidDir = `${out}/frames-30`;
  await frames(vidDir, 30);
  // For LinkedIn and X: doubled with nearest-neighbour so the pixels stay sharp.
  await Bun.$`ffmpeg -v error -y -framerate 30 -i ${vidDir}/%05d.png -vf scale=1920:-2:flags=neighbor -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -movflags +faststart ${out}/story.mp4`;
  console.log("story.mp4 written");
}
