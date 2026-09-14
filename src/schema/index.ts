export const semanticPositionPattern = [
  '^center$',
  '^top-left$',
  '^top-right$',
  '^top-center$',
  '^bottom-left$',
  '^bottom-right$',
  '^bottom-center$',
 '^below:.+$',
 '^above:.+$',
 '^beside:.+$',
 '^left-of:.+$',
 '^right-of:.+$',
].join('|');

const colorRole = ['primary', 'accent', 'highlight', 'danger'];
const sizeVariant = ['small', 'medium', 'large'];
const syncMode = ['audioLocked', 'durationLocked', 'manual'];
const revealMode = ['sequential', 'parallel', 'stagger', 'manual'];

const commonActionProps = {
  start: { type: 'number', minimum: 0, description: 'When action starts, in seconds relative to audio start' },
  duration: { type: 'number', minimum: 0.1, description: 'How long the reveal animation runs, in seconds' },
  atMs: { type: 'number', minimum: 0, description: 'Absolute start offset in ms — prefer `start` (seconds)' },
  durationMs: { type: 'number', minimum: 1, description: 'Reveal duration in ms — prefer `duration` (seconds)' },
  sync: {
    type: 'object',
    additionalProperties: false,
    properties: {
      mode: { enum: syncMode },
    },
  },
  reveal: {
    type: 'object',
    additionalProperties: false,
    properties: {
      mode: { enum: revealMode },
      steps: { type: 'number', minimum: 1 },
      staggerMs: { type: 'number', minimum: 0 },
      markers: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'at'],
          properties: {
            name: { type: 'string' },
            at: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
      },
    },
  },
} as const;

export const actionJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://github.com/jaygupta17/sketchboard/schema/action.json',
  type: 'object',
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'block_type', 'content', 'position'],
      properties: {
        type: { const: 'create_block' },
        ref: { type: 'string' },
        block_type: {
          enum: ['title', 'body', 'theorem', 'formula', 'bullet_list', 'note', 'definition', 'code'],
        },
        content: { type: 'string' },
        subtitle: { type: 'string' },
        items: {
          type: 'array',
          items: { type: 'string' },
        },
        position: { type: 'string', pattern: semanticPositionPattern },
        size: { enum: sizeVariant },
        color: { enum: colorRole },
        speech: { type: 'string' },
        sticky: { type: 'boolean' },
        ...commonActionProps,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'diagram_type', 'data', 'position'],
      properties: {
        type: { const: 'draw_diagram' },
        ref: { type: 'string' },
        diagram_type: { enum: ['cartesian', 'geometry', 'flowchart', 'venn', 'bar_chart', 'pie_chart'] },
        data: { type: 'object' },
        position: { type: 'string', pattern: semanticPositionPattern },
        speech: { type: 'string' },
        caption: { type: 'string' },
        color: { enum: colorRole },
        sticky: { type: 'boolean' },
        ...commonActionProps,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'target'],
      properties: {
        type: { const: 'highlight' },
        target: { type: 'string' },
        style: { enum: ['circle', 'box', 'underline', 'arrow'] },
        color: { enum: ['accent', 'highlight', 'danger'] },
        speech: { type: 'string' },
        ...commonActionProps,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'renderer', 'data', 'position'],
      properties: {
        type: { const: 'custom' },
        ref: { type: 'string' },
        renderer: { type: 'string', minLength: 1 },
        data: {},
        position: { type: 'string', pattern: semanticPositionPattern },
        size: {
          oneOf: [
            { enum: sizeVariant },
            {
              type: 'object',
              additionalProperties: false,
              required: ['width', 'height'],
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
              },
            },
          ],
        },
        color: { enum: colorRole },
        speech: { type: 'string' },
        sticky: { type: 'boolean' },
        ...commonActionProps,
      },
    },
  ],
} as const;

export const segmentJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://github.com/jaygupta17/sketchboard/schema/segment.json',
  type: 'object',
  additionalProperties: false,
  required: ['audio', 'actions'],
  properties: {
    audio: {
      type: 'object',
      additionalProperties: false,
      required: ['data', 'encoding'],
      properties: {
        data: { type: 'string' },
        encoding: { enum: ['pcm_s16le', 'mp3', 'wav'] },
        sampleRate: { type: 'number', minimum: 1 },
        channels: { type: 'number', minimum: 1 },
      },
    },
    actions: {
      type: 'array',
      items: actionJsonSchema,
    },
  },
} as const;
