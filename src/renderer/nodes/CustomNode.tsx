'use client';

import React, { useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AnimationPlan, CustomContent, ResolvedNode } from '../../engine/types';
import { useCanvasStore } from '../../store/canvas-store';
import { useReveal } from '../reveal/useReveal';
import { lightTheme } from '../../theme/default';

interface CustomNodeData {
  content: CustomContent;
  animation: AnimationPlan;
  color: string;
  nodeWidth: number;
  nodeHeight: number;
  [key: string]: unknown;
}

export function CustomNode({ data, id }: NodeProps) {
  const { content, animation, nodeWidth, nodeHeight } = data as unknown as CustomNodeData;
  const renderers = useCanvasStore((s) => s.renderers);
  const theme = useCanvasStore((s) => s.theme) ?? undefined;
  const pushError = useCanvasStore((s) => s.pushError);
  const reveal = useReveal(id, animation, 1);
  const { visible, complete } = reveal;
  const [renderError, setRenderError] = useState<string | null>(null);

  const tokens = theme?.tokens ?? lightTheme.tokens;
  const colors = theme?.colors ?? lightTheme.colors;
  const fontSize = theme?.fontSize ?? lightTheme.fontSize;
  const spacing = theme?.spacing ?? lightTheme.spacing;
  const radius = theme?.radius ?? lightTheme.radius;

  const fallbackStyle: React.CSSProperties = {
    borderRadius: parseInt(radius.lg),
    border: `1px dashed ${colors.highlight}`,
    background: tokens.note.highlight.bg,
    color: tokens.note.highlight.text,
    padding: parseInt(spacing.sm) + 4,
    boxSizing: 'border-box',
    fontFamily: tokens.fonts.code,
    fontSize: fontSize.small,
  };

  if (!visible) {
    return <div style={{ width: nodeWidth, height: nodeHeight, opacity: 0 }} />;
  }

  const Renderer = renderers[content.renderer];
  if (!Renderer) {
    return (
      <div style={{ width: nodeWidth, height: nodeHeight, ...fallbackStyle }}>
        <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Missing custom renderer</div>
        <div style={{ marginBottom: 4 }}><code>{content.renderer}</code></div>
        <div style={{ opacity: 0.8 }}>Register it via <code>SketchboardProvider renderers</code>.</div>
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      </div>
    );
  }

  if (renderError) {
    return (
      <div style={{ width: nodeWidth, height: nodeHeight, ...fallbackStyle }}>
        <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
        <div style={{ fontWeight: 700, marginBottom: 6, color: colors.danger }}>Renderer error</div>
        <div style={{ marginBottom: 4 }}><code>{content.renderer}</code></div>
        <div style={{ opacity: 0.8, fontSize: fontSize.micro }}>{renderError}</div>
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      </div>
    );
  }

  const node: ResolvedNode = {
    id,
    node_type: 'custom',
    x: 0,
    y: 0,
    width: nodeWidth,
    height: nodeHeight,
    content,
    animation,
    color: (data as CustomNodeData).color,
    sticky: false,
  };

  const handleRenderError = useCallback(
    (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      setRenderError(message);
      pushError({
        code: 'RENDERER_RUNTIME_ERROR',
        message,
        nodeId: id,
        rendererKey: content.renderer,
      });
    },
    [id, content.renderer, pushError],
  );

  return (
    <div
      style={{
        width: nodeWidth,
        height: nodeHeight,
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <RendererErrorBoundary onError={handleRenderError}>
        <Renderer
          data={content.data}
          node={node}
          theme={theme}
          isAnimating={!complete}
          reveal={{
            progress: reveal.progress,
            complete: reveal.complete,
            started: reveal.started,
            stepIndex: reveal.stepIndex,
            stepCount: reveal.stepCount,
            markers: reveal.markers,
          }}
          controls={reveal.controls}
        />
      </RendererErrorBoundary>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

// ── Error Boundary for Renderer Errors ─────────────────────

interface RendererErrorBoundaryProps {
  children: React.ReactNode;
  onError: (error: unknown) => void;
}

interface RendererErrorBoundaryState {
  hasError: boolean;
}

class RendererErrorBoundary extends React.Component<
  RendererErrorBoundaryProps,
  RendererErrorBoundaryState
> {
  constructor(props: RendererErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): RendererErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
