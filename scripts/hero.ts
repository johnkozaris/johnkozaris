// The top of the profile: the name, set in the same type as the cards.
import { SANS, esc, type Look } from "../shared/theme";
import { f2, svgDoc } from "./svg";

export const NAME = "John Kozaris";

export function heroSvg(l: Look, narrow: boolean): string {
  const W = narrow ? 360 : 860;
  const size = narrow ? 42 : 58;
  const y = size * 0.78 + 8;
  const H = Math.ceil(y + size * 0.22 + 16);
  const body = `<text x="${W / 2}" y="${f2(y)}" text-anchor="middle" class="name">${esc(NAME)}</text>`;
  const css = `.name{font:600 ${size}px ${SANS};letter-spacing:${f2(-size * 0.03)}px;fill:${l.ink}}`;
  return svgDoc(W, H, NAME, ["inter-600"], css, body);
}
