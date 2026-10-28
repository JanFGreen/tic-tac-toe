import { describe, expect, it } from 'vitest';
import { applyMove, type Board, type Cell, type CellIndex, cellPosition, emptyBoard, legalMoves, otherMark } from './board';

function boardOf(cells: readonly Cell[]): Board {
  return cells as unknown as Board;
}

const xWins = boardOf(['X', 'X', 'X', 'O', 'O', null, null, null, null]);

describe('otherMark', () => {
  it('swaps X and O', () => {
    expect(otherMark('X')).toBe('O');
    expect(otherMark('O')).toBe('X');
  });
});

describe('applyMove', () => {
  it('places the mark and leaves the input board untouched', () => {
    const result = applyMove(emptyBoard, 4, 'X');
    expect(result).toEqual({ ok: true, board: [null, null, null, null, 'X', null, null, null, null] });
    expect(emptyBoard.every((cell) => cell === null)).toBe(true);
  });

  it('rejects an occupied cell with reason occupied and does not mutate the board', () => {
    const board = boardOf(['X', null, null, null, 'O', null, null, null, null]);
    const snapshot = [...board];
    expect(applyMove(board, 0, 'O')).toEqual({ ok: false, reason: 'occupied' });
    expect(applyMove(board, 4, 'X')).toEqual({ ok: false, reason: 'occupied' });
    expect([...board]).toEqual(snapshot);
  });

  it('rejects any move after a win with reason round-over', () => {
    for (const cell of [5, 6, 7, 8] as const) {
      expect(applyMove(xWins, cell, 'O')).toEqual({ ok: false, reason: 'round-over' });
    }
  });

  it('rejects a move on a drawn board with reason round-over', () => {
    const draw = boardOf(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']);
    expect(applyMove(draw, 0, 'O')).toEqual({ ok: false, reason: 'round-over' });
  });
});

describe('legalMoves', () => {
  it('lists every cell of an empty board in ascending order', () => {
    expect(legalMoves(emptyBoard)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('lists exactly the empty cells in ascending order', () => {
    const board = boardOf(['X', null, 'O', null, 'X', null, null, null, 'O']);
    expect(legalMoves(board)).toEqual([1, 3, 5, 6, 7]);
  });

  it('is empty after a win', () => {
    expect(legalMoves(xWins)).toEqual([]);
  });

  it('is empty on a full board', () => {
    expect(legalMoves(boardOf(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']))).toEqual([]);
  });
});

describe('cellPosition', () => {
  it('maps 0..8 to rows and columns 1..3', () => {
    const cells: readonly CellIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    expect(cells.map(cellPosition)).toEqual([
      { row: 1, column: 1 }, { row: 1, column: 2 }, { row: 1, column: 3 },
      { row: 2, column: 1 }, { row: 2, column: 2 }, { row: 2, column: 3 },
      { row: 3, column: 1 }, { row: 3, column: 2 }, { row: 3, column: 3 },
    ]);
  });
});
