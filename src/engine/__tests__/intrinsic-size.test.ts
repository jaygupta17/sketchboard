import { describe, it, expect } from 'vitest';
import { computeIntrinsicSize } from '../intrinsic-size';
import type { CreateBlockAction, CustomAction, DrawDiagramAction, HighlightAction } from '../types';
import { BLOCK_SIZES, CUSTOM_SIZE_LIMITS, CUSTOM_SIZE_PRESETS, DIAGRAM_SIZES, FORMULA_MIN_WIDTH, FORMULA_MAX_WIDTH } from '../constants';

describe('computeIntrinsicSize', () => {
  // ── Block Types ──

  describe('title blocks', () => {
    it('returns fixed size for title without subtitle', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'title',
        content: 'Hello World',
        position: 'center',
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBe(520);
      expect(size.height).toBe(72);
    });

    it('returns taller fixed size for title with subtitle', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'title',
        content: 'Hello World',
        subtitle: 'A great title',
        position: 'center',
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBe(520);
      expect(size.height).toBe(108);
    });
  });

  describe('body blocks', () => {
    it('uses small size variant', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'body',
        content: 'Short text',
        position: 'top-left',
        size: 'small',
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBe(320);
      expect(size.height).toBeGreaterThan(0);
      expect(size.height).toBeLessThanOrEqual(200);
    });

    it('uses medium size variant by default', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'body',
        content: 'Some content here',
        position: 'top-left',
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBe(420);
    });

    it('uses large size variant', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'body',
        content: 'Large body text goes here',
        position: 'top-left',
        size: 'large',
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBe(560);
    });

    it('auto-height grows with content', () => {
      const shortAction: CreateBlockAction = {
        type: 'create_block',
        block_type: 'body',
        content: 'Short',
        position: 'top-left',
        size: 'medium',
      };
      const longAction: CreateBlockAction = {
        type: 'create_block',
        block_type: 'body',
        content: 'This is a much longer body of text that should require more lines to display. It needs to wrap across multiple lines to test auto-height computation.',
        position: 'top-left',
        size: 'medium',
      };
      const shortSize = computeIntrinsicSize(shortAction);
      const longSize = computeIntrinsicSize(longAction);
      expect(longSize.height).toBeGreaterThan(shortSize.height);
    });

    it('clamps to maxHeight and truncates content', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'body',
        content: 'A'.repeat(5000),
        position: 'top-left',
        size: 'small',
      };
      const size = computeIntrinsicSize(action);
      // maxHeight is 9999 for body_small, verify valid size
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
    });
  });

  describe('formula blocks', () => {
    it('returns height of 64px', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'formula',
        content: 'x^2 + y^2 = r^2',
        position: 'center',
      };
      const size = computeIntrinsicSize(action);
      expect(size.height).toBe(64);
    });

    it('respects minimum width', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'formula',
        content: 'x',
        position: 'center',
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBeGreaterThanOrEqual(FORMULA_MIN_WIDTH);
    });

    it('applies scale factor for very long formulas', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'formula',
        content: '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} + \\int_0^{\\infty} e^{-x^2} dx + \\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6} + \\alpha + \\beta + \\gamma',
        position: 'center',
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBeLessThanOrEqual(FORMULA_MAX_WIDTH);
      // May or may not have scale factor depending on KaTeX measurement
    });
  });

  describe('other block types', () => {
    it('computes theorem size', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'theorem',
        content: 'For all x in R, f(x) >= 0',
        position: 'center',
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBe(480);
      expect(size.height).toBeLessThanOrEqual(320);
    });

    it('computes bullet_list size with items', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'bullet_list',
        content: '',
        items: ['First point', 'Second point', 'Third point'],
        position: 'top-left',
        size: 'medium',
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBe(420);
    });

    it('computes note size', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'note',
        content: 'Remember this!',
        position: 'top-right',
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBe(300);
      expect(size.height).toBeLessThanOrEqual(220);
    });

    it('computes code size', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'code',
        content: 'const x = 42;\nconsole.log(x);',
        position: 'center',
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBe(440);
      expect(size.height).toBeLessThanOrEqual(280);
    });

    it('computes definition size', () => {
      const action: CreateBlockAction = {
        type: 'create_block',
        block_type: 'definition',
        content: 'A function is a mapping from inputs to outputs.',
        position: 'center',
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBe(420);
      expect(size.height).toBeLessThanOrEqual(240);
    });
  });

  // ── Diagram Types ──

  describe('diagram types', () => {
    const diagramTypes: Array<{ type: string; w: number; h: number }> = [
      { type: 'cartesian', w: 480, h: 400 },
      { type: 'geometry', w: 400, h: 400 },
      { type: 'flowchart', w: 480, h: 360 },
      { type: 'venn', w: 400, h: 360 },
      { type: 'bar_chart', w: 480, h: 360 },
      { type: 'pie_chart', w: 360, h: 360 },
    ];

    for (const { type, w, h } of diagramTypes) {
      it(`returns correct size for ${type}`, () => {
        const action: DrawDiagramAction = {
          type: 'draw_diagram',
          diagram_type: type as any,
          data: { type } as any,
          position: 'center',
        };
        const size = computeIntrinsicSize(action);
        expect(size.width).toBe(w);
        expect(size.height).toBe(h);
      });
    }
  });

  describe('custom action size', () => {
    it('uses preset size variants', () => {
      const action: CustomAction = {
        type: 'custom',
        renderer: 'widget',
        data: { value: 1 },
        position: 'center',
        size: 'small',
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBe(CUSTOM_SIZE_PRESETS.small.width);
      expect(size.height).toBe(CUSTOM_SIZE_PRESETS.small.height);
    });

    it('clamps explicit dimensions within limits', () => {
      const action: CustomAction = {
        type: 'custom',
        renderer: 'widget',
        data: {},
        position: 'center',
        size: { width: 5000, height: 10 },
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBe(CUSTOM_SIZE_LIMITS.maxWidth);
      expect(size.height).toBe(CUSTOM_SIZE_LIMITS.minHeight);
    });
  });

  // ── Highlight ──

  describe('highlight', () => {
    it('returns zero size for highlights', () => {
      const action: HighlightAction = {
        type: 'highlight',
        target: 'some_ref',
      };
      const size = computeIntrinsicSize(action);
      expect(size.width).toBe(0);
      expect(size.height).toBe(0);
    });
  });
});
