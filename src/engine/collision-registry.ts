// ─────────────────────────────────────────────────────────────
// TutorCanvas Core — Collision Registry
// Flat-array AABB collision detection.
// For expected session density (< 50 nodes), O(n) is fast enough.
// ─────────────────────────────────────────────────────────────

import type { AABB, CollisionEntry } from './types';
import { GAP } from './constants';

/**
 * Test if two AABBs overlap.
 */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY
  );
}

/**
 * Expand an AABB by the gap appropriate for this node type.
 * This ensures minimum spacing between nodes.
 */
export function expandForGap(bounds: AABB, nodeType: string): AABB {
  const hGap = nodeType === 'diagram' ? GAP.DIAGRAM : nodeType === 'note' ? GAP.NOTE : GAP.HORIZONTAL;
  const vGap = GAP.VERTICAL;

  return {
    minX: bounds.minX - hGap,
    minY: bounds.minY - vGap,
    maxX: bounds.maxX + hGap,
    maxY: bounds.maxY + vGap,
  };
}

/**
 * Collision registry — manages all placed node bounding boxes.
 */
export class CollisionRegistry {
  private entries: CollisionEntry[] = [];

  /**
   * Register a placed node's bounds.
   */
  register(id: string, bounds: AABB, sticky: boolean): void {
    this.entries.push({ id, bounds, sticky });
  }

  /**
   * Remove a node from the registry.
   */
  unregister(id: string): void {
    this.entries = this.entries.filter(e => e.id !== id);
  }

  /**
   * Check if a candidate AABB (already expanded with gaps) overlaps any registered node.
   */
  hasCollision(candidate: AABB, excludeId?: string): boolean {
    for (const entry of this.entries) {
      if (excludeId && entry.id === excludeId) continue;
      if (aabbOverlap(candidate, entry.bounds)) return true;
    }
    return false;
  }

  /**
   * Check collision with gap expansion applied.
   * This is the primary method — it auto-expands the candidate by the node type's gap.
   */
  hasCollisionWithGap(candidate: AABB, nodeType: string, excludeId?: string): boolean {
    const expanded = expandForGap(candidate, nodeType);
    return this.hasCollision(expanded, excludeId);
  }

  /**
   * Get all entries (copy).
   */
  getAll(): CollisionEntry[] {
    return [...this.entries];
  }

  /**
   * Get the bounding box of all registered nodes combined.
   */
  getBounds(): AABB | null {
    if (this.entries.length === 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const entry of this.entries) {
      minX = Math.min(minX, entry.bounds.minX);
      minY = Math.min(minY, entry.bounds.minY);
      maxX = Math.max(maxX, entry.bounds.maxX);
      maxY = Math.max(maxY, entry.bounds.maxY);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Find the rightmost edge of any registered node.
   */
  getRightmostEdge(): number {
    let rightmost: number = GAP.SCENE_EDGE;
    for (const entry of this.entries) {
      rightmost = Math.max(rightmost, entry.bounds.maxX);
    }
    return rightmost;
  }

  /**
   * Find the bottommost edge of any registered node.
   */
  getBottomEdge(): number {
    let bottom: number = GAP.SCENE_EDGE;
    for (const entry of this.entries) {
      bottom = Math.max(bottom, entry.bounds.maxY);
    }
    return bottom;
  }

  /**
   * Get the number of registered nodes.
   */
  get size(): number {
    return this.entries.length;
  }

  /**
   * Clear all entries. Used on page/section reset.
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Clear non-sticky entries only. Used on section() calls.
   */
  clearNonSticky(): void {
    this.entries = this.entries.filter(e => e.sticky);
  }
}
