// ─────────────────────────────────────────────────────────────
// NoteNode — Sticky note with hand-drawn SVG background
// Sequential reveal via CSS fade-in.
// ─────────────────────────────────────────────────────────────

'use client';

import React, { useMemo, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import rough from 'roughjs';
import type { BlockContent, AnimationPlan } from '../../engine/types';
import { useReveal } from '../reveal/useReveal';
import { useCanvasStore } from '../../store/canvas-store';
import { lightTheme } from '../../theme/default';

interface NoteNodeData {
  content: BlockContent;
  animation: AnimationPlan;
  color: string;
  nodeWidth: number;
  nodeHeight: number;
  [key: string]: unknown;
}

export function NoteNode({ data, id }: NodeProps) {
  const { content, animation, color, nodeWidth, nodeHeight } = data as unknown as NoteNodeData;
  const blockContent = content as BlockContent;
  const theme = useCanvasStore((s) => s.theme);
  const tokens = theme?.tokens ?? lightTheme.tokens;
  const fontSize = theme?.fontSize ?? lightTheme.fontSize;
  const spacing = theme?.spacing ?? lightTheme.spacing;
  const roughConfig = theme?.rough ?? lightTheme.rough;
  const anim = theme?.animation ?? lightTheme.animation;

  const NOTE_COLORS: Record<string, { bg: string; border: string; text: string }> = tokens.note;

  const { visible, progress, complete } = useReveal(id, animation, blockContent.content.length);

  // Deterministic rotation from node ID
  const rotation = useMemo(() => {
    let hash = 0;
    for (const c of id) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
    return (hash % 5) - 2;
  }, [id]);

  const colors = NOTE_COLORS[color] || NOTE_COLORS.primary;
  const svgRef = useRef<SVGSVGElement>(null);
  const drawnRef = useRef(false);

  // Draw the sticky note background ONCE
  React.useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || drawnRef.current || nodeWidth === 0 || nodeHeight === 0) return;
    drawnRef.current = true;

    // Clear just in case
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);

    // 1. Drop shadow (hatched block slightly offset)
    svg.appendChild(
      rc.rectangle(4, 4, nodeWidth, nodeHeight, {
        fill: 'rgba(0,0,0,0.1)',
        fillStyle: 'hachure',
        hachureAngle: 60,
        hachureGap: 3,
        roughness: 1.5,
        stroke: 'none'
      })
    );

    // 2. Main paper sticky note
    svg.appendChild(
      rc.rectangle(0, 0, nodeWidth, nodeHeight, {
        fill: colors.bg,
        fillStyle: 'solid',
        roughness: roughConfig.roughness,
        stroke: colors.border,
        strokeWidth: roughConfig.strokeWidth
      })
    );

    // 3. Piece of "tape" at the top middle
    const tapeWidth = 40;
    const tapeX = nodeWidth / 2 - tapeWidth / 2;
    svg.appendChild(
      rc.line(tapeX, 2, tapeX + tapeWidth, -4, {
        roughness: 2,
        stroke: 'rgba(255, 255, 255, 0.6)',
        strokeWidth: 12,
        bowing: 0.5
      })
    );

  }, [colors, nodeWidth, nodeHeight]);

  if (!visible) {
    return <div style={{ width: nodeWidth, height: nodeHeight, opacity: 0 }} />;
  }

  return (
    <div
      className="tutor-note-node group"
      style={{
        width: nodeWidth,
        height: nodeHeight,
        position: 'relative',
        transform: `rotate(${rotation}deg) scale(${complete ? 1 : 0.95 + progress * 0.05})`,
        opacity: progress,
        transition: `opacity ${anim.durationSlow} var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)), transform ${anim.durationSlow} var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1))`,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      
      {/* Hand-drawn background */}
      <svg
        ref={svgRef}
        width={nodeWidth + 20}
        height={nodeHeight + 20}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          overflow: 'visible',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      {/* Content */}
      <div style={{
        padding: parseInt(spacing.md),
        fontFamily: tokens.fonts.body,
        fontSize: fontSize.note,
        lineHeight: 1.5,
        color: colors.text,
        boxSizing: 'border-box'
      }}>
        <p style={{ margin: 0 }}>{blockContent.content}</p>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}
