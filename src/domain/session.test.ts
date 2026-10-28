import { describe, expect, it } from 'vitest';
import type { CellIndex, Mark } from './board';
import {
  defaultSettings,
  initialSession,
  roundResult,
  type Session,
  type SessionAction,
  sessionReducer,
  type Settings,
  settingsLocked,
} from './session';

const xLineFirst: readonly CellIndex[] = [0, 3, 1, 4, 2];
const drawFromO: readonly CellIndex[] = [0, 1, 2, 4, 3, 5, 7, 6, 8];
const computerAsO: Settings = { mode: 'computer', difficulty: 'medium', playerMark: 'O' };
const computerAsX: Settings = { mode: 'computer', difficulty: 'hard', playerMark: 'X' };

function run(session: Session, actions: readonly SessionAction[]): Session {
  return actions.reduce(sessionReducer, session);
}

function placeAll(session: Session, cells: readonly CellIndex[]): Session {
  return run(session, cells.map((cell) => ({ type: 'place', cell })));
}

function startedTurn(session: Session): Mark | null {
  const started = sessionReducer(session, { type: 'start' });
  return started.round.phase === 'over' ? null : started.round.turn;
}

function playRound(session: Session, cells: readonly CellIndex[]): Session {
  return placeAll(sessionReducer(session, { type: 'start' }), cells);
}

describe('initialSession', () => {
  it('starts round 1 with X in the ready phase and an empty score', () => {
    const session = initialSession();
    expect(session.settings).toEqual(defaultSettings);
    expect(session.starter).toBe('X');
    expect(session.roundNumber).toBe(1);
    expect(session.score).toEqual({ xWins: 0, oWins: 0, draws: 0 });
    expect(session.round).toEqual({ phase: 'ready', board: Array(9).fill(null), turn: 'X' });
  });
});

describe('starter alternation (AC-8)', () => {
  it('starts four rounds, one of them a draw, with X, O, X, O', () => {
    const starters: (Mark | null)[] = [];
    const rounds = [xLineFirst, drawFromO, xLineFirst, xLineFirst];
    const final = rounds.reduce((session, cells, index) => {
      starters.push(startedTurn(session));
      const finished = playRound(session, cells);
      expect(finished.round.phase).toBe('over');
      return index < rounds.length - 1 ? sessionReducer(finished, { type: 'newRound' }) : finished;
    }, initialSession());
    expect(starters).toEqual(['X', 'O', 'X', 'O']);
    expect(final.roundNumber).toBe(4);
    expect(final.score).toEqual({ xWins: 2, oWins: 1, draws: 1 });
  });

  it('lets the computer (X) move first when the player chooses O', () => {
    const started = sessionReducer(initialSession(computerAsO), { type: 'start' });
    expect(started.round.phase).toBe('computer-thinking');
    expect(started.round).toMatchObject({ turn: 'X', lastMove: null });
  });

  it('lets the player move first when the player chooses X', () => {
    const started = sessionReducer(initialSession(computerAsX), { type: 'start' });
    expect(started.round).toMatchObject({ phase: 'playing', turn: 'X' });
  });
});

describe('turns and moves', () => {
  it('alternates X and O and records the last move', () => {
    const session = placeAll(sessionReducer(initialSession(), { type: 'start' }), [4, 0]);
    expect(session.round).toMatchObject({ phase: 'playing', turn: 'X', lastMove: { cell: 0, mark: 'O' } });
    expect(session.round.board[4]).toBe('X');
    expect(session.round.board[0]).toBe('O');
  });

  it('returns the identical session for a move on an occupied cell (AC-4)', () => {
    const session = placeAll(sessionReducer(initialSession(), { type: 'start' }), [4]);
    expect(sessionReducer(session, { type: 'place', cell: 4 })).toBe(session);
  });

  it('returns the identical session for a move after the round is over (AC-5)', () => {
    const over = playRound(initialSession(), xLineFirst);
    expect(over.round.phase).toBe('over');
    expect(sessionReducer(over, { type: 'place', cell: 8 })).toBe(over);
  });

  it('ignores a move before the round has started', () => {
    const ready = initialSession();
    expect(sessionReducer(ready, { type: 'place', cell: 0 })).toBe(ready);
  });

  it('ignores start while a round is in progress', () => {
    const playing = placeAll(sessionReducer(initialSession(), { type: 'start' }), [4]);
    expect(sessionReducer(playing, { type: 'start' })).toBe(playing);
    const thinking = sessionReducer(initialSession(computerAsO), { type: 'start' });
    expect(sessionReducer(thinking, { type: 'start' })).toBe(thinking);
  });
});

