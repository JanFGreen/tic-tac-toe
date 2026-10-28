# Design

The visual and interaction rules for the tic-tac-toe client. Every screen follows this document.

## Direction

Calm and focused. One centered column, quiet neutral surfaces, one blue primary color and two
clearly different mark colors (X blue, O terracotta). The board is the hero. Everything else (setup,
scoreboard, round controls) is set back in plain panels. No gradients, no decoration, no sound.
Feedback is short and subtle. Light and dark schemes follow the system setting.

## Tokens

`src/ui/theme.ts` is the only token module. It exports `tokens` (typed, `as const`) and
`themeCss`. `src/main.tsx` injects `themeCss` once into a `<style>` element in `document.head`.
Stylesheets read tokens only through these custom properties:

| Group | Custom properties | Values |
|---|---|---|
| Color | `--color-background`, `--color-surface`, `--color-border`, `--color-text-primary`, `--color-text-secondary`, `--color-primary`, `--color-accent`, `--color-success`, `--color-warning`, `--color-danger`, `--color-focus-ring`, `--color-mark-x`, `--color-mark-o` | light in `:root`, dark under `@media (prefers-color-scheme: dark)` |
| Font | `--font-family`, `--font-size-{xs,sm,md,lg,xl,xxl}`, `--font-weight-*`, `--font-line-height-*` | 12 / 14 / 16 / 20 / 24 / 32 px |
| Space | `--space-1` … `--space-7` | 4 / 8 / 12 / 16 / 24 / 32 / 48 px |
| Radius | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full` | 6 / 10 / 16 px, pill |
| Elevation | `--shadow-low`, `--shadow-high` | panel, raised button |
| Opacity | `--opacity-disabled` | disabled controls |
| Motion | `--motion-fast`, `--motion-base`, `--motion-slow`, `--motion-easing`, `--motion-mark-scale-from`, `--motion-line-scale-from` | 150 / 200 / 250 ms |
| Layout | `--layout-max-content-width`, `--layout-board-max-width`, `--layout-board-aspect-ratio`, `--layout-min-touch-target`, `--layout-focus-ring-width`, `--layout-focus-ring-offset`, `--layout-breakpoint-wide` | 560 px column, 360 px board, 1 / 1, 44 px |

Color use:

- `textPrimary` and `textSecondary` are body text. `primary`, `accent`, `success`, `warning` and
  `danger` may be text too (status, result, error). Every one of them reaches 4.5:1 on
  `background` and `surface` in both schemes (`src/ui/theme.test.ts`).
- A filled primary button uses `surface` as its label color on `primary` (4.5:1 or more).
- `markX`, `markO` and `focusRing` reach 3:1 on `background` and `surface` (large graphics).
- `border` is only for 1px hairlines, never for text.

### Allowed literals

A stylesheet in `src/ui` may contain no literal color, size or spacing value. Allowed are only:

- `0`, `100%`, `fr` units (write `1fr 1fr 1fr`, not `repeat(3, 1fr)`) and `1px` for hairlines;
- keywords such as `none`, `auto`, `grid`, `solid`, `inherit`, `transparent` and `currentColor`.
  Named colors (`white`, `red`, `black`, ...) are color literals and are **not** allowed;
- in `@media` conditions, only the breakpoint values from `tokens.layout.breakpoints`
  (custom properties cannot be used in media queries).

Everything else (numbers, units, hex, `rgb()` and other color functions, unitless numbers such
as `opacity`, `z-index`, `flex: 1` or `scale(0.9)`) comes from a token through `var(--…)`.
Add a token to `src/ui/theme.ts` and to this document instead of writing a literal.
`src/stylesheets.test.ts` scans every `src/ui/**/*.css` file for literals and for custom
properties that `themeCss` does not define.

## Layout

- One centered column, at most `--layout-max-content-width` wide, with `--space-4` side padding.
  Nothing scrolls horizontally at 360 px.
- Order from top: title, turn/status line, board, scoreboard, round controls (New round,
  Reset score), setup panel. From `--layout-breakpoint-wide` the setup panel may sit beside the
  board.
- The board is a square 3x3 grid (`aspect-ratio: var(--layout-board-aspect-ratio)`,
  `grid-template-columns: 1fr 1fr 1fr`), `width: 100%` up to `--layout-board-max-width`, with
  `--space-2` gaps.
- Every interactive control is at least `--layout-min-touch-target` (44 px) high and wide.
- Spacing between groups `--space-5`, inside a panel `--space-3` or `--space-4`.

## Components

Shared components live in `src/ui` and are the only place where controls get their look:

- **Button**: native `<button>`. Variants primary (filled `primary`, label `surface`) and
  secondary (`surface` with a 1px `border` hairline). `--radius-md`, min size 44 px,
  disabled with `--opacity-disabled`.
- **ChoiceGroup**: a `<fieldset>` with `<legend>` and radio inputs styled as a segmented control,
  used for mode, difficulty and mark. The whole group is disabled during a round.
- **Panel**: a `surface` card with a 1px `border` hairline, `--radius-lg`, `--shadow-low`
  and `--space-4` padding; used for setup and scoreboard.

The board cells are native buttons (mouse, touch and keyboard work the same). The focus ring is
`:focus-visible` with `--layout-focus-ring-width` in `--color-focus-ring` (set in `base.css`).

## Motion

- Mark placement: the mark fades in and scales from `--motion-mark-scale-from` to full size in
  `--motion-base`.
- Winning line: the three cells get a `success`-tinted highlight; the line scales from
  `--motion-line-scale-from` in `--motion-slow`.
- Turn change: the status text cross-fades in `--motion-fast`.
- Animate only `opacity` and `transform`, always with `--motion-easing` and a `--motion-*`
  duration. Write keyframes with `from` only, so the end state is the element's own style.
- Under `prefers-reduced-motion: reduce`, `themeCss` sets every duration to `0ms` and both scale
  tokens to `1`, so the same rules become instant, non-moving changes.

## Voice

English, short and plain. Name the actor and the action.

- Turn: "X to move", "O to move", "Computer is thinking…".
- Result: "X wins", "O wins", "Draw".
- Controls: "New round", "Reset score", "Two players", "Against the computer", "Easy",
  "Medium", "Hard", "Play as X", "Play as O".
- Cells for screen readers: "Row 1, column 2, empty", "Row 3, column 3, X".
- No exclamation marks, no blame, no jokes.
