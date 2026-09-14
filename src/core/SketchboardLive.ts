import type { Action } from '../engine/types';
import type { AudioProgress } from '../engine/types';
import { AudioPlayer } from './audio-player';
import type { AudioEncoding } from './types';
import { buildActionSchedule } from './timeline-scheduler';
import { SketchboardValidationError, SketchboardRuntimeError, validateSegment } from './validate';

export interface AudioData {
  data: string;
  encoding: AudioEncoding;
  sampleRate?: number;
  channels?: number;
}

export interface Segment {
  audio: AudioData;
  actions: Action[];
}

export interface SketchboardOptions {
  fraction?: number;
  audioSampleRate?: number;
  onActionExecute?: (action: Action, duration: number) => void;
  onStateChange?: (state: SketchboardState) => void;
  onAudioProgress?: (progress: AudioProgress) => void;
  onError?: (error: Error) => void;
}

export interface SketchboardState {
  isPlaying: boolean;
  isSpeaking: boolean;
  isAnimating: boolean;
}

export class SketchboardLive {
  private fraction: number;
  private audioPlayer: AudioPlayer;
  private onStateChange?: (state: SketchboardState) => void;
  private onActionExecute?: (action: Action, duration: number) => void;
  private onAudioProgress?: (progress: AudioProgress) => void;
  private onError?: (error: Error) => void;
  private state: SketchboardState = {
    isPlaying: false,
    isSpeaking: false,
    isAnimating: false,
  };
  private scheduledTimers: ReturnType<typeof setTimeout>[] = [];
  private currentSessionId = 0;

  constructor(options: SketchboardOptions = {}) {
    this.fraction = options.fraction ?? 0.5;
    this.onStateChange = options.onStateChange;
    this.onActionExecute = options.onActionExecute;
    this.onAudioProgress = options.onAudioProgress;
    this.onError = options.onError;
    this.audioPlayer = new AudioPlayer(options.audioSampleRate ?? 24000);
  }

  private setState(updates: Partial<SketchboardState>) {
    this.state = { ...this.state, ...updates };
    this.onStateChange?.(this.state);
  }

  async play(segment: Segment): Promise<void>;
  async play(audio: AudioData, actions: Action[]): Promise<void>;
  async play(audioOrSegment: AudioData | Segment, maybeActions?: Action[]): Promise<void> {
    this.clearScheduledTimers();
    this.currentSessionId += 1;
    const sessionId = this.currentSessionId;

    const segment: Segment = 'audio' in audioOrSegment
      ? audioOrSegment
      : { audio: audioOrSegment, actions: maybeActions ?? [] };

    const issues = validateSegment(segment);
    if (issues.length > 0) {
      const error = new SketchboardValidationError(issues);
      this.onError?.(error);
      throw error;
    }

    const { audio, actions } = segment;

    this.setState({ isPlaying: true, isSpeaking: true, isAnimating: false });

    try {
      await new Promise<void>((resolve, reject) => {
        this.audioPlayer.queueAudio(
          audio.data,
          audio.encoding,
          audio.sampleRate,
          (actualDurationMs) => {
            if (sessionId !== this.currentSessionId) { resolve(); return; }

            this.setState({ isSpeaking: false, isAnimating: true });

            // Force durationLocked mode so actions are sequenced across audio
            const sequencedActions = actions.map(action => ({
              ...action,
              sync: { ...action.sync, mode: 'durationLocked' as const },
            }));

            const schedule = buildActionSchedule(sequencedActions, {
              audioDurationMs: actualDurationMs,
              fraction: this.fraction,
            });

            if (!this.onActionExecute) return;

            for (const item of schedule) {
              const timer = setTimeout(() => {
                if (sessionId !== this.currentSessionId) return;
                this.onActionExecute?.(item.action, item.durationMs);
              }, item.startMs);
              this.scheduledTimers.push(timer);
            }
          },
          () => {
            if (sessionId !== this.currentSessionId) { resolve(); return; }
            this.clearScheduledTimers();
            this.setState({ isPlaying: false, isAnimating: false });
            this.onAudioProgress?.({ currentTimeMs: 0, durationMs: 0, progress: 1 });
            resolve();
          },
          // onProgress callback
          (currentTimeMs, totalDurationMs) => {
            if (sessionId !== this.currentSessionId) return;
            this.onAudioProgress?.({
              currentTimeMs,
              durationMs: totalDurationMs,
              progress: totalDurationMs > 0 ? currentTimeMs / totalDurationMs : 0,
            });
          },
        ).catch(reject);
      });
    } catch (e) {
      this.clearScheduledTimers();
      this.setState({ isPlaying: false, isSpeaking: false, isAnimating: false });

      // Wrap audio decode errors in structured error
      if (e instanceof Error && e.message.includes('decode')) {
        const wrapped = new SketchboardRuntimeError({
          code: 'AUDIO_DECODE_FAILED',
          message: e.message,
          cause: e,
        });
        this.onError?.(wrapped);
        throw wrapped;
      }

      this.onError?.(e as Error);
      throw e;
    }
  }

  pause(): void {
    this.currentSessionId += 1;
    this.clearScheduledTimers();
    this.audioPlayer.interrupt();
    this.setState({ isPlaying: false, isSpeaking: false, isAnimating: false });
  }

  stop(): void {
    this.currentSessionId += 1;
    this.clearScheduledTimers();
    this.audioPlayer.interrupt();
    this.setState({ isPlaying: false, isSpeaking: false, isAnimating: false });
  }

  getState(): SketchboardState {
    return { ...this.state };
  }

  resume(): void {
    this.audioPlayer.resume();
  }

  destroy(): void {
    this.currentSessionId += 1;
    this.clearScheduledTimers();
    this.audioPlayer.interrupt();
    this.setState({ isPlaying: false, isSpeaking: false, isAnimating: false });
  }

  private clearScheduledTimers() {
    for (const timer of this.scheduledTimers) {
      clearTimeout(timer);
    }
    this.scheduledTimers = [];
  }
}
