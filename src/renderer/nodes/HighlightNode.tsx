// ─────────────────────────────────────────────────────────────
// HighlightNode — Rough.js overlay, rendered once.
// Sequential reveal, CSS dashoffset animation.
// ─────────────────────────────────────────────────────────────

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import rough from 'roughjs';
import type { HighlightContent, AnimationPlan } from '../../engine/types';
import { useReveal } from '../reveal/useReveal';
import { useCanvasStore } from '../../store/canvas-store';
import { lightTheme } from '../../theme/default';

interface HighlightNodeData {
  content: HighlightContent;
  animation: AnimationPlan;
  color: string;
  nodeWidth: number;
  nodeHeight: number;
  [key: string]: unknown;
}

export function HighlightNode({ data, id }: NodeProps) {
  const { content, animation, nodeWidth, nodeHeight } = data as unknown as HighlightNodeData;
  const highlightContent = content as HighlightContent;
  const theme = useCanvasStore((s) => s.theme);
  const colors = theme?.colors ?? lightTheme.colors;
  const roughConfig = theme?.rough ?? lightTheme.rough;
  const svgRef = useRef<SVGSVGElement>(null);
  const drawnRef = useRef(false);
  const [svgReady, setSvgReady] = useState(false);

  const { visible, progress, complete } = useReveal(id, animation, 100);

  const HIGHLIGHT_COLORS: Record<string, string> = {
    accent: colors.accent,
    highlight: colors.highlight,
    danger: colors.danger,
  };

  const color = HIGHLIGHT_COLORS[highlightContent.color] || HIGHLIGHT_COLORS.accent;
  const style = highlightContent.style || 'circle';
  const pad = 12;

  // Draw ONCE
  React.useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || drawnRef.current || nodeWidth === 0 || nodeHeight === 0) return;
    drawnRef.current = true;

    // Clear just in case
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);
    const w = nodeWidth + pad * 2;
    const h = nodeHeight + pad * 2;

    switch (style) {
      case 'circle': {
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.max(w, h) / 2 + 4;
        svg.appendChild(rc.ellipse(cx, cy, r * 2, (r * (h / w)) * 2, {
          roughness: roughConfig.roughness + 0.4, stroke: color, strokeWidth: roughConfig.strokeWidth + 1.5, fill: 'none',
        }));
        break;
      }
      case 'box':
        svg.appendChild(rc.rectangle(4, 4, w - 8, h - 8, {
          roughness: roughConfig.roughness + 0.4, stroke: color, strokeWidth: roughConfig.strokeWidth + 1.5, fill: 'none',
        }));
        break;
      case 'underline':
        svg.appendChild(rc.line(8, h - 6, w - 8, h - 6, {
          roughness: 1.5, stroke: color, strokeWidth: roughConfig.strokeWidth + 1.5,
        }));
        break;
      case 'arrow':
        svg.appendChild(rc.line(w + 10, -10, w * 0.7, 8, {
          roughness: 1, stroke: color, strokeWidth: roughConfig.strokeWidth + 1,
        }));
        svg.appendChild(rc.line(w * 0.7, 8, w * 0.7 + 12, 4, { roughness: 0.5, stroke: color, strokeWidth: roughConfig.strokeWidth + 0.5 }));
        svg.appendChild(rc.line(w * 0.7, 8, w * 0.7 + 4, -6, { roughness: 0.5, stroke: color, strokeWidth: roughConfig.strokeWidth + 0.5 }));
        break;
    }

    // Set initial dashoffset
    const paths = svg.querySelectorAll('path');
    paths.forEach((path) => {
      try {
        const len = path.getTotalLength() + 5;
        path.style.strokeDasharray = `${len}`;
        path.style.strokeDashoffset = `${len}`;
        path.dataset.length = `${len}`;
      } catch { /* skip */ }
    });

    setSvgReady(true);
  }, [style, color, nodeWidth, nodeHeight]);

  // Animate dashoffset
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !svgReady) return;

    const paths = svg.querySelectorAll('path');
    paths.forEach((path) => {
      const lenStr = path.dataset.length;
      if (lenStr) {
        const len = parseFloat(lenStr);
        path.style.strokeDashoffset = `${len * (1 - progress)}`;
      }
    });
  }, [progress, svgReady]);

  if (!visible || nodeWidth === 0 || nodeHeight === 0) return null;

  return (
    <div
      className="tutor-highlight-node"
      style={{
        width: nodeWidth + pad * 2,
        height: nodeHeight + pad * 2,
        position: 'absolute',
        left: -pad,
        top: -pad,
        pointerEvents: 'none',
      }}
    >
      <svg
        ref={svgRef}
        width={nodeWidth + pad * 2}
        height={nodeHeight + pad * 2}
        style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0 }}
      />
    </div>
  );
}
