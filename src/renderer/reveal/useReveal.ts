// ─────────────────────────────────────────────────────────────
// Reveal Pipeline — useReveal Hook (v4)
// Supports sequential, parallel, stagger, manual, and audio reveal modes.
// Only animates when this node is the active reveal target.
// No conditional hooks — all hooks called unconditionally.
// ─────────────────────────────────────────────────────────────

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AnimationPlan, RevealMode, AudioProgress } from '../../engine/types';
import { useCanvasStore } from '../../store/canvas-store';

export interface RevealState {
  /** Whether this node should be visible at all */
  visible: boolean;
  /** Whether the reveal animation has started */
  started: boolean;
  /** Progress from 0 to 1 */
  progress: number;
  /** Whether the reveal is complete */
  complete: boolean;
  /** Current character index for char-reveal */
  charIndex: number;
  /** Current reveal step index (0-based) */
  stepIndex: number;
  /** Total reveal steps */
  stepCount: number;
  /** Named marker states */
  markers: Record<string, boolean>;
}

export interface ManualRevealControls {
  /** Advance to the next step */
  advance: () => void;
  /** Jump to a specific step index */
  goToStep: (step: number) => void;
  /** Complete the reveal immediately */
  complete: () => void;
}

const EMPTY_CONTROLS: ManualRevealControls = {
  advance: () => {},
  goToStep: () => {},
  complete: () => {},
};

export interface UseRevealOptions {
  /** Audio progress for audio-driven reveal mode */
  audioProgress?: AudioProgress | null;
  /** Action start time in seconds (for audio mode) */
  actionStart?: number;
  /** Action duration in seconds (for audio mode) */
  actionDuration?: number;
}

/**
 * Hook that drives the reveal animation for a single node.
 * Only animates when this node is the activeRevealId in the store.
 */
