import type { AudioEncoding } from './types';
import { pcm16Base64ToFloat32Array, base64ToArrayBuffer } from './audio-utils';

export interface PlaybackJob {
  id: string;
  buffer: AudioBuffer;
  onStart?: (durationMs: number) => void;
  onProgress?: (currentTimeMs: number, totalDurationMs: number) => void;
  onComplete?: () => void;
}

export class AudioPlayer {
  private context: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private queue: PlaybackJob[] = [];
  private PCM_SAMPLE_RATE: number = 24000;
  private progressRafId: number | null = null;
  private currentJobStartContextTime: number = 0;
  private currentJobDurationSec: number = 0;

  constructor(private defaultSampleRate: number = 24000) {
    this.PCM_SAMPLE_RATE = defaultSampleRate;
  }

  private initContext() {
    if (!this.context) {
      this.context = new (globalThis.AudioContext || (globalThis as any).webkitAudioContext)();
    }
  }

  public async queueAudio(
    base64: string,
    encoding: AudioEncoding,
    sampleRate?: number,
    onStart?: (durationMs: number) => void,
    onComplete?: () => void,
    onProgress?: (currentTimeMs: number, totalDurationMs: number) => void
  ): Promise<{ jobId: string; durationMs: number }> {
    this.initContext();
    if (!this.context) throw new Error("AudioContext not initialized");

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    if (!this.context) return { jobId: 'cancelled', durationMs: 0 };

    await new Promise((r) => setTimeout(r, 10));

    if (!this.context) return { jobId: 'cancelled', durationMs: 0 };

    if (this.context.state !== 'running') {
      await this.context.resume();
      if (!this.context) return { jobId: 'cancelled', durationMs: 0 };
    }

    const jobId = Math.random().toString(36).substring(7);
    let buffer: AudioBuffer;

    try {
      if (encoding === 'pcm_s16le') {
        const float32Data = pcm16Base64ToFloat32Array(base64);
        const rate = sampleRate ?? this.PCM_SAMPLE_RATE;
        buffer = this.context.createBuffer(1, float32Data.length, rate);
        buffer.getChannelData(0).set(float32Data);
      } else {
        const arrayBuffer = base64ToArrayBuffer(base64);
        buffer = await this.context.decodeAudioData(arrayBuffer);
      }
    } catch (err) {
      console.error('[AudioPlayer] Failed to decode audio:', err);
      throw err;
    }

    this.queueJob({ id: jobId, buffer, onStart, onComplete, onProgress });
    return { jobId, durationMs: buffer.duration * 1000 };
  }

  private queueJob(job: PlaybackJob) {
    if (!this.context) return;

    this.queue.push(job);
    const source = this.context.createBufferSource();
    source.buffer = job.buffer;
    source.connect(this.context.destination);

    const currentTime = this.context.currentTime;

    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime + 0.05;
    }

    const startTime = this.nextPlayTime;
    source.start(startTime);

    const startDelay = (startTime - currentTime) * 1000;
    const bufferDurationSec = job.buffer.duration;

    // Track progress during playback
    this.currentJobStartContextTime = startTime;
    this.currentJobDurationSec = bufferDurationSec;

    setTimeout(() => {
      if (job.onStart) job.onStart(bufferDurationSec * 1000);
      // Start progress tracking loop
      this.startProgressTracking(job);
    }, Math.max(0, startDelay));

    this.nextPlayTime += bufferDurationSec;

    source.onended = () => {
      this.queue = this.queue.filter((j) => j.id !== job.id);
      this.stopProgressTracking();
      if (job.onComplete) job.onComplete();
    };
  }

  private startProgressTracking(job: PlaybackJob) {
    this.stopProgressTracking();

    const tick = () => {
      if (!this.context || this.queue.length === 0) return;

      const elapsed = this.context.currentTime - this.currentJobStartContextTime;
      const totalMs = this.currentJobDurationSec * 1000;
      const currentMs = Math.max(0, Math.min(elapsed * 1000, totalMs));

      if (job.onProgress) {
        job.onProgress(currentMs, totalMs);
      }

      if (currentMs < totalMs) {
        this.progressRafId = requestAnimationFrame(tick);
      }
    };

    this.progressRafId = requestAnimationFrame(tick);
  }

  private stopProgressTracking() {
    if (this.progressRafId !== null) {
      cancelAnimationFrame(this.progressRafId);
      this.progressRafId = null;
    }
  }

  public resume() {
    this.initContext();
    if (this.context && this.context.state === 'suspended') {
      void this.context.resume();
    }
  }

  public interrupt() {
    this.stopProgressTracking();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.queue = [];
    this.nextPlayTime = 0;
  }
}
