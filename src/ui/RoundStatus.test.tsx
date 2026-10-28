// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { CellIndex } from '@/domain/board';
import { initialSession, type Session, sessionReducer, type Settings } from '@/domain/session';
import { RoundStatus, statusText } from './RoundStatus';

afterEach(cleanup);

const twoPlayers: Settings = { mode: 'two-players', difficulty: 'medium', playerMark: 'X' };
const vsComputer = (playerMark: 'X' | 'O'): Settings => ({ mode: 'computer', difficulty: 'hard', playerMark });

/** Starts the round and places the given cells in turn (both players, two-player mode). */
function played(cells: readonly CellIndex[], session: Session = initialSession(twoPlayers)): Session {
  const started = sessionReducer(session, { type: 'start' });
  return cells.reduce((current, cell) => sessionReducer(current, { type: 'place', cell }), started);
}

describe('statusText headline', () => {
  it('names X at the start and the next player after a move', () => {
    expect(statusText(initialSession(twoPlayers)).headline).toBe('X to move');
    expect(statusText(played([])).headline).toBe('X to move');
    expect(statusText(played([1])).headline).toBe('O to move');
    expect(statusText(played([1, 4])).headline).toBe('X to move');
  });

  it('names O at the start of round 2', () => {
    const round2 = sessionReducer(played([0, 3, 1, 4, 2]), { type: 'newRound' });
    expect(statusText(round2).headline).toBe('O to move');
  });

  it('shows the computer thinking with its mark', () => {
    expect(statusText(played([0], initialSession(vsComputer('X')))).headline).toBe('Computer (O) is thinking…');
    expect(statusText(played([], initialSession(vsComputer('O')))).headline).toBe('Computer (X) is thinking…');
  });

  it('names the player after the computer moves', () => {
    const session = played([0], initialSession(vsComputer('X')));
    const answered = sessionReducer(session, { type: 'computerMove', roundId: session.roundId, cell: 4 });
    expect(statusText(answered).headline).toBe('X to move');
  });

  it('names the winner, X or O', () => {
    expect(statusText(played([0, 3, 1, 4, 2])).headline).toBe('X wins');
    expect(statusText(played([0, 3, 1, 4, 8, 5])).headline).toBe('O wins');
  });

  it('announces a draw', () => {
    expect(statusText(played([0, 1, 2, 4, 3, 5, 7, 6, 8])).headline).toBe('Draw');
  });
});

describe('statusText announcement', () => {
  it('announces the turn before any move', () => {
    expect(statusText(initialSession(twoPlayers)).announcement).toBe('X to move.');
    expect(statusText(played([], initialSession(vsComputer('O')))).announcement).toBe('Computer (X) is thinking.');
  });

  it('announces the move position and the next turn', () => {
    expect(statusText(played([1])).announcement).toBe('X in row 1, column 2. O to move.');
    expect(statusText(played([1, 8])).announcement).toBe('O in row 3, column 3. X to move.');
    expect(statusText(played([0], initialSession(vsComputer('X')))).announcement).toBe(
      'X in row 1, column 1. Computer (O) is thinking.',
    );
  });

  it('announces the computer move', () => {
    const session = played([0], initialSession(vsComputer('X')));
    const answered = sessionReducer(session, { type: 'computerMove', roundId: session.roundId, cell: 4 });
    expect(statusText(answered).announcement).toBe('O in row 2, column 2. X to move.');
  });

  it('announces the last move and the result', () => {
    expect(statusText(played([0, 3, 1, 4, 2])).announcement).toBe('X in row 1, column 3. X wins.');
    expect(statusText(played([0, 3, 1, 4, 8, 5])).announcement).toBe('O in row 2, column 3. O wins.');
    expect(statusText(played([0, 1, 2, 4, 3, 5, 7, 6, 8])).announcement).toBe('X in row 3, column 3. Draw.');
  });
});

describe('RoundStatus', () => {
  it('renders the headline and a polite status region that follows each move', () => {
    const { rerender } = render(<RoundStatus session={played([])} />);
    expect(screen.getByText('X to move')).toBeTruthy();
    const region = screen.getByRole('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toBe('X to move.');

    rerender(<RoundStatus session={played([1])} />);
    expect(screen.getByText('O to move')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('X in row 1, column 2. O to move.');

    rerender(<RoundStatus session={played([0, 3, 1, 4, 8, 5])} />);
    expect(screen.getByText('O wins')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('O in row 2, column 3. O wins.');
  });
});
