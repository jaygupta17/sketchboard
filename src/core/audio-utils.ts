/**
 * Converts a base64 string to an ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = globalThis.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts a base64 string containing raw PCM_S16LE data (e.g. from Gemini Live API)
 * into a Float32Array normalized between -1.0 and 1.0, required for Web Audio API.
 */
export function pcm16Base64ToFloat32Array(base64: string): Float32Array {
  const buffer = base64ToArrayBuffer(base64);
  const int16Array = new Int16Array(buffer);
  const float32Array = new Float32Array(int16Array.length);

  for (let i = 0; i < int16Array.length; i++) {
    const s = Math.max(-1, Math.min(1, int16Array[i] / 32768));
    float32Array[i] = s;
  }

  return float32Array;
}