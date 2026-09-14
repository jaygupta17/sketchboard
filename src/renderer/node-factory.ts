// ─────────────────────────────────────────────────────────────
// Node Factory — Converts ResolvedNode → React Flow Node
// Maps engine output to React Flow's node format.
// ─────────────────────────────────────────────────────────────

import type { Node } from '@xyflow/react';
import type { ResolvedNode } from '../engine/types';
import { getReactFlowType } from './registry';

/**
 * Convert a ResolvedNode from the layout engine
 * into a React Flow Node object.
 */
export function toReactFlowNode(resolved: ResolvedNode): Node {
  return {
    id: resolved.id,
    type: getReactFlowType(resolved.node_type),
    position: { x: resolved.x, y: resolved.y },
    draggable: false,
    selectable: false,
    data: {
      content: resolved.content,
      animation: resolved.animation,
      color: resolved.color,
      nodeWidth: resolved.width,
      nodeHeight: resolved.height,
      scaleFactor: (resolved.content as any)?.scaleFactor,
    },
    style: {
      width: resolved.width,
      height: resolved.height,
    },
  };
}

/**
 * Convert an array of ResolvedNodes to React Flow nodes.
 */
export function toReactFlowNodes(resolved: ResolvedNode[]): Node[] {
  return resolved.map(toReactFlowNode);
}
