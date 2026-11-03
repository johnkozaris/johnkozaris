// The top of the profile: who John is, in his own words, set in the same type as the cards.
import { SANS, esc, type Look } from "../shared/theme";
import { f2, svgDoc } from "./svg";

export const LINES = ["I’m John Kozaris.", "Software engineer. Maker of things.", "Take a look"];

export function heroSvg(l: Look, narrow: boolean): string {
  const W = narrow ? 360 : 860;
  const [name, line, look] = narrow ? [38, 18, 15] : [52, 21, 16.5];
  const cx = W / 2;
  let y = name * 0.78 + 8;
  let body = `<text x="${cx}" y="${f2(y)}" text-anchor="middle" class="name">${esc(LINES[0])}</text>`;
  y += line + 18;
  body += `<text x="${cx}" y="${f2(y)}" text-anchor="middle" class="line">${esc(LINES[1])}</text>`;
  y += look + 14;
  body += `<text x="${cx}" y="${f2(y)}" text-anchor="middle" class="look">${esc(LINES[2])}</text>`;
  const H = Math.ceil(y + 18);
  const css =
    `.name{font:600 ${name}px ${SANS};letter-spacing:${f2(-name * 0.03)}px;fill:${l.ink}}` +
    `.line{font:500 ${line}px ${SANS};fill:${l.ink}}` +
    `.look{font:400 ${look}px ${SANS};fill:${l.muted}}`;
  return svgDoc(W, H, LINES.join(" "), ["inter-400", "inter-500", "inter-600"], css, body);
}
