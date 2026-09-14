// ─────────────────────────────────────────────────────────────
// TutorCanvas — Main React component
// Assembles React Flow, node components, and camera.
// Camera only moves when nodes go outside the viewport.
// ─────────────────────────────────────────────────────────────

'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '../store/canvas-store';
import { lightTheme } from '../theme/default';
import { toReactFlowNodes } from './node-factory';
import { moveCamera } from './CameraController';
import { buildNodeTypes } from './registry';

// ── Node Type Registry (unified: built-ins + custom) ──────

const builtinNodeTypes: NodeTypes = buildNodeTypes();

const DEFAULT_VIEWPORT_ZOOM = 0.74;

// ── Inner Canvas (needs ReactFlowProvider) ─────────────────

function CanvasInner() {
  const nodes = useCanvasStore((s) => s.nodes);
  const customRenderers = useCanvasStore((s) => s.renderers);
  const theme = useCanvasStore((s) => s.theme);
  const rfInstance = useReactFlow();
  const prevNodeCountRef = useRef(0);
  const isUserInteracting = useRef(false);
  const interactionTimeoutRef = useRef<NodeJS.Timeout>();

  const tokens = theme?.tokens ?? lightTheme.tokens;
  const canvasConfig = theme?.canvas ?? lightTheme.canvas;
  const spacing = theme?.spacing ?? lightTheme.spacing;
  const radius = theme?.radius ?? lightTheme.radius;
  const anim = theme?.animation ?? lightTheme.animation;

  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, []);

  // Camera: keep newly added nodes fully visible.
  useEffect(() => {
    if (nodes.length > prevNodeCountRef.current && nodes.length > 0) {
      const latestNode = nodes[nodes.length - 1];
      if (!isUserInteracting.current) {
        // Small delay to let React Flow render the node first
        requestAnimationFrame(() => {
          moveCamera(rfInstance, latestNode);
        });
      }
    }
    prevNodeCountRef.current = nodes.length;
  }, [nodes, rfInstance]);

  // Convert engine nodes to React Flow nodes
  const rfNodes = useMemo(() => toReactFlowNodes(nodes), [nodes]);

  // Merge built-in + custom renderers into one nodeTypes map
  const nodeTypes = useMemo(
    () => buildNodeTypes(customRenderers),
    [customRenderers],
  );

  const handleResetZoom = () => {
    const viewport = rfInstance.getViewport();
    const zoom = viewport.zoom || 1;
    const container = document.querySelector('.react-flow') as HTMLElement | null;
    if (!container) return;

    const centerX = -viewport.x / zoom + container.clientWidth / (2 * zoom);
    const centerY = -viewport.y / zoom + container.clientHeight / (2 * zoom);

    rfInstance.setCenter(centerX, centerY, {
      zoom: DEFAULT_VIEWPORT_ZOOM,
      duration: parseInt(anim.durationFast),
    });
  };

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={[]}
      nodeTypes={nodeTypes}
      fitView={false}
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      minZoom={0.15}
      maxZoom={2}
      defaultViewport={{ x: 0, y: 0, zoom: DEFAULT_VIEWPORT_ZOOM }}
      proOptions={{ hideAttribution: true }}
      style={{ background: canvasConfig.background }}
      onMoveStart={(event) => {
        if (event) {
          isUserInteracting.current = true;
          if (interactionTimeoutRef.current) {
            clearTimeout(interactionTimeoutRef.current);
          }
        }
      }}
      onMoveEnd={(event) => {
        if (event) {
          interactionTimeoutRef.current = setTimeout(() => {
            isUserInteracting.current = false;
          }, 3000);
        }
      }}
    >
      <Panel position="top-right">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: parseInt(spacing.sm),
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: radius.lg,
            padding: `${spacing.xs} ${spacing.sm}`,
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(255,255,255,0.5) inset',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tokens.colors.text} strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <button
            type="button"
            onClick={() => rfInstance.zoomOut({ duration: 180 })}
            aria-label="Zoom out"
            title="Zoom out"
            className="sketchboard-zoom-btn"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => rfInstance.zoomIn({ duration: 180 })}
            aria-label="Zoom in"
            title="Zoom in"
            className="sketchboard-zoom-btn"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            aria-label="Reset zoom"
            title="Reset zoom"
            className="sketchboard-zoom-btn sketchboard-zoom-btn-reset"
          >
            Reset
          </button>
        </div>
      </Panel>
      <Background
        variant={BackgroundVariant.Dots}
        gap={canvasConfig.gridGap}
        size={canvasConfig.gridDotSize}
        color={canvasConfig.gridDotColor}
      />
    </ReactFlow>
  );
}

// ── Public Component ───────────────────────────────────────

export interface TutorCanvasProps {
  className?: string;
  style?: React.CSSProperties;
}

export function TutorCanvas({ className, style }: TutorCanvasProps) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <ReactFlowProvider>
        <CanvasInner />
      </ReactFlowProvider>
    </div>
  );
}
