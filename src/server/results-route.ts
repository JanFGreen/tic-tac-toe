import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { difficulties } from '../domain/difficulty';
import { parseNickname, playerOutcomes, type SaveResultRequest } from '../domain/leaderboard';
import type { ResultsStore } from './results-store';

const bodyLimitBytes = 1024;
const savesPerWindow = 10;

const nicknameSchema = z.string().transform((raw, ctx) => {
  const nickname = parseNickname(raw);
  if (nickname === null) {
    ctx.addIssue({ code: 'custom', message: 'invalid nickname' });
    return z.NEVER;
  }
  return nickname;
});

const saveResultSchema = z.strictObject({
  nickname: nicknameSchema,
  difficulty: z.enum(difficulties),
  outcome: z.enum(playerOutcomes),
});

/** POST /api/results: validated, size-limited and rate-limited by the socket address. */
export function registerResultsRoute(app: FastifyInstance, store: ResultsStore): void {
  app.post(
    '/api/results',
    {
      bodyLimit: bodyLimitBytes,
      config: {
        rateLimit: {
          max: savesPerWindow,
          timeWindow: '1 minute',
          keyGenerator: (request) => request.ip,
          errorResponseBuilder: () => ({
            statusCode: 429,
            error: 'too many saves, try again later',
          }),
        },
      },
    },
    async (request, reply) => {
      const parsed = saveResultSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: 'invalid result' });
      const result: SaveResultRequest = parsed.data;
      store.saveResult(result);
      return reply.code(201).send({ status: 'saved' });
    },
  );
}
