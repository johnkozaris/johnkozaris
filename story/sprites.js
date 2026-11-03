// Character sprites, drawn like handheld-RPG trainers: a big head, a short body, outlines tinted
// by material and three tones per material, lit from the top left. Each person has a front, a
// back and a side view, and the side view walks in four frames.
//
// Grid letters are tones, not colours, so one design serves everyone:
//   o hair outline  1 hair dark  2 hair  3 hair light
//   k skin outline  s skin shade  S skin  l skin light  e eye  m mouth  r cheek
//   x top outline   c top shade   C top   K top light
//   y scarf shade   F scarf       G scarf light
//   z legs outline  j legs shade  J legs
//   b shoe          B shoe light
import { px } from "./pixel.js";

// John's curly hair is built from small clumps: a light top, a mid tone, a dark underside.
const HEADS = {
  curly: {
    front: [
      "....oo.oo.ooo...",
      "...o33o32o3322o.",
      "..o322232223222o",
      ".o3222322222322o",
      ".o2223222232222o",
      ".o1222212222122o",
      ".o21SS21SS12SSo.",
      ".k1SSSSSSSSSS1k.",
      "ksSSSSSSSSSSSSsk",
      "ksSSeSSSSSSeSSsk",
      ".ksSeSSSSSSeSsk.",
      "..ksrSSmmSSrsk..",
      "...kksSSSSskk...",
    ],
    back: [
      "....oo.oo.ooo...",
      "...o33o32o3322o.",
      "..o322232223222o",
      ".o3222322222322o",
      ".o2223222232222o",
      ".o2222322222232o",
      ".o2322222322222o",
      ".o2222232222322o",
      "ko122222222221ok",
      "ks1222122212221k",
      ".k1122222222111k",
      "..oo11211121oo..",
      "...kksSSSSskk...",
    ],
    side: [
      "....oo.ooo......",
      "...o33o3322o....",
      "..o322232223o...",
      ".o322232222232o.",
      ".o222322223222o.",
      ".o1222212SSSSko.",
      ".o2232221SSSSSk.",
      ".o22221SSSSSSSk.",
      ".o1222sSSSSSSSSk",
      ".ok11sSSSSSeSSSk",
      "..okksSSSSSeSSk.",
      "...kksSSSSmSSk..",
      "....kkssSSSkk...",
    ],
  },
  short: {
    front: [
      "................",
      ".....oooooo.....",
      "...oo233222oo...",
      "..o2332222222o..",
      ".o232222222222o.",
      ".o222222222221o.",
      ".o2SSS222SSSS2o.",
      ".k1SSSSSSSSSS1k.",
      "ksSSSSSSSSSSSSsk",
      "ksSSeSSSSSSeSSsk",
      ".ksSeSSSSSSeSsk.",
      "..ksrSSmmSSrsk..",
      "...kksSSSSskk...",
    ],
    back: [
      "................",
      ".....oooooo.....",
      "...oo233222oo...",
      "..o2332222222o..",
      ".o232222222222o.",
      ".o222222222221o.",
      ".o222222222221o.",
      ".o222222222221o.",
      "ko222222222221ok",
      "ks1222222222211k",
      ".k1122222222111k",
      "..oo11111111oo..",
      "...kksSSSSskk...",
    ],
    side: [
      "................",
      "....ooooo.......",
      "...o23322oo.....",
      "..o232222222o...",
      ".o2322222222o...",
      ".o22222222SSko..",
      ".o2222222SSSSk..",
      ".o122222SSSSSSk.",
      ".o1222sSSSSSSSSk",
      ".ok11sSSSSSeSSSk",
      "..okksSSSSSeSSk.",
      "...kksSSSSmSSk..",
      "....kkssSSSkk...",
    ],
  },
};
// Long hair: the short cut, falling past the shoulders.
HEADS.long = {
  front: HEADS.short.front.map((r, j) => (j >= 7 ? "o2" + r.slice(2, 14) + "2o" : r)),
  back: HEADS.short.back.map((r, j) => (j >= 8 ? "o2" + r.slice(2, 14).replace(/[ks]/g, "2") + "2o" : r)),
  side: HEADS.short.side.map((r, j) => (j >= 7 ? "o22" + r.slice(3) : r)),
};
// A bun on top of the short cut.
HEADS.bun = {
  front: ["......oooo......", ".....o3322o.....", ...HEADS.short.front.slice(2)],
  back: ["......oooo......", ".....o3322o.....", ...HEADS.short.back.slice(2)],
  side: ["..oooo..........", ".o3322o.........", ...HEADS.short.side.slice(2)],
};

