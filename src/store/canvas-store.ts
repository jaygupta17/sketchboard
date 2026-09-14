// ─────────────────────────────────────────────────────────────
// TutorCanvas — Zustand Canvas State Store
// Single source of truth for canvas state.
// Sequential reveal queue — only one node animates at a time.
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand';
import type { ResolvedNode } from '../engine/types';
import type { Renderers, Theme } from '../actions';
import type { SketchboardRuntimeErrorContext } from '../core/validate';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasError {
  code: SketchboardRuntimeErrorContext['code'];
  message: string;
  nodeId?: string;
  rendererKey?: string;
  timestamp: number;
}

export interface CanvasState {
  /** All resolved nodes currently on the canvas */
  nodes: ResolvedNode[];
  /** Current camera viewport position */
  viewport: Viewport;
  /** Ordered queue of node IDs waiting to be revealed */
  revealQueue: string[];
  /** The node ID currently being revealed (only one at a time) */
  activeRevealId: string | null;
  /** Set of node IDs that have completed their reveal animation */
  revealedNodes: Set<string>;
  /** Session status */
  sessionStatus: 'idle' | 'active' | 'ended';
  /** Custom renderers for custom actions */
  renderers: Renderers;
  /** Current theme */
  theme: Theme | null;
  /** Runtime errors surfaced to UI */
  errors: CanvasError[];
}

export interface CanvasActions {
  /** Add a resolved node to the canvas and enqueue for reveal */
  addNode: (node: ResolvedNode) => void;
  /** Add multiple nodes at once */
  addNodes: (nodes: ResolvedNode[]) => void;
  /** Remove a node by ID */
  removeNode: (id: string) => void;
  /** Clear all non-sticky nodes (section transition) */
  clearNonSticky: () => void;
  /** Clear everything (reset) */
  clearAll: () => void;
  /** Update the camera viewport */
  setViewport: (viewport: Viewport) => void;
  /** Mark a node as revealed — triggers the next in queue */
  markRevealed: (nodeId: string) => void;
  /** Set session status */
  setSessionStatus: (status: CanvasState['sessionStatus']) => void;
  /** Set custom renderers */
  setRenderers: (renderers: Renderers) => void;
  /** Set theme */
  setTheme: (theme: Theme | null) => void;
  /** Push a runtime error to the error list */
  pushError: (error: Omit<CanvasError, 'timestamp'>) => void;
  /** Clear all errors */
  clearErrors: () => void;
}

export interface CanvasState {
  /** All resolved nodes currently on the canvas */
  nodes: ResolvedNode[];
  /** Current camera viewport position */
  viewport: Viewport;
  /** Ordered queue of node IDs waiting to be revealed */
  revealQueue: string[];
  /** The node ID currently being revealed (only one at a time) */
  activeRevealId: string | null;
  /** Set of node IDs that have completed their reveal animation */
  revealedNodes: Set<string>;
  /** Session status */
  sessionStatus: 'idle' | 'active' | 'ended';
  /** Custom renderers for custom actions */
  renderers: Renderers;
  /** Current theme */
  theme: Theme | null;
}

export interface CanvasActions {
  /** Add a resolved node to the canvas and enqueue for reveal */
  addNode: (node: ResolvedNode) => void;
  /** Add multiple nodes at once */
  addNodes: (nodes: ResolvedNode[]) => void;
  /** Remove a node by ID */
  removeNode: (id: string) => void;
  /** Clear all non-sticky nodes (section transition) */
  clearNonSticky: () => void;
  /** Clear everything (reset) */
  clearAll: () => void;
  /** Update the camera viewport */
  setViewport: (viewport: Viewport) => void;
  /** Mark a node as revealed — triggers the next in queue */
  markRevealed: (nodeId: string) => void;
  /** Set session status */
  setSessionStatus: (status: CanvasState['sessionStatus']) => void;
  /** Set custom renderers */
  setRenderers: (renderers: Renderers) => void;
  /** Set theme */
  setTheme: (theme: Theme | null) => void;
}

export const useCanvasStore = create<CanvasState & CanvasActions>((set, get) => ({
  // ── State ──
  nodes: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  revealQueue: [],
  activeRevealId: null,
  revealedNodes: new Set<string>(),
  sessionStatus: 'idle',
  renderers: {},
  theme: null,
  errors: [],

  // ── Actions ──
  addNode: (node) =>
    set((state) => {
      // Check if node with same ID already exists - replace it instead of duplicating
      const existingIndex = state.nodes.findIndex((n) => n.id === node.id);
      let newNodes;
      if (existingIndex >= 0) {
        // Update existing node
        newNodes = [...state.nodes];
        newNodes[existingIndex] = node;
      } else {
        // Add new node
        newNodes = [...state.nodes, node];
      }
      const newQueue = existingIndex >= 0 
        ? state.revealQueue // Don't add to queue if updating existing
        : [...state.revealQueue, node.id];
      const activeRevealId = state.activeRevealId ?? node.id;
      return {
        nodes: newNodes,
        revealQueue: newQueue,
        activeRevealId,
      };
    }),

  addNodes: (nodes) =>
    set((state) => {
      const newIds = nodes.map((n) => n.id);
      const newQueue = [...state.revealQueue, ...newIds];
      const activeRevealId = state.activeRevealId ?? (newIds[0] || null);
      return {
        nodes: [...state.nodes, ...nodes],
        revealQueue: newQueue,
        activeRevealId,
      };
    }),

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
    })),

  clearNonSticky: () =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.sticky),
      revealQueue: [],
      activeRevealId: null,
    })),

  clearAll: () =>
    set({
      nodes: [],
      revealQueue: [],
      activeRevealId: null,
      revealedNodes: new Set(),
      errors: [],
    }),

  setViewport: (viewport) => set({ viewport }),

  markRevealed: (nodeId) =>
    set((state) => {
      const next = new Set(state.revealedNodes);
      next.add(nodeId);

      const remaining = state.revealQueue.filter((id) => id !== nodeId && !next.has(id));
      const nextActive = remaining.length > 0 ? remaining[0] : null;

      return {
        revealedNodes: next,
        activeRevealId: nextActive,
        revealQueue: remaining,
      };
    }),

  setSessionStatus: (status) => set({ sessionStatus: status }),

  setRenderers: (renderers) => set({ renderers }),
  setTheme: (theme) => set({ theme }),

  pushError: (error) =>
    set((state) => ({
      errors: [...state.errors, { ...error, timestamp: Date.now() }],
    })),

  clearErrors: () => set({ errors: [] }),
}));
