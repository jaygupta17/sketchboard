import type { ComponentType } from 'react';
import type { Action, TutorAction, CustomAction, ResolvedNode } from '../engine/types';
import type { Theme } from '../theme/default';

// Re-export canonical action types from engine
export type { Action, TutorAction, CustomAction, CustomSize } from '../engine/types';

// Re-export canonical Theme type (includes all design tokens)
export type { Theme } from '../theme/default';

// Manual reveal controls for custom renderers using manual mode
export interface ManualRevealControls {
  advance: () => void;
  goToStep: (step: number) => void;
  complete: () => void;
}

// Renderer component type
export type RendererComponent = ComponentType<{
  data: unknown;
  node: ResolvedNode;
  theme?: Theme;
  isAnimating: boolean;
  reveal: {
    progress: number;
    complete: boolean;
    started: boolean;
    stepIndex: number;
    stepCount: number;
    markers: Record<string, boolean>;
  };
  /** Only provided when reveal.mode === 'manual' */
  controls?: ManualRevealControls;
  onComplete?: () => void;
}>;

// Renderer registry
export interface Renderers {
  [key: string]: RendererComponent;
}
