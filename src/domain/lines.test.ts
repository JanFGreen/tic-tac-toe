import { describe, expect, it } from 'vitest';
import type { Board, Cell, Mark } from './board';
import { type Line, outcome, winningLines } from './lines';

function boardWith(marks: Partial<Record<number, Mark>>): Board {
  const cells: Cell[] = Array.from({ length: 9 }, (_, index) => marks[index] ?? null);
  return cells as unknown as Board;
}

function boardFromLine(line: Line, mark: Mark): Board {
  return boardWith({ [line[0]]: mark, [line[1]]: mark, [line[2]]: mark });
}

describe('winningLines', () => {
  it('has 3 rows, 3 columns and 2 diagonals', () => {
    expect(winningLines).toHaveLength(8);
    expect(new Set(winningLines.map((line) => line.join()))).toHaveLength(8);
  });
});

describe('outcome', () => {
  const marks: Mark[] = ['X', 'O'];
  for (const line of winningLines) {
    for (const mark of marks) {
      it(`reports ${mark} winning on line ${line.join('-')}`, () => {
        expect(outcome(boardFromLine(line, mark))).toEqual({ kind: 'win', winner: mark, line });
      });
    }
  }

  it('is ongoing on an empty board', () => {
    expect(outcome(boardWith({}))).toEqual({ kind: 'ongoing' });
  });

  it('is ongoing on a partial board without a line', () => {
    expect(outcome(boardWith({ 0: 'X', 4: 'O', 8: 'X' }))).toEqual({ kind: 'ongoing' });
  });

  it('is a draw on a full board without a line', () => {
    const board = boardWith({ 0: 'X', 1: 'O', 2: 'X', 3: 'X', 4: 'O', 5: 'O', 6: 'O', 7: 'X', 8: 'X' });
    expect(outcome(board)).toEqual({ kind: 'draw' });
  });

  it('prefers the win when the last move fills the board and completes a line', () => {
    const board = boardWith({ 0: 'X', 1: 'O', 2: 'X', 3: 'O', 4: 'X', 5: 'O', 6: 'O', 7: 'X', 8: 'X' });
    expect(outcome(board)).toEqual({ kind: 'win', winner: 'X', line: [0, 4, 8] });
  });
});
