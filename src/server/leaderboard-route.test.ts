import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { openResultsStore, type ResultsStore, type StoredResult } from './results-store';

const clientAddress = '10.0.0.1';

function setup(store: ResultsStore = openResultsStore(':memory:')) {
  const app = buildApp({ store });
  const save = (payload: StoredResult) =>
    app.inject({ method: 'POST', url: '/api/results', payload, remoteAddress: clientAddress });
  const list = (query: string) =>
    app.inject({ method: 'GET', url: `/api/leaderboard${query}`, remoteAddress: clientAddress });
  return { store, app, save, list };
}

describe('GET /api/leaderboard', () => {
  it('returns ordered top 20 with wins, draws, losses and merges Ann/ann', async () => {
    const { store, list } = setup();
    store.saveResult({ nickname: 'Ann', difficulty: 'easy', outcome: 'win' });
    store.saveResult({ nickname: 'ann', difficulty: 'easy', outcome: 'draw' });
    store.saveResult({ nickname: 'Bob', difficulty: 'easy', outcome: 'loss' });
    for (let i = 0; i < 25; i += 1) {
      store.saveResult({ nickname: `P${String(i).padStart(2, '0')}`, difficulty: 'easy', outcome: 'draw' });
    }
    store.saveResult({ nickname: 'Cy', difficulty: 'hard', outcome: 'win' });

    const res = await list('?difficulty=easy');

    expect(res.statusCode).toBe(200);
    const { entries } = res.json<{ entries: unknown[] }>();
    expect(entries).toHaveLength(20);
    expect(entries).toEqual(store.leaderboard('easy'));
    expect(entries[0]).toEqual({ nickname: 'ann', wins: 1, draws: 1, losses: 0 });
    expect(entries[1]).toEqual({ nickname: 'P00', wins: 0, draws: 1, losses: 0 });
    expect(entries).not.toContainEqual(expect.objectContaining({ nickname: 'Ann' }));
    expect(entries).not.toContainEqual(expect.objectContaining({ nickname: 'Cy' }));
  });

  it('empty difficulty returns empty list; missing or unknown difficulty returns 400', async () => {
    const { store, list } = setup();
    store.saveResult({ nickname: 'Ann', difficulty: 'hard', outcome: 'win' });

    const empty = await list('?difficulty=easy');
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toEqual({ entries: [] });

    for (const query of ['', '?difficulty=', '?difficulty=impossible', '?difficulty=easy&extra=1']) {
      const res = await list(query);
      expect(res.statusCode, query).toBe(400);
      expect(res.json()).toEqual({ error: 'invalid difficulty' });
    }
  });

  it('reads still answer 200 after the write limit is used', async () => {
    const { list, save } = setup();
    const valid: StoredResult = { nickname: 'Ann', difficulty: 'easy', outcome: 'win' };
    for (let i = 0; i < 10; i += 1) expect((await save(valid)).statusCode).toBe(201);
    expect((await save(valid)).statusCode).toBe(429);

    for (let i = 0; i < 15; i += 1) {
      const res = await list('?difficulty=easy');
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ entries: [{ nickname: 'Ann', wins: 10, draws: 0, losses: 0 }] });
    }
  });

  describe('with a database file', () => {
    let directory: string | undefined;
    afterEach(() => {
      if (directory) rmSync(directory, { recursive: true, force: true });
    });

    it('results survive closing and reopening app and store on the same file', async () => {
      directory = mkdtempSync(join(tmpdir(), 'leaderboard-'));
      const path = join(directory, 'results.db');

      const first = setup(openResultsStore(path));
      expect((await first.save({ nickname: 'Ann', difficulty: 'medium', outcome: 'win' })).statusCode).toBe(201);
      expect((await first.save({ nickname: 'Ann', difficulty: 'medium', outcome: 'loss' })).statusCode).toBe(201);
      await first.app.close();
      first.store.close();

      const second = setup(openResultsStore(path));
      const res = await second.list('?difficulty=medium');
      await second.app.close();
      second.store.close();

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ entries: [{ nickname: 'Ann', wins: 1, draws: 0, losses: 1 }] });
    });
  });
});
