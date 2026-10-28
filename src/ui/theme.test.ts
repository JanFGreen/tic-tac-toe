import { describe, expect, it } from 'vitest';
import { themeCss, tokens } from './theme';

type Scheme = keyof typeof tokens.color;
type ColorName = keyof typeof tokens.color.light;

const schemes: readonly Scheme[] = ['light', 'dark'];

const requiredColors = [
  'background', 'surface', 'textPrimary', 'textSecondary', 'primary', 'accent', 'success',
  'warning', 'danger', 'focusRing', 'markX', 'markO',
] as const;

function channel(hex: string, index: number): number {
  const value = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
}

/** WCAG 2.x contrast ratio of two #rrggbb colors. */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function mediaBlock(css: string, query: string): string {
  const start = css.indexOf(`@media (${query})`);
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('\n}', start));
}

function rootBlock(css: string): string {
  return css.slice(css.indexOf(':root {'), css.indexOf('\n}'));
}

describe('tokens contract', () => {
  it.each(schemes)('defines every required color in the %s scheme as #rrggbb', (scheme) => {
    const colors: Readonly<Record<string, string>> = tokens.color[scheme];
    for (const name of requiredColors) expect(colors[name]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('pins the type scale, space steps, motion durations and layout values', () => {
    expect(Object.values(tokens.typeScale).map((step) => step.size)).toEqual(['12px', '14px', '16px', '20px', '24px', '32px']);
    for (const step of Object.values(tokens.typeScale)) {
      expect(step.weight).toBeGreaterThanOrEqual(400);
      expect(step.lineHeight).toBeGreaterThan(1);
    }
    expect(Object.values(tokens.space)).toEqual(['4px', '8px', '12px', '16px', '24px', '32px', '48px']);
    expect(tokens.motion).toMatchObject({ fast: '150ms', base: '200ms', slow: '250ms' });
    expect(tokens.motion.easing).toMatch(/^cubic-bezier\(/);
    expect(tokens.layout.minTouchTarget).toBe('44px');
    expect(tokens.layout.maxContentWidth).toMatch(/^\d+px$/);
    expect(Object.keys(tokens.layout.breakpoints).length).toBeGreaterThan(0);
    expect(tokens.font.family).toContain('sans-serif');
    expect(Object.keys(tokens.radius).length).toBeGreaterThan(0);
    expect(Object.keys(tokens.elevation).length).toBeGreaterThan(0);
  });
});

describe('contrast (WCAG)', () => {
  const textColors: readonly ColorName[] = ['textPrimary', 'textSecondary', 'primary', 'accent', 'success', 'warning', 'danger'];
  const graphicColors: readonly ColorName[] = ['markX', 'markO', 'focusRing'];
  const grounds: readonly ColorName[] = ['background', 'surface'];

  it.each(schemes)('text colors reach 4.5:1 on background and surface in %s', (scheme) => {
    const colors = tokens.color[scheme];
    for (const text of textColors) {
      for (const ground of grounds) {
        expect(contrast(colors[text], colors[ground]), `${text} on ${ground}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it.each(schemes)('a surface-colored label reaches 4.5:1 on primary in %s', (scheme) => {
    const colors = tokens.color[scheme];
    expect(contrast(colors.surface, colors.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(schemes)('marks and the focus ring reach 3:1 on background and surface in %s', (scheme) => {
    const colors = tokens.color[scheme];
    for (const graphic of graphicColors) {
      for (const ground of grounds) {
        expect(contrast(colors[graphic], colors[ground]), `${graphic} on ${ground}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('themeCss', () => {
  const root = rootBlock(themeCss);

  it('declares every color in :root with its light value', () => {
    for (const [name, value] of Object.entries(tokens.color.light)) {
      expect(root).toContain(`--color-${kebab(name)}: ${value};`);
    }
  });

  it('declares every non-color token in :root', () => {
    const { breakpoints, ...layout } = tokens.layout;
    const flat: [string, string | number][] = [
      ['font-family', tokens.font.family],
      ...Object.entries(tokens.typeScale).flatMap(([step, type]): [string, string | number][] => [
        [`font-size-${step}`, type.size],
        [`font-weight-${step}`, type.weight],
        [`font-line-height-${step}`, type.lineHeight],
      ]),
      ...Object.entries(tokens.space).map(([step, value]): [string, string] => [`space-${step}`, value]),
      ...Object.entries(tokens.radius).map(([name, value]): [string, string] => [`radius-${name}`, value]),
      ...Object.entries(tokens.elevation).map(([name, value]): [string, string] => [`shadow-${name}`, value]),
      ...Object.entries(tokens.opacity).map(([name, value]): [string, number] => [`opacity-${kebab(name)}`, value]),
      ...Object.entries(tokens.motion).map(([name, value]): [string, string | number] => [`motion-${kebab(name)}`, value]),
      ...Object.entries(breakpoints).map(([name, value]): [string, string] => [`layout-breakpoint-${name}`, value]),
      ...Object.entries(layout).map(([name, value]): [string, string] => [`layout-${kebab(name)}`, value]),
    ];
    for (const [name, value] of flat) expect(root).toContain(`--${name}: ${String(value)};`);
  });

  it('overrides every color with its dark value under prefers-color-scheme: dark', () => {
    const dark = mediaBlock(themeCss, 'prefers-color-scheme: dark');
    for (const [name, value] of Object.entries(tokens.color.dark)) {
      expect(dark).toContain(`--color-${kebab(name)}: ${value};`);
    }
  });

  it('zeroes the motion durations and the scale effects under prefers-reduced-motion', () => {
    const reduced = mediaBlock(themeCss, 'prefers-reduced-motion: reduce');
    for (const name of ['fast', 'base', 'slow']) expect(reduced).toContain(`--motion-${name}: 0ms;`);
    expect(reduced).toContain('--motion-mark-scale-from: 1;');
    expect(reduced).toContain('--motion-line-scale-from: 1;');
  });
});

const designDocs = import.meta.glob<string>('../../docs/DESIGN.md', { query: '?raw', import: 'default', eager: true });

describe('docs/DESIGN.md', () => {
  const doc = designDocs['../../docs/DESIGN.md'] ?? '';

  it.each(['Direction', 'Tokens', 'Layout', 'Components', 'Motion', 'Voice'])('has the section %s', (section) => {
    expect(doc).toMatch(new RegExp(`^## ${section}$`, 'm'));
  });

  it('names the token module and the shared components', () => {
    for (const name of ['src/ui/theme.ts', 'Button', 'ChoiceGroup', 'Panel']) expect(doc).toContain(name);
  });
});
