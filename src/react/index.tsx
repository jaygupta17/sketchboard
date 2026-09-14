import React, { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { SketchboardLive, type Segment } from '../core';
import { ActionExecutor } from '../engine/action-executor';
import { useCanvasStore } from '../store/canvas-store';
import type { Action, AudioProgress } from '../engine/types';
import type { Renderers } from '../actions';
import type { Theme } from '../theme';
import { themeFromCssVars } from '../theme/css-bridge';

interface SketchboardContextValue {
  play: (segment: Segment) => Promise<void>;
  playActions: (actions: Action[], durationMs?: number) => Promise<void>;
  pause: () => void;
  stop: () => void;
  resume: () => void;
  isPlaying: boolean;
  isSpeaking: boolean;
  isAnimating: boolean;
  /** Current audio playback progress (null when not playing) */
  audioProgress: AudioProgress | null;
  /** Execute a single action immediately (bypasses scheduling) */
  executeAction: (action: Action, duration?: number) => void;
  /** Execute multiple actions immediately (bypasses scheduling) */
  executeActions: (actions: Action[], duration?: number) => void;
  /** Manual mode: advance reveal to next step */
  advanceReveal: () => void;
  /** Manual mode: skip current reveal and complete it immediately */
  skipReveal: () => void;
}

const SketchboardContext = createContext<SketchboardContextValue | null>(null);

interface SketchboardProviderProps {
  children: ReactNode;
  fraction?: number;
  audioSampleRate?: number;
  renderers?: Renderers;
  /** Explicit theme object. Takes priority over autoTheme. */
  theme?: Theme;
  /** Auto-detect CSS variables (--primary, --background, etc.) and create a theme from them. */
  autoTheme?: boolean;
  onError?: (error: Error) => void;
}

export function SketchboardProvider({ children, fraction = 0.5, audioSampleRate = 24000, renderers, theme, autoTheme = false, onError }: SketchboardProviderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [audioProgress, setAudioProgress] = useState<AudioProgress | null>(null);
  
  const executorRef = useRef(new ActionExecutor());
  const setRenderers = useCanvasStore((s) => s.setRenderers);
  const [sketchboardInstance] = useState(() => new SketchboardLive({
    fraction,
    audioSampleRate,
    onStateChange: (state) => {
      setIsPlaying(state.isPlaying);
      setIsSpeaking(state.isSpeaking);
      setIsAnimating(state.isAnimating);
    },
    onActionExecute: (action, suggestedDuration) => {
      const node = executorRef.current.execute(action, suggestedDuration);
      useCanvasStore.getState().addNode(node);
    },
    onAudioProgress: (progress) => {
      setAudioProgress(progress);
    },
    onError,
  }));

  // Reset executor when canvas is cleared
  const nodes = useCanvasStore((s) => s.nodes);
  const prevNodesLengthRef = useRef(nodes.length);
  
  useEffect(() => {
    if (prevNodesLengthRef.current > 0 && nodes.length === 0) {
      executorRef.current.reset();
    }
    prevNodesLengthRef.current = nodes.length;
  }, [nodes.length]);

  useEffect(() => {
    setRenderers(renderers ?? {});
  }, [renderers, setRenderers]);

  // Theme: explicit prop > autoTheme from CSS vars > no theme (falls back to lightTheme)
  const setTheme = useCanvasStore((s) => s.setTheme);
  useEffect(() => {
    if (theme) {
      setTheme(theme);
    } else if (autoTheme) {
      setTheme(themeFromCssVars());
    }
  }, [theme, autoTheme, setTheme]);

  const play = useCallback(async (segment: Segment) => {
    await sketchboardInstance.play(segment);
  }, [sketchboardInstance]);

  // Play multiple actions at once (for lesson sequences)
  const playActions = useCallback(async (actions: Action[], durationMs: number = 3000) => {
    setIsPlaying(true);
    setIsSpeaking(true);
    
    const mockAudio = generateMockPCM(durationMs);
    const segment: Segment = {
      audio: { data: mockAudio, encoding: 'pcm_s16le' },
      actions
    };
    
    await sketchboardInstance.play(segment);
  }, [sketchboardInstance]);

  const pause = useCallback(() => {
    sketchboardInstance.pause();
  }, [sketchboardInstance]);

  const stop = useCallback(() => {
    sketchboardInstance.stop();
  }, [sketchboardInstance]);

  const resume = useCallback(() => {
    sketchboardInstance.resume();
  }, [sketchboardInstance]);

  const executeAction = useCallback((action: Action, duration?: number) => {
    const node = executorRef.current.execute(action, duration ?? 1000);
    useCanvasStore.getState().addNode(node);
  }, []);

  // Execute multiple actions at once
  const executeActions = useCallback((actions: Action[], duration?: number) => {
    const nodes = executorRef.current.executeAll(actions, duration ?? 1000);
    useCanvasStore.getState().addNodes(nodes);
  }, []);

  // Manual reveal: advance to next step
  const advanceReveal = useCallback(() => {
    const { activeRevealId, revealedNodes } = useCanvasStore.getState();
    if (activeRevealId && !revealedNodes.has(activeRevealId)) {
      // Find the node and trigger manual advance via the store
      // This is a simple approach — mark current as revealed to move to next
      useCanvasStore.getState().markRevealed(activeRevealId);
    }
  }, []);

  // Manual reveal: skip current reveal completely
  const skipReveal = useCallback(() => {
    const { activeRevealId, revealedNodes } = useCanvasStore.getState();
    if (activeRevealId && !revealedNodes.has(activeRevealId)) {
      useCanvasStore.getState().markRevealed(activeRevealId);
    }
  }, []);

  const value: SketchboardContextValue = {
    play,
    playActions,
    pause,
    stop,
    resume,
    isPlaying,
    isSpeaking,
    isAnimating,
    audioProgress,
    executeAction,
    executeActions,
    advanceReveal,
    skipReveal,
  };

  return (
    <SketchboardContext.Provider value={value}>
      {children}
    </SketchboardContext.Provider>
  );
}

// Simple mock audio generator for demo purposes
function generateMockPCM(durationMs: number): string {
  const sampleRate = 24000;
  const numSamples = Math.floor(sampleRate * (durationMs / 1000));
  const buffer = new Int16Array(numSamples);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    buffer[i] = Math.sin(2 * Math.PI * 440 * t) * 2000; 
  }
  
  const uint8 = new Uint8Array(buffer.buffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

export function useSketchboardLive(): SketchboardContextValue {
  const context = useContext(SketchboardContext);
  if (!context) {
    throw new Error('useSketchboardLive must be used within a SketchboardProvider');
  }
  return context;
}
