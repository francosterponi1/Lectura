
import { Voice } from '../types';

/**
 * Decodes base64 string to Uint8Array.
 */
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Aplica un fundido de entrada y salida (fade in/out) para evitar clics al inicio/fin.
 */
export function applyFade(data: Int16Array, fadeSamples: number = 480): Int16Array {
  const result = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    let multiplier = 1.0;
    if (i < fadeSamples) {
      multiplier = i / fadeSamples;
    } else if (i > data.length - fadeSamples) {
      multiplier = (data.length - i) / fadeSamples;
    }
    result[i] = Math.round(data[i] * multiplier);
  }
  return result;
}

/**
 * Normalizes PCM data (Int16) to a fixed AC1 Mastering Level.
 */
export function normalizePCM(dataInt16: Int16Array, targetLevel: number = 0.95): Int16Array {
  let max = 0;
  for (let i = 0; i < dataInt16.length; i++) {
    const abs = Math.abs(dataInt16[i]);
    if (abs > max) max = abs;
  }

  if (max === 0) return dataInt16;

  const targetPeak = 32767 * targetLevel;
  const factor = targetPeak / max;

  const result = new Int16Array(dataInt16.length);
  for (let i = 0; i < dataInt16.length; i++) {
    const value = Math.round(dataInt16[i] * factor);
    result[i] = Math.max(-32768, Math.min(32767, value));
  }
  return result;
}

/**
 * Creates a silence PCM buffer.
 */
export function createSilencePCM(durationSeconds: number, sampleRate: number): Int16Array {
  return new Int16Array(durationSeconds * sampleRate);
}

/**
 * Encodes concatenated PCM Int16 data into MP3 using lamejs.
 */
export async function encodeToMp3(dataInt16: Int16Array, sampleRate: number, kbps: number = 128): Promise<Blob> {
  // @ts-ignore (lamejs is loaded from CDN)
  const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, kbps);
  const mp3Data: any[] = [];
  const sampleBlockSize = 1152; // standard for mp3
  
  for (let i = 0; i < dataInt16.length; i += sampleBlockSize) {
    const sampleChunk = dataInt16.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(new Uint8Array(endBuf));
  }

  return new Blob(mp3Data, { type: 'audio/mp3' });
}

/**
 * Plays a synthesized alarm tone for a specific duration.
 */
export function playAlertTone(durationSeconds: number = 6, frequency: number = 440, type: 'success' | 'error' = 'success') {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = type === 'success' ? 'sine' : 'sawtooth';
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  
  const beepInterval = 0.5;
  for (let t = 0; t < durationSeconds; t += beepInterval) {
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime + t);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime + t + beepInterval / 2);
  }

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + durationSeconds);
  
  setTimeout(() => {
    audioCtx.close();
  }, (durationSeconds + 1) * 1000);
}
