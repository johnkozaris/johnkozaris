// Text layout from the embedded fonts' advance widths (no kerning), for code that can't load fontkit.
import { ADVANCE } from "./metrics.generated";
import type { FaceName } from "./theme";

export function textWidth(text: string, face: FaceName, size: number): number {
  const table = ADVANCE[face];
  let w = 0;
  for (const c of text) w += table[c] ?? 600;
  return (w * size) / 1000;
}

export function wrapText(text: string, face: FaceName, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, face, size) > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
