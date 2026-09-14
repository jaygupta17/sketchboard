// ─────────────────────────────────────────────────────────────
// TutorCanvas Core — Utility Functions
// ─────────────────────────────────────────────────────────────

let counter = 0;

/**
 * Generate a short, unique ID for nodes.
 * Format: `node_<timestamp_base36>_<counter>`
 */
export function generateId(): string {
  counter++;
  return `node_${Date.now().toString(36)}_${counter}`;
}

/**
 * Reset the counter — useful for deterministic tests.
 */
export function resetIdCounter(): void {
  counter = 0;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
