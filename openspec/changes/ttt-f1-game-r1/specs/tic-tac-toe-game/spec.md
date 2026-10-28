# Spec Delta

## Purpose

Lets one or two players play tic-tac-toe in the browser with a session score, an accessible interface and a polished look.

## ADDED Requirements

### Requirement: REQ-1 Board and legal moves
The system SHALL provide a 3x3 board where X and O alternate, SHALL reject a move on an occupied cell without changing board or turn, and SHALL accept no move after the round is over.

#### Scenario: Occupied cell rejected
- **WHEN** a player activates a cell that already holds a mark
- **THEN** the board and the turn are unchanged

#### Scenario: Move after round end
- **WHEN** the round has a winner or is a draw and a player activates an empty cell
- **THEN** no mark is placed

### Requirement: REQ-2 Winner and draw detection
The system SHALL detect all eight winning lines and report the winning line, and SHALL report a draw when the board is full without a line.

#### Scenario: Each line wins
- **WHEN** X or O fills any row, column or diagonal
- **THEN** that mark is the winner and the three cells of the line are reported

#### Scenario: Full board draw
- **WHEN** all nine cells are filled and no line is complete
- **THEN** the round is a draw

### Requirement: REQ-3 Mode and difficulty selection
The system SHALL let the player choose before a round between two players on one device and one player against the computer, with easy, medium or hard in computer mode, SHALL lock these choices until the round ends, and SHALL keep the score when they change.

#### Scenario: Computer mode offers difficulty
- **WHEN** the player selects the computer mode
- **THEN** easy, medium and hard are offered

#### Scenario: Locked during a round
- **WHEN** a round is in progress
- **THEN** mode, difficulty and mark controls are disabled and enabled again after the round ends

#### Scenario: Score survives a mode change
- **WHEN** the mode or difficulty changes between two rounds
- **THEN** the scoreboard counts are unchanged

### Requirement: REQ-4 Player mark and fair starter
The system SHALL let the player choose X or O in computer mode, SHALL start round 1 with X, and SHALL alternate the starting mark every following round, including after a draw.

#### Scenario: Alternating starter
- **WHEN** four rounds are played in a session, one of them a draw
- **THEN** the starters are X, O, X, O

#### Scenario: Player chooses O
- **WHEN** the player chooses O against the computer
- **THEN** the computer plays X and moves first in round 1

### Requirement: REQ-5 Computer players
The system SHALL provide easy (uniformly random legal move from an injected random source, ignoring wins and threats, so it can miss a win or a block), medium (win, else block, else random) and hard (perfect minimax, never loses).

#### Scenario: Easy ignores an available win
- **WHEN** the computer could complete a line and the injected random selects a different legal cell
- **THEN** easy plays the randomly selected cell and not the winning cell

#### Scenario: Easy ignores a threat
- **WHEN** the opponent threatens to win next move and the injected random selects a non-blocking legal cell
- **THEN** easy plays that cell and does not block

#### Scenario: Easy can reach every legal cell
- **WHEN** the injected random value is swept over its range on a position with several legal cells
- **THEN** every legal cell is chosen at least once and no occupied cell is ever chosen

#### Scenario: Medium takes the win
- **WHEN** the computer can complete a line with one move
- **THEN** medium plays that move

#### Scenario: Medium blocks
- **WHEN** the computer cannot win and the opponent threatens to win next move
- **THEN** medium plays the blocking cell

#### Scenario: Hard never loses
- **WHEN** hard plays against every possible opponent sequence in either starting order
- **THEN** hard never ends in a loss

### Requirement: REQ-6 Visible thinking pause
The system SHALL block the board during a short visible pause before the computer's mark appears, and SHALL NOT apply a pending computer move to a different round.

#### Scenario: Board blocked while thinking
- **WHEN** the player has moved in computer mode
- **THEN** a thinking indication is shown, cells do not accept input, and the computer's mark appears after the pause

#### Scenario: Stale move discarded
- **WHEN** New round or Reset score is used during the pause
- **THEN** the pending computer move is cancelled and does not appear in the new round

### Requirement: REQ-7 Turn and result display
The system SHALL always show whose turn it is, including after the computer's move, and at round end SHALL show the winner and highlight the winning line, or announce a draw.

#### Scenario: Turn shown
- **WHEN** a round starts or any move is made
- **THEN** the turn indicator names the player to move

#### Scenario: Win highlighted
- **WHEN** a line is completed
- **THEN** the winner is named and the three winning cells are highlighted

#### Scenario: Draw announced
- **WHEN** the board is full without a line
- **THEN** a draw is announced

### Requirement: REQ-8 Scoreboard and round controls
The system SHALL show a session scoreboard of X wins, O wins and draws; New round SHALL keep the counts and Reset score SHALL set all three to zero.

