import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { difficulties } from '../domain/difficulty';
import type { ResultsStore } from './results-store';

const leaderboardQuerySchema = z.strictObject({ difficulty: z.enum(difficulties) });

/** GET /api/leaderboard?difficulty=: the top players for one difficulty; not rate-limited. */
export function registerLeaderboardRoute(app: FastifyInstance, store: ResultsStore): void {
  app.get('/api/leaderboard', async (request, reply) => {
    const parsed = leaderboardQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid difficulty' });
    return reply.send({ entries: store.leaderboard(parsed.data.difficulty) });
  });
}
