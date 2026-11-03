// The story so far, as a short pixel-art film. seek(canvas, t) draws the frame at t seconds, so
// the same code plays live on a page and renders frame by frame to video (tools/render.ts).
// Art is drawn at 320x136 and scaled 3x without smoothing; captions are drawn at full size.
import { W, H, art, g, fade, ease, span } from "./pixel.js";
import * as S from "./scenes.js";

const SCALE = 3;

// Captions are facts: a place or a name, then one plain line.
const SCENES = [
  { len: 6.4, draw: S.thessaloniki, caption: ["Thessaloniki", "Greece"] },
  { len: 5.6, draw: S.firstCode, caption: ["First code", "Android apps, MQTT and ESP8266 boards"] },
  { len: 5.6, draw: S.healthcare, caption: ["VIDAVO", "Software for healthcare"], light: true },
  { len: 5.2, draw: S.lab, caption: ["AcubeSAT", "Flight software lead at SpaceDot"], cut: true },
  { len: 5.6, draw: S.orbit, caption: ["ESA Fly Your Satellite!", "On-board software and image compression"] },
  { len: 6.0, draw: S.ski, caption: ["Microsoft", "Ireland, 2022"], captionAt: 3.9, light: true },
  { len: 5.6, draw: S.coauthor, caption: ["Real-time co-authoring", "Microsoft Supply Chain Center"], light: true },
  { len: 6.0, draw: S.memory, caption: ["Agent memory", "Copilot Studio, patent EP4651035"] },
  { len: 5.4, draw: S.build, caption: ["Build 2024 and 2025", "Agent memory, then multi-agent orchestration, in the keynotes"] },
  { len: 8.6, draw: S.lead, title: ["John Kozaris", "ML lead at Microsoft"] },
];

let at = 0;
for (const s of SCENES) {
  s.from = at;
  at += s.len;
}
export const FILM = { DURATION: at, SCENES };

const FADE = 0.4;

function shadowed(ctx, str, x, y, color, shadow = "rgba(8,8,16,.55)") {
  ctx.fillStyle = shadow;
  ctx.fillText(str, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// Light text with a dark shadow, or on bright scenes dark text with a light one.
function caption(ctx, [head, line], alpha, light) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const shadow = light ? "rgba(255,255,255,.7)" : "rgba(8,8,16,.55)";
  ctx.font = "600 30px Inter";
  shadowed(ctx, head, 36, 62, light ? "#1f2328" : "#fff6ea", shadow);
  ctx.font = "400 17px Inter";
  shadowed(ctx, line, 36, 88, light ? "#3a4048" : "#f3e2cf", shadow);
  ctx.restore();
}

function title(ctx, [name, role], alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.font = "600 46px Inter";
  shadowed(ctx, name, (W * SCALE) / 2, 66, "#fff6ea");
  ctx.font = "400 20px Inter";
  shadowed(ctx, role, (W * SCALE) / 2, 98, "#f3e2cf");
  ctx.restore();
}

export function seek(canvas, t) {
  const i = Math.max(0, SCENES.findIndex((s) => t >= s.from && t < s.from + s.len));
  const scene = SCENES[i === -1 ? SCENES.length - 1 : i];
  const local = Math.min(t - scene.from, scene.len);
  g.clearRect(0, 0, W, H);
  scene.draw(local);
  // Dithered fades between scenes; the lab cuts straight into orbit as the satellite leaves.
  const prev = SCENES[i - 1];
  const fadeIn = i === 0 || prev?.cut ? 0 : 1 - span(local, 0, FADE);
  const fadeOut = scene.cut || i === SCENES.length - 1 ? 0 : span(local, scene.len - FADE, scene.len);
  fade(Math.max(fadeIn, fadeOut));

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art, 0, 0, W * SCALE, H * SCALE);
  if (scene.caption) {
    const from = scene.captionAt ?? 0.7;
    caption(ctx, scene.caption, Math.min(ease(span(local, from, from + 0.6)), 1 - ease(span(local, scene.len - 1.0, scene.len - 0.5))), scene.light);
  }
  if (scene.title) title(ctx, scene.title, ease(span(local, 4.4, 5.2)));
}
