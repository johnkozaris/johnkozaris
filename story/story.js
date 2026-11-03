// The story so far, as a short pixel-art film. seek(canvas, t) draws the frame at t seconds, so
// the same code plays live on a page and renders frame by frame to video (render.ts).
// Art is drawn at 320x136 and scaled 3x without smoothing; captions are drawn at full size.
import { W, H, art, g, fade, iris, ease, lerp, span } from "./pixel.js";
import { person, stage } from "./sprites.js";
import * as S from "./scenes.js";

const SCALE = 3;

// How each scene hands over to the next:
//   walk  the camera pushes on and John walks into the next scene
//   cut   straight on: the satellite leaves the lab and arrives in orbit
//   down  the camera tilts down from orbit to the ski slope
//   door  the office opens out of the door John goes in by
//   iris  a circle closes on John and opens on him again
// Captions are facts: a place or a name, then one plain line. Each is [from, to, head, line].
const SCENES = [
  { len: 4.0, draw: S.greece, out: "walk", captions: [[0.6, 3.6, "Greece"]] },
  { len: 4.6, draw: S.lab, out: "cut", captions: [[1.2, 4.4, "AcubeSAT", "On-board software team lead at SpaceDot"]] },
  {
    len: 8.6,
    draw: S.orbit,
    out: "down",
    captions: [
      [0.6, 3.0, "ESA Fly Your Satellite!", "C and C++ flight software on FreeRTOS"],
      [4.3, 7.4, "Science payload", "Yeast cells on a chip, imaged and compressed on board"],
    ],
  },
  { len: 7.4, draw: S.ski, out: "door", light: true, captions: [[3.9, 6.9, "Microsoft", "Ireland, 2022"]] },
  { len: 6.4, draw: S.coauthor, out: "walk", light: true, captions: [[1.0, 5.8, "Real-time co-authoring", "Microsoft Supply Chain Center"]] },
  { len: 6.2, draw: S.customers, out: "iris", light: true, captions: [[1.3, 5.6, "With customers", "Solving their problems with AI agents"]] },
  { len: 6.2, draw: S.memory, out: "walk", captions: [[0.7, 5.6, "Agent memory", "Copilot Studio, patent EP4651035"]] },
  { len: 5.6, draw: S.build, out: "iris", captions: [[1.2, 5.0, "Build 2024 and 2025", "In Satya Nadella's keynotes"]] },
  { len: 6.4, draw: S.openSource, out: "walk", captions: [[0.8, 4.8, "Open source", "Kodosi and BoBe"]] },
  { len: 7.4, draw: S.workshop, out: "walk", light: true, captions: [[1.2, 6.6, "Building agents", "Leading a team of seven engineers and scientists"]] },
  { len: 6.0, draw: S.zurich, captions: [[1.3, 5.4, "Zürich"]] },
];

let at = 0;
for (const s of SCENES) {
  s.from = at;
  at += s.len;
}
export const FILM = { DURATION: at, SCENES };

const PUSH = 1.0;
const TILT = 1.0;
const DOOR = 0.8;
const IRIS = 0.5;

const buffer = () => (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(W, H) : Object.assign(document.createElement("canvas"), { width: W, height: H }));
const [bufA, bufB] = [buffer(), buffer()];

// Draws one scene at a moment into a buffer, and passes on what it returns.
function shot(scene, local, buf) {
  g.clearRect(0, 0, W, H);
  const r = scene.draw(local) ?? {};
  const ctx = buf.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(art, 0, 0);
  return r;
}

// A curve from a to b that leaves at speed ma and arrives at speed mb, so John keeps his pace
// through the push.
function hermite(a, b, ma, mb, k) {
  const k2 = k * k;
  const k3 = k2 * k;
  return (2 * k3 - 3 * k2 + 1) * a + (k3 - 2 * k2 + k) * ma + (-2 * k3 + 3 * k2) * b + (k3 - k2) * mb;
}

