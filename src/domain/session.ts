import { applyMove, type Board, type CellIndex, emptyBoard, type Mark, otherMark } from './board';
import type { Difficulty } from './difficulty';
import { type Outcome, outcome } from './lines';

export const modes = ['two-players', 'computer'] as const;

export type Mode = (typeof modes)[number];

export type Settings = { mode: Mode; difficulty: Difficulty; playerMark: Mark };

export const defaultSettings: Settings = { mode: 'two-players', difficulty: 'medium', playerMark: 'X' };

export type Score = { xWins: number; oWins: number; draws: number };

export type LastMove = { cell: CellIndex; mark: Mark } | null;

export type FinalOutcome = Exclude<Outcome, { kind: 'ongoing' }>;

/** Flat, JSON-serializable result of a finished round; consumed by the F2 leaderboard. */
export type RoundResult = {
  outcome: Mark | 'draw';
  mode: Mode;
  difficulty: Difficulty | null;
  playerMark: Mark | null;
};

export type Round =
  | { phase: 'ready'; board: Board; turn: Mark }
  | { phase: 'playing' | 'computer-thinking'; board: Board; turn: Mark; lastMove: LastMove }
  | { phase: 'over'; board: Board; lastMove: LastMove; outcome: FinalOutcome; result: RoundResult };

export type Session = {
  settings: Settings;
  score: Score;
  starter: Mark;
  roundNumber: number;
  roundId: number;
  round: Round;
};

export type SessionAction =
  | { type: 'changeSettings'; settings: Partial<Settings> }
  | { type: 'start' }
  | { type: 'place'; cell: CellIndex }
  | { type: 'computerMove'; roundId: number; cell: CellIndex }
  | { type: 'newRound' }
  | { type: 'resetScore' };

const emptyScore: Score = { xWins: 0, oWins: 0, draws: 0 };

function readyRound(starter: Mark): Round {
  return { phase: 'ready', board: emptyBoard, turn: starter };
}

export function initialSession(settings: Settings = defaultSettings): Session {
  return { settings, score: emptyScore, starter: 'X', roundNumber: 1, roundId: 1, round: readyRound('X') };
}

export function roundResult(final: FinalOutcome, settings: Settings): RoundResult {
  const vsComputer = settings.mode === 'computer';
  return {
    outcome: final.kind === 'win' ? final.winner : 'draw',
    mode: settings.mode,
    difficulty: vsComputer ? settings.difficulty : null,
    playerMark: vsComputer ? settings.playerMark : null,
  };
}

export function settingsLocked(session: Session): boolean {
  return session.round.phase === 'playing' || session.round.phase === 'computer-thinking';
}

function isComputerTurn(settings: Settings, turn: Mark): boolean {
  return settings.mode === 'computer' && turn !== settings.playerMark;
}

function addToScore(score: Score, final: FinalOutcome): Score {
  if (final.kind === 'draw') return { ...score, draws: score.draws + 1 };
  return final.winner === 'X' ? { ...score, xWins: score.xWins + 1 } : { ...score, oWins: score.oWins + 1 };
}

function changeSettings(session: Session, settings: Partial<Settings>): Session {
  if (settingsLocked(session)) return session;
  return { ...session, settings: { ...session.settings, ...settings } };
}

function start(session: Session): Session {
  if (session.round.phase !== 'ready') return session;
  const { board, turn } = session.round;
  const phase = isComputerTurn(session.settings, turn) ? 'computer-thinking' : 'playing';
  return { ...session, round: { phase, board, turn, lastMove: null } };
}

function playMove(session: Session, cell: CellIndex, mark: Mark): Session {
  const move = applyMove(session.round.board, cell, mark);
  if (!move.ok) return session;
  const lastMove = { cell, mark };
  const final = outcome(move.board);
  if (final.kind === 'ongoing') {
    const turn = otherMark(mark);
    const phase = isComputerTurn(session.settings, turn) ? 'computer-thinking' : 'playing';
    return { ...session, round: { phase, board: move.board, turn, lastMove } };
  }
  const result = roundResult(final, session.settings);
  const round: Round = { phase: 'over', board: move.board, lastMove, outcome: final, result };
  return { ...session, score: addToScore(session.score, final), round };
}

function place(session: Session, cell: CellIndex): Session {
  if (session.round.phase !== 'playing') return session;
  if (isComputerTurn(session.settings, session.round.turn)) return session;
  return playMove(session, cell, session.round.turn);
}

function computerMove(session: Session, roundId: number, cell: CellIndex): Session {
  if (session.round.phase !== 'computer-thinking' || roundId !== session.roundId) return session;
  return playMove(session, cell, session.round.turn);
}

function newRound(session: Session): Session {
  const starter = otherMark(session.starter);
  return {
    ...session,
    starter,
    roundNumber: session.roundNumber + 1,
    roundId: session.roundId + 1,
    round: readyRound(starter),
  };
}

function resetScore(session: Session): Session {
  return { ...initialSession(session.settings), roundId: session.roundId + 1 };
}

export function sessionReducer(session: Session, action: SessionAction): Session {
  switch (action.type) {
    case 'changeSettings':
      return changeSettings(session, action.settings);
    case 'start':
      return start(session);
    case 'place':
      return place(session, action.cell);
    case 'computerMove':
      return computerMove(session, action.roundId, action.cell);
    case 'newRound':
      return newRound(session);
    case 'resetScore':
      return resetScore(session);
  }
}
