import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionExecutor } from '../action-executor';
import type { Action, CreateBlockAction, CustomAction, HighlightAction } from '../types';
import { resetIdCounter } from '../utils';
import { validateSegment, SketchpenValidationError, SketchpenRuntimeError } from '../../core/validate';
import { buildActionSchedule } from '../../core/timeline-scheduler';
import { compileAction } from '../compiler';
import type { Segment } from '../../core/SketchpenLive';

describe('Golden Integration Scenarios', () => {
  let executor: ActionExecutor;

  beforeEach(() => {
    executor = new ActionExecutor();
    resetIdCounter();
  });

  // ── Scenario 1: Mixed built-in + custom in one segment ──

  describe('1. Mixed built-in + custom actions', () => {
    it('resolves a segment with create_block, custom, and highlight', () => {
      const actions: Action[] = [
        {
          type: 'create_block',
          ref: 'title_1',
          block_type: 'title',
          content: 'Quadratic Equations',
          position: 'center',
          sticky: true,
        },
        {
          type: 'custom',
          ref: 'solver_1',
          renderer: 'stepSolver',
          position: 'below:title_1',
          size: { width: 520, height: 280 },
          data: { equation: 'x^2 - 2x - 3 = 0', steps: [] },
        },
        {
          type: 'highlight',
          target: 'title_1',
          style: 'box',
          color: 'accent',
        },
      ];

      const nodes = executor.executeAll(actions);

      expect(nodes.length).toBe(3);
      expect(nodes[0].node_type).toBe('text');
      expect(nodes[1].node_type).toBe('custom');
      expect(nodes[2].node_type).toBe('highlight');

      // Custom node should have correct dimensions
      expect(nodes[1].width).toBe(520);
      expect(nodes[1].height).toBe(280);

      // No overlaps between non-highlight nodes
      const physical = nodes.filter((n) => n.node_type !== 'highlight');
      for (let i = 0; i < physical.length; i++) {
        for (let j = i + 1; j < physical.length; j++) {
          const a = physical[i];
          const b = physical[j];
          const overlapsX = b.x < a.x + a.width && b.x + b.width > a.x;
          const overlapsY = b.y < a.y + a.height && b.y + b.height > a.y;
          expect(overlapsX && overlapsY).toBe(false);
        }
      }
    });
  });

  // ── Scenario 2: Missing renderer shows fallback ─────────

  describe('2. Missing renderer fallback', () => {
    it('custom action with unknown renderer still resolves as node', () => {
      const action: CustomAction = {
        type: 'custom',
        ref: 'missing_1',
        renderer: 'nonexistentWidget',
        position: 'center',
        data: { foo: 'bar' },
      };

      const node = executor.execute(action);

      expect(node.id).toBe('missing_1');
      expect(node.node_type).toBe('custom');
      expect((node.content as any).renderer).toBe('nonexistentWidget');
      // Node still gets valid dimensions (default medium size)
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
    });
  });

  // ── Scenario 3: Audio decode failure emits structured error ──

  describe('3. Audio decode failure validation', () => {
    it('validates segment with invalid audio data', () => {
      const segment: Segment = {
        audio: { data: '', encoding: 'pcm_s16le' },
        actions: [
          {
            type: 'create_block',
            ref: 'x',
            block_type: 'title',
            content: 'Hello',
            position: 'center',
          },
        ],
      };

      const issues = validateSegment(segment);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.code === 'AUDIO_INVALID')).toBe(true);
    });

    it('validates segment with invalid encoding', () => {
      const segment = {
        audio: { data: 'abc', encoding: 'ogg' as any },
        actions: [],
      };

      const issues = validateSegment(segment);
      expect(issues.some((i) => i.code === 'AUDIO_INVALID')).toBe(true);
    });

    it('validates segment with invalid sample rate', () => {
      const segment: Segment = {
        audio: { data: 'abc', encoding: 'pcm_s16le', sampleRate: -1 },
        actions: [],
      };

      const issues = validateSegment(segment);
      expect(issues.some((i) => i.path === 'audio.sampleRate')).toBe(true);
    });
  });

  // ── Scenario 4: Custom node with oversized dimensions ────

  describe('4. Oversized custom node resolves correctly', () => {
    it('clamps oversized custom node to max dimensions', () => {
      const action: CustomAction = {
        type: 'custom',
        ref: 'big_1',
        renderer: 'bigWidget',
        position: 'center',
        size: { width: 5000, height: 3000 },
        data: {},
      };

      const node = executor.execute(action);

      // Should be clamped to max (960x720)
      expect(node.width).toBeLessThanOrEqual(960);
      expect(node.height).toBeLessThanOrEqual(720);
      // Should still be valid
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
    });

    it('uses preset size for custom nodes', () => {
      const action: CustomAction = {
        type: 'custom',
        ref: 'preset_1',
        renderer: 'widget',
        position: 'center',
        size: 'large',
        data: {},
      };

      const node = executor.execute(action);
      expect(node.width).toBe(600);
      expect(node.height).toBe(360);
    });
  });

  // ── Scenario 5: Highlight target exists and resolves ─────

  describe('5. Highlight targets resolved node', () => {
    it('highlight action references an existing node', () => {
      const blockAction: CreateBlockAction = {
        type: 'create_block',
        ref: 'target_block',
        block_type: 'formula',
        content: 'E = mc^2',
        position: 'center',
      };

      const highlightAction: HighlightAction = {
        type: 'highlight',
        target: 'target_block',
        style: 'box',
        color: 'accent',
      };

      const blockNode = executor.execute(blockAction);
      const highlightNode = executor.execute(highlightAction);

      expect(blockNode.id).toBe('target_block');
      expect(highlightNode.node_type).toBe('highlight');

      // Highlight should be positioned relative to target
      expect(highlightNode.width).toBe(blockNode.width);
      expect(highlightNode.height).toBe(blockNode.height);
    });
  });

  // ── Scenario 6: Compiler + scheduler pipeline ───────────

  describe('6. Compiler + scheduler pipeline', () => {
    it('compiles actions and builds schedule with sync modes', () => {
      const actions: Action[] = [
        {
          type: 'create_block',
          ref: 'a1',
          block_type: 'title',
          content: 'Hello',
          position: 'center',
          sync: { mode: 'audioLocked' },
        },
        {
          type: 'create_block',
          ref: 'a2',
          block_type: 'body',
          content: 'World',
          position: 'below:a1',
          sync: { mode: 'durationLocked' },
        },
        {
          type: 'custom',
          ref: 'c1',
          renderer: 'widget',
          position: 'right-of:a1',
          data: {},
          atMs: 500,
          durationMs: 1000,
          sync: { mode: 'audioLocked' },
        },
      ];

      // Compile each action
      const instructions = actions.map(compileAction);
      expect(instructions.length).toBe(3);
      expect(instructions[0].sync.mode).toBe('audioLocked');
      expect(instructions[1].sync.mode).toBe('durationLocked');
      expect(instructions[2].rendererKey).toBe('widget');

      // Build schedule
      const schedule = buildActionSchedule(actions, {
        audioDurationMs: 5000,
        fraction: 0.5,
      });

      expect(schedule.length).toBe(3);

      // a1: audioLocked, no atMs -> starts at 0
      expect(schedule[0].startMs).toBe(0);

      // a2: durationLocked, no atMs -> starts at cursor (0 initially, then advances)
      expect(schedule[1].startMs).toBe(0);
      // a2 duration should be set
      expect(schedule[1].durationMs).toBeGreaterThan(0);

      // c1: explicit atMs=500
      const c1Schedule = schedule.find((s) => (s.action as CustomAction).ref === 'c1');
      expect(c1Schedule?.startMs).toBe(500);
      expect(c1Schedule?.durationMs).toBe(1000);
    });

    it('respects reveal metadata in compiled instructions', () => {
      const action: CustomAction = {
        type: 'custom',
        ref: 'manual_1',
        renderer: 'stepSolver',
        position: 'center',
        data: {},
        reveal: {
          mode: 'manual',
          steps: 5,
          markers: [
            { name: 'start', at: 0 },
            { name: 'midpoint', at: 0.5 },
            { name: 'end', at: 1 },
          ],
        },
      };

      const instruction = compileAction(action);
      expect(instruction.reveal.mode).toBe('manual');
      expect(instruction.reveal.steps).toBe(5);
      expect(instruction.reveal.markers?.length).toBe(3);
    });
  });

  // ── Scenario 7: Validation catches invalid actions ───────

  describe('7. Validation catches invalid payloads', () => {
    it('rejects action with invalid position', () => {
      const segment: Segment = {
        audio: { data: 'abc', encoding: 'pcm_s16le' },
        actions: [
          {
            type: 'create_block',
            ref: 'bad',
            block_type: 'title',
            content: 'Hello',
            position: 'invalid-position' as any,
          },
        ],
      };

      const issues = validateSegment(segment);
      expect(issues.some((i) => i.code === 'POSITION_INVALID')).toBe(true);
    });

    it('rejects custom action without renderer', () => {
      const segment: Segment = {
        audio: { data: 'abc', encoding: 'pcm_s16le' },
        actions: [
          {
            type: 'custom',
            ref: 'bad',
            renderer: '',
            position: 'center',
            data: {},
          },
        ],
      };

      const issues = validateSegment(segment);
      expect(issues.some((i) => i.code === 'ACTION_INVALID')).toBe(true);
    });

    it('rejects unknown action type', () => {
      const segment: Segment = {
        audio: { data: 'abc', encoding: 'pcm_s16le' },
        actions: [
          { type: 'unknown_action' } as any,
        ],
      };

      const issues = validateSegment(segment);
      expect(issues.some((i) => i.code === 'ACTION_INVALID')).toBe(true);
    });

    it('valid segment produces no issues', () => {
      const segment: Segment = {
        audio: { data: 'abc', encoding: 'pcm_s16le' },
        actions: [
          {
            type: 'create_block',
            ref: 'ok',
            block_type: 'title',
            content: 'Hello',
            position: 'center',
          },
        ],
      };

      const issues = validateSegment(segment);
      expect(issues.length).toBe(0);
    });
  });
});
