// ─────────────────────────────────────────────────────────────
// ViewportScaler — Wraps the canvas in a CSS transform
// that fits the fixed 1920×1080 coordinate space to any screen.
// ─────────────────────────────────────────────────────────────

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../engine/constants';

interface ViewportScalerProps {
  children: React.ReactNode;
}

export function ViewportScaler({ children }: ViewportScalerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const parent = containerRef.current.parentElement;
      if (!parent) return;

      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;

      const scaleX = parentWidth / CANVAS_WIDTH;
      const scaleY = parentHeight / CANVAS_HEIGHT;
      setScale(Math.min(scaleX, scaleY));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    const parent = containerRef.current?.parentElement;
    if (parent) observer.observe(parent);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    >
      {children}
    </div>
  );
}
