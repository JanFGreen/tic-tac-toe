/**
 * The one theme module (docs/DESIGN.md, "Tokens"). Every visual value of the UI lives here;
 * stylesheets read them only through the custom properties emitted by `themeCss`.
 */

const lightColors = {
  background: '#f4f6f8',
  surface: '#ffffff',
  border: '#d5dbe2',
  textPrimary: '#1b2330',
  textSecondary: '#4a5565',
  primary: '#2b5c8a',
  accent: '#5a4ca6',
  success: '#1d7348',
  warning: '#8a5300',
  danger: '#b3261e',
  focusRing: '#2563eb',
  markX: '#2b5c8a',
  markO: '#b04a1f',
};

export const tokens = {
  color: {
    light: lightColors,
    dark: {
      background: '#11151b',
      surface: '#1a2029',
      border: '#323b47',
      textPrimary: '#e7ebf0',
      textSecondary: '#a9b3bf',
      primary: '#8cb8e4',
      accent: '#b9aef2',
      success: '#6fd39f',
      warning: '#e9bb62',
      danger: '#f4938a',
      focusRing: '#8ab4f8',
      markX: '#8cb8e4',
      markO: '#f2a27c',
    } satisfies Record<keyof typeof lightColors, string>,
  },
  font: {
    family: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  typeScale: {
    xs: { size: '12px', weight: 400, lineHeight: 1.5 },
    sm: { size: '14px', weight: 400, lineHeight: 1.5 },
    md: { size: '16px', weight: 400, lineHeight: 1.5 },
    lg: { size: '20px', weight: 600, lineHeight: 1.4 },
    xl: { size: '24px', weight: 600, lineHeight: 1.3 },
    xxl: { size: '32px', weight: 700, lineHeight: 1.2 },
  },
  space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '24px', 6: '32px', 7: '48px' },
  radius: { sm: '6px', md: '10px', lg: '16px', full: '999px' },
  elevation: {
    low: '0 1px 2px rgb(16 24 40 / 0.08)',
    high: '0 8px 24px rgb(16 24 40 / 0.14)',
  },
  opacity: { disabled: 0.55 },
  motion: {
    fast: '150ms',
    base: '200ms',
    slow: '250ms',
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    markScaleFrom: 0.85,
    lineScaleFrom: 0.96,
  },
  layout: {
    maxContentWidth: '560px',
    boardMaxWidth: '360px',
    boardAspectRatio: '1 / 1',
    minTouchTarget: '44px',
    focusRingWidth: '3px',
    focusRingOffset: '2px',
    breakpoints: { wide: '720px' },
  },
} as const;

type TokenGroup = Readonly<Record<string, string | number>>;

const motionDurations = ['fast', 'base', 'slow'] as const;

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function declarations(prefix: string, group: TokenGroup): string[] {
  return Object.entries(group).map(([name, value]) => `  --${prefix}-${kebab(name)}: ${String(value)};`);
}

function typeScaleDeclarations(): string[] {
  return Object.entries(tokens.typeScale).flatMap(([step, type]) => [
    `  --font-size-${step}: ${type.size};`,
    `  --font-weight-${step}: ${String(type.weight)};`,
    `  --font-line-height-${step}: ${String(type.lineHeight)};`,
  ]);
}

function rule(selector: string, lines: readonly string[]): string {
  return `${selector} {\n${lines.join('\n')}\n}`;
}

function buildThemeCss(): string {
  const { breakpoints, ...layout } = tokens.layout;
  const root = rule(':root', [
    '  color-scheme: light dark;',
    ...declarations('color', tokens.color.light),
    ...declarations('font', tokens.font),
    ...typeScaleDeclarations(),
    ...declarations('space', tokens.space),
    ...declarations('radius', tokens.radius),
    ...declarations('shadow', tokens.elevation),
    ...declarations('opacity', tokens.opacity),
    ...declarations('motion', tokens.motion),
    ...declarations('layout', layout),
    ...declarations('layout-breakpoint', breakpoints),
  ]);
  const dark = rule('@media (prefers-color-scheme: dark)', [rule(':root', declarations('color', tokens.color.dark))]);
  const stillMotion = [
    ...motionDurations.map((name) => `  --motion-${name}: 0ms;`),
    '  --motion-mark-scale-from: 1;',
    '  --motion-line-scale-from: 1;',
  ];
  const reducedMotion = rule('@media (prefers-reduced-motion: reduce)', [rule(':root', stillMotion)]);
  return [root, dark, reducedMotion].join('\n\n') + '\n';
}

/** All tokens as CSS custom properties; computed once and injected by src/main.tsx. */
export const themeCss: string = buildThemeCss();
