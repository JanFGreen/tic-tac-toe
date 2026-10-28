import { outcome } from './lines';

export type Mark = 'X' | 'O';
export type Cell = Mark | null;
export type CellIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Board = readonly [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

export const emptyBoard: Board = [null, null, null, null, null, null, null, null, null];

const cellIndices: readonly CellIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export type MoveResult =
  | { ok: true; board: Board }
  | { ok: false; reason: 'occupied' | 'round-over' };

export function otherMark(mark: Mark): Mark {
  return mark === 'X' ? 'O' : 'X';
}

export function legalMoves(board: Board): readonly CellIndex[] {
  if (outcome(board).kind !== 'ongoing') return [];
  return cellIndices.filter((cell) => board[cell] === null);
}

export function cellPosition(cell: CellIndex): { row: 1 | 2 | 3; column: 1 | 2 | 3 } {
  const row = cell < 3 ? 1 : cell < 6 ? 2 : 3;
  const column = cell % 3 === 0 ? 1 : cell % 3 === 1 ? 2 : 3;
  return { row, column };
}

export function applyMove(board: Board, cell: CellIndex, mark: Mark): MoveResult {
  if (outcome(board).kind !== 'ongoing') return { ok: false, reason: 'round-over' };
  if (board[cell] !== null) return { ok: false, reason: 'occupied' };
  return { ok: true, board: board.with(cell, mark) as unknown as Board };
}
