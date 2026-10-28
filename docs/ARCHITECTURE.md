# Architecture

```
src/
  domain/   pure game rules: board, moves, winner/draw, computer player. No React, no I/O.
  ui/       React components and hooks; state of the screen; calls the API through one client module.
  server/   Fastify API: `buildApp({ store, trustProxy? })` builds it without listening (tests use
            `inject`); routes `POST /api/results` (results-route.ts, rate-limited) and
            `GET /api/leaderboard?difficulty=` (leaderboard-route.ts). `results-store.ts` is the
            only storage module and the only `node:sqlite` importer; `main.ts` opens
            `data/results.db` (git-ignored), listens on 127.0.0.1:3001 and enables `trustProxy`
            only when `TRUST_PROXY=true` (opt-in, for a known reverse proxy).
  main.tsx  client entry (mounts <App/> into #root).
```

- Dependency direction: `ui -> domain`, `server -> domain`. `domain` imports nothing outside itself;
  `ui` and `server` never import each other (enforced by ESLint).
- The client is a static build (`dist/`); in development Vite proxies `/api` to the server.
- Randomness and time are passed in (e.g. a `random: () => number` argument), so tests are
  deterministic.
