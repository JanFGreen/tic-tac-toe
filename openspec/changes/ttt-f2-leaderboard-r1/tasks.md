## Tasks

- [ ] TASK-01: The domain module exports the nickname rule, the case-insensitive key, the player-outcome mapping and the shared request/entry types. It imports only from src/domain. Unit tests show: an O win when the human played O maps to win and an X win maps to loss; a draw maps to draw; a two-player result maps to null; 'a b_c-d' and '  Ann  ' (returns 'Ann') are accepted; '', '   ', a 17-character name and 'a<b' are rejected; nicknameKey('Ann') === nicknameKey('ann').
- [ ] TASK-02: openResultsStore creates the schema and stores rows with bound parameters only. leaderboard(difficulty) runs one query that groups by nickname_key and sums wins, draws and losses. It orders by wins DESC, losses ASC, nickname_key ASC with LIMIT 20, and the displayed nickname comes from the group's highest id (latest save). Store tests show: Ann(3W), Bob(3W 1L), Cy(1W) are ordered Ann, Bob, Cy; 'Ann' then 'ann' is one entry with both results and the spelling 'ann'; 25 players give exactly 20 entries; Hard-only results are absent from Easy and Medium; an empty difficulty returns []; results written to a temp file, closed and reopened are still listed. `git check-ignore -q data/results.db data/results` exits 0.
- [ ] TASK-03: buildApp now requires { store }, and every existing caller is updated in this task: src/server/main.ts and src/server/app.test.ts. `npm run check` passes, including the typecheck. Inject tests use buildApp({ store: openResultsStore(':memory:') }) and show the following. A valid save returns 201, and '  Ann  ' is stored as 'Ann'. A missing, empty, 17-character or '<'-containing nickname, an unknown difficulty, outcome 'forfeit', a missing field or an extra field each return 400 and leave the store empty. A body over 1024 bytes returns 413 and leaves the store unchanged. With defaults, 11 valid saves from one remoteAddress, each with a different X-Forwarded-For value, return 429 with 'too many saves, try again later' on the 11th, and only 10 results are stored. With trustProxy: true, the same 11 saves with distinct X-Forwarded-For values all return 201. The server reads only nickname, difficulty and outcome. The health test still passes. main.ts puts the database file under data/ and keeps proxy trust off unless TRUST_PROXY=true. Verify the @fastify/rate-limit route config (errorResponseBuilder) and zod 4 APIs against node_modules type definitions.
- [ ] TASK-04: Inject tests show the following. GET /api/leaderboard?difficulty=easy returns at most 20 entries in store order, each with nickname, wins, draws and losses, and 'Ann' and 'ann' come back as one entry. An empty difficulty returns {entries: []}. A missing difficulty, an unknown one, or an extra query key returns 400. After 10 saves use up the write limit, GET still returns 200. Results POSTed through buildApp on a temp-file store are still listed by GET after the app and store are closed and reopened on the same file. A boundary test asserts that no src/server file except results-store.ts imports node:sqlite. ARCHITECTURE.md describes the new server shape.
- [ ] TASK-05: With an injected fetch: a thrown fetch, a 5xx response (including the Vite proxy's error when the API is down) or a body that fails the schema map to unreachable; 400 and 413 map to rejected; 429 maps to rate-limited; 201 maps to ok(null); 200 with {entries} maps to ok(entries). Requests go to the relative /api/results (POST JSON) and /api/leaderboard?difficulty=<d>. Nickname storage reads back a remembered nickname. When getItem or setItem throws, or storage is null, readNickname returns '' and rememberNickname does nothing, without throwing. No server import (eslint ui rule).
- [ ] TASK-06: Hook rules:
- result exists only when round.phase === 'over' and playerOutcome(round.result) is not null.
- result.difficulty comes from round.result.difficulty, never from session.settings, so changing difficulty after the round still saves the round's difficulty.
- isPending is true while a result exists and status is not 'saved'.
- save sends {nickname, difficulty, outcome} once. It does nothing while status is 'saving' or 'saved'. On ok it remembers the nickname and sets 'saved'. On failure the result stays pending with the matching status. Responses for an older roundId are ignored.
- guardDiscard(action) calls confirm('Discard the unsaved result?') only while isPending and runs the action only when no result is pending or the player confirms.

Form behaviour:
- A Panel 'Save result' with a 'Nickname' text input pre-filled from initialNickname and a primary 'Save' Button.
- An empty nickname shows 'Enter a nickname to save.' and does not call onSave. An invalid one shows 'Use 1 to 16 letters, digits, spaces, _ or -.'
- unreachable shows 'Cannot reach the server.' and rate-limited shows 'Too many saves, try again later.', each with a 'Retry' Button that calls onSave again. rejected shows 'The server did not accept this result.'
- saved shows 'Result saved.' with no input.

Style and copy:
- The input is at least var(--layout-min-touch-target) high.
- The CSS uses only existing tokens and passes src/stylesheets.test.ts.
- English copy without exclamation marks.
- [ ] TASK-07: Screen layout:
- Heading 'Leaderboard' and one secondary 'Back to game' Button that calls onBack in every state.
- A ChoiceGroup with legend 'Difficulty' and options Easy, Medium and Hard, starting at initialDifficulty. Selecting Hard requests and shows the Hard board.

States:
- 'Loading…' while waiting.
- A table in a Panel with the columns Rank, Nickname, Wins, Draws and Losses, in server order.
- 'No results saved yet.' for an empty list.
- On any non-ok result, 'Cannot reach the server.' with a 'Retry' Button that repeats the request and shows the table once it succeeds.
- A late response for a difficulty that is no longer selected is ignored.

Style and copy:
- The CSS passes src/stylesheets.test.ts.
- Width 100% with no fixed widths, so nothing scrolls horizontally at 360 px.
- English copy without exclamation marks.
- DESIGN.md Voice lists: 'Leaderboard', 'Back to game', 'Save result', 'Nickname', 'Save', 'Retry', 'Result saved.', 'Cannot reach the server.', 'Too many saves, try again later.', 'No results saved yet.', 'Discard the unsaved result?'.
- [ ] TASK-08: App tests use an injected api, storage and confirm. Save flow:
- After a win, loss or draw against the computer, the save form appears; it does not appear in two-player mode.
- Saving sends the round's difficulty and the player's outcome. Afterwards 'Result saved.' replaces the form, and the round cannot be saved again.
- After a successful save and a remount with the same storage, the next form shows the remembered nickname.

Discard guard:
- New round while a result is pending calls confirm. Declining keeps the round and the pending result; confirming starts the new round and removes the form.
- Reset score while pending calls confirm. Declining keeps the round, the score and the pending result; confirming resets and discards it.
- With no pending result, or after a successful save, Reset score and New round act without calling confirm.

Offline and navigation:
- With api calls returning unreachable, moves, new rounds and the scoreboard still work, and saving shows 'Cannot reach the server.' with a Retry that succeeds once the api returns ok.
- The 'Leaderboard' control opens the leaderboard screen. 'Back to game' returns with the board, score and pending result unchanged.

All existing App tests still pass; src/main.tsx keeps rendering <App /> with defaults, and every function stays within the lint limits.
