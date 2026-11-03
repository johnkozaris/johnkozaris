// Ship it: a deckbuilder about running agents in production, played one card per click.
// Pure and deterministic (seeded), so a run can be stored as JSON and simulated in bulk.
//
// Each turn you hold three cards and play one; then the incident acts on its shown intent.
// Beat six incidents to ship. The last one is The Demo, which looks great until you check.

export type CardId =
  | "run"
  | "test"
  | "check"
  | "retry"
  | "context"
  | "noise"
  | "worktree"
  | "logs"
  | "scoped"
  | "rollback"
  | "bisect"
  | "human"
  | "remember"
  | "parallel"
  | "delete"
  | "kill";

export type Card = {
  name: string;
  kind: "attack" | "skill" | "junk";
  rarity: "starter" | "common" | "rare" | "junk";
  text: (r: Run) => string;
  lesson?: string;
};

const atk = (n: number, r: Run) => n + r.memory;

export const CARDS: Record<CardId, Card> = {
  run: { name: "Let it run", kind: "attack", rarity: "starter", text: (r) => `Deal ${atk(7, r)}.` },
  test: { name: "Write a test", kind: "skill", rarity: "starter", text: () => "Gain 7 cover." },
  check: {
    name: "Check what it did",
    kind: "attack",
    rarity: "starter",
    text: (r) => `Deal ${atk(5, r)}. Strip whatever the incident hides behind.`,
    lesson: "Demos lie. Check.",
  },
  retry: {
    name: "Retry",
    kind: "attack",
    rarity: "starter",
    text: (r) => `Deal ${atk(12, r)}. It ran twice: lose 3 uptime.`,
    lesson: "Retries have side effects.",
  },
  context: {
    name: "More context",
    kind: "attack",
    rarity: "starter",
    text: (r) => `Deal ${atk(9, r)}. Add 2 Noise to your deck.`,
    lesson: "More context is not more help.",
  },
  noise: { name: "Noise", kind: "junk", rarity: "junk", text: () => "Read 40 files. Nothing happens. Leaves your deck." },
  worktree: {
    name: "Worktree",
    kind: "skill",
    rarity: "common",
    text: () => "Gain 8 cover. Merge conflicts hit once this fight.",
    lesson: "One agent, one worktree.",
  },
  logs: { name: "Read the logs", kind: "attack", rarity: "common", text: (r) => `Deal ${atk(6, r)}. Gain 4 cover.` },
  scoped: {
    name: "Scoped key",
    kind: "skill",
    rarity: "common",
    text: () => "Gain 10 cover. Injections can't escalate this fight.",
    lesson: "Give agents scoped keys, not yours.",
  },
  rollback: { name: "Rollback", kind: "skill", rarity: "common", text: () => "Heal 10. Once per fight." },
  bisect: { name: "git bisect", kind: "attack", rarity: "common", text: (r) => `Deal ${3 + r.memory} for each turn of this fight.` },
  human: {
    name: "Ask a human",
    kind: "skill",
    rarity: "common",
    text: () => "Gain 4 cover. After the incident acts, deal 18.",
  },
  remember: {
    name: "Write it down",
    kind: "skill",
    rarity: "rare",
    text: () => "Every attack deals 2 more for the rest of the run. Leaves your deck.",
    lesson: "Don't let the model hold the only copy.",
  },
  parallel: { name: "Parallel agents", kind: "attack", rarity: "rare", text: (r) => `Deal ${atk(4, r)} three times.` },
  delete: {
    name: "Delete the failing test",
    kind: "attack",
    rarity: "rare",
    text: (r) => `Deal ${atk(16, r)}. Lose 5 max uptime.`,
    lesson: "Green CI, broken product.",
  },
  kill: { name: "kill -9", kind: "attack", rarity: "rare", text: (r) => `Deal ${atk(20, r)}. Once per fight.` },
};

export const STARTER: CardId[] = ["run", "run", "run", "run", "test", "test", "test", "check", "retry", "context"];
const COMMON: CardId[] = ["worktree", "logs", "scoped", "rollback", "bisect", "human", "check"];
const RARE: CardId[] = ["remember", "parallel", "delete", "kill"];

