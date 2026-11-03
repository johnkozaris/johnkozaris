// The people in the film. John is drawn from his avatar: dark curly hair, stubble, a brown coat
// and a cream scarf. Teammates use the same body with their own hair, skin and clothes.
import { rect, px, sprite } from "./pixel.js";

export const JOHN = {
  k: "#1d1411", h: "#3a2820", s: "#d39a70", S: "#ad744f", b: "#5c3e2f", e: "#120d0b",
  w: "#eee3cb", W: "#c8b896", c: "#7b4526", C: "#59301a", L: "#9a5d34", p: "#2a2d38", f: "#141110",
};

const HEAD = {
  john: [
    "...kkhkk....",
    "..khkkkhkk..",
    ".kkkhkkkkhk.",
    ".kkkkkkkkkk.",
    ".kkkkkkssss.",
    "..kkkSssess.",
    "..kkSsssssss",
    "...Sbssssss.",
    "...bbbbbbb..",
    "....bbbbb...",
  ],
  short: [
    "............",
    "...kkkkkk...",
    "..kkkkkkkk..",
    "..kkkkkkkkk.",
    "..kkkkSssss.",
    "..kkkSssess.",
    "..kkSsssssss",
    "...Ssssssss.",
    "...SSssssS..",
    "....SSSSS...",
  ],
  long: [
    "....kkkk....",
    "..kkkkkkkk..",
    ".kkkkkkkkkk.",
    ".kkkkkkkkkk.",
    ".kkkkkSssss.",
    ".kkkkSssess.",
    ".kkkSsssssss",
    ".kkkSssssss.",
    ".kkkSSssssS.",
    ".kkk.SSSSS..",
  ],
  bun: [
    "...kk.......",
    "..kkkkkkk...",
    "..kkkkkkkk..",
    "..kkkkkkkkk.",
    "..kkkkSssss.",
    "..kkkSssess.",
    "..kkSsssssss",
    "...Ssssssss.",
    "...SSssssS..",
    "....SSSSS...",
  ],
  cap: [
    "............",
    "...uuuuuu...",
    "..uuuuuuuu..",
    "..uuuuuuuuuu",
    "..kkkkSssss.",
    "..kkkSssess.",
    "..kkSsssssss",
    "...Ssssssss.",
    "...SSssssS..",
    "....SSSSS...",
  ],
};

const COAT = [
  "....wwwwwW..",
  "...cwwwwWwL.",
  "..ccwWwwcLL.",
  "..cccWwccLL.",
  "..cccwcccLL.",
  "..CccccccLL.",
  "..CcccccccL.",
  "..Ccccccccc.",
];

const SHIRT = [
  "....ttttwT..",
  "...ttttttTL.",
  "..ttttttttL.",
  "..tttttttTL.",
  "..tttttttTL.",
  "..TttttttTL.",
  "..TttttttT..",
  "..Ttttttttt.",
];

const WALK = [
  ["...ppppppp..", "...pp...pp..", "..pp.....pp.", "..pp......pp", ".ff.......ff"],
  ["....pppp....", "....pp.pp...", "....pp.pp...", "....pp.pp...", "....ff.fff.."],
];
const STAND = ["...pppppp...", "...pp..pp...", "...pp..pp...", "...pp..pp...", "...ff..fff.."];
const SIT = ["..pppppppp..", "..pppppppppp", "..........pp", "..........pp", "..........pp", ".........fff"];
const CROUCH = ["...ppppppp..", "..ppp...pp..", ".ff......ff."];

// Teammates: [head, skin, skin shadow, hair, shirt, shirt shadow, trousers]
export const TEAM = [
  ["long", "#e2b08c", "#c08b68", "#6b3d22", "#3f7fbf", "#2f6296", "#2b2f3a"],
  ["short", "#c9875e", "#a66a45", "#1a1412", "#d8664f", "#ad4c3a", "#3a3f4c"],
  ["bun", "#f0c7a4", "#d1a383", "#d9b46a", "#5aa37a", "#3f7f5b", "#2b2f3a"],
  ["cap", "#b97a52", "#956040", "#231916", "#e6c35c", "#bf9d3d", "#353a46", "#7d5cc8"],
  ["short", "#e8bd98", "#c79a78", "#8a5a3a", "#8d6cc4", "#6c4fa0", "#2b2f3a"],
  ["long", "#a86b47", "#87533a", "#141010", "#e08a3c", "#b86c2a", "#3a3f4c"],
];

