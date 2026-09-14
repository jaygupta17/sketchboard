// ─────────────────────────────────────────────────────────────
// FormulaNode — Renders LaTeX formulas with KaTeX
// CSS-based reveal: clip-path wipe from left to right
// ─────────────────────────────────────────────────────────────

'use client';

import React, { useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import katex from 'katex';
import rough from 'roughjs';
import type { BlockContent, AnimationPlan } from '../../engine/types';
import { useReveal } from '../reveal/useReveal';
import { useCanvasStore } from '../../store/canvas-store';
import { lightTheme } from '../../theme/default';

interface FormulaNodeData {
  content: BlockContent;
  animation: AnimationPlan;
  color: string;
  nodeWidth: number;
  nodeHeight: number;
  scaleFactor?: number;
  [key: string]: unknown;
}

export function FormulaNode({ data, id }: NodeProps) {
  const { content, animation, color, nodeWidth, nodeHeight, scaleFactor } = data as unknown as FormulaNodeData;
  const blockContent = content as BlockContent;
  const latex = blockContent.content;
  const theme = useCanvasStore((s) => s.theme);
  const colors = theme?.colors ?? lightTheme.colors;
  const roughConfig = theme?.rough ?? lightTheme.rough;
  const anim = theme?.animation ?? lightTheme.animation;

  const COLOR_MAP: Record<string, string> = {
    primary: colors.text,
    accent: colors.accent,
    highlight: colors.highlight,
    danger: colors.danger,
  };

  // Count content length for reveal timing
  const contentLen = useMemo(() => latex.length, [latex]);

  const { visible, progress, complete } = useReveal(id, animation, contentLen);

  // Render full KaTeX HTML once (memoized — no re-renders)
  const fullHtml = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      return `<span style="color: red; font-family: monospace;">Invalid: ${latex}</span>`;
    }
  }, [latex]);

  const textColor = COLOR_MAP[color] || COLOR_MAP.primary;
  const scale = scaleFactor || 1;

  if (!visible) {
    return <div style={{ width: nodeWidth, height: nodeHeight, opacity: 0 }} />;
  }

  // Use CSS clip-path for smooth left-to-right reveal
  const clipPercent = complete ? 100 : Math.floor(progress * 100);

  return (
    <div
      className="tutor-formula-node hover:-translate-y-1 transition-transform duration-200"
      style={{
        width: nodeWidth,
        height: nodeHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        position: 'relative',
        animation: 'tutor-fade-in 0.25s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1))',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      {/* Rough background box for formulas to look like they are sketched over */}
      <svg
        width={nodeWidth + 20}
        height={nodeHeight + 20}
        style={{
          position: 'absolute',
          top: -10, left: -10,
          overflow: 'visible',
          pointerEvents: 'none',
          zIndex: -1,
        }}
        ref={(svg) => {
          if (!svg || svg.dataset.drawn === 'true') return;
          svg.dataset.drawn = 'true';
          const rc = (window as any).roughPool 
             ? (window as any).roughPool.svg(svg) 
             : rough.svg(svg);
          // Very subtle highlight box behind the math
           svg.appendChild(
            rc.rectangle(10, 10, nodeWidth, nodeHeight, {
               fill: 'rgba(255,255,255,0.7)',
               fillStyle: 'solid',
               stroke: 'rgba(0,0,0,0.1)',
               strokeWidth: roughConfig.strokeWidth,
               roughness: roughConfig.roughness + 0.4
            })
          );
        }}
      />

      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          color: textColor,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: fullHtml }}
          style={{
            clipPath: complete ? 'none' : `inset(0 ${100 - clipPercent}% 0 0)`,
            transition: complete ? 'none' : `clip-path ${anim.durationNormal} var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1))`,
          }}
        />
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}
