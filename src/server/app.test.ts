import { describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { openResultsStore } from './results-store';

describe('API', () => {
  it('reports health', async () => {
    const app = buildApp({ store: openResultsStore(':memory:') });
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});
