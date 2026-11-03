// Orbit: a shared game played one step at a time from the GitHub profile README.
// Everyone flies the same CubeSat. Each click moves it one cell; then its capabilities fire on
// their own, the swarm closes in one cell, and new enemies and pickups arrive at the edges.
// The game is a pure function of the state, the move and a random source, so it can be
// simulated for balance (scripts/sim-orbit.ts) and replayed for the board's animation.

export const COLS = 15;
export const ROWS = 9;
export const MAX_HP = 5;
export const MAX_LEVEL = 4;

export type Dir = "up" | "down" | "left" | "right";
export type Cap = "search" | "drones" | "memory" | "tools" | "vision";
export const CAPS: Cap[] = ["search", "drones", "memory", "tools", "vision"];
export type Kind = "debris" | "drone" | "storm";
export type Cell = [number, number];

export type Enemy = { id: number; kind: Kind; x: number; y: number; px: number; py: number; hp: number };
export type Pickup = { x: number; y: number; cap: Cap };

// What happened in the last step, for the board to animate.
export type Event =
  | { t: "zap"; from: Cell; to: Cell }
  | { t: "tool"; from: Cell; to: Cell }
  | { t: "flash"; at: Cell; r: number }
  | { t: "drone"; at: Cell }
  | { t: "boom"; at: Cell; kind: Kind }
  | { t: "hit"; at: Cell }
  | { t: "shield"; at: Cell }
  | { t: "pickup"; at: Cell; cap: Cap }
  | { t: "spawn"; at: Cell };

export type Run = {
  id: number;
  tick: number;
  x: number;
  y: number;
  px: number;
  py: number;
  facing: Dir;
  hp: number;
  shield: number;
  caps: Record<Cap, number>;
  enemies: Enemy[];
  pickups: Pickup[];
  kills: number;
  nextId: number;
  phase: number;
  over: boolean;
  events: Event[];
  at: number;
};

export type Best = { ticks: number; kills: number; at: number };
export type State = { run: Run; best: Best; runs: number; kills: number; moves: number };

const STEP: Record<Dir, Cell> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
// The eight cells around the satellite, clockwise from the top, for the drones' orbit.
const RING: Cell[] = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

const dist = (ax: number, ay: number, bx: number, by: number) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS;

export function newRun(id: number, now: number): Run {
  return {
    id,
    tick: 0,
    x: 7,
    y: 4,
    px: 7,
    py: 4,
    facing: "right",
    hp: MAX_HP,
    shield: 0,
    caps: { search: 1, drones: 0, memory: 0, tools: 0, vision: 0 },
    enemies: [],
    pickups: [],
    kills: 0,
    nextId: 1,
    phase: 0,
    over: false,
    events: [],
    at: now,
  };
}

export const freshState = (now: number): State => ({ run: newRun(1, now), best: { ticks: 0, kills: 0, at: 0 }, runs: 0, kills: 0, moves: 0 });

export function dronesAt(run: Run): Cell[] {
  const n = run.caps.drones;
  if (!n) return [];
  const out: Cell[] = [];
  for (let i = 0; i < n; i++) {
    const [dx, dy] = RING[(run.phase + i * Math.floor(8 / n)) % 8];
    out.push([run.x + dx, run.y + dy]);
  }
  return out;
}

const SEARCH_RANGE = (lvl: number) => 3 + lvl;
const TOOL_RANGE = (lvl: number) => 4 + lvl;
const VISION_EVERY = (lvl: number) => 6 - lvl;
const VISION_RADIUS = (lvl: number) => (lvl >= 3 ? 2 : 1);
const SHIELD_EVERY = 7;