export type Intent =
  | { kind: "attack"; dmg: number; times: number; label: string }
  | { kind: "shield"; amount: number; label: string }
  | { kind: "heal"; amount: number; label: string }
  | { kind: "inject"; label: string }
  | { kind: "polish"; label: string }
  | { kind: "idle"; label: string };

export type EnemyId = "flaky" | "typo" | "envvar" | "merge" | "inject" | "halluc" | "leak" | "pager" | "deps" | "demo";

export type EnemyDef = { name: string; hp: number; blurb: string; next: (e: Enemy, f: Fight, rnd: () => number) => Intent };

export type Enemy = { id: EnemyId; hp: number; maxHp: number; shield: number; turn: number; hidden: boolean; intent: Intent };

const hit = (dmg: number, label: string, times = 1): Intent => ({ kind: "attack", dmg, times, label });

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  flaky: {
    name: "Flaky Test",
    hp: 18,
    blurb: "Fails when it feels like it.",
    next: (_e, _f, rnd) => {
      const x = rnd();
      return x < 0.5 ? hit(6, "Fails in CI") : x < 0.75 ? hit(3, "Fails twice", 2) : { kind: "idle", label: "Passes this time" };
    },
  },
  typo: {
    name: "Typo in Prod",
    hp: 16,
    blurb: "One character, every request.",
    next: (e) => (e.turn % 3 === 2 ? { kind: "heal", amount: 5, label: "Someone hotfixes it wrong" } : hit(5, "Every request 500s")),
  },
  envvar: {
    name: "Missing Env Var",
    hp: 20,
    blurb: "Works on every machine but this one.",
    next: (e) => hit(2 + e.turn, "Crash loop"),
  },
  merge: {
    name: "Merge Conflict",
    hp: 28,
    blurb: "Two agents, one file.",
    next: (e, f) => (e.turn % 3 === 2 ? { kind: "shield", amount: 6, label: "Rebases" } : hit(4, "Both agents push", f.worktree ? 1 : 2)),
  },
  inject: {
    name: "Prompt Injection",
    hp: 26,
    blurb: "A README that gives orders.",
    next: (e, f) => (e.turn % 2 === 0 ? { kind: "inject", label: "Hides an instruction" } : hit(f.scoped ? 0 : 10, f.scoped ? "Tries to escalate" : "Escalates")),
  },
  halluc: {
    name: "Hallucinated API",
    hp: 26,
    blurb: "Calls an endpoint that never existed.",
    next: (e) => (e.turn % 2 === 0 ? hit(6, "Returns 200 anyway") : { kind: "shield", amount: 5, label: "Invents a v2" }),
  },
  leak: {
    name: "Memory Leak",
    hp: 30,
    blurb: "Fine for an hour.",
    next: (e) => hit(1 + 2 * e.turn, "Swaps harder"),
  },
  pager: {
    name: "Pager at 3 a.m.",
    hp: 40,
    blurb: "Nobody is awake but you.",
    next: (e) => (e.turn % 3 === 2 ? hit(13, "Wakes everyone up") : hit(3, "Rings")),
  },
  deps: {
    name: "Dependency Hell",
    hp: 42,
    blurb: "A patch release with a breaking change.",
    next: (e) => (e.turn % 2 === 0 ? { kind: "shield", amount: 8, label: "Pins a version" } : hit(10, "Breaks the build")),
  },
  demo: {
    name: "The Demo",
    hp: 56,
    blurb: "Looks great. Has never seen production.",
    next: (e) => {
      const cycle: Intent[] = [
        hit(9, "Live audience"),
        { kind: "heal", amount: 6, label: "Applause" },
        hit(11, "Works on my machine"),
        hit(9, "Takes questions"),
        { kind: "polish", label: "Polishes the slides" },
      ];
      return cycle[e.turn % cycle.length];
    },
  },
};

const FLOORS: EnemyId[][] = [["flaky", "typo", "envvar"], ["flaky", "typo", "envvar"], ["merge", "inject", "halluc", "leak"], ["merge", "inject", "halluc", "leak"], ["pager", "deps"], ["demo"]];
export const LAST_FLOOR = FLOORS.length;

