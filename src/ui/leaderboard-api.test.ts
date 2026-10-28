import { describe, expect, it, vi } from 'vitest';
import { createLeaderboardApi } from './leaderboard-api';

const request = { nickname: 'Ann', difficulty: 'hard', outcome: 'win' } as const;

function apiAnswering(status: number, body: unknown = null) {
  const fetchFn = vi.fn(() => Promise.resolve(new Response(body === null ? null : JSON.stringify(body), { status })));
  return { fetchFn, api: createLeaderboardApi(fetchFn) };
}

describe('leaderboard api', () => {
  it('maps network error, 5xx and invalid body to unreachable', async () => {
    const failing = createLeaderboardApi(() => Promise.reject(new TypeError('failed to fetch')));
    expect(await failing.saveResult(request)).toEqual({ kind: 'unreachable' });
    expect(await failing.leaderboard('easy')).toEqual({ kind: 'unreachable' });

    for (const status of [500, 502, 503]) {
      const { api } = apiAnswering(status);
      expect(await api.saveResult(request)).toEqual({ kind: 'unreachable' });
      expect(await api.leaderboard('easy')).toEqual({ kind: 'unreachable' });
    }

    for (const body of [{ entries: [{ nickname: 'Ann', wins: 'many', draws: 0, losses: 0 }] }, { rows: [] }, [], 'x']) {
      expect(await apiAnswering(200, body).api.leaderboard('easy')).toEqual({ kind: 'unreachable' });
    }
    const notJson = createLeaderboardApi(() => Promise.resolve(new Response('<html>', { status: 200 })));
    expect(await notJson.leaderboard('easy')).toEqual({ kind: 'unreachable' });
  });

  it('maps 400/413 to rejected and 429 to rate-limited', async () => {
    for (const status of [400, 413]) {
      const { api } = apiAnswering(status, { error: 'no' });
      expect(await api.saveResult(request)).toEqual({ kind: 'rejected' });
      expect(await api.leaderboard('easy')).toEqual({ kind: 'rejected' });
    }
    const { api } = apiAnswering(429, { error: 'too many saves, try again later' });
    expect(await api.saveResult(request)).toEqual({ kind: 'rate-limited' });
    expect(await api.leaderboard('easy')).toEqual({ kind: 'rate-limited' });
  });

  it('returns parsed entries on 200 and ok on 201', async () => {
    const entries = [{ nickname: 'Ann', wins: 3, draws: 1, losses: 0 }];
    expect(await apiAnswering(200, { entries }).api.leaderboard('medium')).toEqual({ kind: 'ok', value: entries });
    expect(await apiAnswering(200, { entries: [] }).api.leaderboard('medium')).toEqual({ kind: 'ok', value: [] });
    expect(await apiAnswering(201, { ok: true }).api.saveResult(request)).toEqual({ kind: 'ok', value: null });
  });

  it('sends POST JSON to /api/results and GET to /api/leaderboard?difficulty=hard', async () => {
    const saved = apiAnswering(201);
    await saved.api.saveResult(request);
    expect(saved.fetchFn).toHaveBeenCalledWith('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const read = apiAnswering(200, { entries: [] });
    await read.api.leaderboard('hard');
    expect(read.fetchFn).toHaveBeenCalledWith('/api/leaderboard?difficulty=hard', undefined);
  });
});
