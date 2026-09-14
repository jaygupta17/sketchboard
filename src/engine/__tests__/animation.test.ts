import { describe, it, expect } from 'vitest';
import {
  computeAnimationPlan,
  computeTextDuration,
  estimateSpeechDuration,
  adjustDurationForSpeech,
} from '../animation';
import { RHYTHM_MAP, ANIMATION_DEFAULTS } from '../constants';
import type { CreateBlockAction, DrawDiagramAction, HighlightAction } from '../types';

describe('computeTextDuration', () => {
  it('sums character delays using rhythm map', () => {
    const text = 'Hi.';
    // H=40, i=40, .=250
    const expected = 40 + 40 + 250;
    expect(computeTextDuration(text)).toBe(expected);
  });

  it('handles punctuation pauses', () => {
    const comma = computeTextDuration(',');
    const period = computeTextDuration('.');
    const question = computeTextDuration('?');
    expect(comma).toBe(120);
    expect(period).toBe(250);
    expect(question).toBe(220);
  });

  it('handles newlines as longer pauses', () => {
    expect(computeTextDuration('\n')).toBe(300);
  });

  it('spaces have zero delay', () => {
    expect(computeTextDuration(' ')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(computeTextDuration('')).toBe(0);
  });
});

describe('estimateSpeechDuration', () => {
  it('estimates at ~400ms per word', () => {
    const text = 'The quick brown fox';
    expect(estimateSpeechDuration(text)).toBe(4 * 400);
  });

  it('handles single word', () => {
    expect(estimateSpeechDuration('Hello')).toBe(400);
  });

  it('handles empty string', () => {
    expect(estimateSpeechDuration('')).toBe(0);
  });
});

describe('adjustDurationForSpeech', () => {
  it('stretches reveal when speech is longer', () => {
    const result = adjustDurationForSpeech(1000, 2000, 50);
    expect(result).toBe(2000);
  });

  it('speeds up reveal when speech is shorter', () => {
    const result = adjustDurationForSpeech(2000, 500, 50);
    // Min duration = 50 * 30 = 1500ms (MIN_MS_PER_CHAR), so cap at 1500
    expect(result).toBe(1500);
  });

  it('respects minimum ms/char when speeding up', () => {
    const result = adjustDurationForSpeech(2000, 100, 50);
    const minDuration = 50 * ANIMATION_DEFAULTS.MIN_MS_PER_CHAR;
    expect(result).toBe(minDuration);
  });
});

describe('computeAnimationPlan', () => {
  it('text nodes get char-reveal entrance', () => {
    const action: CreateBlockAction = {
      type: 'create_block',
      block_type: 'body',
      content: 'Hello world',
      position: 'center',
    };
    const plan = computeAnimationPlan(action, 'text', 200);
    expect(plan.entrance).toBe('char-reveal');
    expect(plan.duration).toBeGreaterThan(0);
  });

  it('formula nodes get token-reveal entrance', () => {
    const action: CreateBlockAction = {
      type: 'create_block',
      block_type: 'formula',
      content: 'x^2 + y^2 = r^2',
      position: 'center',
    };
    const plan = computeAnimationPlan(action, 'formula', 64);
    expect(plan.entrance).toBe('token-reveal');
  });

  it('diagram nodes get stroke entrance', () => {
    const action: DrawDiagramAction = {
      type: 'draw_diagram',
      diagram_type: 'cartesian',
      data: { type: 'cartesian', domain: [0, 10], range: [0, 10], functions: [] },
      position: 'center',
    };
    const plan = computeAnimationPlan(action, 'diagram', 400);
    expect(plan.entrance).toBe('stroke');
    expect(plan.duration).toBeGreaterThanOrEqual(ANIMATION_DEFAULTS.MIN_STROKE_DURATION);
  });

  it('note nodes get fade entrance', () => {
    const action: CreateBlockAction = {
      type: 'create_block',
      block_type: 'note',
      content: 'Remember this',
      position: 'top-right',
    };
    const plan = computeAnimationPlan(action, 'note', 100);
    expect(plan.entrance).toBe('fade');
    expect(plan.duration).toBe(ANIMATION_DEFAULTS.NOTE_FADE_DURATION);
  });

  it('highlight actions get stroke entrance with fixed duration', () => {
    const action: HighlightAction = {
      type: 'highlight',
      target: 'some_ref',
    };
    const plan = computeAnimationPlan(action, 'highlight', 0);
    expect(plan.entrance).toBe('stroke');
    expect(plan.duration).toBe(ANIMATION_DEFAULTS.HIGHLIGHT_STROKE_DURATION);
  });

  it('includes speech_duration when speech is provided', () => {
    const action: CreateBlockAction = {
      type: 'create_block',
      block_type: 'body',
      content: 'Hello world',
      position: 'center',
      speech: 'Let me explain this concept to you',
    };
    const plan = computeAnimationPlan(action, 'text', 200);
    expect(plan.speech_duration).toBeDefined();
    expect(plan.speech_duration).toBeGreaterThan(0);
  });

  it('adjusts duration to match speech when speech is longer', () => {
    const action: CreateBlockAction = {
      type: 'create_block',
      block_type: 'body',
      content: 'Hi',
      position: 'center',
      speech: 'This is a very long narration that accompanies this short text block and takes much longer to say',
    };
    const plan = computeAnimationPlan(action, 'text', 200);
    // Speech should be much longer than "Hi" reveal
    expect(plan.duration).toBeGreaterThanOrEqual(plan.speech_duration! * 0.9); // approximate
  });
});
