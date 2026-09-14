// ─────────────────────────────────────────────────────────────
// TutorCanvas Core — Constants & Size Contracts
// All hardcoded values from the spec. Non-negotiable.
// ─────────────────────────────────────────────────────────────

import type { BlockType, SizeVariant, DiagramType } from './types';

// ── Canvas Dimensions ──────────────────────────────────────

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

// ── Gap Rules ──────────────────────────────────────────────

export const GAP = {
  /** Horizontal gap between nodes (px) */
  HORIZONTAL: 44,
  /** Vertical gap between nodes (px) */
  VERTICAL: 36,
  /** Node to scene edge — top/left/bottom/right (px) */
  SCENE_EDGE: 56,
  /** Diagram to any other node (px) */
  DIAGRAM: 56,
  /** Note to any other node (px) */
  NOTE: 44,
} as const;

// ── Nudge / Collision Resolution ───────────────────────────

export const NUDGE_STEP = 40;    // px per iteration
export const MAX_NUDGE_ITERATIONS = 8;

// ── Font Metrics ───────────────────────────────────────────

/** Caveat font average character width ≈ 0.55 × font_size */
export const CAVEAT_CHAR_WIDTH_RATIO = 0.55;

export const FONT_SIZES: Record<string, number> = {
  'title': 32,
  'title_subtitle': 18,
  'body_small': 20,
  'body_medium': 22,
  'body_large': 24,
  'theorem': 22,
  'bullet_list_small': 20,
  'bullet_list_medium': 22,
  'bullet_list_large': 22,
  'note': 19,
  'definition': 22,
  'code': 16,
} as const;

export const LINE_HEIGHT_MULTIPLIER = 1.5;

// ── Padding ────────────────────────────────────────────────

export const PADDING_TOP = 16;
export const PADDING_BOTTOM = 16;

// ── Intrinsic Size Tables ──────────────────────────────────

export interface SizeSpec {
  width: number;
  height: number | 'auto';
  maxHeight?: number;
  fontSize: number;
}

export const CUSTOM_SIZE_PRESETS: Record<SizeVariant, { width: number; height: number }> = {
  small: { width: 320, height: 220 },
  medium: { width: 440, height: 280 },
  large: { width: 600, height: 360 },
} as const;

export const CUSTOM_SIZE_LIMITS = {
  minWidth: 120,
  minHeight: 80,
  maxWidth: 960,
  maxHeight: 720,
} as const;

/**
 * Key format: `${block_type}` or `${block_type}_${size}`
 * Height 'auto' means computed from content length.
 */
export const BLOCK_SIZES: Record<string, SizeSpec> = {
  // Title
  'title': { width: 520, height: 72, fontSize: 32 },
  'title_with_subtitle': { width: 520, height: 108, fontSize: 32 },

  // Body
  'body_small': { width: 320, height: 'auto', maxHeight: 9999, fontSize: 20 },
  'body_medium': { width: 420, height: 'auto', maxHeight: 9999, fontSize: 22 },
  'body_large': { width: 560, height: 'auto', maxHeight: 9999, fontSize: 24 },

  // Theorem
  'theorem': { width: 480, height: 'auto', maxHeight: 9999, fontSize: 22 },

  // Formula — width is dynamic (KaTeX measured)
  'formula': { width: 520, height: 64, fontSize: 24 },
  'formula_annotated': { width: 520, height: 96, fontSize: 24 },

  // Bullet list
  'bullet_list_small': { width: 320, height: 'auto', maxHeight: 9999, fontSize: 20 },
  'bullet_list_medium': { width: 420, height: 'auto', maxHeight: 9999, fontSize: 22 },
  'bullet_list_large': { width: 560, height: 'auto', maxHeight: 9999, fontSize: 22 },

  // Note
  'note': { width: 300, height: 'auto', maxHeight: 9999, fontSize: 19 },

  // Definition
  'definition': { width: 420, height: 'auto', maxHeight: 9999, fontSize: 22 },

  // Code
  'code': { width: 440, height: 'auto', maxHeight: 9999, fontSize: 16 },
} as const;

// ── Diagram Size Table ─────────────────────────────────────

export const DIAGRAM_SIZES: Record<DiagramType, { width: number; height: number }> = {
  cartesian:  { width: 480, height: 400 },
  geometry:   { width: 400, height: 400 },
  flowchart:  { width: 480, height: 360 },
  venn:       { width: 400, height: 360 },
  bar_chart:  { width: 480, height: 360 },
  pie_chart:  { width: 360, height: 360 },
} as const;

// ── Formula Constraints ────────────────────────────────────

export const FORMULA_MIN_WIDTH = 120;
export const FORMULA_MAX_WIDTH = 520;

// ── Block Type → Size Key Helpers ──────────────────────────

/**
 * Build the lookup key for BLOCK_SIZES from block_type + size.
 */
export function getSizeKey(blockType: BlockType, size?: SizeVariant, hasSubtitle?: boolean): string {
  if (blockType === 'title') {
    return hasSubtitle ? 'title_with_subtitle' : 'title';
  }

  // These types have size variants
  const sizedTypes: BlockType[] = ['body', 'bullet_list'];
  if (sizedTypes.includes(blockType) && size) {
    return `${blockType}_${size}`;
  }

  // Default size for sizable types
  if (sizedTypes.includes(blockType)) {
    return `${blockType}_medium`;
  }

  // Types without size variants
  return blockType;
}

// ── Rhythm Map for Text Animation ──────────────────────────

export const RHYTHM_MAP: Record<string, number> = {
  ',': 120,
  '.': 250,
  ':': 180,
  ';': 150,
  '!': 200,
  '?': 220,
  '\n': 300,
  ' ': 0,
  default: 40, // ms per character
};

// ── Animation Defaults ─────────────────────────────────────

export const ANIMATION_DEFAULTS = {
  /** Minimum ms per character when speech is faster than reveal */
  MIN_MS_PER_CHAR: 30,
  /** Fixed duration for note fade-in (ms) */
  NOTE_FADE_DURATION: 1000,
  /** Fixed duration for highlight stroke (ms) */
  HIGHLIGHT_STROKE_DURATION: 800,
  /** ms per token for formula token-reveal */
  MS_PER_FORMULA_TOKEN: 150,
  /** Stroke drawing speed: px per ms (lower is slower) */
  STROKE_PX_PER_MS: 0.15,
  /** Minimum stroke animation duration (ms) */
  MIN_STROKE_DURATION: 1200,
} as const;
