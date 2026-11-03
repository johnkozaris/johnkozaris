// Plays thousands of Ship it runs with simple policies, to tune the difficulty.
//   bun scripts/sim-ship.ts [runs]
import { newRun, choose, act, CARDS, LAST_FLOOR, type Run, type CardId } from "../worker/src/ship/engine";

type Policy = (r: Run, rnd: () => number) => { kind: "slot"; slot: number } | { kind: "act" };

const random: Policy = (r, rnd) => {
  const n = r.phase === "fight" ? r.fight!.hand.length : r.reward.length;
  return rnd() < 0.1 ? { kind: "act" } : { kind: "slot", slot: Math.floor(rnd() * n) };
};

// Values a position: how hurt the incident is, how healthy you are.
function value(r: Run): number {
  if (r.phase === "lost") return -1e6;
  if (r.phase === "won") return 1e6;
  if (r.phase === "reward") return 500 + r.hp * 3;
  const e = r.fight!.enemy;
  let v = r.hp * 3 - e.hp * 2 - e.shield;
  if (e.hidden) v -= e.id === "demo" ? 40 : 10;
  v -= r.deck.filter((c) => c === "noise").length * 6;
  if (r.fight!.injected) v -= 8;
  return v + r.memory * 25;
}

const RANK: CardId[] = ["remember", "kill", "parallel", "check", "scoped", "logs", "worktree", "human", "rollback", "bisect", "delete"];

// Looks one click ahead with the real engine and keeps the best outcome.
const greedy: Policy = (r) => {
  if (r.phase === "reward") {
    const checks = r.deck.filter((c) => c === "check").length;
    const ranked = [...r.reward].sort((a, b) => score(b) - score(a));
    function score(c: CardId) {
      if (c === "check" && checks < 2) return 100;
      return 50 - RANK.indexOf(c);
    }
    return { kind: "slot", slot: r.reward.indexOf(ranked[0]) };
  }
  let best: ReturnType<Policy> = { kind: "act" };
  let bestV = value(act(r, 0));
  r.fight!.hand.forEach((_, slot) => {
    const v = value(choose(r, slot, 0));
    if (v > bestV) {
      bestV = v;
      best = { kind: "slot", slot };
    }
  });
  return best;
};

function play(policy: Policy, seed: number): Run {
  let r = newRun(1, seed);
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let i = 0; i < 2000 && (r.phase === "fight" || r.phase === "reward"); i++) {
    const m = policy(r, rnd);
    r = m.kind === "act" ? act(r, 0) : choose(r, m.slot, 0);
  }
  return r;
}

const N = Number(process.argv[2] ?? 3000);
for (const [name, policy] of [["random", random], ["greedy", greedy]] as const) {
  const floors = new Array(LAST_FLOOR + 1).fill(0);
  let wins = 0;
  let turns = 0;
  for (let i = 0; i < N; i++) {
    const r = play(policy, 7919 * (i + 1));
    if (r.phase === "won") wins++;
    else floors[r.floor]++;
    turns += r.turns;
  }
  const died = floors.map((n, f) => (f ? `f${f}:${((100 * n) / N).toFixed(1)}%` : "")).filter(Boolean).join(" ");
  console.log(`${name.padEnd(6)} win ${((100 * wins) / N).toFixed(1)}%  avg clicks ${(turns / N).toFixed(0)}  died at ${died}`);
}
void CARDS;
