import { type Dispatch, useEffect } from 'react';
import { chooseMove, type Random } from '@/domain/computer';
import type { Session, SessionAction } from '@/domain/session';

type ComputerTurnOptions = { random: Random; thinkingMs: number };

/** After the thinking pause, plays the computer's move; the timer is cleared when the round changes. */
export function useComputerTurn(
  session: Session,
  dispatch: Dispatch<SessionAction>,
  { random, thinkingMs }: ComputerTurnOptions,
): void {
  const { roundId, round, settings } = session;
  const thinking = round.phase === 'computer-thinking';
  const board = round.board;
  const turn = round.phase === 'computer-thinking' ? round.turn : null;
  const { difficulty } = settings;

  useEffect(() => {
    if (!thinking || turn === null) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'computerMove', roundId, cell: chooseMove(board, turn, difficulty, random) });
    }, thinkingMs);
    return () => {
      clearTimeout(timer);
    };
  }, [roundId, thinking, board, turn, difficulty, random, dispatch, thinkingMs]);
}
