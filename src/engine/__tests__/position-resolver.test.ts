import { describe, it, expect, beforeEach } from 'vitest';
import { resolvePosition, updateCursor } from '../position-resolver';
import { CollisionRegistry } from '../collision-registry';
import type { ResolvedNode, Cursor } from '../types';
import { GAP, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

function makeNode(overrides: Partial<ResolvedNode> & { id: string; x: number; y: number; width: number; height: number }): ResolvedNode {
  return {
    node_type: 'text',
    content: { type: 'block', block_type: 'body', content: 'test' },
    animation: { entrance: 'fade', duration: 400, delay: 0 },
    color: 'primary',
    sticky: false,
    ...overrides,
  } as ResolvedNode;
}

describe('resolvePosition — absolute positions', () => {
  let registry: CollisionRegistry;
  let cursor: Cursor;
  let nodes: Map<string, ResolvedNode>;
  const nodeWidth = 400;
  const nodeHeight = 200;

  beforeEach(() => {
    registry = new CollisionRegistry();
    cursor = { x: GAP.SCENE_EDGE, y: GAP.SCENE_EDGE };
    nodes = new Map();
  });

  it('center: places node centered with upward bias', () => {
    const pos = resolvePosition('center', nodeWidth, nodeHeight, registry, cursor, nodes);
    expect(pos.x).toBe((CANVAS_WIDTH - nodeWidth) / 2);
    expect(pos.y).toBe((CANVAS_HEIGHT - nodeHeight) / 2 - 60);
  });

  it('top-left: places at scene edge', () => {
    const pos = resolvePosition('top-left', nodeWidth, nodeHeight, registry, cursor, nodes);
    expect(pos.x).toBe(GAP.SCENE_EDGE);
    expect(pos.y).toBe(GAP.SCENE_EDGE);
  });

  it('top-right: places at right edge', () => {
    const pos = resolvePosition('top-right', nodeWidth, nodeHeight, registry, cursor, nodes);
    expect(pos.x).toBe(CANVAS_WIDTH - GAP.SCENE_EDGE - nodeWidth);
    expect(pos.y).toBe(GAP.SCENE_EDGE);
  });

  it('top-center: places centered at top', () => {
    const pos = resolvePosition('top-center', nodeWidth, nodeHeight, registry, cursor, nodes);
    expect(pos.x).toBe((CANVAS_WIDTH - nodeWidth) / 2);
    expect(pos.y).toBe(GAP.SCENE_EDGE);
  });

  it('bottom-left: places at bottom-left', () => {
    const pos = resolvePosition('bottom-left', nodeWidth, nodeHeight, registry, cursor, nodes);
    expect(pos.x).toBe(GAP.SCENE_EDGE);
    expect(pos.y).toBe(CANVAS_HEIGHT - GAP.SCENE_EDGE - nodeHeight);
  });

  it('bottom-right: places at bottom-right', () => {
    const pos = resolvePosition('bottom-right', nodeWidth, nodeHeight, registry, cursor, nodes);
    expect(pos.x).toBe(CANVAS_WIDTH - GAP.SCENE_EDGE - nodeWidth);
    expect(pos.y).toBe(CANVAS_HEIGHT - GAP.SCENE_EDGE - nodeHeight);
  });

  it('bottom-center: places centered at bottom', () => {
    const pos = resolvePosition('bottom-center', nodeWidth, nodeHeight, registry, cursor, nodes);
    expect(pos.x).toBe((CANVAS_WIDTH - nodeWidth) / 2);
    expect(pos.y).toBe(CANVAS_HEIGHT - GAP.SCENE_EDGE - nodeHeight);
  });
});

describe('resolvePosition — relative positions', () => {
  let registry: CollisionRegistry;
  let cursor: Cursor;
  let nodes: Map<string, ResolvedNode>;

  beforeEach(() => {
    registry = new CollisionRegistry();
    cursor = { x: GAP.SCENE_EDGE, y: GAP.SCENE_EDGE };
    nodes = new Map();
  });

  it('below:ref centers horizontally and places below with vertical gap', () => {
    const refNode = makeNode({ id: 'ref1', x: 100, y: 100, width: 400, height: 80 });
    nodes.set('ref1', refNode);

    const pos = resolvePosition('below:ref1', 300, 60, registry, cursor, nodes);
    expect(pos.x).toBe(100 + (400 - 300) / 2); // centered relative to parent
    expect(pos.y).toBe(100 + 80 + GAP.VERTICAL);
  });

  it('above:ref centers horizontally and places above', () => {
    const refNode = makeNode({ id: 'ref1', x: 200, y: 400, width: 300, height: 100 });
    nodes.set('ref1', refNode);

    const pos = resolvePosition('above:ref1', 200, 60, registry, cursor, nodes);
    expect(pos.x).toBe(200 + (300 - 200) / 2);
    expect(pos.y).toBe(400 - 60 - GAP.VERTICAL);
  });

  it('beside:ref places to the right with horizontal gap', () => {
    const refNode = makeNode({ id: 'ref1', x: 100, y: 100, width: 300, height: 80 });
    nodes.set('ref1', refNode);

    const pos = resolvePosition('beside:ref1', 200, 60, registry, cursor, nodes);
    expect(pos.x).toBe(100 + 300 + GAP.HORIZONTAL);
    expect(pos.y).toBe(100); // same top alignment
  });

  it('right-of:ref is alias for beside', () => {
    const refNode = makeNode({ id: 'ref1', x: 100, y: 100, width: 300, height: 80 });
    nodes.set('ref1', refNode);

    const pos = resolvePosition('right-of:ref1', 200, 60, registry, cursor, nodes);
    expect(pos.x).toBe(100 + 300 + GAP.HORIZONTAL);
    expect(pos.y).toBe(100);
  });

  it('left-of:ref places to the left', () => {
    const refNode = makeNode({ id: 'ref1', x: 500, y: 100, width: 300, height: 80 });
    nodes.set('ref1', refNode);

    const pos = resolvePosition('left-of:ref1', 200, 60, registry, cursor, nodes);
    expect(pos.x).toBe(500 - 200 - GAP.HORIZONTAL);
    expect(pos.y).toBe(100);
  });

  it('falls back to cursor when ref is missing', () => {
    const pos = resolvePosition('below:nonexistent', 200, 60, registry, cursor, nodes);
    expect(pos.x).toBe(cursor.x);
    expect(pos.y).toBe(cursor.y);
  });
});

describe('resolvePosition — collision avoidance', () => {
  let registry: CollisionRegistry;
  let cursor: Cursor;
  let nodes: Map<string, ResolvedNode>;

  beforeEach(() => {
    registry = new CollisionRegistry();
    cursor = { x: GAP.SCENE_EDGE, y: GAP.SCENE_EDGE };
    nodes = new Map();
  });

  it('nudges downward when collision detected', () => {
    // Place a node at top-left
    registry.register('blocker', { minX: 60, minY: 60, maxX: 460, maxY: 260 }, false);

    // Try to place another at the same position
    const pos = resolvePosition('top-left', 400, 200, registry, cursor, nodes);

    // Should be nudged downward
    expect(pos.y).toBeGreaterThan(60);
  });

  it('creates new column when downward nudges fail', () => {
    // Fill the entire left column with nodes
    for (let i = 0; i < 6; i++) {
      registry.register(`blocker${i}`, {
        minX: 0,
        minY: i * 180,
        maxX: 500,
        maxY: i * 180 + 150,
      }, false);
    }

    const pos = resolvePosition('top-left', 400, 200, registry, cursor, nodes);
    // Should have moved to a new column to the right
    expect(pos.x).toBeGreaterThan(500);
  });

  it('never produces negative coordinates', () => {
    const refNode = makeNode({ id: 'ref1', x: 60, y: 60, width: 100, height: 50 });
    nodes.set('ref1', refNode);

    // above:ref should try to go above, but clamped to scene edge
    const pos = resolvePosition('above:ref1', 400, 200, registry, cursor, nodes);
    expect(pos.x).toBeGreaterThanOrEqual(GAP.SCENE_EDGE);
    expect(pos.y).toBeGreaterThanOrEqual(GAP.SCENE_EDGE);
  });
});

describe('updateCursor', () => {
  it('moves cursor down after placement', () => {
    const node = makeNode({ id: 'n1', x: 100, y: 100, width: 400, height: 200 });
    const newCursor = updateCursor(node);
    expect(newCursor.x).toBe(100);
    expect(newCursor.y).toBe(100 + 200 + GAP.VERTICAL);
  });

  it('starts new column when off bottom of viewport', () => {
    const node = makeNode({ id: 'n1', x: 100, y: 900, width: 400, height: 200 });
    const newCursor = updateCursor(node);
    // 900 + 200 + 36 = 1136 > 1080 - 60 = 1020 → new column
    expect(newCursor.x).toBe(100 + 400 + GAP.HORIZONTAL);
    expect(newCursor.y).toBe(GAP.SCENE_EDGE);
  });
});
