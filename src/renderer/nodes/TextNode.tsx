// ─────────────────────────────────────────────────────────────
// TextNode — Renders text blocks with CSS char-reveal animation
// Uses Caveat font. Hand-drawn rough.js aesthetic.
// ─────────────────────────────────────────────────────────────

'use client';

import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import rough from 'roughjs';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/themes/prism.css'; // Let's use the default light prism theme

import type { BlockContent, AnimationPlan } from '../../engine/types';
import { useReveal } from '../reveal/useReveal';
import { useCanvasStore } from '../../store/canvas-store';
import { lightTheme } from '../../theme/default';

interface TextNodeData {
  content: BlockContent;
  animation: AnimationPlan;
  color: string;
  nodeWidth: number;
  nodeHeight: number;
  [key: string]: unknown;
}

export function TextNode({ data, id }: NodeProps) {
  const { content, animation, color, nodeWidth, nodeHeight } = data as unknown as TextNodeData;
  const blockContent = content as BlockContent;
  const theme = useCanvasStore((s) => s.theme);
  const colors = theme?.colors ?? lightTheme.colors;
  const tokens = theme?.tokens ?? lightTheme.tokens;
  const fontSize = theme?.fontSize ?? lightTheme.fontSize;
  const spacing = theme?.spacing ?? lightTheme.spacing;
  const roughConfig = theme?.rough ?? lightTheme.rough;
  const anim = theme?.animation ?? lightTheme.animation;
  
  const COLOR_MAP: Record<string, string> = {
    primary: colors.text,
    accent: colors.accent,
    highlight: colors.highlight,
    danger: colors.danger,
  };
  
  const textContent = blockContent.block_type === 'bullet_list' 
    ? (blockContent.items || []).join('\n') 
    : blockContent.content;

  const { visible, charIndex, complete } = useReveal(id, animation, textContent.length);

  const visibleText = complete ? textContent : textContent.slice(0, charIndex);
  const textColor = COLOR_MAP[color] || COLOR_MAP.primary;

  if (!visible) {
    return <div style={{ width: nodeWidth, height: nodeHeight, opacity: 0 }} />;
  }

  return (
    <div
      className="tutor-text-node group"
      style={{
        width: nodeWidth,
        height: nodeHeight,
        fontFamily: tokens.fonts.body,
        color: textColor,
        position: 'relative',
        animation: `tutor-fade-in ${anim.durationNormal} var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1))`,
        transition: `transform ${anim.durationNormal} var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1))`,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      {blockContent.block_type === 'title' && (
        <TitleBlock
          text={visibleText} subtitle={blockContent.subtitle}
          charIndex={charIndex} textLength={textContent.length}
          complete={complete} width={nodeWidth} height={nodeHeight} color={textColor}
          spacing={spacing} fontSize={fontSize} roughConfig={roughConfig}
        />
      )}

      {blockContent.block_type === 'body' && (
        <BodyBlock text={visibleText} spacing={spacing} fontSize={fontSize} />
      )}

      {blockContent.block_type === 'theorem' && (
        <TheoremBlock text={visibleText} textColor={textColor} complete={complete} width={nodeWidth} height={nodeHeight} surfaceBg={colors.surface} spacing={spacing} fontSize={fontSize} roughConfig={roughConfig} />
      )}

      {blockContent.block_type === 'bullet_list' && (
        <BulletListBlock
          items={blockContent.items || textContent.split('\n')}
          charIndex={charIndex} complete={complete} color={textColor}
          spacing={spacing} fontSize={fontSize} anim={anim}
        />
      )}

      {blockContent.block_type === 'definition' && (
        <DefinitionBlock text={visibleText} textColor={textColor} complete={complete} width={nodeWidth} bgColor={colors.background} spacing={spacing} fontSize={fontSize} />
      )}

      {blockContent.block_type === 'code' && (
        <CodeBlock text={visibleText} complete={complete} width={nodeWidth} height={nodeHeight} codeBg={tokens.codeBg} spacing={spacing} fontSize={fontSize} tokens={tokens} />
      )}

      {blockContent.block_type === 'note' && (
        <BodyBlock text={visibleText} spacing={spacing} fontSize={fontSize} />
      )}

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function RoughContainer({ width, height, drawFn }: { width: number; height: number; drawFn: (rc: ReturnType<typeof rough.svg>, svg: SVGSVGElement) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawnRef = useRef(false);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || drawnRef.current || width === 0 || height === 0) return;
    drawnRef.current = true;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    drawFn(rough.svg(svg), svg);
  }, [width, height, drawFn]);

  return (
    <svg ref={svgRef} width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none', zIndex: -1 }} />
  );
}

function TitleBlock({ text, subtitle, charIndex, textLength, complete, width, height, color, spacing, fontSize, roughConfig }: any) {
  const subtitleVisible = complete || charIndex > textLength;
  const subtitleChars = subtitle && subtitleVisible
    ? subtitle.slice(0, complete ? subtitle.length : charIndex - textLength)
    : '';

  return (
    <div style={{ padding: parseInt(spacing.md), display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ fontSize: fontSize.title, fontWeight: 700, lineHeight: 1.2, margin: 0, position: 'relative', zIndex: 1 }}>
        {text}{!complete && <span className="tutor-cursor">|</span>}
      </h1>
      
      {/* Rough underline directly below the title masked by clip-path */}
      <div style={{ position: 'relative', width: width - 32, height: 10, marginTop: 4, marginBottom: subtitle ? 4 : 0 }}>
        <div style={{
          width: '100%', height: '100%',
          clipPath: `inset(0 ${100 - (charIndex / Math.max(1, textLength)) * 100}% 0 0)`,
        }}>
          <RoughContainer width={width - 32} height={10} drawFn={(rc, svg) => {
            svg.appendChild(rc.line(2, 5, width - 34, 5, { stroke: color, strokeWidth: roughConfig.strokeWidth + 0.5, roughness: roughConfig.roughness + 0.7, bowing: roughConfig.bowing }));
          }} />
        </div>
      </div>

      {subtitle && (
        <p style={{ fontSize: fontSize.subtitle, opacity: subtitleVisible ? 0.7 : 0, transition: 'opacity 0.3s ease', margin: 0 }}>
          {subtitleChars}
        </p>
      )}
    </div>
  );
}

function BodyBlock({ text, spacing, fontSize }: any) {
  return (
    <div style={{ padding: parseInt(spacing.md) }}>
      <p style={{ fontSize: fontSize.body, fontWeight: 400, lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{text}</p>
    </div>
  );
}

function TheoremBlock({ text, textColor, complete, width, height, surfaceBg, spacing, fontSize, roughConfig }: any) {
  const mdPad = parseInt(spacing.md);
  const smPad = parseInt(spacing.sm);
  return (
    <div style={{ position: 'relative', width, height, padding: `${mdPad}px ${mdPad}px ${smPad + 4}px`, boxSizing: 'border-box' }}>
      <RoughContainer width={width} height={height} drawFn={(rc, svg) => {
        // Drop shadow
        svg.appendChild(rc.rectangle(4, 4, width - 8, height - 8, { fill: 'rgba(0,0,0,0.06)', fillStyle: 'hachure', hachureGap: 4, roughness: 2, stroke: 'none' }));
        // Main box
        svg.appendChild(rc.rectangle(2, 2, width - 8, height - 8, { fill: surfaceBg, fillStyle: 'solid', stroke: textColor, strokeWidth: roughConfig.strokeWidth, roughness: roughConfig.roughness }));
      }} />

      <span style={{ position: 'absolute', top: -4, left: 24, background: surfaceBg, padding: `0 ${parseInt(spacing.sm)}px`, fontSize: fontSize.caption, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: textColor, zIndex: 1 }}>
        Theorem
      </span>
      <p style={{ fontSize: fontSize.body, lineHeight: 1.5, margin: 0, position: 'relative', zIndex: 1 }}>{text}</p>
    </div>
  );
}

function BulletListBlock({ items, charIndex, complete, color, spacing, fontSize, anim }: any) {
  let charsSoFar = 0;
  return (
    <div style={{ padding: parseInt(spacing.md) }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item: string, i: number) => {
          const itemStart = charsSoFar;
          charsSoFar += item.length + 1;
          const itemVisible = complete || charIndex > itemStart;
          const itemComplete = complete || charIndex >= itemStart + item.length;
          const itemText = itemComplete ? item : item.slice(0, Math.max(0, charIndex - itemStart));

          return (
            <li key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: parseInt(spacing.sm) + 2, marginBottom: 8,
              fontSize: fontSize.body, lineHeight: 1.5,
              opacity: itemVisible ? 1 : 0,
              transform: itemVisible ? 'translateX(0)' : 'translateX(-12px)',
              transition: `opacity ${anim.durationNormal} var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) ${i * anim.staggerMs}ms, transform ${anim.durationNormal} var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) ${i * anim.staggerMs}ms`,
            }}>
              <div style={{ width: 14, height: 14, marginTop: 10, flexShrink: 0, position: 'relative' }}>
                <RoughContainer width={14} height={14} drawFn={(rc, svg) => {
                  svg.appendChild(rc.circle(7, 7, 8, { fill: color, fillStyle: 'solid', roughness: 1, stroke: 'none' }));
                }} />
              </div>
              <span>{itemText}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DefinitionBlock({ text, textColor, complete, width, bgColor, spacing, fontSize }: any) {
  return (
    <div style={{ padding: parseInt(spacing.md), position: 'relative' }}>
      <div style={{ position: 'absolute', top: 12, left: parseInt(spacing.md), width: width - 32, height: 4, overflow: 'hidden' }}>
        <RoughContainer width={width - 32} height={4} drawFn={(rc, svg) => {
           svg.appendChild(rc.line(2, 2, width - 34, 2, { stroke: textColor, strokeWidth: 2, roughness: 2, bowing: 2 }));
        }} />
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: complete ? '0%' : '100%',
          background: bgColor,
          transition: 'width 0.5s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)), opacity 0.3s ease',
          opacity: complete ? 0 : 1,
        }} />
      </div>
      <p style={{ fontSize: fontSize.body, lineHeight: 1.5, margin: `${parseInt(spacing.sm) + 4}px 0 0 0` }}>{text}</p>
    </div>
  );
}

function CodeBlock({ text, complete, width, height, codeBg, spacing, fontSize, tokens }: any) {
  // Use PrismJS for syntax highlighting
  const highlightedCode = useMemo(() => {
    // Basic python fallback
    return Prism.highlight(text, Prism.languages.python, 'python');
  }, [text]);

  return (
    <div style={{ position: 'relative', width, height, padding: parseInt(spacing.md), boxSizing: 'border-box' }}>
      <RoughContainer width={width} height={height} drawFn={(rc, svg) => {
        // Hatched background simulating a highlighted area
        svg.appendChild(rc.rectangle(2, 2, width - 4, height - 4, { fill: codeBg || 'rgba(0,0,0,0.03)', fillStyle: 'zigzag', hachureAngle: -45, roughness: 1.5, stroke: 'rgba(0,0,0,0.1)' }));
      }} />

      <pre style={{
        fontFamily: tokens.fonts.code,
        fontSize: fontSize.code, lineHeight: 1.6, margin: 0, position: 'relative', zIndex: 1,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        {!complete && <span className="tutor-cursor">|</span>}
      </pre>
    </div>
  );
}
