import { describe, expect, it } from 'vitest';
import { nicknameKey, nicknameMaxLength, parseNickname, playerOutcome } from './leaderboard';
import type { RoundResult } from './session';

const vsComputer = (outcome: RoundResult['outcome'], playerMark: 'X' | 'O'): RoundResult => ({
  outcome,
  mode: 'computer',
  difficulty: 'hard',
  playerMark,
});

describe('playerOutcome', () => {
  it('maps O win to win when human plays O, X win to loss', () => {
    expect(playerOutcome(vsComputer('O', 'O'))).toBe('win');
    expect(playerOutcome(vsComputer('X', 'O'))).toBe('loss');
    expect(playerOutcome(vsComputer('X', 'X'))).toBe('win');
    expect(playerOutcome(vsComputer('O', 'X'))).toBe('loss');
  });

  it('maps draw to draw and two-player results to null', () => {
    expect(playerOutcome(vsComputer('draw', 'X'))).toBe('draw');
    const twoPlayers: RoundResult = { outcome: 'X', mode: 'two-players', difficulty: null, playerMark: null };
    expect(playerOutcome(twoPlayers)).toBeNull();
    expect(playerOutcome({ ...twoPlayers, outcome: 'draw' })).toBeNull();
  });
});

describe('parseNickname', () => {
  it('accepts a b_c-d and trims surrounding spaces', () => {
    expect(parseNickname('a b_c-d')).toBe('a b_c-d');
    expect(parseNickname('  Ann  ')).toBe('Ann');
    expect(parseNickname('a'.repeat(nicknameMaxLength))).toBe('a'.repeat(nicknameMaxLength));
  });

  it('rejects empty, blank, 17-character and <-containing nicknames', () => {
    expect(parseNickname('')).toBeNull();
    expect(parseNickname('   ')).toBeNull();
    expect(parseNickname('a'.repeat(nicknameMaxLength + 1))).toBeNull();
    expect(parseNickname('a<b')).toBeNull();
    expect(parseNickname('Ann\nBob')).toBeNull();
  });
});

describe('nicknameKey', () => {
  it('nicknameKey is case-insensitive', () => {
    expect(nicknameKey('Ann')).toBe(nicknameKey('ann'));
    expect(nicknameKey('Ann')).not.toBe(nicknameKey('Anna'));
  });
});
