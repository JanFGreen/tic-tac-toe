# Spec Delta

## Purpose

Lets players save results against the computer and compare themselves on a per-difficulty leaderboard.

## ADDED Requirements

### Requirement: REQ-1 Save a finished round
The client SHALL let the player save the result of a finished round against the computer (win, loss or draw from the player's point of view) under a nickname, and SHALL NOT save without a nickname.

#### Scenario: Save after a win
- **WHEN** the player wins a round against the computer and submits a valid nickname
- **THEN** a save request with the difficulty, outcome win and the nickname is sent and a confirmation is shown

#### Scenario: Empty nickname
- **WHEN** the player submits the save form with an empty nickname
- **THEN** no request is sent and the form explains that a nickname is needed

#### Scenario: Two-player rounds
- **WHEN** a round in two-player mode finishes
- **THEN** no save form is offered

### Requirement: REQ-2 Remembered nickname
The client SHALL store the nickname of a successful save in localStorage and SHALL pre-fill it in the next save form, while allowing a different nickname to be typed.

#### Scenario: Pre-filled after reload
- **WHEN** a save succeeded under "Ann" and the page is reloaded and another round finishes
- **THEN** the save form shows "Ann"

#### Scenario: Different nickname
- **WHEN** the player replaces the pre-filled nickname with "Bob" and saves
- **THEN** the result is saved under "Bob" and "Bob" is remembered next

#### Scenario: Storage unavailable
- **WHEN** localStorage throws on read or write
- **THEN** the form still works with an empty nickname and no error is shown

### Requirement: REQ-3 Validated saves
The server SHALL validate POST /api/results with a strict zod schema: nickname trimmed to 1-16 characters of letters, digits, space, underscore and hyphen; difficulty easy, medium or hard; outcome win, loss or draw. It SHALL reject anything else with 400, enforce a body limit of about 1 KB before parsing, and store nothing for a rejected request.

#### Scenario: Malformed nickname rejected
- **WHEN** a save has a nickname that is empty, 17 characters long, or contains "<"
- **THEN** the response is 400 and the store is unchanged

#### Scenario: Unknown fields and values rejected
- **WHEN** a save has an unknown difficulty, an outcome "forfeit", a missing field or an extra field
- **THEN** the response is 400 and the store is unchanged

#### Scenario: Oversized body
- **WHEN** a save body is larger than the route body limit
- **THEN** the response is 413 and the body is not parsed

#### Scenario: Trimmed nickname accepted
- **WHEN** a save has the nickname "  Ann  "
- **THEN** it is stored as "Ann" and the response is 201

### Requirement: REQ-4 Write rate limit
The server SHALL allow at most 10 saves per minute per client IP using @fastify/rate-limit on the save route only, keyed on the socket address. It SHALL ignore X-Forwarded-For and similar headers unless trustProxy is explicitly configured (default off). Further saves get 429 with 'too many saves, try again later'.

#### Scenario: Limit exceeded
- **WHEN** one client sends 11 valid saves within a minute
- **THEN** the 11th returns 429 with the 'too many saves' message and the stored results show only 10 saves

#### Scenario: Forged forwarding header
- **WHEN** buildApp() has default options and one socket address sends 11 valid saves, each with a different X-Forwarded-For value
- **THEN** the 11th returns 429 and only 10 results are stored

#### Scenario: Proxy trust is opt-in
- **WHEN** buildApp() is created with trustProxy explicitly enabled
- **THEN** the forwarded client address is used as the rate-limit key

#### Scenario: Reads not limited by the write limit
- **WHEN** a client has used its 10 saves
- **THEN** GET /api/leaderboard still answers 200

#### Scenario: Client explains the limit
- **WHEN** the client receives 429 on a save
- **THEN** it shows that there were too many saves and to try again later, and keeps the result pending

### Requirement: REQ-5 Leaderboard per difficulty
GET /api/leaderboard?difficulty= SHALL return up to 20 players for that difficulty, grouped by case-insensitive nickname, each with wins, draws and losses, ordered by wins descending, then losses ascending, then nickname ascending. The displayed spelling SHALL be that of the most recent save of the group. Players without saved results SHALL NOT appear.

#### Scenario: Ordering
- **WHEN** Ann has 3 wins, Bob has 3 wins and 1 loss, and Cy has 1 win
- **THEN** the order is Ann, Bob, Cy

#### Scenario: Case-insensitive grouping
- **WHEN** results are saved as "Ann" and then "ann"
- **THEN** one entry appears, with both results counted and the spelling "ann"

#### Scenario: Top 20 only
- **WHEN** 25 players have results on Easy
- **THEN** exactly 20 are returned

#### Scenario: Difficulties are separate
- **WHEN** Ann has results only on Hard
- **THEN** she is absent from the Easy and Medium leaderboards

#### Scenario: Invalid difficulty
- **WHEN** the difficulty query is missing or unknown
- **THEN** the response is 400

### Requirement: REQ-6 Leaderboard screen
The client SHALL provide a leaderboard control in the game that opens a separate leaderboard screen with Easy, Medium and Hard views, showing rank, nickname, wins, draws and losses, an empty-state message for a difficulty without results, and one control that returns to the game.

#### Scenario: Open and return
- **WHEN** the player activates the leaderboard control and then the back control
- **THEN** the leaderboard screen is shown and then the game is shown again with its board and score unchanged

#### Scenario: Empty state
- **WHEN** the selected difficulty has no results
- **THEN** a message says that no results are saved yet

#### Scenario: Switch difficulty
- **WHEN** the player selects Hard
- **THEN** the Hard leaderboard is requested and shown

### Requirement: REQ-7 Persistent single-module storage
Results SHALL be stored in a node:sqlite database file under data/ that survives a server restart. data/ SHALL be excluded from git. All SQL SHALL live in one storage module (src/server/results-store.ts) using bound parameters, and route handlers SHALL NOT access SQLite directly.

#### Scenario: Survives restart
- **WHEN** results are saved, the store is closed and a new store opens the same file
- **THEN** the leaderboard lists the same results

#### Scenario: Not committed
- **WHEN** the database file exists under data/
- **THEN** git ignores it

#### Scenario: Handlers use the module only
- **WHEN** the route files are inspected
- **THEN** they import no node:sqlite and call only the store interface

### Requirement: REQ-8 Unreachable server
When the API cannot be reached, the game board, round and scoreboard SHALL keep working, and saving and the leaderboard SHALL show that the server cannot be reached and offer a Retry that works once the server is back.

#### Scenario: Save while offline
- **WHEN** the save request fails with a network error
- **THEN** a message says the server cannot be reached, a Retry button is shown and the result stays pending

#### Scenario: Leaderboard while offline
- **WHEN** the leaderboard request fails with a network error
- **THEN** the screen shows the same message and a Retry button, and the back control still works

#### Scenario: Retry succeeds
- **WHEN** the server is back and the player activates Retry
- **THEN** the request is repeated and its result is shown

#### Scenario: Play continues
- **WHEN** the server is unreachable
- **THEN** moves, new rounds and the scoreboard work as before

### Requirement: REQ-9 Pending result
The client SHALL keep a finished result pending until it is saved and SHALL save a round at most once. Every action that would discard the finished round, New round and Reset score, SHALL ask for confirmation while a result is pending and discard it only on confirmation. The server SHALL trust only nickname, difficulty and outcome.

#### Scenario: Failed save stays pending
- **WHEN** a save fails
- **THEN** the result remains pending and can be saved again

#### Scenario: New round while pending
- **WHEN** the player starts a new round with a pending result and declines the confirmation
- **THEN** the round is not reset and the result stays pending

#### Scenario: Discard confirmed
- **WHEN** the player confirms the new round
- **THEN** the pending result is discarded and the new round starts

#### Scenario: Reset score while pending, declined
- **WHEN** a round is over with a pending result and the player activates Reset score and declines the confirmation
- **THEN** the round, the score and the pending result are unchanged

#### Scenario: Reset score while pending, confirmed
- **WHEN** the player activates Reset score with a pending result and confirms
- **THEN** the pending result is discarded and the score and round are reset

#### Scenario: Reset score without pending result
- **WHEN** no result is pending, because none exists or it was saved
- **THEN** Reset score acts without a confirmation

#### Scenario: No double save
- **WHEN** a result was saved successfully
- **THEN** the save form is no longer offered for that round

### Requirement: REQ-10 Testable API without new dependencies
The API SHALL be built by buildApp() that accepts a store, so every route is testable with Fastify inject without a network listener, and the change SHALL add no npm dependency.

#### Scenario: Inject with in-memory store
- **WHEN** buildApp({ store }) is created with an in-memory store
- **THEN** save and leaderboard routes respond through inject

#### Scenario: Dependencies unchanged
- **WHEN** the change is complete
- **THEN** package.json and package-lock.json are unchanged

### Requirement: REQ-11 Design compliance
New screens and controls SHALL follow docs/DESIGN.md: styles only from tokens, shared Button, ChoiceGroup and Panel components, 44 px minimum targets, and English voice without exclamation marks.

#### Scenario: Stylesheet scan
- **WHEN** the stylesheet scan test runs
- **THEN** the new CSS files contain no literal colors or sizes and use only defined custom properties

#### Scenario: Narrow screen
- **WHEN** the leaderboard is viewed at 360 px width
- **THEN** nothing scrolls horizontally

### Requirement: REQ-12 Layering
Game rules SHALL stay pure in src/domain, including the player-outcome mapping and the nickname rule shared by client and server; the leaderboard screen and API client SHALL live in src/ui and the API in src/server.

#### Scenario: Outcome mapping
- **WHEN** the human played O and O wins
- **THEN** the mapped outcome is win, and an X win maps to loss

#### Scenario: Shared nickname rule
- **WHEN** the client and the server validate "a b_c-d"
- **THEN** both accept it through the same domain rule

#### Scenario: Domain stays pure
- **WHEN** src/domain files are inspected
- **THEN** they import nothing from React, Fastify or node:sqlite
