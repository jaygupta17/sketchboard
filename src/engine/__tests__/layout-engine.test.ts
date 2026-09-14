import { describe, it, expect, beforeEach } from 'vitest';
import { layoutNode } from '../layout-engine';
import { CollisionRegistry } from '../collision-registry';
import type { CreateBlockAction, CustomAction, DrawDiagramAction, HighlightAction, ResolvedNode, Cursor } from '../types';
import { GAP, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { resetIdCounter } from '../utils';

describe('layoutNode', () => {
  let registry: CollisionRegistry;
  let cursor: Cursor;
  let nodes: Map<string, ResolvedNode>;

  beforeEach(() => {
    registry = new CollisionRegistry();
    cursor = { x: GAP.SCENE_EDGE, y: GAP.SCENE_EDGE };
    nodes = new Map();
    resetIdCounter();
  });

  describe('block actions', () => {
    it('resolves a title at center', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        ref: 'title_1',
        block_type: 'title',
        content: 'Introduction to Calculus',
        position: 'center',
      };

      const result = layoutNode(action, registry, cursor, nodes);

      expect(result.node.id).toBe('title_1');
      expect(result.node.node_type).toBe('text');
      expect(result.node.width).toBe(520);
      expect(result.node.height).toBe(72);
      expect(result.node.x).toBe((CANVAS_WIDTH - 520) / 2);
      expect(result.node.y).toBe((CANVAS_HEIGHT - 72) / 2 - 60);
      expect(result.node.animation.entrance).toBe('char-reveal');
    });

    it('resolves a body block at top-left', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        ref: 'body_1',
        block_type: 'body',
        content: 'Some text content',
        position: 'top-left',
        size: 'medium',
      };

      const result = layoutNode(action, registry, cursor, nodes);

      expect(result.node.x).toBe(GAP.SCENE_EDGE);
      expect(result.node.y).toBe(GAP.SCENE_EDGE);
      expect(result.node.width).toBe(420);
    });

    it('resolves a formula block', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        ref: 'eq_1',
        block_type: 'formula',
        content: 'E = mc^2',
        position: 'center',
      };

      const result = layoutNode(action, registry, cursor, nodes);

      expect(result.node.node_type).toBe('formula');
      expect(result.node.height).toBe(64);
      expect(result.node.animation.entrance).toBe('token-reveal');
    });

    it('resolves a note block with fade animation', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        ref: 'note_1',
        block_type: 'note',
        content: 'Key insight',
        position: 'top-right',
      };

      const result = layoutNode(action, registry, cursor, nodes);

      expect(result.node.node_type).toBe('note');
      expect(result.node.animation.entrance).toBe('fade');
    });

    it('generates an ID when ref is not provided', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'body',
        content: 'No ref',
        position: 'center',
      };

      const result = layoutNode(action, registry, cursor, nodes);

      expect(result.node.id).toBeTruthy();
      expect(result.node.id.startsWith('node_')).toBe(true);
    });

    it('registers node in collision registry', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        ref: 'block_1',
        block_type: 'body',
        content: 'Test',
        position: 'top-left',
      };

      layoutNode(action, registry, cursor, nodes);

      expect(registry.size).toBe(1);
    });

    it('updates cursor after placement', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        ref: 'block_1',
        block_type: 'title',
        content: 'Test',
        position: 'top-left',
      };

      const result = layoutNode(action, registry, cursor, nodes);

      expect(result.cursor.y).toBeGreaterThan(GAP.SCENE_EDGE);
    });

    it('sets sticky flag from action', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        ref: 'sticky_1',
        block_type: 'title',
        content: 'Sticky Title',
        position: 'top-center',
        sticky: true,
      };

      const result = layoutNode(action, registry, cursor, nodes);

      expect(result.node.sticky).toBe(true);
    });

    it('sets color from action', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        ref: 'colored',
        block_type: 'body',
        content: 'Colored',
        position: 'center',
        color: 'danger',
      };

      const result = layoutNode(action, registry, cursor, nodes);

      expect(result.node.color).toBe('danger');
    });
  });

  describe('diagram actions', () => {
    it('resolves a cartesian diagram', () => {
      const action: DrawDiagramAction = {
        type: 'draw_diagram',
        ref: 'graph_1',
        diagram_type: 'cartesian',
        data: {
          type: 'cartesian',
          domain: [-5, 5],
          range: [-5, 5],
          functions: [{ expression: 'x^2' }],
        },
        position: 'center',
      };

      const result = layoutNode(action, registry, cursor, nodes);

      expect(result.node.node_type).toBe('diagram');
      expect(result.node.width).toBe(480);
      expect(result.node.height).toBe(400);
      expect(result.node.animation.entrance).toBe('stroke');
    });

    it('resolves a pie chart', () => {
      const action: DrawDiagramAction = {
        type: 'draw_diagram',
        ref: 'pie_1',
        diagram_type: 'pie_chart',
        data: {
          type: 'pie_chart',
          slices: [
            { label: 'A', value: 50 },
            { label: 'B', value: 50 },
          ],
        },
        position: 'center',
      };

      const result = layoutNode(action, registry, cursor, nodes);

      expect(result.node.width).toBe(360);
      expect(result.node.height).toBe(360);
    });
  });

  describe('highlight actions', () => {
    it('resolves a highlight on an existing node', () => {
      // First place a node
      const blockAction: CreateBlockAction = {
        type: 'create_block',
        ref: 'target_1',
        block_type: 'body',
        content: 'Highlight me',
        position: 'center',
        size: 'medium',
      };
      const blockResult = layoutNode(blockAction, registry, cursor, nodes);
      nodes.set(blockResult.node.id, blockResult.node);

      // Now highlight it
      const highlightAction: HighlightAction = {
        type: 'highlight',
        target: 'target_1',
        style: 'circle',
        color: 'accent',
      };
      const result = layoutNode(highlightAction, registry, cursor, nodes);

      expect(result.node.node_type).toBe('highlight');
      expect(result.node.x).toBe(blockResult.node.x);
      expect(result.node.y).toBe(blockResult.node.y);
      expect(result.node.width).toBe(blockResult.node.width);
      expect(result.node.height).toBe(blockResult.node.height);
    });

    it('handles highlight on missing target gracefully', () => {
      const action: HighlightAction = {
        type: 'highlight',
        target: 'nonexistent',
        style: 'box',
      };

      const result = layoutNode(action, registry, cursor, nodes);

      expect(result.node.node_type).toBe('highlight');
      expect(result.node.width).toBe(0);
      expect(result.node.height).toBe(0);
    });

    it('does not move the cursor', () => {
      const action: HighlightAction = {
        type: 'highlight',
        target: 'whatever',
      };

      const result = layoutNode(action, registry, cursor, nodes);

      expect(result.cursor).toEqual(cursor);
    });
  });

  describe('relative positioning', () => {
    it('places node below a reference node', () => {
      // Place first node
      const firstAction: CreateBlockAction = {
        type: 'create_block',
        ref: 'first',
        block_type: 'title',
        content: 'First',
        position: 'top-center',
      };
      const firstResult = layoutNode(firstAction, registry, cursor, nodes);
      nodes.set(firstResult.node.id, firstResult.node);

      // Place below
      const secondAction: CreateBlockAction = {
        type: 'create_block',
        ref: 'second',
        block_type: 'body',
        content: 'Second',
        position: 'below:first',
        size: 'medium',
      };
      const secondResult = layoutNode(secondAction, registry, firstResult.cursor, nodes);

      expect(secondResult.node.y).toBeGreaterThan(firstResult.node.y + firstResult.node.height);
    });

    it('places node beside a reference node', () => {
      const firstAction: CreateBlockAction = {
        type: 'create_block',
        ref: 'left_block',
        block_type: 'body',
        content: 'Left',
        position: 'top-left',
        size: 'small',
      };
      const firstResult = layoutNode(firstAction, registry, cursor, nodes);
      nodes.set(firstResult.node.id, firstResult.node);

      const secondAction: CreateBlockAction = {
        type: 'create_block',
        ref: 'right_block',
        block_type: 'body',
        content: 'Right',
        position: 'beside:left_block',
        size: 'small',
      };
      const secondResult = layoutNode(secondAction, registry, firstResult.cursor, nodes);

      expect(secondResult.node.x).toBe(firstResult.node.x + firstResult.node.width + GAP.HORIZONTAL);
      expect(secondResult.node.y).toBe(firstResult.node.y);
    });
  });

  describe('custom actions', () => {
    it('resolves custom action with explicit size and custom node type', () => {
      const action: CustomAction = {
        type: 'custom',
        ref: 'widget_1',
        renderer: 'graphExplorer',
        data: { points: [1, 2, 3] },
        position: 'center',
        size: { width: 512, height: 320 },
      };

      const result = layoutNode(action, registry, cursor, nodes);

      expect(result.node.id).toBe('widget_1');
      expect(result.node.node_type).toBe('custom');
      expect(result.node.width).toBe(512);
      expect(result.node.height).toBe(320);
      expect((result.node.content as any).type).toBe('custom');
      expect((result.node.content as any).renderer).toBe('graphExplorer');
    });
  });

  describe('collision avoidance', () => {
    it('avoids placing on top of existing nodes', () => {
      // Place first node at top-left
      const firstAction: CreateBlockAction = {
        type: 'create_block',
        ref: 'blocker',
        block_type: 'body',
        content: 'I block the area',
        position: 'top-left',
        size: 'large',
      };
      const firstResult = layoutNode(firstAction, registry, cursor, nodes);
      nodes.set(firstResult.node.id, firstResult.node);

      // Try to place second at same position
      const secondAction: CreateBlockAction = {
        type: 'create_block',
        ref: 'victim',
        block_type: 'body',
        content: 'I need space',
        position: 'top-left',
        size: 'large',
      };
      const secondResult = layoutNode(secondAction, registry, firstResult.cursor, nodes);

      // Should not overlap
      const r1 = firstResult.node;
      const r2 = secondResult.node;
      const overlapsX = r2.x < r1.x + r1.width && r2.x + r2.width > r1.x;
      const overlapsY = r2.y < r1.y + r1.height && r2.y + r2.height > r1.y;
      expect(overlapsX && overlapsY).toBe(false);
    });
  });
});
