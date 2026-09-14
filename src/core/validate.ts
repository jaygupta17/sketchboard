import type { Action } from '../engine/types';
import type { AudioData, Segment } from './SketchpenLive';

export type ValidationErrorCode =
  | 'SCHEMA_INVALID'
  | 'AUDIO_INVALID'
  | 'ACTION_INVALID'
  | 'POSITION_INVALID';

export interface ValidationIssue {
  code: ValidationErrorCode;
  path: string;
  message: string;
}

export class SketchpenValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super(issues[0]?.message ?? 'Invalid segment payload');
    this.name = 'SketchpenValidationError';
    this.issues = issues;
  }
}

// ── Runtime Error Codes ────────────────────────────────────

export type RuntimeErrorCode =
  | 'AUDIO_DECODE_FAILED'
  | 'UNKNOWN_RENDERER'
  | 'RENDERER_RUNTIME_ERROR'
  | 'SYNC_DRIFT_EXCEEDED';

export interface SketchpenRuntimeErrorContext {
  code: RuntimeErrorCode;
  message: string;
  /** Optional node ID related to the error */
  nodeId?: string;
  /** Optional renderer key related to the error */
  rendererKey?: string;
  /** Original error if available */
  cause?: unknown;
}

export class SketchpenRuntimeError extends Error {
  readonly code: RuntimeErrorCode;
  readonly nodeId?: string;
  readonly rendererKey?: string;
  readonly cause?: unknown;

  constructor(ctx: SketchpenRuntimeErrorContext) {
    super(ctx.message);
    this.name = 'SketchpenRuntimeError';
    this.code = ctx.code;
    this.nodeId = ctx.nodeId;
    this.rendererKey = ctx.rendererKey;
    this.cause = ctx.cause;
  }
}

/** Union of all error types the system can produce */
export type SketchpenError = SketchpenValidationError | SketchpenRuntimeError;

const POSITION_RE = /^(center|top-left|top-right|top-center|bottom-left|bottom-right|bottom-center|below:.+|above:.+|beside:.+|left-of:.+|right-of:.+)$/;

export function validateSegment(segment: Segment): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  issues.push(...validateAudio(segment.audio));

  if (!Array.isArray(segment.actions)) {
    issues.push({
      code: 'SCHEMA_INVALID',
      path: 'actions',
      message: '`actions` must be an array',
    });
    return issues;
  }

  segment.actions.forEach((action, index) => {
    issues.push(...validateAction(action, `actions[${index}]`));
  });

  return issues;
}

function validateAudio(audio: AudioData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!audio || typeof audio !== 'object') {
    issues.push({
      code: 'AUDIO_INVALID',
      path: 'audio',
      message: '`audio` must be an object',
    });
    return issues;
  }

  if (typeof audio.data !== 'string' || audio.data.length === 0) {
    issues.push({
      code: 'AUDIO_INVALID',
      path: 'audio.data',
      message: '`audio.data` must be a non-empty base64 string',
    });
  }

  if (!['pcm_s16le', 'mp3', 'wav'].includes(audio.encoding)) {
    issues.push({
      code: 'AUDIO_INVALID',
      path: 'audio.encoding',
      message: '`audio.encoding` must be one of: pcm_s16le, mp3, wav',
    });
  }

  if (audio.sampleRate !== undefined && (!Number.isFinite(audio.sampleRate) || audio.sampleRate <= 0)) {
    issues.push({
      code: 'AUDIO_INVALID',
      path: 'audio.sampleRate',
      message: '`audio.sampleRate` must be a positive number when provided',
    });
  }

  return issues;
}

function validateAction(action: Action, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!action || typeof action !== 'object') {
    issues.push({ code: 'ACTION_INVALID', path, message: 'Action must be an object' });
    return issues;
  }

  const validatePosition = (position: string | undefined) => {
    if (!position || !POSITION_RE.test(position)) {
      issues.push({
        code: 'POSITION_INVALID',
        path: `${path}.position`,
        message: `Invalid semantic position: ${String(position)}`,
      });
    }
  };

  switch (action.type) {
    case 'create_block':
      validatePosition(action.position);
      if (!action.content) {
        issues.push({ code: 'ACTION_INVALID', path: `${path}.content`, message: '`content` is required' });
      }
      break;
    case 'draw_diagram':
      validatePosition(action.position);
      if (!action.data || typeof action.data !== 'object') {
        issues.push({ code: 'ACTION_INVALID', path: `${path}.data`, message: '`data` is required for draw_diagram' });
      }
      break;
    case 'highlight':
      if (!action.target) {
        issues.push({ code: 'ACTION_INVALID', path: `${path}.target`, message: '`target` is required for highlight' });
      }
      break;
    case 'custom':
      validatePosition(action.position);
      if (!action.renderer) {
        issues.push({ code: 'ACTION_INVALID', path: `${path}.renderer`, message: '`renderer` is required for custom action' });
      }
      break;
    default:
      issues.push({ code: 'ACTION_INVALID', path: `${path}.type`, message: `Unknown action type` });
      break;
  }

  return issues;
}
