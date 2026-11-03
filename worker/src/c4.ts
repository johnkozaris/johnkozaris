// Connect Four on a 7x6 board. Cell index = col * ROWS + row, row 0 at the bottom.
export const COLS = 7;
export const ROWS = 6;
export const HUMAN = 1;
export const DOSI = 2;

export type Cell = 0 | 1 | 2;
export type Board = Cell[];

export const empty = (): Board => new Array(COLS * ROWS).fill(0);
export const at = (col: number, row: number) => col * ROWS + row;

export function height(board: Board, col: number): number {
  let row = 0;
  while (row < ROWS && board[at(col, row)] !== 0) row++;
  return row;
}

// Every run of four cells, precomputed once.
const WINDOWS: number[][] = [];
for (let c = 0; c < COLS; c++)
  for (let r = 0; r < ROWS; r++)
    for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const ec = c + 3 * dc;
      const er = r + 3 * dr;
      if (ec < 0 || ec >= COLS || er < 0 || er >= ROWS) continue;
      WINDOWS.push([0, 1, 2, 3].map((i) => at(c + i * dc, r + i * dr)));
    }

// The four cells through (col, row) that win for whoever sits there, if any.
export function winLine(board: Board, col: number, row: number): number[] | null {
  const p = board[at(col, row)];
  if (!p) return null;
  for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const line = [at(col, row)];
    for (const s of [1, -1]) {
      let c = col + s * dc;
      let r = row + s * dr;
      while (c >= 0 && c < COLS && r >= 0 && r < ROWS && board[at(c, r)] === p) {
        line.push(at(c, r));
        c += s * dc;
        r += s * dr;
      }
    }
    if (line.length >= 4) return line;
  }
  return null;
}

const ORDER = [3, 2, 4, 1, 5, 0, 6];
const WIN = 1_000_000;

function evaluate(board: Board, me: Cell): number {
  const them = me === HUMAN ? DOSI : HUMAN;
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    const v = board[at(3, r)];
    if (v === me) score += 4;
    else if (v === them) score -= 4;
  }
  for (const w of WINDOWS) {
    let mine = 0;
    let theirs = 0;
    for (const i of w) {
      if (board[i] === me) mine++;
      else if (board[i] === them) theirs++;
    }
    if (theirs === 0) score += mine === 3 ? 40 : mine === 2 ? 6 : mine;
    else if (mine === 0) score -= theirs === 3 ? 48 : theirs === 2 ? 6 : theirs;
  }
  return score;
}

type Search = { nodes: number; budget: number };

function negamax(board: Board, me: Cell, depth: number, alpha: number, beta: number, ply: number, s: Search): number {
  s.nodes++;
  const them = me === HUMAN ? DOSI : HUMAN;
  let any = false;
  for (const col of ORDER) {
    const row = height(board, col);
    if (row === ROWS) continue;
    any = true;
    board[at(col, row)] = me;
    const won = winLine(board, col, row) !== null;
    board[at(col, row)] = 0;
    if (won) return WIN - ply;
  }
  if (!any) return 0;
  if (depth === 0 || s.nodes > s.budget) return evaluate(board, me);
  let best = -Infinity;
  for (const col of ORDER) {
    const row = height(board, col);
    if (row === ROWS) continue;
    board[at(col, row)] = me;
    const v = -negamax(board, them, depth - 1, -beta, -alpha, ply + 1, s);
    board[at(col, row)] = 0;
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

// Dosi looks `depth` moves ahead and picks at random among moves that score the same.
export function dosiMove(board: Board, depth = 6, budget = 60_000, rand = Math.random): number {
  const s: Search = { nodes: 0, budget };
  const scored: [number, number][] = [];
  for (const col of ORDER) {
    const row = height(board, col);
    if (row === ROWS) continue;
    board[at(col, row)] = DOSI;
    const v = winLine(board, col, row) ? WIN : -negamax(board, HUMAN, depth - 1, -Infinity, Infinity, 1, s);
    board[at(col, row)] = 0;
    scored.push([col, v]);
  }
  if (!scored.length) return -1;
  const top = Math.max(...scored.map(([, v]) => v));
  const best = scored.filter(([, v]) => v >= top - (top >= WIN - 100 ? 0 : 2));
  return best[Math.floor(rand() * best.length)][0];
}
