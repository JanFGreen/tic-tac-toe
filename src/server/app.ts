import Fastify, { type FastifyInstance } from 'fastify';

/** Builds the HTTP API without listening, so tests can call it with `inject`. */
export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.get('/api/health', () => ({ status: 'ok' }));
  return app;
}
