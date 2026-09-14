import type { Action, RevealSpec, SyncSpec } from '../types';

export interface RenderInstruction {
  action: Action;
  rendererKey: string;
  sync: SyncSpec;
  reveal: RevealSpec;
}

/**
 * Normalize action metadata into a stable runtime instruction.
 */
export function compileAction(action: Action): RenderInstruction {
  const sync: SyncSpec = {
    mode: action.sync?.mode ?? 'audioLocked',
  };

  const reveal: RevealSpec = {
    mode: action.reveal?.mode ?? 'sequential',
    steps: action.reveal?.steps,
    staggerMs: action.reveal?.staggerMs,
    markers: action.reveal?.markers,
  };

  return {
    action: {
      ...action,
      sync,
      reveal,
    },
    rendererKey: getRendererKey(action),
    sync,
    reveal,
  };
}

function getRendererKey(action: Action): string {
  switch (action.type) {
    case 'create_block':
      return `builtin:block:${action.block_type}`;
    case 'draw_diagram':
      return `builtin:diagram:${action.diagram_type}`;
    case 'highlight':
      return 'builtin:highlight';
    case 'custom':
      return action.renderer;
    default:
      return 'builtin:unknown';
  }
}