describe('computer turns', () => {
  it('blocks player moves while the computer is thinking and applies the computer move', () => {
    const thinking = sessionReducer(initialSession(computerAsO), { type: 'start' });
    expect(sessionReducer(thinking, { type: 'place', cell: 0 })).toBe(thinking);
    const answered = sessionReducer(thinking, { type: 'computerMove', roundId: thinking.roundId, cell: 4 });
    expect(answered.round).toMatchObject({ phase: 'playing', turn: 'O', lastMove: { cell: 4, mark: 'X' } });
    const next = sessionReducer(answered, { type: 'place', cell: 0 });
    expect(next.round).toMatchObject({ phase: 'computer-thinking', turn: 'X' });
  });

  it('ignores a computer move outside the thinking phase', () => {
    const playing = sessionReducer(initialSession(computerAsX), { type: 'start' });
    expect(sessionReducer(playing, { type: 'computerMove', roundId: playing.roundId, cell: 0 })).toBe(playing);
  });

  it('ignores a matching computer move onto an occupied cell', () => {
    const thinking = placeAll(sessionReducer(initialSession(computerAsX), { type: 'start' }), [4]);
    expect(thinking.round.phase).toBe('computer-thinking');
    expect(sessionReducer(thinking, { type: 'computerMove', roundId: thinking.roundId, cell: 4 })).toBe(thinking);
  });

  it('ignores a stale computer move after newRound (AC-10)', () => {
    const thinking = placeAll(sessionReducer(initialSession(computerAsX), { type: 'start' }), [4]);
    const stale = thinking.roundId;
    const next = run(thinking, [{ type: 'newRound' }, { type: 'start' }]);
    expect(next.round).toMatchObject({ phase: 'computer-thinking', turn: 'O' });
    expect(sessionReducer(next, { type: 'computerMove', roundId: stale, cell: 0 })).toBe(next);
  });

  it('ignores a stale computer move after resetScore (AC-10)', () => {
    const thinking = sessionReducer(initialSession(computerAsO), { type: 'start' });
    const stale = thinking.roundId;
    const next = run(thinking, [{ type: 'resetScore' }, { type: 'start' }]);
    expect(next.round).toMatchObject({ phase: 'computer-thinking', turn: 'X' });
    expect(sessionReducer(next, { type: 'computerMove', roundId: stale, cell: 0 })).toBe(next);
  });

  it('ends the round when the computer completes a line', () => {
    const almost = run(sessionReducer(initialSession(computerAsO), { type: 'start' }), [
      { type: 'computerMove', roundId: 1, cell: 0 },
      { type: 'place', cell: 3 },
      { type: 'computerMove', roundId: 1, cell: 1 },
      { type: 'place', cell: 4 },
    ]);
    const over = sessionReducer(almost, { type: 'computerMove', roundId: almost.roundId, cell: 2 });
    expect(over.round).toMatchObject({ phase: 'over', outcome: { kind: 'win', winner: 'X', line: [0, 1, 2] } });
    expect(over.score).toEqual({ xWins: 1, oWins: 0, draws: 0 });
  });
});

