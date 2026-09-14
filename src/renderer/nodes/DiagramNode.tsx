// ─────────────────────────────────────────────────────────────
// DiagramNode — Renders diagrams using rough.js
// KEY FIX: rough.js shapes are rendered ONCE and cached.
// Animation is pure CSS dashoffset — no re-rendering of shapes.
// ─────────────────────────────────────────────────────────────

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import rough from 'roughjs';
import type { DiagramContent, AnimationPlan } from '../../engine/types';
import { evaluateExpression } from '../expression';
import { useReveal } from '../reveal/useReveal';
import { useCanvasStore } from '../../store/canvas-store';
import { lightTheme } from '../../theme/default';

interface DiagramNodeData {
  content: DiagramContent;
  animation: AnimationPlan;
  color: string;
  nodeWidth: number;
  nodeHeight: number;
  [key: string]: unknown;
}

export function DiagramNode({ data, id }: NodeProps) {
  const { content, animation, nodeWidth, nodeHeight } = data as unknown as DiagramNodeData;
  const diagramContent = content as DiagramContent;
  const theme = useCanvasStore((s) => s.theme);
  const tokens = theme?.tokens ?? lightTheme.tokens;
  const fontSize = theme?.fontSize ?? lightTheme.fontSize;
  const roughConfig = theme?.rough ?? lightTheme.rough;
  const anim = theme?.animation ?? lightTheme.animation;
  const svgRef = useRef<SVGSVGElement>(null);
  const drawnRef = useRef(false);
  const [svgReady, setSvgReady] = useState(false);

  const { visible, progress, complete } = useReveal(id, animation, 100);

  // Draw ONCE — render rough.js shapes and set up dashoffset
  React.useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || drawnRef.current) return;
    drawnRef.current = true;

    // Clear just in case for strict mode
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const padding = 40;
    const drawWidth = nodeWidth - padding * 2;
    const drawHeight = nodeHeight - padding * 2;

    const rc = rough.svg(svg);
    const palette = tokens.diagramPalette;
    const axisColor = tokens.diagramAxis;
    const labelColor = tokens.diagramLabel;
    const labelFontFamily = tokens.fonts.body;
    const labelFontSize = fontSize.caption;

    switch (diagramContent.diagram_type) {
      case 'cartesian':
        drawCartesian(svg, rc, diagramContent.data as any, padding, drawWidth, drawHeight, palette, axisColor, labelColor, labelFontFamily, labelFontSize);
        break;
      case 'bar_chart':
        drawBarChart(svg, rc, diagramContent.data as any, padding, drawWidth, drawHeight, palette, axisColor, labelColor, labelFontFamily, labelFontSize);
        break;
      case 'pie_chart':
        drawPieChart(svg, rc, diagramContent.data as any, nodeWidth, nodeHeight, palette, labelFontFamily, labelFontSize);
        break;
      case 'geometry':
        drawGeometry(svg, rc, diagramContent.data as any, padding, drawWidth, drawHeight, palette, axisColor, labelFontFamily, labelFontSize);
        break;
      case 'flowchart':
        drawFlowchart(svg, rc, diagramContent.data as any, padding, drawWidth, drawHeight, palette, axisColor, labelFontFamily, labelFontSize);
        break;
      case 'venn':
        drawVenn(svg, rc, diagramContent.data as any, nodeWidth, nodeHeight, palette, axisColor, labelFontFamily, labelFontSize);
        break;
    }

    // Set initial dashoffset on ALL drawn paths (fully hidden)
    const allPaths = svg.querySelectorAll('path');
    allPaths.forEach((path) => {
      try {
        const length = path.getTotalLength() + 5; // Add slight buffer
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        path.dataset.length = `${length}`;
        // NO css transition here! It fights with rAF and causes vibration
      } catch { /* skip */ }
    });

    // Hide text labels initially
    const allText = svg.querySelectorAll('text');
    allText.forEach((t) => {
      t.style.opacity = '0';
      t.style.transition = `opacity ${anim.durationNormal} ease`;
    });

    setSvgReady(true);
  }, [diagramContent, nodeWidth, nodeHeight]);

  // Animate dashoffset based on progress (no re-render of rough shapes!)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !svgReady) return;

    const allPaths = svg.querySelectorAll('path');
    allPaths.forEach((path) => {
      const lenStr = path.dataset.length;
      if (lenStr) {
        const len = parseFloat(lenStr);
        path.style.strokeDashoffset = `${len * (1 - progress)}`;
      }
    });

    // Gradual label fade from 50% to 80% progress
    if (progress > 0.5) {
      const allText = svg.querySelectorAll('text');
      const labelOpacity = Math.min(1, (progress - 0.5) / 0.3);
      allText.forEach((t) => {
        t.style.opacity = String(labelOpacity);
      });
    }
  }, [progress, svgReady]);

  if (!visible) {
    return <div style={{ width: nodeWidth, height: nodeHeight, opacity: 0 }} />;
  }

  return (
    <div
      className="tutor-diagram-node group hover:-translate-y-1 transition-transform duration-200"
      style={{
        width: nodeWidth,
        height: nodeHeight,
        position: 'relative',
        animation: 'tutor-fade-in 0.3s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1))',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      <svg
        ref={svgRef}
        width={nodeWidth}
        height={nodeHeight}
        style={{ overflow: 'visible' }}
      />

      {diagramContent.caption && (
        <div style={{
          position: 'absolute', bottom: 4, left: 0, right: 0,
          textAlign: 'center', fontSize: fontSize.caption,
          fontFamily: tokens.fonts.body,
          color: tokens.diagramLabel,
          opacity: complete ? 1 : 0,
          transition: `opacity ${anim.durationSlow} var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1))`,
        }}>
          {diagramContent.caption}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

// ── Diagram Renderers (same as before, unchanged) ──────────

function drawCartesian(
  svg: SVGSVGElement, rc: ReturnType<typeof rough.svg>,
  data: any, padding: number, w: number, h: number,
  palette: string[], axisColor: string, labelColor: string,
  labelFontFamily?: string, labelFontSize?: number,
) {
  const [xMin, xMax] = data.domain || [-10, 10];
  const [yMin, yMax] = data.range || [-10, 10];
  const toX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * w;
  const toY = (y: number) => padding + ((yMax - y) / (yMax - yMin)) * h;

  svg.appendChild(rc.line(padding, toY(0), padding + w, toY(0), { roughness: 0.8, stroke: axisColor }));
  svg.appendChild(rc.line(toX(0), padding, toX(0), padding + h, { roughness: 0.8, stroke: axisColor }));

  if (data.x_label) addLabel(svg, padding + w + 8, toY(0) + 4, data.x_label, labelColor, 'start', labelFontFamily, labelFontSize);
  if (data.y_label) addLabel(svg, toX(0) + 8, padding - 8, data.y_label, labelColor, 'start', labelFontFamily, labelFontSize);

  (data.functions || []).forEach((fn: any, i: number) => {
    const color = fn.color || palette[i % palette.length];
    const points: [number, number][] = [];
    for (let px = 0; px <= 200; px++) {
      const x = xMin + (px / 200) * (xMax - xMin);
      try {
        const y = evaluateExpression(fn.expression, x);
        if (isFinite(y) && y >= yMin && y <= yMax) {
          points.push([toX(x), toY(y)]);
        }
      } catch { /* skip */ }
    }
    if (points.length > 1) {
      svg.appendChild(rc.curve(points, { roughness: 0.6, stroke: color, strokeWidth: 2 }));
    } else if (fn.expression) {
      console.warn(`[sketchboard] No plottable points for function "${fn.expression}"`);
    }
    if (fn.label) {
      const mid = points[Math.floor(points.length / 2)];
      if (mid) addLabel(svg, mid[0] + 8, mid[1] - 12, fn.label, color, 'start', labelFontFamily, labelFontSize);
    }
  });

  (data.points || []).forEach((pt: any) => {
    const cx = toX(pt.x); const cy = toY(pt.y);
    svg.appendChild(rc.circle(cx, cy, 10, { fill: palette[0], fillStyle: 'solid', roughness: 0.5 }));
    if (pt.label) addLabel(svg, cx + 8, cy - 8, pt.label, labelColor, 'start', labelFontFamily, labelFontSize);
  });
}

function drawBarChart(
  svg: SVGSVGElement, rc: ReturnType<typeof rough.svg>,
  data: any, padding: number, w: number, h: number,
  palette: string[], axisColor: string, labelColor: string,
  labelFontFamily?: string, labelFontSize?: number,
) {
  const bars = data.bars || [];
  if (bars.length === 0) return;
  const maxVal = Math.max(...bars.map((b: any) => Math.abs(b.value)));
  const barWidth = w / bars.length * 0.7;
  const gap = w / bars.length * 0.3;

  svg.appendChild(rc.line(padding, padding, padding, padding + h, { roughness: 0.8, stroke: axisColor }));
  svg.appendChild(rc.line(padding, padding + h, padding + w, padding + h, { roughness: 0.8, stroke: axisColor }));

  bars.forEach((bar: any, i: number) => {
    const barH = (Math.abs(bar.value) / maxVal) * h * 0.85;
    const x = padding + i * (barWidth + gap) + gap / 2;
    const y = padding + h - barH;
    const color = bar.color || palette[i % palette.length];
    svg.appendChild(rc.rectangle(x, y, barWidth, barH, {
      fill: color, fillStyle: 'cross-hatch', roughness: 1, stroke: color,
    }));
    addLabel(svg, x + barWidth / 2, padding + h + 16, bar.label, labelColor, 'middle', labelFontFamily, labelFontSize);
    addLabel(svg, x + barWidth / 2, y - 8, String(bar.value), color, 'middle', labelFontFamily, labelFontSize);
  });
}

function drawPieChart(
  svg: SVGSVGElement, rc: ReturnType<typeof rough.svg>,
  data: any, w: number, h: number,
  palette: string[],
  labelFontFamily?: string, labelFontSize?: number,
) {
  const slices = data.slices || [];
  const total = slices.reduce((s: number, sl: any) => s + sl.value, 0);
  if (total === 0) return;
  const cx = w / 2; const cy = h / 2 - 10;
  const r = Math.min(w, h) / 2 - 40;
  let angle = -Math.PI / 2;

  slices.forEach((slice: any, i: number) => {
    const sliceAngle = (slice.value / total) * 2 * Math.PI;
    const endAngle = angle + sliceAngle;
    const color = slice.color || palette[i % palette.length];
    svg.appendChild(rc.arc(cx, cy, r * 2, r * 2, angle, endAngle, true, {
      fill: color, fillStyle: 'cross-hatch', roughness: 0.8, stroke: color,
    }));
    const midAngle = angle + sliceAngle / 2;
    const lx = cx + (r + 20) * Math.cos(midAngle);
    const ly = cy + (r + 20) * Math.sin(midAngle);
    addLabel(svg, lx, ly, slice.label, color, 'middle', labelFontFamily, labelFontSize);
    angle = endAngle;
  });
}

function drawGeometry(
  svg: SVGSVGElement, rc: ReturnType<typeof rough.svg>,
  data: any, padding: number, w: number, h: number,
  palette: string[], axisColor: string,
  labelFontFamily?: string, labelFontSize?: number,
) {
  const shapes = data.shapes || [];
  const scale = Math.min(w, h) / 200;

  shapes.forEach((shape: any) => {
    const toX = (x: number) => padding + x * scale;
    const toY = (y: number) => padding + y * scale;
    const shapeColor = palette[0];
    switch (shape.type) {
      case 'circle':
        svg.appendChild(rc.circle(toX(shape.cx), toY(shape.cy), shape.r * scale * 2, {
          roughness: 0.8, stroke: shapeColor, strokeWidth: 2,
        }));
        if (shape.label) addLabel(svg, toX(shape.cx), toY(shape.cy) - shape.r * scale - 8, shape.label, axisColor, 'start', labelFontFamily, labelFontSize);
        break;
      case 'line':
        svg.appendChild(rc.line(toX(shape.x1), toY(shape.y1), toX(shape.x2), toY(shape.y2), {
          roughness: 0.8, stroke: axisColor, strokeWidth: 2,
        }));
        break;
      case 'triangle':
        svg.appendChild(rc.polygon([
          [toX(shape.a[0]), toY(shape.a[1])],
          [toX(shape.b[0]), toY(shape.b[1])],
          [toX(shape.c[0]), toY(shape.c[1])],
        ], { roughness: 0.8, stroke: shapeColor, strokeWidth: 2 }));
        break;
      case 'rectangle':
        svg.appendChild(rc.rectangle(toX(shape.x), toY(shape.y), shape.w * scale, shape.h * scale, {
          roughness: 0.8, stroke: shapeColor, strokeWidth: 2,
        }));
        break;
      case 'polygon':
        svg.appendChild(rc.polygon(
          shape.points.map((p: [number, number]) => [toX(p[0]), toY(p[1])] as [number, number]),
          { roughness: 0.8, stroke: shapeColor, strokeWidth: 2 }
        ));
        break;
    }
  });
}

function drawFlowchart(
  svg: SVGSVGElement, rc: ReturnType<typeof rough.svg>,
  data: any, padding: number, w: number, h: number,
  palette: string[], axisColor: string,
  labelFontFamily?: string, labelFontSize?: number,
) {
  const nodes = data.nodes || [];
  const edges = data.edges || [];
  if (nodes.length === 0) return;
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);
  const cellW = w / cols; const cellH = h / rows;
  const nodeW = cellW * 0.7; const nodeH = cellH * 0.5;
  const positions = new Map<string, { cx: number; cy: number }>();
  const primaryColor = palette[0];
  const fillColor = primaryColor + '15';

  nodes.forEach((node: any, i: number) => {
    const col = i % cols; const row = Math.floor(i / cols);
    const cx = padding + col * cellW + cellW / 2;
    const cy = padding + row * cellH + cellH / 2;
    positions.set(node.id, { cx, cy });
    if (node.shape === 'diamond') {
      svg.appendChild(rc.polygon([
        [cx, cy - nodeH / 2], [cx + nodeW / 2, cy],
        [cx, cy + nodeH / 2], [cx - nodeW / 2, cy],
      ], { roughness: 0.8, stroke: primaryColor, fill: fillColor, fillStyle: 'solid' }));
    } else if (node.shape === 'pill') {
      svg.appendChild(rc.ellipse(cx, cy, nodeW, nodeH, {
        roughness: 0.8, stroke: primaryColor, fill: fillColor, fillStyle: 'solid',
      }));
    } else {
      svg.appendChild(rc.rectangle(cx - nodeW / 2, cy - nodeH / 2, nodeW, nodeH, {
        roughness: 0.8, stroke: primaryColor, fill: fillColor, fillStyle: 'solid',
      }));
    }
    addLabel(svg, cx, cy + 4, node.text, axisColor, 'middle', labelFontFamily, labelFontSize);
  });

  edges.forEach((edge: any) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) return;
    svg.appendChild(rc.line(from.cx, from.cy + nodeH / 2, to.cx, to.cy - nodeH / 2, {
      roughness: 0.8, stroke: axisColor, strokeWidth: 1.5,
    }));
  });
}

function drawVenn(
  svg: SVGSVGElement, rc: ReturnType<typeof rough.svg>,
  data: any, w: number, h: number,
  palette: string[], axisColor: string,
  labelFontFamily?: string, labelFontSize?: number,
) {
  const sets = data.sets || [];
  const cx = w / 2; const cy = h / 2;
  const r = Math.min(w, h) / 3; const offset = r * 0.5;

  if (sets.length >= 2) {
    svg.appendChild(rc.circle(cx - offset, cy, r * 2, {
      roughness: 0.8, stroke: palette[0], strokeWidth: 2, fill: palette[0] + '15', fillStyle: 'solid',
    }));
    svg.appendChild(rc.circle(cx + offset, cy, r * 2, {
      roughness: 0.8, stroke: palette[1], strokeWidth: 2, fill: palette[1] + '15', fillStyle: 'solid',
    }));
    addLabel(svg, cx - offset - r * 0.4, cy - r * 0.6, sets[0].label, palette[0], 'middle', labelFontFamily, labelFontSize);
    addLabel(svg, cx + offset + r * 0.4, cy - r * 0.6, sets[1].label, palette[1], 'middle', labelFontFamily, labelFontSize);
  }
  if (sets.length >= 3) {
    svg.appendChild(rc.circle(cx, cy + offset, r * 2, {
      roughness: 0.8, stroke: palette[2], strokeWidth: 2, fill: palette[2] + '15', fillStyle: 'solid',
    }));
    addLabel(svg, cx, cy + offset + r * 0.6, sets[2].label, palette[2], 'middle', labelFontFamily, labelFontSize);
  }
  if (data.intersection?.length) {
    addLabel(svg, cx, cy + 4, data.intersection.join(', '), axisColor, 'middle', labelFontFamily, labelFontSize);
  }
}

function addLabel(
  svg: SVGSVGElement, x: number, y: number, text: string,
  color: string = '#666', anchor: string = 'start',
  fontFamily?: string, fontSize?: number,
) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  el.setAttribute('x', String(x));
  el.setAttribute('y', String(y));
  el.setAttribute('fill', color);
  el.setAttribute('font-family', fontFamily ?? "var(--font-caveat), 'Caveat', cursive");
  el.setAttribute('font-size', String(fontSize ?? 14));
  el.setAttribute('text-anchor', anchor);
  el.textContent = text;
  svg.appendChild(el);
}
