import { z } from 'zod';
import type { Difficulty } from '../domain/difficulty';
import type { LeaderboardEntry, SaveResultRequest } from '../domain/leaderboard';

export type ApiResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'unreachable' }
  | { kind: 'rejected' }
  | { kind: 'rate-limited' };

export type LeaderboardApi = {
  saveResult(request: SaveResultRequest): Promise<ApiResult<null>>;
  leaderboard(difficulty: Difficulty): Promise<ApiResult<LeaderboardEntry[]>>;
};

const count = z.number().int().nonnegative();

const leaderboardResponse = z.object({
  entries: z.array(z.object({ nickname: z.string(), wins: count, draws: count, losses: count })),
});

const unreachable = { kind: 'unreachable' } as const;

async function send(fetchFn: typeof fetch, url: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetchFn(url, init);
  } catch {
    return null;
  }
}

/** Status codes that are the server's answer to the request rather than a failure to reach it. */
function failureOf(response: Response): ApiResult<never> {
  if (response.status === 400 || response.status === 413) return { kind: 'rejected' };
  if (response.status === 429) return { kind: 'rate-limited' };
  return unreachable;
}

async function parseEntries(response: Response): Promise<ApiResult<LeaderboardEntry[]>> {
  try {
    const parsed = leaderboardResponse.safeParse(await response.json());
    return parsed.success ? { kind: 'ok', value: parsed.data.entries } : unreachable;
  } catch {
    return unreachable;
  }
}

export function createLeaderboardApi(fetchFn: typeof fetch): LeaderboardApi {
  return {
    async saveResult(request) {
      const response = await send(fetchFn, '/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response) return unreachable;
      return response.status === 201 ? { kind: 'ok', value: null } : failureOf(response);
    },
    async leaderboard(difficulty) {
      const response = await send(fetchFn, `/api/leaderboard?difficulty=${encodeURIComponent(difficulty)}`);
      if (!response) return unreachable;
      return response.status === 200 ? parseEntries(response) : failureOf(response);
    },
  };
}
