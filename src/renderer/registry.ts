// ─────────────────────────────────────────────────────────────
// Renderer Registry — Single source of truth for all node renderers.
// Built-ins and custom renderers share the same lookup path.
// ─────────────────────────────────────────────────────────────

import type { NodeTypes } from '@xyflow/react';
import { TextNode } from './nodes/TextNode';
import { FormulaNode } from './nodes/FormulaNode';
import { DiagramNode } from './nodes/DiagramNode';
import { NoteNode } from './nodes/NoteNode';
import { HighlightNode } from './nodes/HighlightNode';
import { CustomNode } from './nodes/CustomNode';
import type { RendererComponent, Renderers } from '../actions';
import type { NodeType } from '../engine/types';

// ── Built-in Renderer Keys ─────────────────────────────────

export const BUILTIN_RENDERER_KEYS = [
  'textNode',
  'formulaNode',
  'diagramNode',
  'noteNode',
  'highlightNode',
] as const;

// ── Built-in React Flow NodeTypes ──────────────────────────

const builtinNodeTypes: NodeTypes = {
  textNode: TextNode,
  formulaNode: FormulaNode,
  diagramNode: DiagramNode,
  noteNode: NoteNode,
  highlightNode: HighlightNode,
};

// ── Node Type → React Flow Type Mapping ────────────────────

const NODE_TYPE_TO_RF: Record<NodeType, string> = {
  text: 'textNode',
  formula: 'formulaNode',
  diagram: 'diagramNode',
  note: 'noteNode',
  highlight: 'highlightNode',
  custom: 'customNode',
};

/**
 * Get the React Flow node type key for a given engine NodeType.
 */
export function getReactFlowType(nodeType: NodeType): string {
  return NODE_TYPE_TO_RF[nodeType] ?? 'textNode';
}

// ── Registry Service ───────────────────────────────────────

/**
 * Build a unified NodeTypes map that includes both built-in and custom renderers.
 * Custom renderers are wrapped in the CustomNode shell, which delegates to the
 * appropriate renderer from the registry.
 */
export function buildNodeTypes(customRenderers: Renderers = {}): NodeTypes {
  const hasCustomRenderers = Object.keys(customRenderers).length > 0;

  return {
    ...builtinNodeTypes,
    // Always include customNode so custom actions can render.
    // CustomNode internally looks up the correct renderer from the store.
    ...(hasCustomRenderers || true ? { customNode: CustomNode } : {}),
  };
}

/**
 * Resolve a renderer component by key from a combined built-in + custom registry.
 * Returns null if not found (caller should use fallback).
 */
export function resolveRenderer(
  key: string,
  customRenderers: Renderers = {},
): RendererComponent | null {
  // Custom renderers take precedence for their keys
  if (customRenderers[key]) {
    return customRenderers[key];
  }

  // Built-in renderers are React Flow node components, not RendererComponents.
  // They are resolved via nodeTypes, not this path.
  return null;
}

/**
 * Check if a renderer key is known (built-in or custom).
 */
export function hasRenderer(
  key: string,
  customRenderers: Renderers = {},
): boolean {
  return key in builtinNodeTypes || key in customRenderers;
}
