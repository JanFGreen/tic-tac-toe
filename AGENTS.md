# AGENTS.md — Tic-tac-toe

Web game: React 19 + Vite client, Fastify API on Node 24, TypeScript everywhere.

Read first: `docs/PRODUCT.md` (what), `docs/ARCHITECTURE.md` (where), `docs/ENGINEERING.md` (how).

## Commands

```sh
npm run check      # typecheck + lint (0 warnings) + duplicates + tests + build — must pass
npm test           # vitest run
npm run dev        # client dev server (proxies /api to 127.0.0.1:3001)
npm run server     # API on 127.0.0.1:3001
npm run build      # static client build into dist/
```

## Rules for agents

- Dependencies are preinstalled and fixed: do not edit `package.json`, `package-lock.json`,
  `tsconfig*.json`, `eslint.config.*`, `vite.config.*` or `vitest.config.*`, and do not install
  packages (there is no network). If something truly needs a new dependency, stop and say so.
- Available: React 19.3, Vite 8, Fastify 5, @fastify/rate-limit, zod 4, Node 24 built-ins
  (including `node:sqlite`), Testing Library + user-event + jsdom for component tests.
  Prefer APIs you can verify in `node_modules/` type definitions over memory.
- Game rules live in `src/domain/` (pure), React in `src/ui/`, the API in `src/server/`.
