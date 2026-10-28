import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerLeaderboardRoute } from './leaderboard-route';
import { registerResultsRoute } from './results-route';
import type { ResultsStore } from './results-store';

export type AppOptions = { store: ResultsStore; trustProxy?: boolean };

/** Builds the HTTP API without listening, so tests can call it with `inject`. */
export function buildApp(options: AppOptions): FastifyInstance {
  const app = Fastify({ logger: false, trustProxy: options.trustProxy ?? false });
  app.register(rateLimit, { global: false });
  // Registered after the rate-limit plugin has loaded, so its onRoute hook sees the route config.
  app.register((instance, _options, done) => {
    registerResultsRoute(instance, options.store);
    done();
  });
  registerLeaderboardRoute(app, options.store);
  app.get('/api/health', () => ({ status: 'ok' }));
  return app;
}
