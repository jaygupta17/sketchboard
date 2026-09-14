// ─────────────────────────────────────────────────────────────
// TutorCanvas Core — Intrinsic Size Calculator
// Computes the fixed width × height for any action.
// ─────────────────────────────────────────────────────────────

import type { Action, CreateBlockAction, DrawDiagramAction, CustomAction } from './types';
import {
  BLOCK_SIZES,
  CUSTOM_SIZE_LIMITS,
  CUSTOM_SIZE_PRESETS,
  DIAGRAM_SIZES,
  FORMULA_MIN_WIDTH,
  FORMULA_MAX_WIDTH,
  CAVEAT_CHAR_WIDTH_RATIO,
  LINE_HEIGHT_MULTIPLIER,
  PADDING_TOP,
  PADDING_BOTTOM,
  getSizeKey,
} from './constants';
import katex from 'katex';

// ── Public API ─────────────────────────────────────────────

export interface IntrinsicSize {
  width: number;
  height: number;
  /** For formulas: CSS scale factor if content exceeds max width */
  scaleFactor?: number;
  /** Content truncated to fit within max height */
  truncatedContent?: string;
}

/**
 * Compute the intrinsic size of a TutorAction.
 * Returns { width, height } and optional scaleFactor / truncatedContent.
 */
export function computeIntrinsicSize(action: Action): IntrinsicSize {
  if (action.type === 'highlight') {
    // Highlights don't have intrinsic size — they overlay a target node
    return { width: 0, height: 0 };
  }

  if (action.type === 'custom') {
    return computeCustomSize(action);
  }

  if (action.type === 'draw_diagram') {
    return computeDiagramSize(action);
  }

  return computeBlockSize(action);
}

// ── Block Size ─────────────────────────────────────────────

function computeBlockSize(action: CreateBlockAction): IntrinsicSize {
  const { block_type, size, content, subtitle, items } = action;

  // Formula is special — width depends on KaTeX output
  if (block_type === 'formula') {
    return computeFormulaSize(content);
  }

  const sizeKey = getSizeKey(block_type, size, !!subtitle);
  const spec = BLOCK_SIZES[sizeKey];

  if (!spec) {
    // Fallback to medium body if unknown
    const fallback = BLOCK_SIZES['body_medium']!;
    return { width: fallback.width, height: typeof fallback.height === 'number' ? fallback.height : 200 };
  }

  // Fixed height
  if (typeof spec.height === 'number') {
    return { width: spec.width, height: spec.height };
  }

  // Auto-height: compute from content
  const textContent = block_type === 'bullet_list' && items
    ? items.join('\n')
    : content;

  return computeAutoHeight(spec.width, spec.fontSize, textContent, spec.maxHeight!, block_type === 'code');
}

// ── Auto-Height Calculation ────────────────────────────────

function computeAutoHeight(
  width: number,
  fontSize: number,
  content: string,
  maxHeight: number,
  isCode: boolean
): IntrinsicSize {
  const lineHeight = isCode ? fontSize * 1.6 : fontSize * LINE_HEIGHT_MULTIPLIER;
  const charWidthRatio = isCode ? 0.65 : CAVEAT_CHAR_WIDTH_RATIO;
  
  const innerWidth = width - 32; // Assuming 16px horizontal padding
  const charPerLine = Math.floor(innerWidth / (fontSize * charWidthRatio));

  if (charPerLine <= 0) {
    return { width, height: PADDING_TOP + PADDING_BOTTOM + lineHeight };
  }

  // Exact word-wrapping simulation algorithm
  const paragraphs = content.split('\n');
  let totalLines = 0;
  
  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      totalLines += 1;
      continue;
    }
    
    let currentLineLen = 0;
    const words = paragraph.split(' ');
    
    for (const word of words) {
      if (word.length > charPerLine) {
        if (currentLineLen > 0) {
          totalLines += 1;
          currentLineLen = 0;
        }
        // Word itself wraps across multiple lines
        const linesForWord = Math.ceil(word.length / charPerLine);
        totalLines += linesForWord - 1;
        currentLineLen = word.length % charPerLine + 1;
      } else if (currentLineLen + word.length > charPerLine) {
        // Word wraps to next normal line
        totalLines += 1;
        currentLineLen = word.length + 1;
      } else {
        // Fits comfortably on current line
        currentLineLen += word.length + 1;
      }
    }
    totalLines += 1; // Final line of the paragraph
  }

  // Adding fractional buffers just to cover Safari/macOS subpixel rendering discrepancies
  if (isCode) {
    totalLines += 1.25; 
  } else {
    totalLines += 0.5;
  }

  const computedHeight = totalLines * lineHeight + PADDING_TOP + PADDING_BOTTOM;
  const height = Math.min(computedHeight, maxHeight);

  // If truncation needed, estimate where to cut
  let truncatedContent: string | undefined;
  if (computedHeight > maxHeight) {
    const availableLines = Math.floor((maxHeight - PADDING_TOP - PADDING_BOTTOM) / lineHeight);
    const maxChars = availableLines * charPerLine;
    if (maxChars < content.length) {
      truncatedContent = content.slice(0, maxChars - 3) + '...';
    }
  }

  return { width, height, truncatedContent };
}

