export { SketchboardLive } from './SketchboardLive';
export type {
  SketchboardOptions,
  SketchboardState,
  Segment,
  AudioData,
} from './SketchboardLive';
export type { AudioEncoding } from './types';
export { buildActionSchedule, type ScheduledAction } from './timeline-scheduler';
export { validateSegment, SketchboardValidationError, SketchboardRuntimeError, type ValidationIssue, type ValidationErrorCode, type RuntimeErrorCode, type SketchboardRuntimeErrorContext, type SketchboardError } from './validate';
