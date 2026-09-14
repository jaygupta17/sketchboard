// ─────────────────────────────────────────────────────────────
// TutorCanvas Core — Action Executor
// Routes TutorActions through the layout engine.
// Holds session state: collision registry, cursor, placed nodes.
// ─────────────────────────────────────────────────────────────

import type { Action, ResolvedNode, Cursor } from './types';
import { CollisionRegistry } from './collision-registry';
import { layoutNode } from './layout-engine';
import { GAP } from './constants';
import { compileAction } from './compiler';

/**
 * ActionExecutor is the top-level API for processing TutorActions.
 *
 * Usage:
 *   const executor = new ActionExecutor();
 *   const resolved = executor.execute(action);
 *   // resolved is a ResolvedNode with final coordinates, size, content, animation
 *
 * All actions are processed sequentially. The executor maintains:
 * - A collision registry (tracks all placed node bounds)
 * - A cursor (where the next implicit node would go)
 * - A map of all placed nodes (for relative position lookups)
 */
export class ActionExecutor {
  private registry: CollisionRegistry;
  private cursor: Cursor;
  private nodes: Map<string, ResolvedNode>;
  private history: ResolvedNode[];

  constructor() {
    this.registry = new CollisionRegistry();
    this.cursor = { x: GAP.SCENE_EDGE, y: GAP.SCENE_EDGE };
    this.nodes = new Map();
    this.history = [];
  }

  /**
   * Execute a single TutorAction.
   * Returns the ResolvedNode with final coordinates, size, content, and animation plan.
   */
  execute(action: Action, suggestedDurationMs?: number): ResolvedNode {
    const instruction = compileAction(action);
    const result = layoutNode(instruction.action, this.registry, this.cursor, this.nodes, suggestedDurationMs);

    // Update cursor (only for non-highlight actions)
    if (instruction.action.type !== 'highlight') {
      this.cursor = result.cursor;
    }

    // Store the node for future ref lookups
    this.nodes.set(result.node.id, result.node);
    this.history.push(result.node);

    return result.node;
  }

  /**
   * Execute multiple actions sequentially.
   * Returns all resolved nodes in order.
   */
  executeAll(actions: Action[], suggestedDurationMs?: number): ResolvedNode[] {
    return actions.map(action => this.execute(action, suggestedDurationMs));
  }

  /**
   * Get a placed node by ID (for debugging or inspection).
   */
  getNode(id: string): ResolvedNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all placed nodes.
   */
  getAllNodes(): ResolvedNode[] {
    return [...this.nodes.values()];
  }

  /**
   * Get execution history in order.
   */
  getHistory(): ResolvedNode[] {
    return [...this.history];
  }

  /**
   * Get current cursor position.
   */
  getCursor(): Cursor {
    return { ...this.cursor };
  }

  /**
   * Get the collision registry (for debugging).
   */
  getRegistry(): CollisionRegistry {
    return this.registry;
  }

  /**
   * Clear non-sticky nodes. Used when transitioning between sections.
   * Sticky nodes and their collision entries persist.
   */
  section(): void {
    // Remove non-sticky from nodes map
    const nonStickyIds: string[] = [];
    for (const [id, node] of this.nodes) {
      if (!node.sticky) {
        nonStickyIds.push(id);
      }
    }
    for (const id of nonStickyIds) {
      this.nodes.delete(id);
    }

    // Clear non-sticky from registry
    this.registry.clearNonSticky();

    // Reset cursor
    this.cursor = { x: GAP.SCENE_EDGE, y: GAP.SCENE_EDGE };
  }

  /**
   * Full reset — clears all state. Used for new sessions.
   */
  reset(): void {
    this.registry.clear();
    this.nodes.clear();
    this.history = [];
    this.cursor = { x: GAP.SCENE_EDGE, y: GAP.SCENE_EDGE };
  }
}
