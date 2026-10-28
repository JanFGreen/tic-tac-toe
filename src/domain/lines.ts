import type { Board, CellIndex, Mark } from './board';

export type Line = readonly [CellIndex, CellIndex, CellIndex];

export const winningLines: readonly Line[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export type Outcome =
  | { kind: 'win'; winner: Mark; line: Line }
  | { kind: 'draw' }
  | { kind: 'ongoing' };

export function outcome(board: Board): Outcome {
  for (const line of winningLines) {
    const [a, b, c] = line;
    const mark = board[a];
    if (mark !== null && mark === board[b] && mark === board[c]) {
      return { kind: 'win', winner: mark, line };
    }
  }
  return board.every((cell) => cell !== null) ? { kind: 'draw' } : { kind: 'ongoing' };
}
