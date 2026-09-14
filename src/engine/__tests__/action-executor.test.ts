import { describe, it, expect, beforeEach } from 'vitest';
import { ActionExecutor } from '../action-executor';
import type { CreateBlockAction, DrawDiagramAction, HighlightAction } from '../types';
import { GAP } from '../constants';
import { resetIdCounter } from '../utils';

describe('ActionExecutor', () => {
  let executor: ActionExecutor;

  beforeEach(() => {
    executor = new ActionExecutor();
    resetIdCounter();
  });

  describe('execute', () => {
    it('executes a single block action and returns a resolved node', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        ref: 'title_1',
        block_type: 'title',
        content: 'Hello',
        position: 'center',
      };

      const node = executor.execute(action);

      expect(node.id).toBe('title_1');
      expect(node.node_type).toBe('text');
      expect(node.width).toBe(520);
      expect(node.height).toBe(72);
      expect(node.x).toBeGreaterThan(0);
      expect(node.y).toBeGreaterThan(0);
    });

    it('stores executed nodes for later ref lookup', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        ref: 'block_1',
        block_type: 'body',
        content: 'Content',
        position: 'top-left',
      };

      executor.execute(action);

      expect(executor.getNode('block_1')).toBeDefined();
      expect(executor.getNode('block_1')!.id).toBe('block_1');
    });

    it('advances cursor after each block', () => {
      const initial = executor.getCursor();

      executor.execute({
        type: 'create_block',
        ref: 'b1',
        block_type: 'title',
        content: 'Title',
        position: 'top-left',
      });

      const after = executor.getCursor();
      expect(after.y).toBeGreaterThan(initial.y);
    });

    it('does not advance cursor for highlight actions', () => {
      executor.execute({
        type: 'create_block',
        ref: 'target',
        block_type: 'body',
        content: 'Target',
        position: 'top-left',
      });

      const beforeHighlight = executor.getCursor();

      executor.execute({
        type: 'highlight',
        target: 'target',
        style: 'circle',
      });

      const afterHighlight = executor.getCursor();
      expect(afterHighlight).toEqual(beforeHighlight);
    });
  });

  describe('executeAll', () => {
    it('executes multiple actions sequentially', () => {
      const actions: CreateBlockAction[] = [
        {
          type: 'create_block',
          ref: 'title',
          block_type: 'title',
          content: 'Title',
          position: 'top-center',
        },
        {
          type: 'create_block',
          ref: 'body_1',
          block_type: 'body',
          content: 'First paragraph',
          position: 'below:title',
          size: 'medium',
        },
        {
          type: 'create_block',
          ref: 'body_2',
          block_type: 'body',
          content: 'Second paragraph',
          position: 'below:body_1',
          size: 'medium',
        },
      ];

      const nodes = executor.executeAll(actions);

      expect(nodes.length).toBe(3);
      // Each should be below the previous
      expect(nodes[1].y).toBeGreaterThan(nodes[0].y);
      expect(nodes[2].y).toBeGreaterThan(nodes[1].y);
    });

    it('no two resolved nodes overlap', () => {
      const actions: CreateBlockAction[] = [
        {
          type: 'create_block',
          ref: 'a',
          block_type: 'body',
          content: 'Block A with some content',
          position: 'top-left',
          size: 'large',
        },
        {
          type: 'create_block',
          ref: 'b',
          block_type: 'body',
          content: 'Block B beside A',
          position: 'beside:a',
          size: 'large',
        },
        {
          type: 'create_block',
          ref: 'c',
          block_type: 'body',
          content: 'Block C below A',
          position: 'below:a',
          size: 'medium',
        },
      ];

      const nodes = executor.executeAll(actions);

      // Check no pair of nodes overlaps
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const overlapsX = b.x < a.x + a.width && b.x + b.width > a.x;
          const overlapsY = b.y < a.y + a.height && b.y + b.height > a.y;
          expect(overlapsX && overlapsY).toBe(false);
        }
      }
    });
  });

  describe('section()', () => {
    it('clears non-sticky nodes and resets cursor', () => {
      executor.execute({
        type: 'create_block',
        ref: 'sticky_title',
        block_type: 'title',
        content: 'Persistent Title',
        position: 'top-center',
        sticky: true,
      });

      executor.execute({
        type: 'create_block',
        ref: 'temp_body',
        block_type: 'body',
        content: 'Temporary content',
        position: 'below:sticky_title',
      });

      expect(executor.getAllNodes().length).toBe(2);

      executor.section();

      expect(executor.getNode('sticky_title')).toBeDefined();
      expect(executor.getNode('temp_body')).toBeUndefined();
      expect(executor.getCursor()).toEqual({ x: GAP.SCENE_EDGE, y: GAP.SCENE_EDGE });
    });
  });

  describe('reset()', () => {
    it('clears everything including sticky nodes', () => {
      executor.execute({
        type: 'create_block',
        ref: 'sticky',
        block_type: 'title',
        content: 'Sticky',
        position: 'center',
        sticky: true,
      });

      executor.reset();

      expect(executor.getAllNodes().length).toBe(0);
      expect(executor.getHistory().length).toBe(0);
      expect(executor.getCursor()).toEqual({ x: GAP.SCENE_EDGE, y: GAP.SCENE_EDGE });
    });
  });

  describe('complex scenario — full lesson flow', () => {
    it('handles a realistic lesson sequence without crashing', () => {
      // Title
      executor.execute({
        type: 'create_block',
        ref: 'lesson_title',
        block_type: 'title',
        content: 'Quadratic Equations',
        subtitle: 'Solving ax² + bx + c = 0',
        position: 'top-center',
        sticky: true,
      });

      // Formula
      executor.execute({
        type: 'create_block',
        ref: 'quadratic_formula',
        block_type: 'formula',
        content: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        position: 'below:lesson_title',
      });

      // Explanation body
      executor.execute({
        type: 'create_block',
        ref: 'explanation',
        block_type: 'body',
        content: 'This formula gives us the roots of any quadratic equation. The discriminant b²-4ac tells us how many real solutions exist.',
        position: 'below:quadratic_formula',
        size: 'large',
      });

      // Diagram beside
      executor.execute({
        type: 'draw_diagram',
        ref: 'parabola',
        diagram_type: 'cartesian',
        data: {
          type: 'cartesian',
          domain: [-5, 5],
          range: [-5, 10],
          x_label: 'x',
          y_label: 'f(x)',
          functions: [{ expression: 'x^2 - 3*x + 2', label: 'f(x) = x² - 3x + 2' }],
          points: [
            { x: 1, y: 0, label: 'Root 1' },
            { x: 2, y: 0, label: 'Root 2' },
          ],
        },
        position: 'beside:explanation',
        caption: 'Graph of f(x) = x² - 3x + 2',
      });

      // Highlight the formula
      executor.execute({
        type: 'highlight',
        target: 'quadratic_formula',
        style: 'box',
        color: 'accent',
      });

      // Note
      executor.execute({
        type: 'create_block',
        ref: 'tip',
        block_type: 'note',
        content: 'Always check: is b²-4ac ≥ 0?',
        position: 'bottom-right',
      });

      // Bullet list
      executor.execute({
        type: 'create_block',
        ref: 'cases',
        block_type: 'bullet_list',
        content: '',
        items: [
          'Δ > 0: Two distinct real roots',
          'Δ = 0: One repeated root',
          'Δ < 0: No real roots (complex)',
        ],
        position: 'below:explanation',
        size: 'medium',
      });

      const allNodes = executor.getAllNodes();
      expect(allNodes.length).toBe(7); // 6 blocks + 1 highlight

      // Verify no overlaps among non-highlight nodes
      const physicalNodes = allNodes.filter(n => n.node_type !== 'highlight');
      for (let i = 0; i < physicalNodes.length; i++) {
        for (let j = i + 1; j < physicalNodes.length; j++) {
          const a = physicalNodes[i];
          const b = physicalNodes[j];
          const overlapsX = b.x < a.x + a.width && b.x + b.width > a.x;
          const overlapsY = b.y < a.y + a.height && b.y + b.height > a.y;
          expect(overlapsX && overlapsY).toBe(false);
        }
      }
    });
  });
});
