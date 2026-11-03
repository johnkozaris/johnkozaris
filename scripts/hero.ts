// The top of the profile: the name and one line, set in the same type as the cards.
import { SANS, esc, type Look } from "../shared/theme";
import { wrap, f2, svgDoc } from "./svg";

export const NAME = "John Kozaris";
export const LINE = "I like building things that sound a bit too ambitious";

export function heroSvg(l: Look, narrow: boolean): string {
  const W = narrow ? 360 : 860;
  const nameSize = narrow ? 42 : 58;
  const lineSize = narrow ? 18 : 21;
  const lines = wrap(LINE, "inter-500", lineSize, narrow ? 280 : 760);
  const cx = W / 2;
  let y = nameSize * 0.78 + 8;
  let body = `<text x="${cx}" y="${f2(y)}" text-anchor="middle" class="name">${esc(NAME)}</text>`;
  lines.forEach((line, i) => {
    y += i ? lineSize * 1.3 : lineSize + 20;
    body += `<text x="${cx}" y="${f2(y)}" text-anchor="middle" class="line">${esc(line)}</text>`;
  });
  const H = Math.ceil(y + 18);
  const css =
    `.name{font:600 ${nameSize}px ${SANS};letter-spacing:${f2(-nameSize * 0.03)}px;fill:${l.ink}}` +
    `.line{font:500 ${lineSize}px ${SANS};fill:${l.ink}}`;
  return svgDoc(W, H, `${NAME}. ${LINE}.`, ["inter-500", "inter-600"], css, body);
}
