## Context

Selected option OPT-A: per-result rows, leaderboard aggregated at read.

## Decisions

- Storage: src/server/results-store.ts opens a DatabaseSync (file under data/ from main.ts, ':memory:' in tests) and exposes saveResult and leaderboard. Table results(id, nickname_key, nickname, difficulty, outcome, created_at) with an index on (difficulty, nickname_key). The leaderboard is one bound-parameter query per difficulty with GROUP BY nickname_key, SUM(CASE outcome) for wins, draws and losses, ORDER BY wins DESC, losses ASC, nickname_key ASC, LIMIT 20. The displayed nickname is the one from the latest row of the group.
- API: zod strict schemas; POST /api/results has bodyLimit about 1 KB and @fastify/rate-limit registered with global:false and a route max of 10 per 1 minute with a 'too many saves, try again later' error body.
- Rate-limit key: buildApp() keeps Fastify's trustProxy off by default (as src/server/app.ts does today), so the key is the socket address and X-Forwarded-For and similar headers cannot change it. buildApp accepts an explicit trustProxy option, set from main.ts only through deliberate configuration (for example an environment variable) when deployed behind a known proxy. A test sends varied X-Forwarded-For values with defaults and expects 429 on the 11th save.
- GET /api/leaderboard validates the difficulty query.
- Client: one src/ui API module with injectable fetch returning ok, unreachable, rejected or rate-limited; a LeaderboardScreen switched by App state; a save form pre-filled from localStorage; a pending-result hook with retry.
- Discard guard: one guard in App wraps every action that replaces the session (New round and Reset score, which resets via src/domain/session.ts). While a result is pending it asks for confirmation and runs the action only on confirmation. The pending result is cleared only with a confirmed discard or a successful save.
- Domain: pure nickname rule and player-outcome mapping.

## Risks

- Row growth is bounded only by the rate limit; acceptable at friends scale with the index.
- Nicknames are labels, not identities; any player may use any nickname (decisions Q-3, Q-4).
- Behind a proxy without trustProxy configured, all clients share one limit bucket; this is the safe failure and is documented for deployment.
