// ─────────────────────────────────────────────────────────────
// CameraController — Keep nodes fully visible with padding.
// If a node is even partially clipped, camera pans/zooms out
// just enough to bring it fully into view.
// ─────────────────────────────────────────────────────────────

import type { ReactFlowInstance } from '@xyflow/react';
import type { ResolvedNode } from '../engine/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../engine/constants';
import type { HighlightContent } from '../engine/types';

const PAN_DURATION_MIN = 350;
const PAN_DURATION_MAX = 1200;
const VIEWPORT_PADDING = 72;
const HIGHLIGHT_PADDING = 24;

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface ContainerSize {
  width: number;
  height: number;
}

function getContainerSize(): ContainerSize | null {
  if (typeof document === 'undefined') return null;
  const container = document.querySelector('.react-flow') as HTMLElement | null;
  if (!container) return null;
  return {
    width: container.clientWidth,
    height: container.clientHeight,
  };
}

function getNodeBounds(node: ResolvedNode): Bounds {
  let minX = node.x;
  let minY = node.y;
  let maxX = node.x + node.width;
  let maxY = node.y + node.height;

  if (node.node_type === 'highlight') {
    const content = node.content as HighlightContent;
    minX -= HIGHLIGHT_PADDING;
    minY -= HIGHLIGHT_PADDING;
    maxX += HIGHLIGHT_PADDING;
    maxY += HIGHLIGHT_PADDING;

    if (content.style === 'arrow') {
      maxX += 28;
      minY -= 18;
    }
  }

  return { minX, minY, maxX, maxY };
}

function getVisibleBounds(
  viewport: { x: number; y: number; zoom: number },
  container: ContainerSize,
  paddingPx: number,
): Bounds {
  const zoom = viewport.zoom || 1;
  const safeWidth = Math.max(container.width - paddingPx * 2, 1);
  const safeHeight = Math.max(container.height - paddingPx * 2, 1);

  const minX = (-viewport.x + paddingPx) / zoom;
  const minY = (-viewport.y + paddingPx) / zoom;

  return {
    minX,
    minY,
    maxX: minX + safeWidth / zoom,
    maxY: minY + safeHeight / zoom,
  };
}

function isBoundsFullyVisible(inner: Bounds, outer: Bounds): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.minY >= outer.minY &&
    inner.maxX <= outer.maxX &&
    inner.maxY <= outer.maxY
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeZoomToFit(
  bounds: Bounds,
  container: ContainerSize,
  paddingPx: number,
  currentZoom: number,
): number {
  const safeWidth = Math.max(container.width - paddingPx * 2, 1);
  const safeHeight = Math.max(container.height - paddingPx * 2, 1);

  const boundsWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const boundsHeight = Math.max(bounds.maxY - bounds.minY, 1);

  const fitZoom = Math.min(safeWidth / boundsWidth, safeHeight / boundsHeight);

  // Never auto-zoom in. Only zoom out as needed.
  return clamp(Math.min(currentZoom, fitZoom), 0.15, 2);
}

function computeConstrainedCenter(
  currentCenter: { x: number; y: number },
  bounds: Bounds,
  container: ContainerSize,
  zoom: number,
  paddingPx: number,
): { x: number; y: number } {
  const halfVisibleW = Math.max((container.width - paddingPx * 2) / zoom / 2, 1);
  const halfVisibleH = Math.max((container.height - paddingPx * 2) / zoom / 2, 1);

  const rangeMinX = bounds.maxX - halfVisibleW;
  const rangeMaxX = bounds.minX + halfVisibleW;
  const rangeMinY = bounds.maxY - halfVisibleH;
  const rangeMaxY = bounds.minY + halfVisibleH;

  const boundsCenterX = (bounds.minX + bounds.maxX) / 2;
  const boundsCenterY = (bounds.minY + bounds.maxY) / 2;

  const x = rangeMinX <= rangeMaxX
    ? clamp(currentCenter.x, rangeMinX, rangeMaxX)
    : boundsCenterX;

  const y = rangeMinY <= rangeMaxY
    ? clamp(currentCenter.y, rangeMinY, rangeMaxY)
    : boundsCenterY;

  return { x, y };
}

/**
 * Check if a node is already within the visible viewport area.
 * Returns true if the node is visible and no camera movement is needed.
 */
export function isNodeVisible(
  rfInstance: ReactFlowInstance,
  node: ResolvedNode,
): boolean {
  const viewport = rfInstance.getViewport();
  const container = getContainerSize();
  if (!container) return false;
  const visible = getVisibleBounds(viewport, container, VIEWPORT_PADDING);
  return isBoundsFullyVisible(getNodeBounds(node), visible);
}

/**
 * Get the current viewport center in canvas coordinates.
 */
function getCurrentCenter(
  rfInstance: ReactFlowInstance,
  container?: ContainerSize,
): { x: number; y: number } {
  const viewport = rfInstance.getViewport();
  const zoom = viewport.zoom || 1;
  const size = container ?? getContainerSize();
  if (!size) return { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };

  return {
    x: -viewport.x / zoom + size.width / (2 * zoom),
    y: -viewport.y / zoom + size.height / (2 * zoom),
  };
}

/**
 * Calculate distance between two points.
 */
function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Move camera to show a newly placed node.
 * Only moves if the node is outside the current viewport.
 */
export function moveCamera(
  rfInstance: ReactFlowInstance | null,
  node: ResolvedNode,
): void {
  if (!rfInstance) return;
  const container = getContainerSize();
  if (!container) return;

  const viewport = rfInstance.getViewport();
  const currentZoom = viewport.zoom || 1;
  const nodeBounds = getNodeBounds(node);
  const visibleBounds = getVisibleBounds(viewport, container, VIEWPORT_PADDING);

  // Don't move if fully visible already.
  if (isBoundsFullyVisible(nodeBounds, visibleBounds)) return;

  const targetZoom = computeZoomToFit(nodeBounds, container, VIEWPORT_PADDING, currentZoom);
  const currentCenter = getCurrentCenter(rfInstance, container);
  const targetCenter = computeConstrainedCenter(
    currentCenter,
    nodeBounds,
    container,
    targetZoom,
    VIEWPORT_PADDING,
  );
  const dist = distance(currentCenter, targetCenter);
  const zoomDelta = Math.abs(currentZoom - targetZoom);
  const duration = Math.min(
    PAN_DURATION_MAX,
    Math.max(PAN_DURATION_MIN, dist * 0.45 + zoomDelta * 900),
  );

  rfInstance.setCenter(targetCenter.x, targetCenter.y, {
    zoom: targetZoom,
    duration,
  });
}

/**
 * Focus on a specific node (e.g. for highlight actions).
 */
export function focusNode(
  rfInstance: ReactFlowInstance | null,
  node: ResolvedNode,
): void {
  moveCamera(rfInstance, node);
}
