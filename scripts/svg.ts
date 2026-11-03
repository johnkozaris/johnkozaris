// Drawing helpers shared by the profile's SVGs: text metrics, lit surfaces, Dosi's face.
import * as fontkit from "fontkit";
import { fontFaces, type FaceName, type Palette } from "../shared/theme";

const fonts = new Map<FaceName, any>();
function font(face: FaceName) {
  if (!fonts.has(face)) fonts.set(face, fontkit.openSync(new URL(`../fonts/${face}.woff2`, import.meta.url).pathname));
  return fonts.get(face);
}

// Width of a line of text as the browser will lay it out with the embedded font.
export function measure(text: string, face: FaceName, size: number, tracking = 0): number {
  const f = font(face);
  return (f.layout(text).advanceWidth * size) / f.unitsPerEm + tracking * text.length;
}

// Breaks text into lines that fit `width`.
export function wrap(text: string, face: FaceName, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, face, size) > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export const f2 = (n: number) => Number(n.toFixed(2)).toString();

// The short shadow every raised surface casts, falling down and right (two layers, tight).
export function liftFilter(p: Palette, id = "lift"): string {
  return (
    `<filter id="${id}" x="-10%" y="-10%" width="125%" height="135%">` +
    `<feDropShadow dx="1.5" dy="3" stdDeviation="2.5" flood-color="${p.shadow}" flood-opacity="${p.shadowOpacity}"/>` +
    `<feDropShadow dx=".5" dy="1" stdDeviation=".5" flood-color="${p.shadow}" flood-opacity="${p.shadowOpacity}"/></filter>`
  );
}

// A solid surface lit from the top left: a fine light rim on the top and left edges and a
// dark rim on the bottom and right edges. Needs liftFilter() in the same SVG.
export function surface(p: Palette, x: number, y: number, w: number, h: number, r: number, fill: string, filter = "lift"): string {
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" filter="url(#${filter})"/>` +
    rims(p, x, y, w, h, r)
  );
}

export function rims(p: Palette, x: number, y: number, w: number, h: number, r: number): string {
  const i = 0.75;
  return (
    `<path d="M${f2(x + i)} ${f2(y + h - r)}V${f2(y + r)}A${f2(r - i)} ${f2(r - i)} 0 0 1 ${f2(x + r)} ${f2(y + i)}H${f2(x + w - r)}" stroke="${p.rimLight}" stroke-width="1.5" fill="none" stroke-linecap="round"/>` +
    `<path d="M${f2(x + w - i)} ${f2(y + r)}V${f2(y + h - r)}A${f2(r - i)} ${f2(r - i)} 0 0 1 ${f2(x + w - r)} ${f2(y + h - i)}H${f2(x + r)}" stroke="${p.rimDark}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`
  );
}

// A continuous-corner square (agents, rooms and kinds of things are squircles in Kodosi).
export function squircle(x: number, y: number, s: number): string {
  const h = s / 2;
  const c = h * 0.09;
  return (
    `M${f2(x - h)} ${f2(y)}C${f2(x - h)} ${f2(y - h + c)} ${f2(x - h + c)} ${f2(y - h)} ${f2(x)} ${f2(y - h)}` +
    `C${f2(x + h - c)} ${f2(y - h)} ${f2(x + h)} ${f2(y - h + c)} ${f2(x + h)} ${f2(y)}` +
    `C${f2(x + h)} ${f2(y + h - c)} ${f2(x + h - c)} ${f2(y + h)} ${f2(x)} ${f2(y + h)}` +
    `C${f2(x - h + c)} ${f2(y + h)} ${f2(x - h)} ${f2(y + h - c)} ${f2(x - h)} ${f2(y)}Z`
  );
}

// Dosi: the copper cursor doubled into two eyes on a dark squircle.
export function dosiEyes(x: number, y: number, s: number, color: string): string {
  const ew = s * 0.135;
  const eh = s * 0.29;
  const gap = s * 0.16;
  const eye = (cx: number) =>
    `<rect x="${f2(cx - ew / 2)}" y="${f2(y - eh / 2)}" width="${f2(ew)}" height="${f2(eh)}" rx="${f2(ew * 0.3)}" fill="${color}"/>`;
  return eye(x - gap) + eye(x + gap);
}

export function svgDoc(w: number, h: number, title: string, faces: FaceName[], css: string, body: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title.replace(/"/g, "&quot;")}">` +
    `<title>${title.replace(/</g, "&lt;")}</title>` +
    `<style>${fontFaces(faces)}${css}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>` +
    body +
    `</svg>`
  );
}