function transition(prev, scene, local, t) {
  const how = prev?.out;
  if (how === "walk" && local < PUSH) {
    const k = local / PUSH;
    stage.hideJohn = true;
    shot(prev, prev.len + local, bufA);
    shot(scene, local, bufB);
    stage.hideJohn = false;
    const cam = Math.round(ease(k) * W);
    g.clearRect(0, 0, W, H);
    g.drawImage(bufA, -cam, 0);
    g.drawImage(bufB, W - cam, 0);
    const [xa, ya, va] = prev.draw.exit;
    const [xb, yb, vb] = scene.draw.entry;
    const x = hermite(xa, W + xb, va * PUSH, vb * PUSH, k) - ease(k) * W;
    person("john", Math.round(x), Math.round(lerp(ya, yb, ease(k))), "right", t, "walk");
    return true;
  }
  if (how === "down" && local < TILT) {
    const cam = Math.round(ease(local / TILT) * H);
    shot(prev, prev.len + local, bufA);
    shot(scene, local, bufB);
    g.clearRect(0, 0, W, H);
    g.drawImage(bufA, 0, -cam);
    g.drawImage(bufB, 0, H - cam);
    return true;
  }
  if (how === "door" && local < DOOR) {
    const k = ease(local / DOOR);
    const { door } = shot(prev, prev.len + local, bufA);
    shot(scene, local, bufB);
    const [dx, dy, dw, dh] = door;
    const x = Math.round(lerp(dx, 0, k));
    const y = Math.round(lerp(dy, 0, k));
    const w = Math.round(lerp(dw, W, k));
    const h = Math.round(lerp(dh, H, k));
    g.clearRect(0, 0, W, H);
    g.drawImage(bufA, 0, 0);
    g.fillStyle = "#1e2a36";
    g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.drawImage(bufB, x, y, w, h, x, y, w, h);
    return true;
  }
  return false;
}

function shadowed(ctx, str, x, y, color, shadow) {
  ctx.fillStyle = shadow;
  ctx.fillText(str, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// Light text with a dark shadow, or on bright scenes dark text with a light one.
function caption(ctx, head, line, alpha, light) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const shadow = light ? "rgba(255,255,255,.7)" : "rgba(8,8,16,.55)";
  ctx.font = "600 30px Inter";
  shadowed(ctx, head, 36, 62, light ? "#1f2328" : "#fff6ea", shadow);
  if (line) {
    ctx.font = "400 17px Inter";
    shadowed(ctx, line, 36, 88, light ? "#3a4048" : "#f3e2cf", shadow);
  }
  ctx.restore();
}

export function seek(canvas, t) {
  const found = SCENES.findIndex((s) => t >= s.from && t < s.from + s.len);
  const i = found === -1 ? SCENES.length - 1 : found;
  const scene = SCENES[i];
  const prev = SCENES[i - 1];
  const local = Math.min(t - scene.from, scene.len);
  if (!transition(prev, scene, local, t)) {
    g.clearRect(0, 0, W, H);
    scene.draw(local);
  }
  if (scene.out === "iris") {
    const [x, y] = scene.draw.exit;
    const k = ease(span(local, scene.len - IRIS, scene.len));
    if (k > 0) iris(x, y - 12, (1 - k) * Math.hypot(W, H));
  }
  if (prev?.out === "iris") {
    const [x, y] = scene.draw.entry;
    const k = ease(span(local, 0, IRIS));
    if (k < 1) iris(x, y - 12, k * Math.hypot(W, H));
  }
  // The loop comes up out of the dark and goes back into it.
  if (i === 0) fade(1 - span(local, 0, 0.6));
  if (i === SCENES.length - 1) fade(span(local, scene.len - 0.7, scene.len));

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art, 0, 0, W * SCALE, H * SCALE);
  for (const [from, to, head, line] of scene.captions ?? []) {
    const alpha = Math.min(ease(span(local, from, from + 0.6)), 1 - ease(span(local, to - 0.5, to)));
    caption(ctx, head, line, alpha, scene.light);
  }
}
