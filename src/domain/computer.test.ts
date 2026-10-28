import { describe, expect, it } from 'vitest';
import { type Board, type Cell, type CellIndex, emptyBoard, legalMoves, type Mark, otherMark } from './board';
import { chooseMove, type Random } from './computer';
import { outcome } from './lines';

function boardOf(cells: readonly Cell[]): Board {
  return cells as unknown as Board;
}

const fixed =
  (value: number): Random =>
  () =>
    value;

const noRandom: Random = () => {
  throw new Error('hard must not use the random source');
};

const sweep = Array.from({ length: 50 }, (_, step) => step / 50);

// X wins at 2 and O wins at 5 (X X _ / O O _ / _ _ _).
const xCanWinAndOThreatens = boardOf(['X', 'X', null, 'O', 'O', null, null, null, null]);
// X cannot win; O threatens to complete 0-1-2 at cell 2.
const oThreatens = boardOf(['O', 'O', null, null, 'X', null, null, null, null]);
// Neither side can win next move.
const quiet = boardOf(['X', null, null, null, 'O', null, null, null, null]);

describe('easy', () => {
  it('reaches every legal cell over a sweep of random values and never an occupied cell', () => {
    const board = boardOf(['X', 'O', null, null, 'X', null, null, null, 'O']);
    const legal = legalMoves(board);
    const chosen = new Set(sweep.map((value) => chooseMove(board, 'O', 'easy', fixed(value))));
    expect([...chosen].sort()).toEqual([...legal].sort());
  });

  it('maps random to the legal move list by index', () => {
    expect(chooseMove(emptyBoard, 'X', 'easy', fixed(0))).toBe(0);
    expect(chooseMove(emptyBoard, 'X', 'easy', fixed(0.999999))).toBe(8);
  });

  it('plays a non-winning cell although a win is available', () => {
    expect(chooseMove(xCanWinAndOThreatens, 'X', 'easy', fixed(0.99))).toBe(8);
  });

  it('plays a non-blocking cell although the opponent threatens', () => {
    expect(chooseMove(oThreatens, 'X', 'easy', fixed(0.99))).toBe(8);
    expect(chooseMove(oThreatens, 'X', 'easy', fixed(0.2))).toBe(3);
  });
});

describe('medium', () => {
  it('plays the winning cell for every random value', () => {
    for (const value of sweep) {
      expect(chooseMove(xCanWinAndOThreatens, 'X', 'medium', fixed(value))).toBe(2);
    }
  });

  it('takes its own win rather than blocking the opponent', () => {
    for (const value of sweep) {
      expect(chooseMove(xCanWinAndOThreatens, 'O', 'medium', fixed(value))).toBe(5);
    }
  });

  it('blocks the opponent immediate win when it cannot win, for every random value', () => {
    for (const value of sweep) {
      expect(chooseMove(oThreatens, 'X', 'medium', fixed(value))).toBe(2);
    }
  });

  it('plays the randomly selected legal cell when there is no win or threat', () => {
    const legal = legalMoves(quiet);
    const chosen = sweep.map((value) => chooseMove(quiet, 'X', 'medium', fixed(value)));
    expect(new Set(chosen)).toEqual(new Set(legal));
    expect(chooseMove(quiet, 'X', 'medium', fixed(0))).toBe(1);
    expect(chooseMove(quiet, 'X', 'medium', fixed(0.999999))).toBe(8);
  });
});

describe('hard', () => {
  it('takes an immediate win', () => {
    expect(chooseMove(xCanWinAndOThreatens, 'X', 'hard', noRandom)).toBe(2);
  });

  it('blocks when it cannot win', () => {
    expect(chooseMove(oThreatens, 'X', 'hard', noRandom)).toBe(2);
  });

  it('takes the immediate win although the opponent also threatens', () => {
    const board = boardOf(['X', 'O', null, 'X', 'O', null, null, null, null]);
    expect(chooseMove(board, 'X', 'hard', noRandom)).toBe(6);
  });

  it('breaks ties on the lowest index', () => {
    expect(chooseMove(emptyBoard, 'X', 'hard', noRandom)).toBe(0);
  });

  it('throws on a finished board', () => {
    const won = boardOf(['X', 'X', 'X', 'O', 'O', null, null, null, null]);
    expect(() => chooseMove(won, 'O', 'hard', noRandom)).toThrow();
    expect(() => chooseMove(won, 'O', 'easy', fixed(0))).toThrow();
  });

  function neverLoses(board: Board, toMove: Mark, computer: Mark): boolean {
    const result = outcome(board);
    if (result.kind === 'win') return result.winner === computer;
    if (result.kind === 'draw') return true;
    if (toMove === computer) {
      const cell = chooseMove(board, computer, 'hard', noRandom);
      return neverLoses(withMark(board, cell, toMove), otherMark(toMove), computer);
    }
    return legalMoves(board).every((cell) =>
      neverLoses(withMark(board, cell, toMove), otherMark(toMove), computer),
    );
  }

  function withMark(board: Board, cell: CellIndex, mark: Mark): Board {
    return board.with(cell, mark) as unknown as Board;
  }

  it('never loses across the full opponent move tree when moving first', () => {
    expect(neverLoses(emptyBoard, 'X', 'X')).toBe(true);
  });

  it('never loses across the full opponent move tree when moving second', () => {
    expect(neverLoses(emptyBoard, 'X', 'O')).toBe(true);
  });
});
