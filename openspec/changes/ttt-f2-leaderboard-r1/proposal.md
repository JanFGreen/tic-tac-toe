## Original Request

Add an online leaderboard for games against the computer, served by the Node.js API.

- After a round against the computer, the player can save the result under a nickname. The nickname is remembered on the device for the next time.
- The server stores results and offers a leaderboard per difficulty: best players first, with wins, draws and losses. The client shows it on its own screen, reachable from the game.
- The API must be safe to expose on the internet: validate every input, limit sizes and the rate of writes, and never trust the client for more than it can know.
- Results survive a server restart (Node's built-in SQLite, a file under data/).
- When the server is unreachable the game still works; saving and the leaderboard explain the problem and offer a retry.

## Why

Players want to compare results against the computer. A shared, persistent leaderboard needs a small, hardened API and a resilient client.

## What Changes

- New API: POST /api/results and GET /api/leaderboard, backed by one SQLite storage module.
- New client pieces: save form with a remembered nickname, pending-result handling, and a leaderboard screen.
- Pure domain additions: player-outcome mapping and the nickname rule shared by client and server.
- data/ is excluded from git.

## Capabilities

### New Capabilities

- `leaderboard`: saving results against the computer and ranking players per difficulty.

### Modified Capabilities

None.

## Impact

- src/domain (nickname rule, outcome mapping), src/server (app, results store, main), src/ui (API module, save form, leaderboard screen, styles using tokens), .gitignore.
- No new dependencies; package.json and the lockfile stay unchanged.
