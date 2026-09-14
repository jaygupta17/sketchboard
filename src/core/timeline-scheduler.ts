import type { Action, SyncMode } from '../engine/types';

export interface ScheduledAction {
  action: Action;
  startMs: number;
  durationMs: number;
}

export interface BuildScheduleOptions {
  audioDurationMs: number;
  fraction: number;
}

/**
 * Resolves the start time for an action in milliseconds.
 * Priority: start (seconds) > atMs (ms) > inferred
 */
function resolveStartMs(action: Action, sequentialCursorMs: number, mode: SyncMode): number {
  // Explicit start in seconds takes highest priority
  if (action.start !== undefined) {
    return Math.max(0, Math.round(action.start * 1000));
  }
  // Fallback to atMs (legacy milliseconds)
  if (action.atMs !== undefined) {
    return Math.max(0, Math.round(action.atMs));
  }
  // Inferred from mode
  if (mode === 'durationLocked') {
    return sequentialCursorMs;
  }
  return 0;
}

/**
 * Resolves the duration for an action in milliseconds.
 * Priority: duration (seconds) > durationMs (ms) > baseDuration (from audio fraction)
 */
function resolveDurationMs(action: Action, baseDuration: number): number {
  // Explicit duration in seconds takes highest priority
  if (action.duration !== undefined) {
    return Math.max(1, Math.round(action.duration * 1000));
  }
  // Fallback to durationMs (legacy milliseconds)
  if (action.durationMs !== undefined) {
    return Math.max(1, Math.round(action.durationMs));
  }
  // CustomAction legacy duration field (ms)
  const legacyDuration = action.type === 'custom' ? action.duration : undefined;
  if (legacyDuration !== undefined) {
    return Math.max(1, Math.round(legacyDuration));
  }
  // Default: base duration from audio fraction
  return baseDuration;
}

/**
 * Builds execution timing for each action in a segment.
 *
 * Supports both seconds-based (`start`, `duration`) and ms-based (`atMs`, `durationMs`) fields.
 * Seconds take priority when both are provided.
 *
 * Defaults:
 * - sync mode: audioLocked
 * - start: 0ms (unless start/atMs is provided)
 * - duration: action.duration (seconds) OR action.durationMs (ms) OR audioDuration * fraction
 */
export function buildActionSchedule(
  actions: Action[],
  options: BuildScheduleOptions,
): ScheduledAction[] {
  const baseDuration = Math.max(1, Math.round(options.audioDurationMs * options.fraction));
  const out: ScheduledAction[] = [];

  let sequentialCursorMs = 0;

  for (const action of actions) {
    const mode: SyncMode = action.sync?.mode ?? 'audioLocked';
    const durationMs = resolveDurationMs(action, baseDuration);
    const startMs = resolveStartMs(action, sequentialCursorMs, mode);

    out.push({ action, startMs, durationMs });

    if (mode === 'durationLocked') {
      sequentialCursorMs = startMs + durationMs;
    }
  }

  out.sort((a, b) => a.startMs - b.startMs);
  return out;
}