export type Fight = {
  enemy: Enemy;
  hand: CardId[];
  draw: CardId[];
  discard: CardId[];
  cover: number;
  turn: number;
  worktree: boolean;
  scoped: boolean;
  injected: boolean;
  delayed: number;
};

export type Event = { text: string; tone: "you" | "them" | "good" | "bad" | "info" };

export type Run = {
  id: number;
  floor: number;
  hp: number;
  maxHp: number;
  deck: CardId[];
  memory: number;
  rng: number;
  phase: "fight" | "reward" | "won" | "lost";
  fight: Fight | null;
  reward: CardId[];
  turns: number;
  log: Event[];
  // What changed on the last click, so the pictures can animate it once.
  last: { at: number; dealt: number; took: number; healed: number; enemyHpBefore: number; hpBefore: number; drew: boolean } | null;
};

// mulberry32: small, seedable, good enough for shuffles.
function rand(r: Run): number {
  let t = (r.rng = (r.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffle<T>(r: Run, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(r) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const say = (r: Run, text: string, tone: Event["tone"]) => {
  r.log = [...r.log, { text, tone }].slice(-4);
};

export function newRun(id: number, seed: number): Run {
  const r: Run = {
    id,
    floor: 1,
    hp: 60,
    maxHp: 60,
    deck: [...STARTER],
    memory: 0,
    rng: seed | 0,
    phase: "fight",
    fight: null,
    reward: [],
    turns: 0,
    log: [],
    last: null,
  };
  startFight(r);
  return r;
}

function startFight(r: Run) {
  const pool = FLOORS[r.floor - 1];
  const id = pool[Math.floor(rand(r) * pool.length)];
  const def = ENEMIES[id];
  const enemy: Enemy = { id, hp: def.hp, maxHp: def.hp, shield: 0, turn: 0, hidden: id === "demo" || id === "halluc", intent: { kind: "idle", label: "" } };
  const f: Fight = { enemy, hand: [], draw: shuffle(r, r.deck), discard: [], cover: 0, turn: 1, worktree: false, scoped: false, injected: false, delayed: 0 };
  r.fight = f;
  r.phase = "fight";
  enemy.intent = def.next(enemy, f, () => rand(r));
  drawHand(r);
  say(r, `Floor ${r.floor}: ${def.name}. ${def.blurb}`, "info");
}

function drawHand(r: Run) {
  const f = r.fight!;
  f.hand = [];
  while (f.hand.length < 3) {
    if (!f.draw.length) {
      if (!f.discard.length) break;
      f.draw = shuffle(r, f.discard);
      f.discard = [];
    }
    f.hand.push(f.draw.pop()!);
  }
}

// Damage to the incident, after its shield and what it hides behind.
function deal(r: Run, raw: number): number {
  const e = r.fight!.enemy;
  if (e.hidden && e.id === "demo") return 0;
  let n = e.hidden ? Math.floor(raw / 2) : raw;
  const absorbed = Math.min(e.shield, n);
  e.shield -= absorbed;
  n -= absorbed;
  e.hp = Math.max(0, e.hp - n);
  return n;
}

function loseUptime(r: Run, n: number) {
  r.hp = Math.max(0, r.hp - n);
}

function playCard(r: Run, card: CardId, stats: { dealt: number; took: number; healed: number }) {
  const f = r.fight!;
  const e = f.enemy;
  const name = CARDS[card].name;
  if (f.injected && card !== "scoped" && card !== "check") {
    f.injected = false;
    say(r, `${name} followed the hidden instruction instead. Nothing happened.`, "bad");
    return;
  }
  f.injected = false;
  const d = (n: number) => {
    const done = deal(r, n + r.memory);
    stats.dealt += done;
    return done;
  };
  switch (card) {
    case "run":
      say(r, `Let it run: ${d(7)} damage.`, "you");
      break;
    case "test":
      f.cover += 7;
      say(r, "Wrote a test: 7 cover.", "you");
      break;
    case "check": {
      const was = e.hidden;
      e.hidden = false;
      const n = d(5);
      say(r, was ? `Checked what it did. ${ENEMIES[e.id].name} has nothing to hide behind now. ${n} damage.` : `Checked: ${n} damage.`, was ? "good" : "you");
      break;
    }
    case "retry": {
      const n = d(12);
      loseUptime(r, 3);
      stats.took += 3;
      say(r, `Retry: ${n} damage. It ran twice, so you lost 3 uptime.`, "you");
      break;
    }
    case "context":
      say(r, `More context: ${d(9)} damage. 2 Noise went into your deck.`, "you");
      r.deck.push("noise", "noise");
      f.discard.push("noise", "noise");
      break;
    case "noise":
      r.deck.splice(r.deck.indexOf("noise"), 1);
      say(r, "Read 40 files. Nothing happened, but the Noise is gone.", "bad");
      return;
    case "worktree":
      f.cover += 8;
      f.worktree = true;
      say(r, "Worktree: 8 cover, and each agent gets its own files.", "you");
      break;
    case "logs": {
      const n = d(6);
      f.cover += 4;
      say(r, `Read the logs: ${n} damage, 4 cover.`, "you");
      break;
    }
    case "scoped":
      f.cover += 10;
      f.scoped = true;
      say(r, "Scoped key: 10 cover. Nothing can escalate this fight.", "you");
      break;
    case "rollback": {
      const before = r.hp;
      r.hp = Math.min(r.maxHp, r.hp + 10);
      stats.healed += r.hp - before;
      say(r, `Rollback: healed ${r.hp - before}.`, "good");
      break;
    }
    case "bisect": {
      const n = deal(r, (3 + r.memory) * f.turn);
      stats.dealt += n;
      say(r, `git bisect, turn ${f.turn}: ${n} damage.`, "you");
      break;
    }
    case "human":
      f.cover += 4;
      f.delayed += 18;
      say(r, "Asked a human: 4 cover now, and an answer after the incident acts.", "you");
      break;
    case "remember":
      r.memory += 2;
      r.deck.splice(r.deck.indexOf("remember"), 1);
      say(r, "Wrote it down. Every attack deals 2 more for the rest of the run.", "good");
      return;
    case "parallel": {
      let n = 0;
      for (let i = 0; i < 3; i++) n += d(4);
      say(r, `Parallel agents: ${n} damage.`, "you");
      break;
    }
    case "delete":
      say(r, `Deleted the failing test: ${d(16)} damage. CI is green. Max uptime −5.`, "bad");
      r.maxHp -= 5;
      r.hp = Math.min(r.hp, r.maxHp);
      break;
    case "kill":
      say(r, `kill -9: ${d(20)} damage.`, "you");
      break;
  }
}

function enemyActs(r: Run, stats: { dealt: number; took: number; healed: number }) {
  const f = r.fight!;
  const e = f.enemy;
  const name = ENEMIES[e.id].name;
  const it = e.intent;
  switch (it.kind) {
    case "attack": {
      // Worktree and Scoped key count from the turn they are played.
      const times = e.id === "merge" && f.worktree ? 1 : it.times;
      const dmg = e.id === "inject" && f.scoped ? 0 : it.dmg;
      let total = 0;
      for (let i = 0; i < times; i++) {
        const blocked = Math.min(f.cover, dmg);
        f.cover -= blocked;
        total += dmg - blocked;
      }
      loseUptime(r, total);
      stats.took += total;
      if (dmg === 0) say(r, `${name} ${it.label.toLowerCase()}, but the key is scoped.`, "good");
      else say(r, `${name}: ${it.label.toLowerCase()}. ${total ? `You lost ${total} uptime.` : "Your cover held."}`, total ? "them" : "good");
      break;
    }
    case "shield":
      e.shield += it.amount;
      say(r, `${name} ${it.label.toLowerCase()}: shield ${it.amount}.`, "them");
      break;
    case "heal":
      e.hp = Math.min(e.maxHp, e.hp + it.amount);
      say(r, `${name}: ${it.label.toLowerCase()}. Healed ${it.amount}.`, "them");
      break;
    case "inject":
      if (f.scoped) say(r, `${name} hides an instruction. Your scoped key ignores it.`, "good");
      else {
        f.injected = true;
        say(r, `${name} hid an instruction. Your next card does nothing, unless it's a Scoped key or a check.`, "them");
      }
      break;
    case "polish":
      e.hidden = true;
      say(r, `${name} polished the slides. It looks great again.`, "them");
      break;
    case "idle":
      say(r, `${name}: ${it.label.toLowerCase()}.`, "info");
      break;
  }
  if (f.delayed && e.hp > 0) {
    const n = deal(r, f.delayed);
    stats.dealt += n;
    f.delayed = 0;
    say(r, `A human answered: ${n} damage.`, "good");
  }
}

// After a card or a revert: the incident acts, cover fades, a new hand is drawn.
function endTurn(r: Run, stats: { dealt: number; took: number; healed: number }) {
  const f = r.fight!;
  if (f.enemy.hp > 0) enemyActs(r, stats);
  if (r.hp <= 0) {
    r.phase = "lost";
    say(r, `Production is down on floor ${r.floor}. The run is over.`, "bad");
    return;
  }
  if (f.enemy.hp <= 0) return winFight(r);
  f.cover = 0;
  f.turn++;
  f.enemy.turn++;
  f.discard.push(...f.hand);
  f.enemy.intent = ENEMIES[f.enemy.id].next(f.enemy, f, () => rand(r));
  drawHand(r);
}

function winFight(r: Run) {
  const f = r.fight!;
  say(r, `${ENEMIES[f.enemy.id].name} is fixed.`, "good");
  if (r.floor === LAST_FLOOR) {
    r.phase = "won";
    say(r, "Shipped. The Demo met production and production won.", "good");
    return;
  }
  r.hp = Math.min(r.maxHp, r.hp + 6);
  r.phase = "reward";
  r.reward = rewards(r);
}

function rewards(r: Run): CardId[] {
  const out: CardId[] = [];
  while (out.length < 3) {
    const pool = rand(r) < 0.28 ? RARE : COMMON;
    const c = pool[Math.floor(rand(r) * pool.length)];
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

function stamp(r: Run, now: number, stats: { dealt: number; took: number; healed: number }, enemyHpBefore: number, hpBefore: number) {
  r.last = { at: now, ...stats, enemyHpBefore, hpBefore, drew: r.phase === "fight" };
}

// A click on one of the three slots: play that card, or take that reward.
export function choose(r: Run, slot: number, now = Date.now()): Run {
  r = structuredClone(r);
  const stats = { dealt: 0, took: 0, healed: 0 };
  const enemyHpBefore = r.fight?.enemy.hp ?? 0;
  const hpBefore = r.hp;
  if (r.phase === "fight") {
    const f = r.fight!;
    const card = f.hand[slot];
    if (!card) return r;
    f.hand.splice(slot, 1);
    r.turns++;
    playCard(r, card, stats);
    // Noise and Write it down leave the deck; once-per-fight cards sit out the rest of the fight.
    if (!["noise", "remember", "rollback", "kill"].includes(card)) f.discard.push(card);
    if (f.enemy.hp <= 0) winFight(r);
    else endTurn(r, stats);
  } else if (r.phase === "reward") {
    const card = r.reward[slot];
    if (!card) return r;
    r.deck.push(card);
    say(r, `Added ${CARDS[card].name} to your deck.`, "info");
    r.floor++;
    startFight(r);
  } else return r;
  stamp(r, now, stats, enemyHpBefore, hpBefore);
  return r;
}

// The button under the cards: revert the hand, skip a reward, or nothing once the run ends.
export function act(r: Run, now = Date.now()): Run {
  r = structuredClone(r);
  const stats = { dealt: 0, took: 0, healed: 0 };
  const enemyHpBefore = r.fight?.enemy.hp ?? 0;
  const hpBefore = r.hp;
  if (r.phase === "fight") {
    r.turns++;
    say(r, "Reverted. New hand, but the incident still gets its turn.", "info");
    r.fight!.injected = false;
    endTurn(r, stats);
  } else if (r.phase === "reward") {
    const before = r.hp;
    r.hp = Math.min(r.maxHp, r.hp + 12);
    stats.healed = r.hp - before;
    say(r, `Skipped the card and rested: healed ${stats.healed}.`, "good");
    r.floor++;
    startFight(r);
  } else return r;
  stamp(r, now, stats, enemyHpBefore, hpBefore);
  return r;
}
