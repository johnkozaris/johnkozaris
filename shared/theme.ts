// Kodosi's palette (clients/macos/DESIGN.md): a warm workbench lit from the top left.
// Terminals and the game board stay dark in both appearances.
import { INTER_400, INTER_500, INTER_600, MONO_400 } from "./fonts.generated";

export type Palette = {
  ground: string;
  surface: string;
  raised: string;
  lifted: string;
  well: string;
  hairline: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  accent: string;
  accentSoft: string;
  ready: string;
  rimLight: string;
  rimDark: string;
  shadow: string;
  shadowOpacity: number;
};

export const dark: Palette = {
  ground: "#110E0C",
  surface: "#181411",
  raised: "#251D19",
  lifted: "#2E241F",
  well: "#0C0A08",
  hairline: "#3B2F29",
  ink: "#F1E9E3",
  inkMuted: "#B3A094",
  inkFaint: "#8C7A6F",
  accent: "#DB8A62",
  accentSoft: "#3E281C",
  ready: "#7DBB99",
  rimLight: "#4A3B33",
  rimDark: "#080605",
  shadow: "#000000",
  shadowOpacity: 0.5,
};

export const light: Palette = {
  ground: "#F0E9DC",
  surface: "#F7F2E8",
  raised: "#FEFBF5",
  lifted: "#FFFDF9",
  well: "#E8E0D2",
  hairline: "#D9CCBA",
  ink: "#25160E",
  inkMuted: "#5F4838",
  inkFaint: "#8A7262",
  accent: "#B85A26",
  accentSoft: "#F4DEC8",
  ready: "#2F7D54",
  rimLight: "#FFFFFF",
  rimDark: "#CDBFAA",
  shadow: "#5F4838",
  shadowOpacity: 0.2,
};

export const terminal = {
  face: "#0D0B09",
  band: "#221A16",
  ink: "#F1E9E3",
  muted: "#B3A094",
  faint: "#8C7A6F",
  accent: "#DB8A62",
  ready: "#7DBB99",
  caution: "#DDB866",
  link: "#8FB6E8",
};

// The profile's own look: GitHub's neutral surfaces, so the pictures sit in the page, with
// Kodosi's copper as the one accent. Two of each, because <picture> picks by GitHub theme.
export type Look = {
  surface: string;
  border: string;
  ink: string;
  muted: string;
  faint: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  agent: string;
  agentEdge: string;
  ok: string;
  onOk: string;
  danger: string;
  dangerSoft: string;
  okSoft: string;
  people: [string, string];
  shadow: string;
};

export const looks: Record<"dark" | "light", Look> = {
  dark: {
    surface: "#151b23",
    border: "#3d444d",
    ink: "#f0f6fc",
    muted: "#9198a1",
    faint: "#6e7681",
    accent: "#DB8A62",
    accentSoft: "#2f221b",
    accentText: "#E9A582",
    agent: "#262c36",
    agentEdge: "#4b535d",
    ok: "#7DBB99",
    onOk: "#0d1117",
    danger: "#E77A75",
    dangerSoft: "#3b1d1d",
    okSoft: "#1c2e25",
    people: ["#6C9BD2", "#B58BD6"],
    shadow: "rgba(1,4,9,.7)",
  },
  light: {
    surface: "#f6f8fa",
    border: "#d1d9e0",
    ink: "#1f2328",
    muted: "#59636e",
    faint: "#818b98",
    accent: "#B85A26",
    accentSoft: "#F8E8DC",
    accentText: "#9C4A1C",
    agent: "#1f2328",
    agentEdge: "#1f2328",
    ok: "#2F7D54",
    onOk: "#ffffff",
    danger: "#B23A32",
    dangerSoft: "#FBE6E4",
    okSoft: "#E3F1E8",
    people: ["#3D72B8", "#8A55B8"],
    shadow: "rgba(31,35,40,.10)",
  },
};

export const SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";

const faces = {
  "inter-400": ["Inter", 400, INTER_400],
  "inter-500": ["Inter", 500, INTER_500],
  "inter-600": ["Inter", 600, INTER_600],
  "mono-400": ["JetBrains Mono", 400, MONO_400],
} as const;

export type FaceName = keyof typeof faces;

// An SVG loaded as an image cannot fetch fonts, so each one carries its own subset.
export function fontFaces(names: FaceName[]): string {
  return names
    .map((n) => {
      const [family, weight, data] = faces[n];
      return `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;src:url(data:font/woff2;base64,${data}) format('woff2')}`;
    })
    .join("");
}

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
