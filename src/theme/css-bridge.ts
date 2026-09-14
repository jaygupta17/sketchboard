import type { Theme, ThemeColors, ThemeFonts, ThemeFontSize, ThemeSpacing, ThemeRadius, ThemeCanvas, ThemeRough, ThemeAnimation, ThemeTokens } from './default';
import { lightTheme } from './default';

// ── Three-Layer Variable Resolution ───────────────────────
//
// For each value, we try in order:
//   1. --sp-* (sketchpen-specific, highest priority)
//   2. Standard variable (--primary, --background, --font-sans, etc.)
//   3. Library hardcoded default (lightTheme)

function readCssVar(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(name).trim();
  return value || null;
}

/** Try --sp-* first, then standard variable, then fallback */
function resolveVar(spName: string, standardName: string | null, fallback: string): string {
  const spValue = readCssVar(spName);
  if (spValue) return spValue;
  if (standardName) {
    const stdValue = readCssVar(standardName);
    if (stdValue) return stdValue;
  }
  return fallback;
}

/** Try --sp-* first, then standard variable, then fallback (number) */
function resolveVarNum(spName: string, standardName: string | null, fallback: number): number {
  const val = resolveVar(spName, standardName, String(fallback));
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
}

// ── Theme Builder ─────────────────────────────────────────

/**
 * Create a sketchpen Theme by reading CSS custom properties from the document.
 *
 * Variable resolution order for each property:
 *   1. `--sp-*` (sketchpen-specific)
 *   2. Standard variable (`--primary`, `--background`, etc.)
 *   3. Library default (from `lightTheme`)
 */
