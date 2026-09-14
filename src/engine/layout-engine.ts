// ─────────────────────────────────────────────────────────────
// TutorCanvas Core — Layout Engine
// Composes all modules into a single layoutNode() entry point.
// Takes a TutorAction, returns a ResolvedNode. Pure math, no DOM.
// ─────────────────────────────────────────────────────────────

import type {
  Action,
  CreateBlockAction,
  DrawDiagramAction,
  CustomAction,
  HighlightAction,
  ResolvedNode,
  NodeType,
  BlockContent,
  DiagramContent,
  HighlightContent,
  CustomContent,
  AABB,
  Cursor,
} from './types';
import { CollisionRegistry } from './collision-registry';
import { computeIntrinsicSize, type IntrinsicSize } from './intrinsic-size';
import { resolvePosition, updateCursor } from './position-resolver';
import { computeAnimationPlan } from './animation';
import { generateId } from './utils';
import { GAP } from './constants';

// ── Public API ─────────────────────────────────────────────

export interface LayoutResult {
  node: ResolvedNode;
  cursor: Cursor;
}

/**
 * Layout a single TutorAction → ResolvedNode.
 * This is the main entry point of the layout engine.
 *
 * Returns the resolved node AND the updated cursor position.
 */
export function layoutNode(
  action: Action,
  registry: CollisionRegistry,
  cursor: Cursor,
  nodes: Map<string, ResolvedNode>,
  suggestedDurationMs?: number
): LayoutResult {
  // ── Highlight special case ──
  if (action.type === 'highlight') {
    const node = layoutHighlight(action, nodes);
    return { node, cursor }; // highlights don't move the cursor
  }

  // Step 1: Determine node type
  const nodeType = getNodeType(action);

  // Step 2: Compute intrinsic size
  const intrinsicSize = computeIntrinsicSize(action);

  // Step 3: Resolve semantic position to canvas coordinates
  const { x, y } = resolvePosition(
    action.position,
    intrinsicSize.width,
    intrinsicSize.height,
    registry,
    cursor,
    nodes,
    nodeType
  );

  // Step 4: Build content payload
  const content = buildContent(action, intrinsicSize);

  // Step 5: Compute animation plan
  const animation = computeAnimationPlan(action, nodeType, intrinsicSize.height, suggestedDurationMs);

  // Step 6: Build resolved node
  const id = action.ref || generateId();
  const resolved: ResolvedNode = {
    id,
    node_type: nodeType,
    x,
    y,
    width: intrinsicSize.width,
    height: intrinsicSize.height,
    content,
    animation,
    color: getColor(action),
    sticky: getSticky(action),
    action_ref: action.ref,
  };

  // Step 7: Register in collision registry
  const bounds: AABB = {
    minX: x,
    minY: y,
    maxX: x + intrinsicSize.width,
    maxY: y + intrinsicSize.height,
  };
  registry.register(id, bounds, resolved.sticky);

  // Step 8: Update cursor
  const newCursor = updateCursor(resolved);

  return { node: resolved, cursor: newCursor };
}

// ── Highlight Layout ───────────────────────────────────────

function layoutHighlight(
  action: HighlightAction,
  nodes: Map<string, ResolvedNode>
): ResolvedNode {
  const target = nodes.get(action.target);
  const animation = computeAnimationPlan(action, 'highlight', 0);

  if (!target) {
    console.warn(`[layout] Highlight target "${action.target}" not found`);
    return {
      id: generateId(),
      node_type: 'highlight',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      content: {
        type: 'highlight',
        target: action.target,
        style: action.style || 'circle',
        color: action.color || 'accent',
      } as HighlightContent,
      animation,
      color: action.color || 'accent',
      sticky: false,
    };
  }

  return {
    id: generateId(),
    node_type: 'highlight',
    x: target.x,
    y: target.y,
    width: target.width,
    height: target.height,
    content: {
      type: 'highlight',
      target: action.target,
      style: action.style || 'circle',
      color: action.color || 'accent',
    } as HighlightContent,
    animation,
    color: action.color || 'accent',
    sticky: false,
  };
}

// ── Node Type Mapping ──────────────────────────────────────

function getNodeType(action: CreateBlockAction | DrawDiagramAction | CustomAction): NodeType {
  if (action.type === 'custom') return 'custom';
  if (action.type === 'draw_diagram') return 'diagram';
  return blockTypeToNodeType(action.block_type);
}

export function blockTypeToNodeType(blockType: string): NodeType {
  switch (blockType) {
    case 'formula': return 'formula';
    case 'note': return 'note';
    case 'title':
    case 'body':
    case 'theorem':
    case 'bullet_list':
    case 'definition':
    case 'code':
      return 'text';
    default:
      return 'text';
  }
}

// ── Content Builders ───────────────────────────────────────

function buildContent(
  action: CreateBlockAction | DrawDiagramAction | CustomAction,
  intrinsicSize: IntrinsicSize
): BlockContent | DiagramContent | CustomContent {
  if (action.type === 'custom') {
    return {
      type: 'custom',
      renderer: action.renderer,
      data: action.data,
    } as CustomContent;
  }

  if (action.type === 'draw_diagram') {
    return {
      type: 'diagram',
      diagram_type: action.diagram_type,
      data: action.data,
      caption: action.caption,
    } as DiagramContent;
  }

  return {
    type: 'block',
    block_type: action.block_type,
    content: intrinsicSize.truncatedContent || action.content,
    subtitle: action.subtitle,
    items: action.items,
  } as BlockContent;
}

// ── Property Extractors ────────────────────────────────────

function getColor(action: Action): string {
  if (action.type === 'highlight') return action.color || 'accent';
  return action.color || 'primary';
}

function getSticky(action: Action): boolean {
  if (action.type === 'highlight') return false;
  return action.sticky || false;
}