const BODY_FRONT = [
  "...yFFGGFFFFy...",
  "..xKFFFFFFFFcx..",
  ".xKCyFFFFFyCccx.",
  ".xKCCvvFvvCCccx.",
  ".kSxCCvFvVCcxsk.",
  "..kxCCvvvVCcxk..",
  "...xcccccccccx..",
];
const BODY_BACK = [
  "...yFFFFFFFFy...",
  "..xKCCCCCCCCcx..",
  ".xKCCCCCCCCCccx.",
  ".xKCCCCCCCCCccx.",
  ".kSxCCCCCCCCxsk.",
  "..kxCCCCCCCcxk..",
  "...xcccccccccx..",
];
const LEGS_FRONT = ["....zJJJjJJjz...", "....zJJzzJjz....", "....bBBb.bBBb...", ".....bb...bb...."];

const SIDE_BODY = [
  ".....yFFFFy.....",
  "....xKFFGFcx....",
  "...xKCyFFvCcx...",
  "...xKCCvFvCcx...",
  "...xKCCvSkCcx...",
  "....xCCCCCcx....",
  "....xcccccccx...",
];
const SIDE_LEGS = [
  ["....zJJJjJz.....", "....zJJzJJz.....", "....bBBbBBBb....", ".....bb..bbb...."],
  ["...zJJJzzjJz....", "..zJJz....zJJz..", ".bBBb.....bBBb..", "..bb.......bbb.."],
  ["....zJJJjJz.....", ".....zJJJz......", ".....bBBBb......", "......bbbb......"],
  ["...zjJJzzJJz....", "..zjJz....zJJz..", ".bBBb.....bBBb..", "..bb.......bbb.."],
];
const ARM_SWING = [0, 1, 0, -1];

export const LOOKS = {
  john: {
    o: "#1f1510", 1: "#352820", 2: "#4f3b2e", 3: "#77593f",
    k: "#9c5c44", s: "#df9f7a", S: "#f6c6a2", l: "#ffe2cc", e: "#22181a", m: "#c76a56", r: "#f4a48c",
    x: "#47240f", c: "#7c4222", C: "#a35f33", K: "#c88048",
    y: "#bfae86", F: "#f1e8d1", G: "#fffcf2",
    z: "#1c2236", j: "#34405e", J: "#4a5b82", b: "#2a201e", B: "#55463e", v: "#6e7f99", V: "#56647c",
  },
};

// Everyone else: hair colours, skin, top and trousers. Hair shape follows the same design.
const STYLES = ["long", "short", "bun", "short", "long", "short", "bun"];
const PEOPLE = [
  ["#5a2e18", "#7a4426", "#a2643c", "#f8d6b8", "#e2b090", "#a0705a", "#2f62a8", "#3f7fd0", "#6aa0e8", "#222a3c", "#3a4660", "#52648a"],
  ["#141010", "#241c1a", "#3a2e2a", "#cf9268", "#b0724c", "#7a4a34", "#b84f3a", "#e06a50", "#f49276", "#262830", "#3a3e4c", "#525868"],
  ["#8a6a2a", "#c0943e", "#e6c06a", "#f8dcc2", "#e2bea0", "#a8806a", "#3a8a5c", "#52ae78", "#82cc9c", "#222a3c", "#3a4660", "#52648a"],
  ["#3a2214", "#5a3826", "#86563a", "#ecc09a", "#d29e7a", "#9a6a50", "#6c4fa6", "#8f6cc8", "#b394e6", "#262830", "#3a3e4c", "#525868"],
  ["#141010", "#241c1a", "#3a2e2a", "#ad7450", "#8e5a3c", "#5e3a28", "#c0802a", "#e8a040", "#f8c070", "#222a3c", "#3a4660", "#52648a"],
  ["#6e6a66", "#a8a49e", "#d4d0ca", "#f2cbab", "#d8aa8a", "#a07a62", "#2a303c", "#3b4250", "#5a6272", "#1e222c", "#2e3440", "#454c5c"],
  ["#2a1a14", "#463024", "#6a4a38", "#f6c6a2", "#df9f7a", "#9c5c44", "#a8406a", "#d05a8a", "#ec8ab0", "#222a3c", "#3a4660", "#52648a"],
];
PEOPLE.forEach(([o, h1, h2, S, s, k, c, C, K, z, j, J], i) => {
  LOOKS[i] = {
    style: STYLES[i],
    o, 1: o, 2: h1, 3: h2,
    k, s, S, l: S, e: "#22181a", m: "#c07a66", r: "#f0a890",
    x: z, c, C, K, y: c, F: "#f2efe8", G: "#ffffff", v: C, V: c,
    z, j, J, b: "#2a201e", B: "#55463e",
  };
});
LOOKS.john.style = "curly";

function blit(rows, pal, x, y, flip) {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[flip ? row.length - 1 - i : i];
      if (ch !== ".") {
        const c = pal[ch];
        if (c) px(x + i, y + j, c);
      }
    }
  }
}

