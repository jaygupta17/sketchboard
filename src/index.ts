// @sketchpen/core - Main entry point

// Core exports
export { SketchpenLive } from './core/SketchpenLive';
export type {
  SketchpenOptions,
  SketchpenState,
  Segment,
  AudioData,
  AudioEncoding,
} from './core';
export {
  buildActionSchedule,
  validateSegment,
  SketchpenValidationError,
  SketchpenRuntimeError,
} from './core';
export type {
  ScheduledAction,
  ValidationIssue,
  ValidationErrorCode,
  RuntimeErrorCode,
  SketchpenRuntimeErrorContext,
  SketchpenError,
} from './core';

// React exports
export { SketchpenProvider, useSketchpenLive } from './react';
export type { UseRevealOptions } from './renderer/reveal/useReveal';

// Engine exports
export * from './engine';

// Renderer exports
export { TutorCanvas } from './renderer/TutorCanvas';
export { moveCamera } from './renderer/CameraController';
export { toReactFlowNodes } from './renderer/node-factory';
export { useReveal } from './renderer/reveal/useReveal';
export type { RevealState } from './renderer/reveal/useReveal';

// Store exports
export { useCanvasStore } from './store/canvas-store';
export type { CanvasState, CanvasActions, CanvasError, Viewport } from './store/canvas-store';

// Actions exports
export type { Action, CustomAction, RendererComponent, Renderers, Theme, ManualRevealControls } from './actions';

// Theme exports
export { lightTheme, darkTheme, createTheme, getTheme } from './theme';
export { themeFromCssVars, hasCssVarTheme } from './theme/css-bridge';
export type { Theme as SketchpenTheme, ThemeId, ThemeColors, ThemeFonts, ThemeFontSize, ThemeSpacing, ThemeRadius, ThemeCanvas, ThemeRough, ThemeAnimation } from './theme';

// JSON schema exports (for agent/tooling integration)
export { actionJsonSchema, segmentJsonSchema } from './schema';
