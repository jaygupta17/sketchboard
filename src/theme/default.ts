// ─────────────────────────────────────────────────────────────
// Theme Type Definitions + Default Themes
// All visual design tokens live here.
// ─────────────────────────────────────────────────────────────

// ── Colors ────────────────────────────────────────────────

export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  text: string;
  surface: string;
  border: string;
  highlight: string;
  danger: string;
}

export interface ThemeNoteColors {
  bg: string;
  border: string;
  text: string;
}

// ── Fonts ─────────────────────────────────────────────────

export interface ThemeFonts {
  body: string;
  heading: string;
  code: string;
}

// ── Font Sizes ────────────────────────────────────────────

export interface ThemeFontSize {
  micro: number;
  small: number;
  caption: number;
  code: number;
  note: number;
  subtitle: number;
  body: number;
  bodyLarge: number;
  title: number;
}

// ── Spacing ───────────────────────────────────────────────

export interface ThemeSpacing {
  '2xs': string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

// ── Border Radius ─────────────────────────────────────────

export interface ThemeRadius {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

// ── Canvas ────────────────────────────────────────────────

export interface ThemeCanvas {
  background: string;
  gridDotColor: string;
  gridDotSize: number;
  gridGap: number;
}

// ── Rough.js Config ───────────────────────────────────────

export interface ThemeRough {
  strokeWidth: number;
  roughness: number;
  bowing: number;
}

// ── Animation ─────────────────────────────────────────────

export interface ThemeAnimation {
  durationFast: string;
  durationNormal: string;
  durationSlow: string;
  staggerMs: number;
}

// ── Tokens (legacy, kept for backwards compat) ────────────

export interface ThemeTokens {
  colors: ThemeColors;
  fonts: ThemeFonts;
  codeBg: string;
  codeText: string;
  note: Record<'primary' | 'accent' | 'highlight' | 'danger', ThemeNoteColors>;
  diagramPalette: string[];
  diagramAxis: string;
  diagramLabel: string;
}

// ── Full Theme ────────────────────────────────────────────

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  tokens: ThemeTokens;
  fontSize: ThemeFontSize;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  canvas: ThemeCanvas;
  rough: ThemeRough;
  animation: ThemeAnimation;
}

// ── Default Light Theme (matches globals.css warm palette) ─

const defaultFonts: ThemeFonts = {
  body: "'Delius Swash Caps', system-ui, -apple-system, sans-serif",
  heading: "'Delius Swash Caps', system-ui, -apple-system, sans-serif",
  code: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
};

const defaultFontSize: ThemeFontSize = {
  micro: 10,
  small: 12,
  caption: 14,
  code: 16,
  note: 18,
  subtitle: 18,
  body: 22,
  bodyLarge: 24,
  title: 32,
};

const defaultSpacing: ThemeSpacing = {
  '2xs': '4px',
  xs: '6px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
};

const defaultRadius: ThemeRadius = {
  sm: '4px',
  md: '8px',
  lg: '10px',
  xl: '14px',
  full: '50%',
};

export const lightTheme: Theme = {
  id: 'light',
  name: 'Light',
  colors: {
    primary: '#c98a2a',
    accent: '#b46820',
    background: '#f6f0df',
    text: '#6b5a2f',
    surface: '#faf5e4',
    border: '#d4c39a',
    highlight: '#e5c95c',
    danger: '#c44440',
  },
  fonts: { ...defaultFonts },
  tokens: {
    colors: {
      primary: '#c98a2a',
      accent: '#b46820',
      background: '#f6f0df',
      text: '#6b5a2f',
      surface: '#faf5e4',
      border: '#d4c39a',
      highlight: '#e5c95c',
      danger: '#c44440',
    },
    fonts: { ...defaultFonts },
    codeBg: '#ede7cd',
    codeText: '#525252',
    note: {
      primary: { bg: '#f5edc4', border: '#c98a2a', text: '#5c3e00' },
      accent: { bg: '#f0d8b8', border: '#b46820', text: '#6b3a00' },
      highlight: { bg: '#f5e8b0', border: '#e5c95c', text: '#6b5000' },
      danger: { bg: '#f2d4d4', border: '#c44440', text: '#6b2020' },
    },
    diagramPalette: ['#c98a2a', '#b46820', '#6b8a5a', '#c44440', '#7a6aaa', '#aa6a8a'],
    diagramAxis: '#8a7a5a',
    diagramLabel: '#8a7a5a',
  },
  fontSize: { ...defaultFontSize },
  spacing: { ...defaultSpacing },
  radius: { ...defaultRadius },
  canvas: {
    background: '#f6f0df',
    gridDotColor: '#d4c39a',
    gridDotSize: 1,
    gridGap: 20,
  },
  rough: {
    strokeWidth: 1.5,
    roughness: 0.8,
    bowing: 1,
  },
  animation: {
    durationFast: '200ms',
    durationNormal: '300ms',
    durationSlow: '400ms',
    staggerMs: 50,
  },
};

export const darkTheme: Theme = {
  id: 'dark',
  name: 'Dark',
  colors: {
    primary: '#e5a84a',
    accent: '#d48040',
    background: '#1a1508',
    text: '#e8dcc0',
    surface: '#241e10',
    border: '#3a3020',
    highlight: '#8a6a10',
    danger: '#e06060',
  },
  fonts: { ...defaultFonts },
  tokens: {
    colors: {
      primary: '#e5a84a',
      accent: '#d48040',
      background: '#1a1508',
      text: '#e8dcc0',
      surface: '#241e10',
      border: '#3a3020',
      highlight: '#8a6a10',
      danger: '#e06060',
    },
    fonts: { ...defaultFonts },
    codeBg: '#241e10',
    codeText: '#e8dcc0',
    note: {
      primary: { bg: '#3a2800', border: '#e5a84a', text: '#f5edc4' },
      accent: { bg: '#3a2000', border: '#d48040', text: '#f0d8b8' },
      highlight: { bg: '#3a3000', border: '#8a6a10', text: '#f5e8b0' },
      danger: { bg: '#3a1010', border: '#e06060', text: '#f2d4d4' },
    },
    diagramPalette: ['#e5a84a', '#d48040', '#8aaa7a', '#e06060', '#9a8aca', '#ca8aaa'],
    diagramAxis: '#8a7a5a',
    diagramLabel: '#9a8a6a',
  },
  fontSize: { ...defaultFontSize },
  spacing: { ...defaultSpacing },
  radius: { ...defaultRadius },
  canvas: {
    background: '#1a1508',
    gridDotColor: '#3a3020',
    gridDotSize: 1,
    gridGap: 20,
  },
  rough: {
    strokeWidth: 1.5,
    roughness: 0.8,
    bowing: 1,
  },
  animation: {
    durationFast: '200ms',
    durationNormal: '300ms',
    durationSlow: '400ms',
    staggerMs: 50,
  },
};

export function createTheme(overrides: Partial<Theme>): Theme {
  return { ...lightTheme, ...overrides };
}

export type ThemeId = 'light' | 'dark';

export function getTheme(id: ThemeId): Theme {
  return id === 'dark' ? darkTheme : lightTheme;
}
