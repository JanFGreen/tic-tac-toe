# Engineering rules

These apply to every change, human or agent.

## Design
- Respect the layers in ARCHITECTURE.md. Game rules live in `src/domain` only.
- Small, single-purpose modules and functions; names from the game (board, cell, mark, move,
  turn, line, winner, draw, round, score).
- Pure functions first; side effects (time, randomness, storage, network) are parameters.
- Make illegal states unrepresentable: discriminated unions, readonly data, `as const`.
- Validate all external input (HTTP bodies, query strings, stored data) at the boundary with zod.
- No premature abstraction; no dead code; no commented-out code.

## Enforced limits (lint and duplication gate)
- Function: cyclomatic complexity ≤ 10, nesting depth ≤ 3, ≤ 4 parameters, ≤ 60 lines.
  File ≤ 300 lines. Callbacks nested ≤ 3.
- Layers: `src/domain` imports nothing from UI, server or `node:*`; client and server never
  import each other.
- No new duplicated block of ≥ 50 tokens outside tests (`npm run duplicates`).

## TypeScript
- No `any`, no non-null `!`, no `@ts-ignore`/`eslint-disable` to silence a real issue.
- Errors: typed results for expected failures; throw only for programmer errors.

## Tests
- Every behavior change ships with tests in the same change (`*.test.ts(x)` next to the code).
- Test behavior through public APIs. Deterministic: inject randomness and time.
- Component tests: `// @vitest-environment jsdom`, Testing Library queries by role/label/text,
  `@testing-library/user-event` for interaction (also proves keyboard access).

## UI
- Visual values (colors, spacing, radius, type sizes, motion) come from one theme module.
- Every interactive element has an accessible name; touch targets at least 44×44 px.
- Works on a narrow phone (360 px) and on desktop; light and dark color schemes.

## Security
- The API trusts nothing from the client: validate, bound sizes, rate-limit writes.
- Never log personal data. SQL only with bound parameters.

## Done means
`npm run check` passes.
