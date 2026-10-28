import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Difficulty } from '../domain/difficulty';
import type { PlayerOutcome } from '../domain/leaderboard';
import { openResultsStore, type ResultsStore } from './results-store';

function save(store: ResultsStore, nickname: string, outcomes: PlayerOutcome[], difficulty: Difficulty = 'easy') {
  for (const outcome of outcomes) store.saveResult({ nickname, difficulty, outcome });
}

const times = (count: number, outcome: PlayerOutcome): PlayerOutcome[] => Array<PlayerOutcome>(count).fill(outcome);

describe('results store', () => {
  let store: ResultsStore;

  beforeEach(() => {
    store = openResultsStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  it('orders by wins desc, losses asc, nickname asc', () => {
    save(store, 'Cy', ['win']);
    save(store, 'Bob', ['win', 'loss', 'win', 'win']);
    save(store, 'Ann', times(3, 'win'));
    expect(store.leaderboard('easy')).toEqual([
      { nickname: 'Ann', wins: 3, draws: 0, losses: 0 },
      { nickname: 'Bob', wins: 3, draws: 0, losses: 1 },
      { nickname: 'Cy', wins: 1, draws: 0, losses: 0 },
    ]);
  });

  it('puts fewer losses first even when the nickname sorts later', () => {
    save(store, 'Amy', ['win', 'win', 'loss']);
    save(store, 'Zed', ['win', 'win', 'draw']);
    expect(store.leaderboard('easy').map((entry) => entry.nickname)).toEqual(['Zed', 'Amy']);
  });

  it('breaks full ties by nickname, ignoring letter case', () => {
    save(store, 'bea', ['win', 'draw']);
    save(store, 'Al', ['win', 'draw']);
    save(store, 'Cat', ['win', 'draw']);
    expect(store.leaderboard('easy').map((entry) => entry.nickname)).toEqual(['Al', 'bea', 'Cat']);
  });

  it('groups nicknames case-insensitively with the latest spelling', () => {
    save(store, 'Ann', ['win']);
    save(store, 'ann', ['draw']);
    expect(store.leaderboard('easy')).toEqual([{ nickname: 'ann', wins: 1, draws: 1, losses: 0 }]);
  });

  it('returns at most 20 entries', () => {
    for (let i = 0; i < 20; i += 1) save(store, `Mid${String(i).padStart(2, '0')}`, ['win']);
    for (let i = 0; i < 5; i += 1) save(store, `Top${i}`, times(2, 'win'));
    const names = store.leaderboard('easy').map((entry) => entry.nickname);
    expect(names).toHaveLength(20);
    expect(names.slice(0, 5)).toEqual(['Top0', 'Top1', 'Top2', 'Top3', 'Top4']);
    expect(names.slice(5)).toEqual(Array.from({ length: 15 }, (_, i) => `Mid${String(i).padStart(2, '0')}`));
  });

  it('keeps difficulties separate and returns [] when empty', () => {
    expect(store.leaderboard('easy')).toEqual([]);
    save(store, 'Ann', ['win', 'loss'], 'hard');
    expect(store.leaderboard('easy')).toEqual([]);
    expect(store.leaderboard('medium')).toEqual([]);
    expect(store.leaderboard('hard')).toEqual([{ nickname: 'Ann', wins: 1, draws: 0, losses: 1 }]);
  });

  it('stores nicknames as data, not SQL', () => {
    save(store, "x'); DROP TABLE results;--", ['win']);
    save(store, 'Ann', ['win']);
    expect(store.leaderboard('easy')).toHaveLength(2);
  });
});

describe('results store on a file', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'results-store-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reopened file store lists earlier results', () => {
    const path = join(dir, 'results.db');
    const first = openResultsStore(path);
    save(first, 'Ann', ['win', 'draw'], 'medium');
    first.close();

    const reopened = openResultsStore(path);
    save(reopened, 'Bob', ['loss'], 'medium');
    expect(reopened.leaderboard('medium')).toEqual([
      { nickname: 'Ann', wins: 1, draws: 1, losses: 0 },
      { nickname: 'Bob', wins: 0, draws: 0, losses: 1 },
    ]);
    reopened.close();
  });
});
