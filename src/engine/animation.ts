// ─────────────────────────────────────────────────────────────
// TutorCanvas Core — Animation Plan Computation
// Determines entrance type, duration, and delay for each node.
// ─────────────────────────────────────────────────────────────

import type { Action, AnimationPlan, NodeType } from './types';
import { RHYTHM_MAP, ANIMATION_DEFAULTS } from './constants';

// ── Public API ─────────────────────────────────────────────

/**
 * Compute the animation plan for a given action + resolved node type.
 */
export function computeAnimationPlan(
  action: Action,
  nodeType: NodeType,
  height: number,
  suggestedDurationMs?: number
): AnimationPlan {
  if (action.type === 'highlight') {
    return {
      entrance: 'stroke',
      duration: action.durationMs ?? suggestedDurationMs ?? ANIMATION_DEFAULTS.HIGHLIGHT_STROKE_DURATION,
      delay: 0,
      reveal: action.reveal,
    };
  }

  if (action.type === 'custom') {
    return {
      entrance: 'fade',
      duration: action.durationMs ?? suggestedDurationMs ?? action.duration ?? ANIMATION_DEFAULTS.NOTE_FADE_DURATION,
      delay: 0,
      reveal: action.reveal,
    };
  }

  const entrance = getEntranceType(nodeType);
  let duration: number;

  // Determine the full text payload (handles bullet lists where content is in items)
  const fullText = action.type === 'create_block' 
    ? (action.items?.length ? action.items.join('\n') : action.content)
    : '';

  if (action.durationMs !== undefined) {
    duration = action.durationMs;
  } else if (suggestedDurationMs !== undefined) {
    duration = suggestedDurationMs;
  } else {
    switch (entrance) {
      case 'char-reveal':
        duration = computeTextDuration(fullText);
        break;
      case 'token-reveal':
        duration = computeFormulaDuration(fullText);
        break;
      case 'stroke':
        duration = computeStrokeDuration(height);
        break;
      case 'fade':
        duration = ANIMATION_DEFAULTS.NOTE_FADE_DURATION;
        break;
      default:
        duration = ANIMATION_DEFAULTS.NOTE_FADE_DURATION;
    }
  }

  // Adjust for speech sync if speech is provided (and we didn't get a hard duration from the sync queue)
  // Only for create_block and draw_diagram actions that have speech
  const speech = (action.type === 'create_block' || action.type === 'draw_diagram') ? action.speech : undefined;
  if (speech && suggestedDurationMs === undefined) {
    const speechDuration = estimateSpeechDuration(speech);
    const charCount = fullText.length;
    duration = adjustDurationForSpeech(duration, speechDuration, charCount);
    return { entrance, duration, delay: 0, speech_duration: speechDuration, reveal: action.reveal };
  }

  return { entrance, duration, delay: 0, reveal: action.reveal };
}

// ── Entrance Type Mapping ──────────────────────────────────

function getEntranceType(nodeType: NodeType): AnimationPlan['entrance'] {
  switch (nodeType) {
    case 'text': return 'char-reveal';
    case 'formula': return 'token-reveal';
    case 'diagram': return 'stroke';
    case 'note': return 'fade';
    case 'highlight': return 'stroke';
    default: return 'fade';
  }
}

// ── Text Duration (Rhythm Map) ─────────────────────────────

/**
 * Compute reveal duration for text content using the rhythm map.
 * Each character gets a specific delay based on its type.
 */
export function computeTextDuration(content: string): number {
  let total = 0;
  for (const char of content) {
    total += RHYTHM_MAP[char] ?? RHYTHM_MAP.default;
  }
  return total;
}

// ── Formula Duration ───────────────────────────────────────

/**
 * Estimate token count from LaTeX string and compute duration.
 */
function computeFormulaDuration(latex: string): number {
  // Count "tokens" — LaTeX commands, symbols, numbers are each ~1 token
  const commands = latex.match(/\\[a-zA-Z]+/g)?.length ?? 0;
  const symbols = latex.replace(/\\[a-zA-Z]+/g, '').replace(/[{}\s]/g, '').length;
  const tokenCount = commands + symbols;
  return Math.max(tokenCount * ANIMATION_DEFAULTS.MS_PER_FORMULA_TOKEN, ANIMATION_DEFAULTS.MIN_STROKE_DURATION);
}

// ── Stroke Duration (Diagrams) ─────────────────────────────

/**
 * Estimate total stroke length from diagram height and compute duration.
 * Uses a rough heuristic: total stroke ≈ width + height * 2 (average complexity).
 */
function computeStrokeDuration(height: number): number {
  // Rough estimate: average diagram has stroke length ≈ 3× its height
  const estimatedStrokeLength = height * 3;
  const duration = estimatedStrokeLength / ANIMATION_DEFAULTS.STROKE_PX_PER_MS;
  return Math.max(duration, ANIMATION_DEFAULTS.MIN_STROKE_DURATION);
}

// ── Speech Sync ────────────────────────────────────────────

/**
 * Estimate speech duration from text.
 * Average speaking rate ≈ 150 words/min ≈ 2.5 words/sec ≈ 400ms/word.
 */
export function estimateSpeechDuration(text: string): number {
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  return wordCount * 400; // 400ms per word
}

/**
 * Adjust animation duration to sync with speech.
 * If speech is longer → stretch reveal.
 * If speech is shorter → speed up reveal (but not below MIN_MS_PER_CHAR).
 */
export function adjustDurationForSpeech(
  computedDuration: number,
  speechDuration: number,
  charCount: number
): number {
  if (speechDuration > computedDuration) {
    return speechDuration;
  }
  // Speed up but respect minimum
  const minDuration = charCount * ANIMATION_DEFAULTS.MIN_MS_PER_CHAR;
  return Math.max(speechDuration, minDuration);
}