#### Scenario: New round keeps score
- **WHEN** a round ends and the player chooses New round
- **THEN** a fresh board is shown and the counts are unchanged

#### Scenario: Reset score
- **WHEN** the player chooses Reset score
- **THEN** X wins, O wins and draws all show 0

### Requirement: REQ-9 Mouse, touch and keyboard operation
The system SHALL be fully operable by mouse, touch and keyboard alone: the board is a single tab stop (roving tabindex), arrow keys move focus to the adjacent cell without placing a mark and stay on the edge cell instead of wrapping, Enter or Space places a mark, and setup, New round and Reset score are reachable by keyboard.

#### Scenario: Keyboard-only round
- **WHEN** a player uses only Tab, arrow keys, Enter and Space
- **THEN** a full round can be played to its result, every cell after the first is reached with arrow keys, and a new round can be started

#### Scenario: Single tab stop
- **WHEN** the board is rendered
- **THEN** exactly one cell is in the tab order and Tab moves focus past the board to the next control

#### Scenario: Arrow keys move focus
- **WHEN** focus is on a cell and the player presses ArrowRight, ArrowLeft, ArrowDown or ArrowUp
- **THEN** focus moves to the adjacent cell in that direction and no mark is placed

#### Scenario: Arrow navigation at the edge
- **WHEN** focus is on a cell at the edge of the board and the player presses the arrow key pointing off the board
- **THEN** focus stays on the same cell, does not wrap, and no mark is placed

### Requirement: REQ-10 Screen reader support
The system SHALL expose each cell's position and state (empty, X or O) and SHALL announce each move, the next turn and the round result through a polite live region.

#### Scenario: Cell names
- **WHEN** a screen reader reads a cell
- **THEN** it announces row, column and empty, X or O

#### Scenario: Result announced
- **WHEN** a round ends
- **THEN** the live region announces the winner or the draw

### Requirement: REQ-11 Responsive and color-scheme support
The system SHALL be usable at 360 px width without horizontal scrolling with controls of at least 44 px, SHALL work on desktop, and SHALL keep text contrast of at least 4.5:1 in light and dark color schemes.

#### Scenario: Phone width
- **WHEN** the viewport is 360 px wide
- **THEN** there is no horizontal scroll and all controls are at least 44 px

#### Scenario: Dark scheme
- **WHEN** the system color scheme is dark
- **THEN** the game uses the dark token values and stays legible

### Requirement: REQ-12 Calm, polished look and motion
The system SHALL present the calm and focused visual direction with subtle animations for mark placement, the winning line and turn changes, and SHALL disable or reduce them under prefers-reduced-motion.

#### Scenario: Subtle feedback
- **WHEN** a mark is placed or a line is won
- **THEN** a short animation within the design's motion durations plays

#### Scenario: Reduced motion
- **WHEN** prefers-reduced-motion is set
- **THEN** animations are removed or reduced to non-motion changes

### Requirement: REQ-13 Design document and tokens
The system SHALL include docs/DESIGN.md with Direction, Tokens, Layout, Components, Motion and Voice, and one theme tokens module, created before screens, from which every screen takes its styles.

#### Scenario: Document exists
- **WHEN** the change is complete
- **THEN** docs/DESIGN.md has all six sections and names the tokens module

#### Scenario: No literal styles
- **WHEN** screen styles are reviewed
- **THEN** colors, sizes and spacing come from tokens and shared components

### Requirement: REQ-14 Pure domain with unit tests
The system SHALL implement board, winner and draw detection, legal moves, computer players and session transitions as pure functions in src/domain with unit tests, including exhaustive hard-player tests.

#### Scenario: Domain is pure
- **WHEN** src/domain is inspected
- **THEN** it imports no React or DOM APIs and takes randomness as an injected input

#### Scenario: Exhaustive hard test
- **WHEN** the unit tests run
- **THEN** hard is checked against the full opponent move tree in both starting orders

### Requirement: REQ-15 Project constraints
The system SHALL add no dependencies, SHALL remain a static Vite client build, SHALL keep React components in src/ui with English UI text, and SHALL replace the placeholder screen.

#### Scenario: Dependencies unchanged
- **WHEN** the change is complete
- **THEN** package.json and the lockfile are unchanged and `npm run check` passes

### Requirement: REQ-16 Plain session result for F2
The system SHALL expose a finished round's result as a plain serializable value (winner or draw, mode, difficulty, player mark) and SHALL NOT build server or leaderboard features.

#### Scenario: Serializable result
- **WHEN** a round ends
- **THEN** the result value survives a JSON round trip unchanged and no network request is made
