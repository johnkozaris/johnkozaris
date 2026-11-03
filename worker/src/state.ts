import { empty, type Board, type Cell } from "./c4";

export type Move = { col: number; row: number; by: Cell; at: number };

export type State = {
  board: Board;
  moves: Move[];
  status: "playing" | "humans" | "dosi" | "draw";
  winLine: number[];
  score: { humans: number; dosi: number; draws: number };
  totalMoves: number;
};

export const fresh = (prev?: State): State => ({
  board: empty(),
  moves: [],
  status: "playing",
  winLine: [],
  score: prev?.score ?? { humans: 0, dosi: 0, draws: 0 },
  totalMoves: prev?.totalMoves ?? 0,
});