export function useReveal(
  nodeId: string,
  animation: AnimationPlan,
  contentLength: number = 0,
  options?: UseRevealOptions
): RevealState & { controls: ManualRevealControls } {
  const activeRevealId = useCanvasStore((s) => s.activeRevealId);
  const revealedNodes = useCanvasStore((s) => s.revealedNodes);
  const markRevealed = useCanvasStore((s) => s.markRevealed);

  const isActive = activeRevealId === nodeId;
  const isRevealed = revealedNodes.has(nodeId);

  const [progress, setProgress] = useState(0);
  const [manualStep, setManualStep] = useState(0);
  const [started, setStarted] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const markedRef = useRef(false);

  const revealConfig = animation.reveal;
  const mode: RevealMode = revealConfig?.mode ?? 'sequential';
  const configuredSteps = revealConfig?.steps;
  const stepCount = Math.max(1, configuredSteps ?? 1);
  const staggerMs = revealConfig?.staggerMs ?? 150;

  // Audio mode params
  const audioProgress = options?.audioProgress;
  const actionStartSec = options?.actionStart ?? 0;
  const actionDurationSec = options?.actionDuration ?? 0;

  // ── Manual mode controls ─────────────────────────────────

  const manualAdvance = useCallback(() => {
    setManualStep((prev) => Math.min(prev + 1, stepCount - 1));
  }, [stepCount]);

  const manualGoToStep = useCallback((step: number) => {
    setManualStep(Math.max(0, Math.min(step, stepCount - 1)));
  }, [stepCount]);

  const manualComplete = useCallback(() => {
    setManualStep(stepCount - 1);
    setProgress(1);
    if (!markedRef.current) {
      markedRef.current = true;
      markRevealed(nodeId);
    }
  }, [stepCount, nodeId, markRevealed]);

  // ── Compute marker states ────────────────────────────────

  const markerStates = (() => {
    const out: Record<string, boolean> = {};
    const markers = revealConfig?.markers ?? [];
    for (const marker of markers) {
      const at = Math.max(0, Math.min(1, marker.at));
      out[marker.name] = progress >= at;
    }
    return out;
  })();

  // ── Compute step index based on mode ─────────────────────

  const computedStepIndex = (() => {
    switch (mode) {
      case 'parallel':
        // All steps visible immediately
        return stepCount - 1;
      case 'stagger': {
        // Each step appears at staggerMs intervals
        if (progress >= 1) return stepCount - 1;
        const staggerProgress = staggerMs > 0
          ? Math.floor((progress * animation.duration) / staggerMs)
          : stepCount - 1;
        return Math.min(stepCount - 1, staggerProgress);
      }
      case 'manual':
        return manualStep;
      case 'audio':
        // Audio mode: step index driven by progress
        return Math.min(
          stepCount - 1,
          Math.max(0, Math.floor(progress * stepCount)),
        );
      case 'sequential':
      default:
        return Math.min(
          stepCount - 1,
          Math.max(0, Math.floor(progress * stepCount)),
        );
    }
  })();

  // ── Run animation (sequential/parallel/stagger) ──────────

  useEffect(() => {
    // Skip manual and audio modes — progress is externally driven
    if (mode === 'manual' || mode === 'audio') return;
    // Skip if not our turn or already done
    if (!isActive || isRevealed || markedRef.current) return;

    setStarted(true);
    setProgress(0);
    const delay = animation.delay || 0;

    const delayTimer = setTimeout(() => {
      startTimeRef.current = performance.now();

      const animate = (now: number) => {
        const elapsed = now - (startTimeRef.current ?? now);
        const p = Math.min(elapsed / Math.max(animation.duration, 50), 1);
        setProgress(p);

        if (p < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          // Done — mark revealed, triggering next in queue
          if (!markedRef.current) {
            markedRef.current = true;
            markRevealed(nodeId);
          }
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, isRevealed, animation.delay, animation.duration, nodeId, markRevealed, mode]);

  // ── Audio mode: drive progress from audio playback ────────

  useEffect(() => {
    if (mode !== 'audio') return;
    if (!isActive || isRevealed || markedRef.current) return;
    if (!audioProgress) return;

    setStarted(true);

    const actionStartMs = actionStartSec * 1000;
    const actionDurationMs = actionDurationSec * 1000;

    // Calculate local progress within this action's time range
    let localProgress: number;
    if (actionDurationMs <= 0) {
      // No duration specified — show immediately when audio reaches start
      localProgress = audioProgress.currentTimeMs >= actionStartMs ? 1 : 0;
    } else {
      const elapsed = audioProgress.currentTimeMs - actionStartMs;
      localProgress = Math.max(0, Math.min(1, elapsed / actionDurationMs));
    }

    setProgress(localProgress);

    // Mark complete when progress reaches 1
    if (localProgress >= 1) {
      if (!markedRef.current) {
        markedRef.current = true;
        markRevealed(nodeId);
      }
    }
  }, [mode, isActive, isRevealed, nodeId, markRevealed, audioProgress, actionStartSec, actionDurationSec]);

  // ── Manual mode: auto-mark when step reaches end ─────────

  useEffect(() => {
    if (mode !== 'manual') return;
    if (!isActive || isRevealed || markedRef.current) return;

    setStarted(true);

    if (manualStep >= stepCount - 1) {
      setProgress(1);
      if (!markedRef.current) {
        markedRef.current = true;
        markRevealed(nodeId);
      }
    } else {
      setProgress(stepCount > 1 ? manualStep / (stepCount - 1) : 1);
    }
  }, [manualStep, mode, isActive, isRevealed, nodeId, markRevealed, stepCount]);

  // ── Build controls for manual mode ───────────────────────

  const controls: ManualRevealControls =
    mode === 'manual' && isActive && !isRevealed
      ? { advance: manualAdvance, goToStep: manualGoToStep, complete: manualComplete }
      : EMPTY_CONTROLS;

  // ── Determine final state ────────────────────────────────

  if (isRevealed || markedRef.current) {
    return {
      visible: true,
      started: true,
      progress: 1,
      complete: true,
      charIndex: contentLength,
      stepIndex: stepCount - 1,
      stepCount,
      markers: Object.fromEntries((revealConfig?.markers ?? []).map(m => [m.name, true])),
      controls,
    };
  }

  if (!isActive) {
    return {
      visible: false,
      started: false,
      progress: 0,
      complete: false,
      charIndex: 0,
      stepIndex: 0,
      stepCount,
      markers: Object.fromEntries((revealConfig?.markers ?? []).map(m => [m.name, false])),
      controls: EMPTY_CONTROLS,
    };
  }

  return {
    visible: true,
    started,
    progress,
    complete: progress >= 1,
    charIndex: Math.floor(progress * contentLength),
    stepIndex: computedStepIndex,
    stepCount,
    markers: markerStates,
    controls,
  };
}