// who: "john" or a number; (x, y): the point between the feet. dir: front, back, left, right.
// pose: stand | walk | cheer | wave | lift | point | sit | type | ski
export function person(who, x, y, dir = "front", t = 0, pose = "stand") {
  const pal = LOOKS[who];
  const head = HEADS[pal.style];
  const left = Math.round(x - 8);
  const top = Math.round(y - 24);
  if (dir === "front" || dir === "back") {
    const hop = pose === "cheer" ? Math.round(Math.abs(Math.sin(t * 8 + x)) * 2) : 0;
    blit(head[dir], pal, left, top - hop, false);
    blit(dir === "front" ? BODY_FRONT : BODY_BACK, pal, left, top + 13 - hop, false);
    blit(LEGS_FRONT, pal, left, top + 20 - hop, false);
    // Arms go up outside the head's outline: to eye level for a cheer or a wave, to the top of
    // the head for a lift.
    if (pose === "cheer") arms(pal, left, top - hop, 5, [0, 1]);
    if (pose === "lift") arms(pal, left, top, 0, [0, 1]);
    if (pose === "wave") arms(pal, left, top, Math.floor(t * 5) % 2 ? 4 : 7, [1]);
    return;
  }
  const flip = dir === "left";
  const fx = (i) => (flip ? left + 15 - i : left + i); // a column, mirrored when facing left
  if (pose === "sit" || pose === "type") {
    // Seated: the figure drops two pixels, thighs forward, shins down to the floor.
    blit(head.side, pal, left, top + 2, flip);
    blit(SIDE_BODY, pal, left, top + 15, flip);
    blit(SIT_LEGS, pal, left, top + 20, flip);
    if (pose === "type") {
      const tap = Math.floor(t * 9 + x) % 2;
      for (let i = 9; i <= 12; i++) px(fx(i), top + 18, pal.C);
      px(fx(13), top + 18 + tap, pal.S);
    }
    return;
  }
  if (pose === "ski") {
    // Crouched over the skis, poles trailing.
    blit(head.side, pal, left, top + 3, flip);
    blit(SIDE_BODY, pal, left, top + 16, flip);
    blit(SKI_LEGS, pal, left, top + 21, flip);
    for (let i = 0; i < 22; i++) px(flip ? left + 19 - i : left - 4 + i, y, i > 19 ? "#d8463a" : "#c2392f");
    px(fx(18), y - 1, "#c2392f");
    for (let i = 0; i < 8; i++) px(fx(10 - i), top + 17 + Math.round(i * 0.8), "#9aa0ac");
    px(fx(11), top + 17, pal.S);
    return;
  }
  const frame = pose === "walk" ? Math.floor(t * 8) % 4 : 0;
  // The whole figure rises a pixel as the legs pass each other, so nothing comes apart.
  const bob = frame === 2 ? -1 : 0;
  blit(head.side, pal, left, top + bob, flip);
  blit(SIDE_BODY, pal, left, top + 13 + bob, flip);
  const sw = ARM_SWING[frame];
  if (sw) px(fx(8 + sw), top + 17 + bob, pal.S);
  if (pose === "point") {
    for (let i = 10; i <= 13; i++) px(fx(i), top + 15, pal.C);
    px(fx(14), top + 15, pal.S);
    px(fx(14), top + 14, pal.k);
  }
  blit(SIDE_LEGS[frame], pal, left, top + 20 + bob, flip);
}

function arms(pal, left, top, reach, sides) {
  for (const side of sides) {
    const col = (i) => (side ? left + 15 + i : left - i);
    px(col(-1), top + 13, pal.x);
    px(col(0), top + 13, pal.C);
    px(col(1), top + 12, pal.C);
    px(col(2), top + 12, pal.x);
    for (let y = top + reach + 2; y < top + 12; y++) {
      px(col(1), y, pal.C);
      px(col(2), y, pal.x);
    }
    px(col(1), top + reach, pal.S);
    px(col(2), top + reach, pal.k);
    px(col(1), top + reach + 1, pal.S);
    px(col(2), top + reach + 1, pal.s);
  }
}

const SIT_LEGS = ["....zJJJJJJz....", "....zjjjjjJJz...", "..........zJz...", "..........bBBb.."];
const SKI_LEGS = ["....zJJJJz......", "...zJJzJJz......", "...bBBbBBb......"];

// While the camera carries John from one scene to the next, the scenes leave him out and the
// transition draws him once, so he never appears twice.
export const stage = { hideJohn: false };

export const john = (x, y, dir, t, pose) => {
  if (!stage.hideJohn) person("john", x, y, dir, t, pose);
};

// For the sprite sheet page: every view and frame of one person, side by side.
export function sheet(who, x, y, t) {
  person(who, x + 8, y + 24, "front", 0, "stand");
  person(who, x + 28, y + 24, "back", 0, "stand");
  for (let f = 0; f < 4; f++) person(who, x + 48 + f * 20, y + 24, "right", f / 8, "walk");
  person(who, x + 128, y + 24, "left", 0, "stand");
  person(who, x + 148, y + 24, "front", t, "cheer");
  person(who, x + 170, y + 24, "front", 0, "lift");
  person(who, x + 192, y + 24, "back", t, "cheer");
  person(who, x + 212, y + 24, "right", t, "type");
}
