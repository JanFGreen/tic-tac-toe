import type { Difficulty } from './difficulty';
import type { RoundResult } from './session';

export const playerOutcomes = ['win', 'loss', 'draw'] as const;

export type PlayerOutcome = (typeof playerOutcomes)[number];

export const nicknameMaxLength = 16;

const nicknamePattern = new RegExp(`^[A-Za-z0-9 _-]{1,${nicknameMaxLength}}$`);

/** The save request shared by client and server; the server trusts only these fields. */
export type SaveResultRequest = { nickname: string; difficulty: Difficulty; outcome: PlayerOutcome };

export type LeaderboardEntry = { nickname: string; wins: number; draws: number; losses: number };

/** Trimmed nickname when it follows the nickname rule, otherwise null. */
export function parseNickname(raw: string): string | null {
  const nickname = raw.trim();
  return nicknamePattern.test(nickname) ? nickname : null;
}

/** Grouping key: nicknames that differ only in letter case are the same player. */
export function nicknameKey(nickname: string): string {
  return nickname.toLowerCase();
}

/** The round result from the human's point of view; null when no human played the computer. */
export function playerOutcome(result: RoundResult): PlayerOutcome | null {
  if (result.mode !== 'computer') return null;
  if (result.outcome === 'draw') return 'draw';
  return result.outcome === result.playerMark ? 'win' : 'loss';
}