// ── Formula Size (KaTeX) ───────────────────────────────────

/**
 * Measure formula width using KaTeX's HTML output.
 * Falls back to char-count heuristic if KaTeX fails.
 */
function computeFormulaSize(latex: string): IntrinsicSize {
  let measuredWidth: number;

  try {
    // Render to HTML and estimate width from the output
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
    });

    // Estimate width from HTML token count
    // KaTeX output is structured — each "atom" is roughly proportional to a character
    // We extract text nodes and measure their combined length
    measuredWidth = estimateKatexWidth(html, latex);
  } catch {
    // Fallback: use character-count heuristic
    measuredWidth = estimateLatexWidthFromString(latex);
  }

  // Apply constraints
  if (measuredWidth > FORMULA_MAX_WIDTH) {
    const scaleFactor = FORMULA_MAX_WIDTH / measuredWidth;
    return {
      width: FORMULA_MAX_WIDTH,
      height: 64,
      scaleFactor,
    };
  }

  const width = Math.max(measuredWidth, FORMULA_MIN_WIDTH);
  return { width, height: 64 };
}

/**
 * Estimate rendered width from KaTeX HTML output.
 * Uses a heuristic based on the number of rendered characters/symbols.
 */
function estimateKatexWidth(html: string, latex: string): number {
  // Count visible text characters in the HTML (strip tags)
  const textOnly = html.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
  const charCount = textOnly.length;

  // KaTeX renders at roughly 18px per character in display mode
  // with added spacing for operators, fractions, etc.
  const baseWidth = charCount * 18;

  // Add width for special structures
  let structureBonus = 0;
  if (latex.includes('\\frac')) structureBonus += 40;
  if (latex.includes('\\int')) structureBonus += 30;
  if (latex.includes('\\sum')) structureBonus += 30;
  if (latex.includes('\\sqrt')) structureBonus += 20;

  return baseWidth + structureBonus;
}

/**
 * Fallback: estimate formula width from the raw LaTeX string.
 */
function estimateLatexWidthFromString(latex: string): number {
  // Strip LaTeX commands, count remaining symbols
  const stripped = latex
    .replace(/\\[a-zA-Z]+/g, 'X')  // commands → single char
    .replace(/[{}^_]/g, '')          // structural chars
    .replace(/\s+/g, '');

  return Math.max(stripped.length * 18, FORMULA_MIN_WIDTH);
}

// ── Diagram Size ───────────────────────────────────────────

function computeDiagramSize(action: DrawDiagramAction): IntrinsicSize {
  const spec = DIAGRAM_SIZES[action.diagram_type];
  return { width: spec.width, height: spec.height };
}

function computeCustomSize(action: CustomAction): IntrinsicSize {
  if (typeof action.size === 'object' && action.size !== null) {
    return {
      width: clamp(action.size.width, CUSTOM_SIZE_LIMITS.minWidth, CUSTOM_SIZE_LIMITS.maxWidth),
      height: clamp(action.size.height, CUSTOM_SIZE_LIMITS.minHeight, CUSTOM_SIZE_LIMITS.maxHeight),
    };
  }

  const preset = CUSTOM_SIZE_PRESETS[action.size ?? 'medium'];
  return { width: preset.width, height: preset.height };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
