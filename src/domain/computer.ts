import { applyMove, type Board, type CellIndex, legalMoves, type Mark, otherMark } from './board';
import type { Difficulty } from './difficulty';
import { outcome } from './lines';

export type Random = () => number;

type Situation = {
  board: Board;
  mark: Mark;
  moves: readonly CellIndex[];
  random: Random;
};

type Strategy = (situation: Situation) => CellIndex;

const winScore = 10;

function place(board: Board, cell: CellIndex, mark: Mark): Board {
  const result = applyMove(board, cell, mark);
  if (!result.ok) throw new Error(`Cannot place ${mark} on cell ${cell}: ${result.reason}`);
  return result.board;
}

function pickRandom({ moves, random }: Situation): CellIndex {
  const cell = moves[Math.floor(random() * moves.length)];
  if (cell === undefined) throw new Error('The random source must return a value in [0, 1)');
  return cell;
}

function completingMove({ board, moves }: Situation, mark: Mark): CellIndex | undefined {
  return moves.find((cell) => outcome(place(board, cell, mark)).kind === 'win');
}

function mediumMove(situation: Situation): CellIndex {
  return (
    completingMove(situation, situation.mark) ??
    completingMove(situation, otherMark(situation.mark)) ??
    pickRandom(situation)
  );
}

// Negamax with alpha-beta: the score is from the view of `toMove`; faster wins and slower losses score higher.
function negamax(board: Board, toMove: Mark, depth: number, window: { alpha: number; beta: number }): number {
  const result = outcome(board);
  if (result.kind === 'win') return depth - winScore;
  if (result.kind === 'draw') return 0;
  let { alpha } = window;
  for (const cell of legalMoves(board)) {
    const score = -negamax(place(board, cell, toMove), otherMark(toMove), depth + 1, {
      alpha: -window.beta,
      beta: -alpha,
    });
    alpha = Math.max(alpha, score);
    if (alpha >= window.beta) break;
  }
  return alpha;
}

function hardMove({ board, mark, moves }: Situation): CellIndex {
  let best: { cell: CellIndex; score: number } | undefined;
  for (const cell of moves) {
    const score = -negamax(place(board, cell, mark), otherMark(mark), 1, {
      alpha: -Infinity,
      beta: Infinity,
    });
    if (best === undefined || score > best.score) best = { cell, score };
  }
  if (best === undefined) throw new Error('No legal move for the computer');
  return best.cell;
}

const strategies: Record<Difficulty, Strategy> = {
  easy: pickRandom,
  medium: mediumMove,
  hard: hardMove,
};

export function chooseMove(board: Board, mark: Mark, difficulty: Difficulty, random: Random): CellIndex {
  const moves = legalMoves(board);
  if (moves.length === 0) throw new Error('The computer cannot move on a finished board');
  return strategies[difficulty]({ board, mark, moves, random });
}
