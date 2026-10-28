// Literal-value guard for every stylesheet in src/ui (docs/DESIGN.md, "Allowed literals").
// Lives outside src/ui because client code (tests included) may not import node:*.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { themeCss, tokens } from '@/ui/theme';

const namedColors = new Set(`aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue
blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue
darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid
darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink
deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold
goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush
lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey
lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime
limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen
mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin
navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise
palevioletred papayawhip peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown
salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen
steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`.split(/\s+/));

const literalPattern = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(|(?<![\w-])-?\d*\.?\d+[a-z%]*|[a-z]+/gi;
const allowedNumber = /^(?:0|100%|\d*\.?\d+fr|1px)$/;
const breakpointValues = new Set<string>(Object.values(tokens.layout.breakpoints));

function isLiteral(match: string): boolean {
  if (/^[a-z]+$/i.test(match)) return namedColors.has(match.toLowerCase());
  return !allowedNumber.test(match);
}

function valueLiterals(value: string): string[] {
  const withoutVars = value.replace(/var\(--[a-z0-9-]+\)/g, ' ').replace(/url\([^)]*\)|"[^"]*"|'[^']*'/g, ' ');
  return (withoutVars.match(literalPattern) ?? []).filter(isLiteral);
}

function mediaLiterals(css: string): string[] {
  const preludes = [...css.matchAll(/@media([^{]*)\{/g)].map((match) => match[1] ?? '');
  return preludes
    .flatMap((prelude) => prelude.match(/(?<![\w-])\d*\.?\d+[a-z%]*/gi) ?? [])
    .filter((value) => !breakpointValues.has(value));
}

/** Literal color, size or spacing values in a stylesheet, as `property: literal` entries. */
function findCssLiterals(source: string): string[] {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const bodies = [...css.matchAll(/\{([^{}]*)\}/g)].map((match) => match[1] ?? '');
  const declared = bodies.flatMap((body) => body.split(';')).flatMap((declaration) => {
    const colon = declaration.indexOf(':');
    if (colon < 0) return [];
    const property = declaration.slice(0, colon).trim();
    return valueLiterals(declaration.slice(colon + 1)).map((literal) => `${property}: ${literal}`);
  });
  return [...declared, ...mediaLiterals(css).map((literal) => `@media: ${literal}`)];
}

function usedProperties(source: string): string[] {
  return [...source.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((match) => match[1] ?? '');
}

// Read from disk: vitest does not process CSS, so `?raw` CSS imports arrive empty.
const uiDir = fileURLToPath(new URL('./ui/', import.meta.url));
const stylesheets: [string, string][] = readdirSync(uiDir, { recursive: true, encoding: 'utf8' })
  .filter((path) => path.endsWith('.css'))
  .map((path) => [path, readFileSync(join(uiDir, path), 'utf8')]);

describe('stylesheet literal guard', () => {
  it('flags hex, color functions, named colors, sizes and unitless numbers', () => {
    const css = `a { color: #fff; background: rgb(0 0 0); border: 1px solid red; margin: 4px; }
      b { color: white; background: Red; z-index: 2; transform: scale(0.9); }
      @media (min-width: 600px) { c { padding: 0; } }`;
    expect(findCssLiterals(css)).toEqual([
      'color: #fff', 'background: rgb(', 'border: red', 'margin: 4px',
      'color: white', 'background: Red', 'z-index: 2', 'transform: 0.9', '@media: 600px',
    ]);
  });

  it('allows tokens, the documented literals, keywords and selectors with digits', () => {
    const css = `/* 12px in a comment */
      h1, li:nth-child(2) > p { margin: 0; width: 100%; border-bottom: 1px solid var(--color-border); }
      .board { display: grid; grid-template-columns: 1fr 1fr 1fr; aspect-ratio: var(--layout-board-aspect-ratio);
        max-width: var(--layout-board-max-width); background: transparent; color: currentColor; }
      @keyframes mark-in { from { opacity: 0; transform: scale(var(--motion-mark-scale-from)); } }
      .mark { animation: mark-in var(--motion-base) var(--motion-easing) both; }
      .cell:disabled { opacity: var(--opacity-disabled); }
      @media (min-width: ${tokens.layout.breakpoints.wide}) and (prefers-reduced-motion: reduce) { .x { gap: var(--space-4); } }`;
    expect(findCssLiterals(css)).toEqual([]);
  });

  it('finds at least the base stylesheet', () => {
    expect(stylesheets.map(([path]) => path)).toContain('base.css');
    expect(stylesheets.find(([path]) => path === 'base.css')?.[1]).toContain('var(--color-background)');
  });

  it.each(stylesheets)('%s has no literal color, size or spacing values', (_path, source) => {
    expect(findCssLiterals(source)).toEqual([]);
  });

  it.each(stylesheets)('%s uses only custom properties defined by themeCss', (_path, source) => {
    for (const property of usedProperties(source)) expect(themeCss).toContain(`${property}:`);
  });
});

