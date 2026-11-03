// The top of the profile: the name, a line, and a few plain facts, set in the same type as the cards.
import { SANS, esc, type Look } from "../shared/theme";
import { wrap, f2, svgDoc } from "./svg";

export const NAME = "John Kozaris";
export const ROLE = "I like building things that sound a bit too ambitious";
export const ABOUT =
  "I invented long-term memory for AI agents, architected a runtime where agents hand work to each other, and led the flight software of a nanosatellite.";

export function heroSvg(l: Look, narrow: boolean): string {
  const W = narrow ? 360 : 860;
  const nameSize = narrow ? 42 : 58;
  const roleSize = narrow ? 18 : 21;
  const aboutSize = narrow ? 15 : 16.5;
  const lead = aboutSize * 1.5;
  const roles = wrap(ROLE, "inter-500", roleSize, narrow ? 280 : 760);
  const lines = wrap(ABOUT, "inter-400", aboutSize, narrow ? 330 : 640);
  const cx = W / 2;
  let y = nameSize * 0.78 + 8;
  let body = `<text x="${cx}" y="${f2(y)}" text-anchor="middle" class="name">${esc(NAME)}</text>`;
  roles.forEach((line, i) => {
    y += i ? roleSize * 1.3 : roleSize + 20;
    body += `<text x="${cx}" y="${f2(y)}" text-anchor="middle" class="role">${esc(line)}</text>`;
  });
  y += 14;
  lines.forEach((line) => {
    y += lead;
    body += `<text x="${cx}" y="${f2(y)}" text-anchor="middle" class="about">${esc(line)}</text>`;
  });
  const H = Math.ceil(y + 18);
  const css =
    `.name{font:600 ${nameSize}px ${SANS};letter-spacing:${f2(-nameSize * 0.03)}px;fill:${l.ink}}` +
    `.role{font:500 ${roleSize}px ${SANS};fill:${l.ink}}` +
    `.about{font:400 ${aboutSize}px ${SANS};fill:${l.muted}}`;
  return svgDoc(W, H, `${NAME}. ${ROLE}. ${ABOUT}`, ["inter-400", "inter-500", "inter-600"], css, body);
}
