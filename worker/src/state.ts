import { empty, type Board, type Cell } from "./c4";

export type Move = { col: number; row: number; by: Cell; at: number };

export type State = {
  board: Board;
  moves: Move[];
  status: "playing" | "visitors" | "bot" | "draw";
  winLine: number[];
  score: { visitors: number; bot: number; draws: number };
  totalMoves: number;
};

export const fresh = (prev?: State): State => ({
  board: empty(),
  moves: [],
  status: "playing",
  winLine: [],
  score: prev?.score ?? { visitors: 0, bot: 0, draws: 0 },
  totalMoves: prev?.totalMoves ?? 0,
});
