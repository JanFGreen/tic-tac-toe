import { describe, expect, it } from 'vitest';
import { buildApp, type AppOptions } from './app';
import { openResultsStore, type ResultsStore } from './results-store';

const valid = { nickname: 'Ann', difficulty: 'easy', outcome: 'win' };

function setup(options: Partial<Omit<AppOptions, 'store'>> = {}) {
  const store = openResultsStore(':memory:');
  const app = buildApp({ store, ...options });
  const save = (payload: unknown, headers: Record<string, string> = {}) =>
    app.inject({ method: 'POST', url: '/api/results', payload: payload as object, headers, remoteAddress: '10.0.0.1' });
  return { store, app, save };
}

const stored = (store: ResultsStore) =>
  (['easy', 'medium', 'hard'] as const).flatMap((difficulty) => store.leaderboard(difficulty));

describe('POST /api/results', () => {
  it('stores trimmed nickname and answers 201', async () => {
    const { store, save } = setup();
    const res = await save({ ...valid, nickname: '  Ann  ' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ status: 'saved' });
    expect(store.leaderboard('easy')).toEqual([{ nickname: 'Ann', wins: 1, draws: 0, losses: 0 }]);
  });

  it.each([
    ['missing nickname', { difficulty: 'easy', outcome: 'win' }],
    ['empty nickname', { ...valid, nickname: '' }],
    ['blank nickname', { ...valid, nickname: '   ' }],
    ['17-character nickname', { ...valid, nickname: 'a'.repeat(17) }],
    ['nickname with <', { ...valid, nickname: 'A<b' }],
    ['non-string nickname', { ...valid, nickname: 5 }],
    ['unknown difficulty', { ...valid, difficulty: 'impossible' }],
    ['forfeit outcome', { ...valid, outcome: 'forfeit' }],
    ['missing difficulty', { nickname: 'Ann', outcome: 'win' }],
    ['missing outcome', { nickname: 'Ann', difficulty: 'easy' }],
    ['extra field', { ...valid, score: 99 }],
  ])('rejects malformed nickname, unknown difficulty, forfeit, missing and extra fields with 400 and stores nothing (%s)', async (_name, body) => {
    const { store, save } = setup();
    const res = await save(body);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid result' });
    expect(stored(store)).toEqual([]);
  });

  it('answers 413 for a body over 1024 bytes and stores nothing', async () => {
    const { store, save } = setup();
    const res = await save({ ...valid, padding: 'x'.repeat(1100) });
    expect(res.statusCode).toBe(413);
    expect(stored(store)).toEqual([]);
  });

  it('11th save within a minute answers 429 with too many saves message, 10 stored', async () => {
    const { store, save } = setup();
    for (let i = 0; i < 10; i += 1) expect((await save(valid)).statusCode).toBe(201);
    const res = await save(valid);
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ error: 'too many saves, try again later' });
    expect(store.leaderboard('easy')[0]?.wins).toBe(10);
  });

  it('default buildApp ignores X-Forwarded-For for the limit key', async () => {
    const { store, save } = setup();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      statuses.push((await save(valid, { 'x-forwarded-for': `203.0.113.${i}` })).statusCode);
    }
    expect(statuses.slice(0, 10).every((status) => status === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect(store.leaderboard('easy')[0]?.wins).toBe(10);
  });

  it('trustProxy: true keys the limit on the forwarded address', async () => {
    const { save } = setup({ trustProxy: true });
    for (let i = 0; i < 11; i += 1) {
      const res = await save(valid, { 'x-forwarded-for': `203.0.113.${i}` });
      expect(res.statusCode).toBe(201);
    }
  });
});
