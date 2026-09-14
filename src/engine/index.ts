// ─────────────────────────────────────────────────────────────
// TutorCanvas Core — Public API
// ─────────────────────────────────────────────────────────────

// Types
export type {
  Action,
  TutorAction,
  CustomAction,
  CustomSize,
  CreateBlockAction,
  DrawDiagramAction,
  HighlightAction,
  SemanticPosition,
  BlockType,
  SizeVariant,
  ColorRole,
  DiagramType,
  DiagramData,
  CartesianData,
  GeometryData,
  FlowchartData,
  VennData,
  BarChartData,
  PieChartData,
  GeometryShape,
  HighlightStyle,
  SyncMode,
  SyncSpec,
  RevealMode,
  RevealMarker,
  RevealSpec,
  AnimationPlan,
  EntranceType,
  ResolvedNode,
  NodeType,
  BlockContent,
  DiagramContent,
  HighlightContent,
  CustomContent,
  AABB,
  CollisionEntry,
  Cursor,
} from './types';

// Engine
export { ActionExecutor } from './action-executor';
export { layoutNode, blockTypeToNodeType, type LayoutResult } from './layout-engine';
export { CollisionRegistry } from './collision-registry';
export { computeIntrinsicSize, type IntrinsicSize } from './intrinsic-size';
export { resolvePosition, updateCursor } from './position-resolver';
export { computeAnimationPlan, computeTextDuration, estimateSpeechDuration, adjustDurationForSpeech } from './animation';
export { compileAction, type RenderInstruction } from './compiler';
export { generateId, resetIdCounter } from './utils';

// Constants
export {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GAP,
  BLOCK_SIZES,
  CUSTOM_SIZE_PRESETS,
  CUSTOM_SIZE_LIMITS,
  DIAGRAM_SIZES,
  RHYTHM_MAP,
  ANIMATION_DEFAULTS,
} from './constants';
