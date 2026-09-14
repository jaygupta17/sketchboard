// ─────────────────────────────────────────────────────────────
// TutorCanvas Core — Semantic Position Resolver
// Converts SemanticPosition strings to canvas pixel coordinates.
// ─────────────────────────────────────────────────────────────

import type { SemanticPosition, ResolvedNode, AABB, Cursor } from './types';
import { CollisionRegistry } from './collision-registry';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GAP,
  NUDGE_STEP,
  MAX_NUDGE_ITERATIONS,
} from './constants';

// ── Public API ─────────────────────────────────────────────

/**
 * Resolve a semantic position to canvas {x, y} coordinates.
 * Handles absolute positions, relative positions, collision avoidance, and fallbacks.
 */
export function resolvePosition(
  position: SemanticPosition,
  nodeWidth: number,
  nodeHeight: number,
  registry: CollisionRegistry,
  cursor: Cursor,
  nodes: Map<string, ResolvedNode>,
  nodeType: string = 'text'
): { x: number; y: number } {
  // Step 1: Get the candidate position from the semantic string
  let candidate = resolveSemantic(position, nodeWidth, nodeHeight, cursor, nodes);

  // Step 2: Clamp to scene edges (no negative coords)
  candidate = clampToSceneEdges(candidate, nodeWidth, nodeHeight);

  // Step 3: Check collision and nudge if needed
  candidate = resolveCollision(candidate, nodeWidth, nodeHeight, registry, nodeType);

  // Step 4: Final clamp (nudge may have gone offscreen)
  candidate = clampToSceneEdges(candidate, nodeWidth, nodeHeight);

  return candidate;
}

/**
 * Update the cursor after a node is placed.
 * Default growth: downward. If off bottom, start new column.
 */
export function updateCursor(node: ResolvedNode): Cursor {
  const newY = node.y + node.height + GAP.VERTICAL;

  // If going off bottom of viewport, start new column
  if (newY + GAP.SCENE_EDGE > CANVAS_HEIGHT) {
    return {
      x: node.x + node.width + GAP.HORIZONTAL,
      y: GAP.SCENE_EDGE,
    };
  }

  return {
    x: node.x,
    y: newY,
  };
}

// ── Semantic Resolution ────────────────────────────────────

function resolveSemantic(
  position: SemanticPosition,
  nodeWidth: number,
  nodeHeight: number,
  cursor: Cursor,
  nodes: Map<string, ResolvedNode>
): { x: number; y: number } {
  // ── Absolute positions ──
  switch (position) {
    case 'center':
      return {
        x: (CANVAS_WIDTH - nodeWidth) / 2,
        y: (CANVAS_HEIGHT - nodeHeight) / 2 - 60,
      };
    case 'top-left':
      return { x: GAP.SCENE_EDGE, y: GAP.SCENE_EDGE };
    case 'top-right':
      return { x: CANVAS_WIDTH - GAP.SCENE_EDGE - nodeWidth, y: GAP.SCENE_EDGE };
    case 'top-center':
      return { x: (CANVAS_WIDTH - nodeWidth) / 2, y: GAP.SCENE_EDGE };
    case 'bottom-left':
      return { x: GAP.SCENE_EDGE, y: CANVAS_HEIGHT - GAP.SCENE_EDGE - nodeHeight };
    case 'bottom-right':
      return { x: CANVAS_WIDTH - GAP.SCENE_EDGE - nodeWidth, y: CANVAS_HEIGHT - GAP.SCENE_EDGE - nodeHeight };
    case 'bottom-center':
      return { x: (CANVAS_WIDTH - nodeWidth) / 2, y: CANVAS_HEIGHT - GAP.SCENE_EDGE - nodeHeight };
  }

  // ── Relative positions ──
  if (position.startsWith('below:')) {
    return resolveRelativeBelow(position.slice(6), nodeWidth, nodeHeight, cursor, nodes);
  }
  if (position.startsWith('above:')) {
    return resolveRelativeAbove(position.slice(6), nodeWidth, nodeHeight, cursor, nodes);
  }
  if (position.startsWith('beside:') || position.startsWith('right-of:')) {
    const ref = position.startsWith('beside:') ? position.slice(7) : position.slice(9);
    return resolveRelativeRight(ref, nodeWidth, cursor, nodes);
  }
  if (position.startsWith('left-of:')) {
    return resolveRelativeLeft(position.slice(8), nodeWidth, cursor, nodes);
  }

  // Unknown position → use cursor
  console.warn(`[layout] Unknown semantic position: "${position}", using cursor`);
  return { x: cursor.x, y: cursor.y };
}