// One step of the game: the satellite moves, fires, the swarm moves, and the edges fill.
export function step(prev: Run, dir: Dir, rand: () => number, now: number): Run {
  const run: Run = structuredClone(prev);
  run.events = [];
  run.at = now;
  const ev = (e: Event) => run.events.push(e);
  const enemyAt = (x: number, y: number) => run.enemies.find((e) => e.hp > 0 && e.x === x && e.y === y);

  const damage = (amount: number) => {
    for (let i = 0; i < amount; i++) {
      if (run.shield > 0) {
        run.shield--;
        ev({ t: "shield", at: [run.x, run.y] });
      } else {
        run.hp--;
        ev({ t: "hit", at: [run.x, run.y] });
      }
    }
  };
  const hurt = (e: Enemy, amount: number) => {
    e.hp -= amount;
    if (e.hp <= 0) {
      run.kills++;
      ev({ t: "boom", at: [e.x, e.y], kind: e.kind });
    }
  };

  // 1. The satellite moves. Flying into an enemy rams it; flying onto a pickup takes it.
  for (const e of run.enemies) [e.px, e.py] = [e.x, e.y];
  [run.px, run.py] = [run.x, run.y];
  run.facing = dir;
  const [dx, dy] = STEP[dir];
  if (inside(run.x + dx, run.y + dy)) [run.x, run.y] = [run.x + dx, run.y + dy];
  const rammed = enemyAt(run.x, run.y);
  if (rammed) {
    damage(rammed.kind === "storm" ? 2 : 1);
    hurt(rammed, rammed.kind === "storm" ? 3 : rammed.hp);
    if (rammed.hp > 0) [run.x, run.y] = [run.px, run.py];
  }
  const pick = run.pickups.findIndex((p) => p.x === run.x && p.y === run.y);
  if (pick >= 0) {
    const { cap } = run.pickups[pick];
    run.pickups.splice(pick, 1);
    run.caps[cap] = Math.min(MAX_LEVEL, run.caps[cap] + 1);
    if (cap === "memory") run.shield = run.caps.memory;
    ev({ t: "pickup", at: [run.x, run.y], cap });
  }

  // 2. Capabilities fire on their own.
  const alive = () => run.enemies.filter((e) => e.hp > 0);
  const nearest = (range: number) =>
    alive()
      .map((e) => ({ e, d: dist(e.x, e.y, run.x, run.y) }))
      .filter(({ d }) => d <= range)
      .sort((a, b) => a.d - b.d || a.e.id - b.e.id)
      .map(({ e }) => e);
  const s = run.caps.search;
  if (s) {
    for (const e of nearest(SEARCH_RANGE(s)).slice(0, s >= 3 ? 2 : 1)) {
      ev({ t: "zap", from: [run.x, run.y], to: [e.x, e.y] });
      hurt(e, s >= 4 ? 2 : 1);
    }
  }
  const tl = run.caps.tools;
  if (tl) {
    const [fx, fy] = STEP[run.facing];
    let [tx, ty] = [run.x, run.y];
    let target: Enemy | undefined;
    for (let i = 0; i < TOOL_RANGE(tl); i++) {
      if (!inside(tx + fx, ty + fy)) break;
      [tx, ty] = [tx + fx, ty + fy];
      target = enemyAt(tx, ty);
      if (target) break;
    }
    if (tx !== run.x || ty !== run.y) ev({ t: "tool", from: [run.x, run.y], to: [tx, ty] });
    if (target) hurt(target, tl);
  }
  const v = run.caps.vision;
  if (v && run.tick % VISION_EVERY(v) === 0) {
    const r = VISION_RADIUS(v);
    ev({ t: "flash", at: [run.x, run.y], r });
    for (const e of alive()) if (dist(e.x, e.y, run.x, run.y) <= r) hurt(e, 1);
  }
  const droneHits = () => {
    for (const [cx, cy] of dronesAt(run)) {
      const e = enemyAt(cx, cy);
      if (e) {
        ev({ t: "drone", at: [cx, cy] });
        hurt(e, 1);
      }
    }
  };
  run.phase = (run.phase + 1) % 8;
  droneHits();

  // 3. The swarm closes in. Debris and storms move like rooks, drones like kings; storms move
  // every other step. An enemy that reaches the satellite hits it, and debris and drones break.
  const moving = alive().sort((a, b) => dist(a.x, a.y, run.x, run.y) - dist(b.x, b.y, run.x, run.y));
  for (const e of moving) {
    if (e.kind === "storm" && run.tick % 2 === 1) continue;
    const ddx = Math.sign(run.x - e.x);
    const ddy = Math.sign(run.y - e.y);
    const options: Cell[] =
      e.kind === "drone"
        ? [[ddx, ddy], [ddx, 0], [0, ddy]]
        : Math.abs(run.x - e.x) >= Math.abs(run.y - e.y)
          ? [[ddx, 0], [0, ddy]]
          : [[0, ddy], [ddx, 0]];
    for (const [ox, oy] of options) {
      if (!ox && !oy) continue;
      const [nx, ny] = [e.x + ox, e.y + oy];
      if (nx === run.x && ny === run.y) {
        damage(e.kind === "storm" ? 2 : 1);
        if (e.kind !== "storm") {
          e.hp = 0;
          ev({ t: "boom", at: [e.x, e.y], kind: e.kind });
        }
        break;
      }
      if (!enemyAt(nx, ny) && !run.pickups.some((p) => p.x === nx && p.y === ny)) {
        [e.x, e.y] = [nx, ny];
        break;
      }
    }
  }
  droneHits();
  run.enemies = run.enemies.filter((e) => e.hp > 0);

  // 4. The shield recharges; the edges fill with new enemies; capabilities drift in.
  if (run.caps.memory && run.shield < run.caps.memory && run.tick % SHIELD_EVERY === SHIELD_EVERY - 1) run.shield++;
  run.tick++;
  const t = run.tick;
  const free = (x: number, y: number) => !enemyAt(x, y) && !(x === run.x && y === run.y) && !run.pickups.some((p) => p.x === x && p.y === y);
  const edgeCell = (): Cell | null => {
    for (let tries = 0; tries < 20; tries++) {
      const side = Math.floor(rand() * 4);
      const along = side < 2 ? Math.floor(rand() * COLS) : Math.floor(rand() * ROWS);
      const cell: Cell = side === 0 ? [along, 0] : side === 1 ? [along, ROWS - 1] : side === 2 ? [0, along] : [COLS - 1, along];
      if (free(...cell) && dist(cell[0], cell[1], run.x, run.y) >= 3) return cell;
    }
    return null;
  };
  const spawn = (kind: Kind) => {
    const cell = edgeCell();
    if (!cell) return;
    const hp = kind === "storm" ? 12 + Math.floor(t / 30) * 4 : kind === "drone" ? 2 : 1;
    run.enemies.push({ id: run.nextId++, kind, x: cell[0], y: cell[1], px: cell[0], py: cell[1], hp });
    ev({ t: "spawn", at: cell });
  };
  const wave = t < 10 ? (t % 2 === 0 ? 1 : 0) : Math.min(4, 1 + Math.floor((t - 10) / 25));
  for (let i = 0; i < wave; i++) spawn(t > 14 && rand() < Math.min(0.45, 0.15 + t / 200) ? "drone" : "debris");
  if (t % 35 === 0) spawn("storm");
  if (t % 6 === 3 && run.pickups.length < 2) {
    const weights: number[] = CAPS.map((c) => (run.caps[c] >= MAX_LEVEL ? 0 : run.caps[c] === 0 ? 3 : 1));
    let roll = rand() * weights.reduce((a, b) => a + b, 0);
    const cap = CAPS.find((_, i) => (roll -= weights[i]) < 0);
    if (cap) {
      for (let tries = 0; tries < 30; tries++) {
        const [x, y] = [1 + Math.floor(rand() * (COLS - 2)), 1 + Math.floor(rand() * (ROWS - 2))];
        if (free(x, y) && dist(x, y, run.x, run.y) >= 3) {
          run.pickups.push({ x, y, cap });
          break;
        }
      }
    }
  }
  if (run.hp <= 0) {
    run.hp = 0;
    run.over = true;
  }
  return run;
}
