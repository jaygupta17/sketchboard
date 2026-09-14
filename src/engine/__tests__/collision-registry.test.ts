import { describe, it, expect, beforeEach } from 'vitest';
import { CollisionRegistry, aabbOverlap, expandForGap } from '../collision-registry';
import type { AABB } from '../types';
import { GAP } from '../constants';

describe('aabbOverlap', () => {
  it('detects overlapping boxes', () => {
    const a: AABB = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    const b: AABB = { minX: 50, minY: 50, maxX: 150, maxY: 150 };
    expect(aabbOverlap(a, b)).toBe(true);
  });

  it('detects non-overlapping boxes (horizontal gap)', () => {
    const a: AABB = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    const b: AABB = { minX: 200, minY: 0, maxX: 300, maxY: 100 };
    expect(aabbOverlap(a, b)).toBe(false);
  });

  it('detects non-overlapping boxes (vertical gap)', () => {
    const a: AABB = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    const b: AABB = { minX: 0, minY: 200, maxX: 100, maxY: 300 };
    expect(aabbOverlap(a, b)).toBe(false);
  });

  it('touching edges do not overlap (exclusive bounds)', () => {
    const a: AABB = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    const b: AABB = { minX: 100, minY: 0, maxX: 200, maxY: 100 };
    expect(aabbOverlap(a, b)).toBe(false);
  });

  it('one box fully inside another overlaps', () => {
    const outer: AABB = { minX: 0, minY: 0, maxX: 200, maxY: 200 };
    const inner: AABB = { minX: 50, minY: 50, maxX: 100, maxY: 100 };
    expect(aabbOverlap(outer, inner)).toBe(true);
  });
});

describe('expandForGap', () => {
  it('expands by standard gap for text nodes', () => {
    const bounds: AABB = { minX: 100, minY: 100, maxX: 200, maxY: 200 };
    const expanded = expandForGap(bounds, 'text');
    expect(expanded.minX).toBe(100 - GAP.HORIZONTAL);
    expect(expanded.minY).toBe(100 - GAP.VERTICAL);
    expect(expanded.maxX).toBe(200 + GAP.HORIZONTAL);
    expect(expanded.maxY).toBe(200 + GAP.VERTICAL);
  });

  it('expands by diagram gap for diagram nodes', () => {
    const bounds: AABB = { minX: 100, minY: 100, maxX: 200, maxY: 200 };
    const expanded = expandForGap(bounds, 'diagram');
    expect(expanded.minX).toBe(100 - GAP.DIAGRAM);
    expect(expanded.maxX).toBe(200 + GAP.DIAGRAM);
  });

  it('expands by note gap for note nodes', () => {
    const bounds: AABB = { minX: 100, minY: 100, maxX: 200, maxY: 200 };
    const expanded = expandForGap(bounds, 'note');
    expect(expanded.minX).toBe(100 - GAP.NOTE);
    expect(expanded.maxX).toBe(200 + GAP.NOTE);
  });
});

describe('CollisionRegistry', () => {
  let registry: CollisionRegistry;

  beforeEach(() => {
    registry = new CollisionRegistry();
  });

  it('starts empty', () => {
    expect(registry.size).toBe(0);
    expect(registry.getAll()).toEqual([]);
  });

  it('registers a node', () => {
    const bounds: AABB = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    registry.register('node1', bounds, false);
    expect(registry.size).toBe(1);
  });

  it('detects collision with registered node', () => {
    registry.register('node1', { minX: 0, minY: 0, maxX: 100, maxY: 100 }, false);
    const candidate: AABB = { minX: 50, minY: 50, maxX: 150, maxY: 150 };
    expect(registry.hasCollision(candidate)).toBe(true);
  });

  it('no collision with distant candidate', () => {
    registry.register('node1', { minX: 0, minY: 0, maxX: 100, maxY: 100 }, false);
    const candidate: AABB = { minX: 500, minY: 500, maxX: 600, maxY: 600 };
    expect(registry.hasCollision(candidate)).toBe(false);
  });

  it('excludes a specific node from collision check', () => {
    registry.register('node1', { minX: 0, minY: 0, maxX: 100, maxY: 100 }, false);
    const candidate: AABB = { minX: 50, minY: 50, maxX: 150, maxY: 150 };
    expect(registry.hasCollision(candidate, 'node1')).toBe(false);
  });

  it('hasCollisionWithGap expands before checking', () => {
    registry.register('node1', { minX: 0, minY: 0, maxX: 100, maxY: 100 }, false);
    // This candidate is 110px to the right — no raw overlap, but within 48px gap
    const candidate: AABB = { minX: 110, minY: 0, maxX: 210, maxY: 100 };
    expect(registry.hasCollision(candidate)).toBe(false); // raw: no overlap
    expect(registry.hasCollisionWithGap(candidate, 'text')).toBe(true); // with gap: yes
  });

  it('unregisters a node', () => {
    registry.register('node1', { minX: 0, minY: 0, maxX: 100, maxY: 100 }, false);
    registry.unregister('node1');
    expect(registry.size).toBe(0);
  });

  it('clearNonSticky keeps sticky nodes', () => {
    registry.register('sticky1', { minX: 0, minY: 0, maxX: 100, maxY: 100 }, true);
    registry.register('temp1', { minX: 200, minY: 0, maxX: 300, maxY: 100 }, false);
    registry.register('temp2', { minX: 400, minY: 0, maxX: 500, maxY: 100 }, false);
    
    registry.clearNonSticky();
    
    expect(registry.size).toBe(1);
    expect(registry.getAll()[0].id).toBe('sticky1');
  });

  it('getRightmostEdge returns the rightmost boundary', () => {
    registry.register('n1', { minX: 0, minY: 0, maxX: 100, maxY: 50 }, false);
    registry.register('n2', { minX: 200, minY: 0, maxX: 500, maxY: 50 }, false);
    expect(registry.getRightmostEdge()).toBe(500);
  });

  it('getBottomEdge returns the bottommost boundary', () => {
    registry.register('n1', { minX: 0, minY: 0, maxX: 100, maxY: 300 }, false);
    registry.register('n2', { minX: 0, minY: 400, maxX: 100, maxY: 800 }, false);
    expect(registry.getBottomEdge()).toBe(800);
  });

  it('getBounds returns enclosing bounding box', () => {
    registry.register('n1', { minX: 10, minY: 20, maxX: 100, maxY: 200 }, false);
    registry.register('n2', { minX: 50, minY: 5, maxX: 300, maxY: 150 }, false);
    const bounds = registry.getBounds();
    expect(bounds).toEqual({ minX: 10, minY: 5, maxX: 300, maxY: 200 });
  });

  it('getBounds returns null on empty registry', () => {
    expect(registry.getBounds()).toBeNull();
  });

  it('clear removes everything', () => {
    registry.register('a', { minX: 0, minY: 0, maxX: 10, maxY: 10 }, true);
    registry.register('b', { minX: 0, minY: 0, maxX: 10, maxY: 10 }, false);
    registry.clear();
    expect(registry.size).toBe(0);
  });
});