// ── Relative Position Helpers ──────────────────────────────

function resolveRelativeBelow(
  ref: string,
  nodeWidth: number,
  _nodeHeight: number,
  cursor: Cursor,
  nodes: Map<string, ResolvedNode>
): { x: number; y: number } {
  const refNode = nodes.get(ref);
  if (!refNode) {
    console.warn(`[layout] Reference "${ref}" not found for below:, using cursor`);
    return { x: cursor.x, y: cursor.y };
  }
  return {
    x: refNode.x + (refNode.width - nodeWidth) / 2,
    y: refNode.y + refNode.height + GAP.VERTICAL,
  };
}

function resolveRelativeAbove(
  ref: string,
  nodeWidth: number,
  nodeHeight: number,
  cursor: Cursor,
  nodes: Map<string, ResolvedNode>
): { x: number; y: number } {
  const refNode = nodes.get(ref);
  if (!refNode) {
    console.warn(`[layout] Reference "${ref}" not found for above:, using cursor`);
    return { x: cursor.x, y: cursor.y };
  }
  return {
    x: refNode.x + (refNode.width - nodeWidth) / 2,
    y: refNode.y - nodeHeight - GAP.VERTICAL,
  };
}

function resolveRelativeRight(
  ref: string,
  _nodeWidth: number,
  cursor: Cursor,
  nodes: Map<string, ResolvedNode>
): { x: number; y: number } {
  const refNode = nodes.get(ref);
  if (!refNode) {
    console.warn(`[layout] Reference "${ref}" not found for beside:/right-of:, using cursor`);
    return { x: cursor.x, y: cursor.y };
  }
  return {
    x: refNode.x + refNode.width + GAP.HORIZONTAL,
    y: refNode.y,
  };
}

function resolveRelativeLeft(
  ref: string,
  nodeWidth: number,
  cursor: Cursor,
  nodes: Map<string, ResolvedNode>
): { x: number; y: number } {
  const refNode = nodes.get(ref);
  if (!refNode) {
    console.warn(`[layout] Reference "${ref}" not found for left-of:, using cursor`);
    return { x: cursor.x, y: cursor.y };
  }
  return {
    x: refNode.x - nodeWidth - GAP.HORIZONTAL,
    y: refNode.y,
  };
}

// ── Collision Resolution ───────────────────────────────────

function resolveCollision(
  candidate: { x: number; y: number },
  nodeWidth: number,
  nodeHeight: number,
  registry: CollisionRegistry,
  nodeType: string
): { x: number; y: number } {
  const candidateBounds: AABB = {
    minX: candidate.x,
    minY: candidate.y,
    maxX: candidate.x + nodeWidth,
    maxY: candidate.y + nodeHeight,
  };

  // No collision → return as-is
  if (!registry.hasCollisionWithGap(candidateBounds, nodeType)) {
    return candidate;
  }

  // Nudge loop: try moving down
  let nudgeX = candidate.x;
  let nudgeY = candidate.y;

  for (let i = 0; i < MAX_NUDGE_ITERATIONS; i++) {
    nudgeY += NUDGE_STEP;

    const nudgeBounds: AABB = {
      minX: nudgeX,
      minY: nudgeY,
      maxX: nudgeX + nodeWidth,
      maxY: nudgeY + nodeHeight,
    };

    if (!registry.hasCollisionWithGap(nudgeBounds, nodeType)) {
      return { x: nudgeX, y: nudgeY };
    }
  }

  // All downward nudges failed → new column to the right
  const newColumnX = registry.getRightmostEdge() + GAP.HORIZONTAL;
  const newColumnCandidate = { x: newColumnX, y: GAP.SCENE_EDGE };

  const newColumnBounds: AABB = {
    minX: newColumnCandidate.x,
    minY: newColumnCandidate.y,
    maxX: newColumnCandidate.x + nodeWidth,
    maxY: newColumnCandidate.y + nodeHeight,
  };

  if (!registry.hasCollisionWithGap(newColumnBounds, nodeType)) {
    return newColumnCandidate;
  }

  // Nuclear fallback: below the lowest node on the entire canvas
  const bottomEdge = registry.getBottomEdge();
  return { x: GAP.SCENE_EDGE, y: bottomEdge + GAP.VERTICAL };
}

// ── Scene Edge Clamping ────────────────────────────────────

function clampToSceneEdges(
  pos: { x: number; y: number },
  _nodeWidth: number,
  _nodeHeight: number
): { x: number; y: number } {
  return {
    x: Math.max(GAP.SCENE_EDGE, pos.x),
    y: Math.max(GAP.SCENE_EDGE, pos.y),
  };
}