function look(who) {
  if (who === "john") return { head: HEAD.john, body: COAT, pal: JOHN };
  const [head, s, S, k, t, T, p, u] = TEAM[who];
  return {
    head: HEAD[head],
    body: SHIRT,
    pal: { k, h: k, s, S, b: S, e: "#120d0b", t, T, L: T, w: "#f2efe8", p, f: "#141110", u: u ?? t },
  };
}

// Arms raised, for cheering and for the last scene.
function armsUp(x, top, pal, color, high) {
  const lift = high ? 0 : 2;
  for (let i = 0; i < 6; i++) {
    px(x + 1 - (i > 3 ? 1 : 0), top + 11 - i - lift, color);
    px(x + 10 + (i > 3 ? 1 : 0), top + 11 - i - lift, color);
  }
  px(x, top + 4 - lift, pal.s);
  px(x + 11, top + 4 - lift, pal.s);
}

// pose: walk | stand | sit | type | cheer | ski | point
export function person(who, x, y, t, pose = "stand", flip = false) {
  const { head, body, pal } = look(who);
  const coat = who === "john" ? pal.c : pal.t;
  if (pose === "walk") {
    const frame = Math.floor(t * 8) % 4;
    const top = y - 23 + (frame % 2 ? -1 : 0);
    sprite(head, pal, x, top, flip);
    sprite(body, pal, x, top + 10, flip);
    sprite(WALK[frame % 2], pal, x, top + 18, flip);
    if (who === "john" && frame >= 2) px(x + (flip ? 10 : 1), top + 12, JOHN.W);
    return;
  }
  if (pose === "sit" || pose === "type") {
    const top = y - 24;
    sprite(head, pal, x, top, flip);
    sprite(body, pal, x, top + 10, flip);
    sprite(SIT, pal, x, top + 18, flip);
    if (pose === "type") {
      const tap = Math.floor(t * 9 + x) % 2;
      for (let i = 0; i < 4; i++) px(flip ? x + 1 - i : x + 9 + i, top + 14 + (i === 3 ? tap : 0), coat);
      px(flip ? x - 3 : x + 13, top + 14 + tap, pal.s);
    }
    return;
  }
  if (pose === "ski") {
    const top = y - 21;
    sprite(head, pal, x, top, flip);
    sprite(body, pal, x, top + 10, flip);
    sprite(CROUCH, pal, x, top + 18, flip);
    rect(x - 4, y, 20, 1, "#c2453a");
    px(x + 16, y - 1, "#c2453a");
    for (let i = 0; i < 7; i++) px(x + 10 - i, top + 13 + i, "#8a8f99");
    px(x + 10, top + 13, pal.s);
    return;
  }
  const jump = pose === "cheer" ? Math.round(Math.abs(Math.sin(t * 7 + x)) * 3) : 0;
  const top = y - 23 - jump;
  sprite(head, pal, x, top, flip);
  sprite(body, pal, x, top + 10, flip);
  sprite(STAND, pal, x, top + 18, flip);
  if (pose === "cheer") armsUp(x, top, pal, coat, Math.sin(t * 7 + x) > 0);
  if (pose === "point") {
    for (let i = 0; i < 5; i++) px(flip ? x + 1 - i : x + 10 + i, top + 12 - Math.floor(i / 2), coat);
    px(flip ? x - 4 : x + 15, top + 10, pal.s);
  }
}

export const john = (x, y, t, pose = "walk", flip = false) => person("john", x, y, t, pose, flip);

// A small agent: a dark squircle with a screen face and copper eyes, hovering a little.
export function agent(x, y, t, seed = 0, eye = "#DB8A62", body = "#262c36") {
  const bob = Math.round(Math.sin(t * 3 + seed * 1.7));
  const yy = y + bob;
  rect(x + 1, yy, 8, 8, body);
  rect(x, yy + 1, 10, 6, body);
  rect(x + 1, yy + 1, 7, 1, "#3b4350");
  rect(x + 1, yy + 1, 1, 5, "#3b4350");
  rect(x + 2, yy + 2, 6, 4, "#11151b");
  const blink = (Math.floor(t * 2 + seed * 3.1) % 9) === 0;
  if (!blink) {
    rect(x + 3, yy + 3, 1, 2, eye);
    rect(x + 6, yy + 3, 1, 2, eye);
  }
  px(x + 5, yy - 1, "#4b535d");
  px(x + 5, yy - 2, eye);
  rect(x + 3, yy + 8, 4, 2, body);
  px(x + 2, y + 12, "#1b1f26");
  px(x + 7, y + 12, "#1b1f26");
}