export function themeFromCssVars(overrides?: Partial<Theme>): Theme {
  const r = resolveVar;
  const rn = resolveVarNum;
  const d = lightTheme;

  const colors: ThemeColors = {
    primary: r('--sp-primary', '--primary', d.colors.primary),
    accent: r('--sp-secondary', '--secondary', d.colors.accent),
    background: r('--sp-background', '--background', d.colors.background),
    text: r('--sp-foreground', '--foreground', d.colors.text),
    surface: r('--sp-surface', '--card', d.colors.surface),
    border: r('--sp-border', '--border', d.colors.border),
    highlight: r('--sp-highlight', '--accent', d.colors.highlight),
    danger: r('--sp-danger', '--destructive', d.colors.danger),
  };

  const bodyFont = r('--sp-font-body', '--font-sans', d.fonts.body);
  const headingFont = r('--sp-font-heading', '--font-serif', d.fonts.heading);
  const codeFont = r('--sp-font-code', '--font-mono', d.fonts.code);

  const fonts: ThemeFonts = {
    body: bodyFont,
    heading: headingFont,
    code: codeFont,
  };

  const fontSize: ThemeFontSize = {
    micro: rn('--sp-font-size-micro', null, d.fontSize.micro),
    small: rn('--sp-font-size-small', null, d.fontSize.small),
    caption: rn('--sp-font-size-caption', null, d.fontSize.caption),
    code: rn('--sp-font-size-code', null, d.fontSize.code),
    note: rn('--sp-font-size-note', null, d.fontSize.note),
    subtitle: rn('--sp-font-size-subtitle', null, d.fontSize.subtitle),
    body: rn('--sp-font-size-body', null, d.fontSize.body),
    bodyLarge: rn('--sp-font-size-body-large', null, d.fontSize.bodyLarge),
    title: rn('--sp-font-size-title', null, d.fontSize.title),
  };

  const spacing: ThemeSpacing = {
    '2xs': r('--sp-spacing-2xs', null, d.spacing['2xs']),
    xs: r('--sp-spacing-xs', null, d.spacing.xs),
    sm: r('--sp-spacing-sm', null, d.spacing.sm),
    md: r('--sp-spacing-md', null, d.spacing.md),
    lg: r('--sp-spacing-lg', null, d.spacing.lg),
    xl: r('--sp-spacing-xl', null, d.spacing.xl),
    '2xl': r('--sp-spacing-2xl', null, d.spacing['2xl']),
  };

  const radius: ThemeRadius = {
    sm: r('--sp-radius-sm', '--radius-sm', d.radius.sm),
    md: r('--sp-radius-md', '--radius-md', d.radius.md),
    lg: r('--sp-radius-lg', '--radius-lg', d.radius.lg),
    xl: r('--sp-radius-xl', '--radius-xl', d.radius.xl),
    full: r('--sp-radius-full', null, d.radius.full),
  };

  const canvas: ThemeCanvas = {
    background: r('--sp-canvas-background', '--background', d.canvas.background),
    gridDotColor: r('--sp-grid-dot-color', '--border', d.canvas.gridDotColor),
    gridDotSize: rn('--sp-grid-dot-size', null, d.canvas.gridDotSize),
    gridGap: rn('--sp-grid-gap', null, d.canvas.gridGap),
  };

  const rough: ThemeRough = {
    strokeWidth: rn('--sp-rough-stroke-width', null, d.rough.strokeWidth),
    roughness: rn('--sp-rough-roughness', null, d.rough.roughness),
    bowing: rn('--sp-rough-bowing', null, d.rough.bowing),
  };

  const animation: ThemeAnimation = {
    durationFast: r('--sp-duration-fast', null, d.animation.durationFast),
    durationNormal: r('--sp-duration-normal', null, d.animation.durationNormal),
    durationSlow: r('--sp-duration-slow', null, d.animation.durationSlow),
    staggerMs: rn('--sp-stagger-ms', null, d.animation.staggerMs),
  };

  const tokens: ThemeTokens = {
    colors,
    fonts,
    codeBg: r('--sp-code-bg', '--muted', d.tokens.codeBg),
    codeText: r('--sp-code-text', '--foreground', d.tokens.codeText),
    note: {
      primary: {
        bg: r('--sp-note-primary-bg', null, d.tokens.note.primary.bg),
        border: r('--sp-note-primary-border', null, d.tokens.note.primary.border),
        text: r('--sp-note-primary-text', null, d.tokens.note.primary.text),
      },
      accent: {
        bg: r('--sp-note-accent-bg', null, d.tokens.note.accent.bg),
        border: r('--sp-note-accent-border', null, d.tokens.note.accent.border),
        text: r('--sp-note-accent-text', null, d.tokens.note.accent.text),
      },
      highlight: {
        bg: r('--sp-note-highlight-bg', null, d.tokens.note.highlight.bg),
        border: r('--sp-note-highlight-border', null, d.tokens.note.highlight.border),
        text: r('--sp-note-highlight-text', null, d.tokens.note.highlight.text),
      },
      danger: {
        bg: r('--sp-note-danger-bg', null, d.tokens.note.danger.bg),
        border: r('--sp-note-danger-border', null, d.tokens.note.danger.border),
        text: r('--sp-note-danger-text', null, d.tokens.note.danger.text),
      },
    },
    diagramPalette: d.tokens.diagramPalette,
    diagramAxis: r('--sp-diagram-axis', '--muted-foreground', d.tokens.diagramAxis),
    diagramLabel: r('--sp-diagram-label', '--muted-foreground', d.tokens.diagramLabel),
  };

  const base: Theme = {
    id: 'css-vars',
    name: 'CSS Variables',
    colors,
    fonts,
    tokens,
    fontSize,
    spacing,
    radius,
    canvas,
    rough,
    animation,
  };

  return overrides ? { ...base, ...overrides } : base;
}

/**
 * Detect if the document has CSS custom properties that match
 * the expected shadcn/tailwind pattern.
 */
export function hasCssVarTheme(): boolean {
  if (typeof document === 'undefined') return false;
  return readCssVar('--primary') !== null || readCssVar('--sp-primary') !== null;
}
