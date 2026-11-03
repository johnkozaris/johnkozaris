// The story so far, as a short pixel-art film. seek(canvas, t) draws the frame at t seconds, so
// the same code plays live on a page and renders frame by frame to video (render.ts).
// Art is drawn at 320x136 and scaled 3x without smoothing.
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
// There are no captions: signs, screens, logos and what people say tell where he is.
const SCENES = [
  { len: 4.0, draw: S.greece, out: "walk" },
  { len: 4.6, draw: S.lab, out: "cut" },
  { len: 8.6, draw: S.orbit, out: "down" },
  { len: 7.4, draw: S.ski, out: "door" },
  { len: 6.4, draw: S.coauthor, out: "walk" },
  { len: 6.2, draw: S.customers, out: "iris" },
  { len: 6.2, draw: S.memory, out: "walk" },
  { len: 5.6, draw: S.build, out: "iris" },
  { len: 6.4, draw: S.openSource, out: "walk" },
  { len: 7.4, draw: S.workshop, out: "walk" },
  { len: 6.0, draw: S.zurich },
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
}
