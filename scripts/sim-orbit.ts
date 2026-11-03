// Plays many Orbit runs with simple players, to check how long a run lasts.
//   bun scripts/sim-orbit.ts [runs]
import { step, newRun, CAPS, type Dir, type Run } from "../worker/src/orbit";

const DIRS: Dir[] = ["up", "down", "left", "right"];
const N = Number(process.argv[2] ?? 300);

function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One step of lookahead: keep the battery, stay clear of the swarm, take pickups.
function careful(run: Run, rand: () => number): Dir {
  let best: Dir = "up";
  let bestScore = -Infinity;
  for (const d of DIRS) {
    const next = step(run, d, () => 0.5, 0);
    const gap = next.enemies.reduce((sum, e) => sum + Math.min(4, Math.max(Math.abs(e.x - next.x), Math.abs(e.y - next.y))), 0);
    const caps = CAPS.reduce((sum, c) => sum + next.caps[c], 0);
    const near = next.enemies.filter((e) => Math.max(Math.abs(e.x - next.x), Math.abs(e.y - next.y)) <= 1).length;
    const toPickup = Math.min(...next.pickups.map((p) => Math.abs(p.x - next.x) + Math.abs(p.y - next.y)), 20);
    const score = next.hp * 100 + next.shield * 40 + caps * 60 + next.kills * 3 + gap - near * 25 - toPickup * 6 + rand();
    if (score > bestScore) [best, bestScore] = [d, score];
  }
  return best;
}

function play(policy: (run: Run, rand: () => number) => Dir, seed: number) {
  const rand = mulberry(seed);
  let run = newRun(1, 0);
  while (!run.over && run.tick < 2000) run = step(run, policy(run, rand), rand, 0);
  return run;
}

const policies: Record<string, (run: Run, rand: () => number) => Dir> = {
  random: (_, rand) => DIRS[Math.floor(rand() * 4)],
  careful,
  crowd: (run, rand) => (rand() < 0.6 ? careful(run, rand) : DIRS[Math.floor(rand() * 4)]),
};

for (const [name, policy] of Object.entries(policies)) {
  const runs = Array.from({ length: N }, (_, i) => play(policy, i + 1));
  const ticks = runs.map((r) => r.tick).sort((a, b) => a - b);
  const q = (p: number) => ticks[Math.floor((ticks.length - 1) * p)];
  const kills = runs.reduce((s, r) => s + r.kills, 0) / runs.length;
  const caps = runs.reduce((s, r) => s + CAPS.reduce((c, k) => c + r.caps[k], 0), 0) / runs.length;
  console.log(`${name.padEnd(8)} ticks median ${q(0.5)}, p10 ${q(0.1)}, p90 ${q(0.9)}, max ${ticks.at(-1)}; kills ${kills.toFixed(1)}; capability levels ${caps.toFixed(1)}`);
}