describe('settings lock (AC-6)', () => {
  const change: SessionAction = { type: 'changeSettings', settings: { mode: 'computer', difficulty: 'hard' } };

  it('applies settings in ready and over', () => {
    const ready = sessionReducer(initialSession(), change);
    expect(ready.settings).toEqual({ mode: 'computer', difficulty: 'hard', playerMark: 'X' });
    expect(settingsLocked(ready)).toBe(false);
    const over = playRound(initialSession(), xLineFirst);
    expect(settingsLocked(over)).toBe(false);
    expect(sessionReducer(over, change).settings.mode).toBe('computer');
  });

  it('ignores settings while playing and while the computer is thinking', () => {
    const playing = sessionReducer(initialSession(), { type: 'start' });
    expect(settingsLocked(playing)).toBe(true);
    expect(sessionReducer(playing, change)).toBe(playing);
    const thinking = sessionReducer(initialSession(computerAsO), { type: 'start' });
    expect(settingsLocked(thinking)).toBe(true);
    expect(sessionReducer(thinking, change)).toBe(thinking);
  });
});

describe('score (AC-7, AC-12)', () => {
  it('counts a win and a draw in exactly one field each', () => {
    const won = playRound(initialSession(), xLineFirst);
    expect(won.score).toEqual({ xWins: 1, oWins: 0, draws: 0 });
    const drawn = playRound(sessionReducer(won, { type: 'newRound' }), drawFromO);
    expect(drawn.round).toMatchObject({ phase: 'over', outcome: { kind: 'draw' } });
    expect(drawn.score).toEqual({ xWins: 1, oWins: 0, draws: 1 });
  });

  it('keeps the score across mode and difficulty changes and newRound', () => {
    const played = playRound(initialSession(), xLineFirst);
    const changed = run(played, [
      { type: 'changeSettings', settings: { mode: 'computer' } },
      { type: 'newRound' },
      { type: 'changeSettings', settings: { difficulty: 'easy' } },
    ]);
    expect(changed.settings).toEqual({ mode: 'computer', difficulty: 'easy', playerMark: 'X' });
    expect(changed.score).toEqual({ xWins: 1, oWins: 0, draws: 0 });
    expect(changed.round.phase).toBe('ready');
  });

  it('resetScore zeroes the score and puts the starter back to X from round 2', () => {
    const played = playRound(initialSession(computerAsX), [4]);
    const round2 = sessionReducer(playRound(initialSession(), xLineFirst), { type: 'newRound' });
    expect(round2.starter).toBe('O');
    const reset = sessionReducer(round2, { type: 'resetScore' });
    expect(reset.score).toEqual({ xWins: 0, oWins: 0, draws: 0 });
    expect(reset.starter).toBe('X');
    expect(reset.roundNumber).toBe(1);
    expect(reset.round).toMatchObject({ phase: 'ready', turn: 'X' });
    expect(reset.roundId).toBe(round2.roundId + 1);
    expect(sessionReducer(played, { type: 'resetScore' }).settings).toEqual(computerAsX);
  });

  it('newRound from a round in progress keeps the score and alternates the starter', () => {
    const won = playRound(initialSession(), xLineFirst);
    const midRound = placeAll(sessionReducer(sessionReducer(won, { type: 'newRound' }), { type: 'start' }), [4]);
    const next = sessionReducer(midRound, { type: 'newRound' });
    expect(next.score).toEqual(won.score);
    expect(next.starter).toBe('X');
    expect(next.roundNumber).toBe(3);
    expect(next.round).toMatchObject({ phase: 'ready', turn: 'X' });
  });
});

describe('roundResult (AC-18)', () => {
  it('stores the finished round as a flat value that survives JSON', () => {
    const finished = playRound(initialSession(), xLineFirst);
    if (finished.round.phase !== 'over') throw new Error('round should be over');
    const result = finished.round.result;
    expect(result).toEqual({ outcome: 'X', mode: 'two-players', difficulty: null, playerMark: null });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it('records difficulty and player mark in computer mode and draws as draw', () => {
    const result = roundResult({ kind: 'draw' }, computerAsO);
    expect(result).toEqual({ outcome: 'draw', mode: 'computer', difficulty: 'medium', playerMark: 'O' });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(roundResult({ kind: 'win', winner: 'O', line: [2, 4, 6] }, computerAsX).outcome).toBe('O');
  });
});
