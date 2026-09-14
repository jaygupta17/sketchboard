export { SketchpenLive } from './SketchpenLive';
export type {
  SketchpenOptions,
  SketchpenState,
  Segment,
  AudioData,
} from './SketchpenLive';
export type { AudioEncoding } from './types';
export { buildActionSchedule, type ScheduledAction } from './timeline-scheduler';
export { validateSegment, SketchpenValidationError, SketchpenRuntimeError, type ValidationIssue, type ValidationErrorCode, type RuntimeErrorCode, type SketchpenRuntimeErrorContext, type SketchpenError } from './validate';
