import type { AudioBuffer } from 'react-native-audio-api';
import { decodeAudioData } from 'react-native-audio-api';
import type { DubSirenParams } from '../hooks/useDubSiren';

export type SampleVariant =
  | 'main'
  | 'main_all'
  | 'siren_intro'
  | 'siren_loop'
  | 'siren_all'
  | 'siren_end'
  | 'tone_intro'
  | 'tone_loop'
  | 'tone_all'
  | 'tone_end';

export interface SampleKey {
  pitch: number; // 0-3
  mode: number; // 0-3
  beat: number; // 0-3
  variant: SampleVariant;
}

type SampleSource = string | number;

// Static manifest of all WAV assets. Keys are the exact filenames.
// Files live in `assets/samples`, so we require them with the correct relative path.
const SAMPLE_MODULES: Record<string, SampleSource> = {
  'PITCH_1_ MODE_1_ BEAT_1.wav': require('./samples/PITCH_1_ MODE_1_ BEAT_1.wav'),
  'PITCH_1_ MODE_1_ BEAT_2.wav': require('./samples/PITCH_1_ MODE_1_ BEAT_2.wav'),
  'PITCH_1_ MODE_1_ BEAT_3.wav': require('./samples/PITCH_1_ MODE_1_ BEAT_3.wav'),
  'PITCH_1_ MODE_2_ BEAT_1.wav': require('./samples/PITCH_1_ MODE_2_ BEAT_1.wav'),
  'PITCH_1_ MODE_2_ BEAT_2.wav': require('./samples/PITCH_1_ MODE_2_ BEAT_2.wav'),
  'PITCH_1_ MODE_2_ BEAT_3.wav': require('./samples/PITCH_1_ MODE_2_ BEAT_3.wav'),
  'PITCH_1_ MODE_3_ BEAT_1.wav': require('./samples/PITCH_1_ MODE_3_ BEAT_1.wav'),
  'PITCH_1_ MODE_3_ BEAT_2.wav': require('./samples/PITCH_1_ MODE_3_ BEAT_2.wav'),
  'PITCH_1_ MODE_3_ BEAT_3.wav': require('./samples/PITCH_1_ MODE_3_ BEAT_3.wav'),
  'PITCH_1_ MODE_4_ BEAT_1.wav': require('./samples/PITCH_1_ MODE_4_ BEAT_1.wav'),
  'PITCH_1_ MODE_4_ BEAT_2.wav': require('./samples/PITCH_1_ MODE_4_ BEAT_2.wav'),
  'PITCH_1_ MODE_4_ BEAT_3.wav': require('./samples/PITCH_1_ MODE_4_ BEAT_3.wav'),
  'PITCH_2_ MODE_1_ BEAT_1.wav': require('./samples/PITCH_2_ MODE_1_ BEAT_1.wav'),
  'PITCH_2_ MODE_1_ BEAT_2.wav': require('./samples/PITCH_2_ MODE_1_ BEAT_2.wav'),
  'PITCH_2_ MODE_1_ BEAT_3.wav': require('./samples/PITCH_2_ MODE_1_ BEAT_3.wav'),
  'PITCH_2_ MODE_2_ BEAT_1.wav': require('./samples/PITCH_2_ MODE_2_ BEAT_1.wav'),
  'PITCH_2_ MODE_2_ BEAT_2.wav': require('./samples/PITCH_2_ MODE_2_ BEAT_2.wav'),
  'PITCH_2_ MODE_2_ BEAT_3.wav': require('./samples/PITCH_2_ MODE_2_ BEAT_3.wav'),
  'PITCH_2_ MODE_3_ BEAT_1.wav': require('./samples/PITCH_2_ MODE_3_ BEAT_1.wav'),
  'PITCH_2_ MODE_3_ BEAT_2.wav': require('./samples/PITCH_2_ MODE_3_ BEAT_2.wav'),
  'PITCH_2_ MODE_3_ BEAT_3.wav': require('./samples/PITCH_2_ MODE_3_ BEAT_3.wav'),
  'PITCH_2_ MODE_4_ BEAT_1.wav': require('./samples/PITCH_2_ MODE_4_ BEAT_1.wav'),
  'PITCH_2_ MODE_4_ BEAT_2.wav': require('./samples/PITCH_2_ MODE_4_ BEAT_2.wav'),
  'PITCH_2_ MODE_4_ BEAT_3.wav': require('./samples/PITCH_2_ MODE_4_ BEAT_3.wav'),
  'PITCH_3_ MODE_1_ BEAT_1.wav': require('./samples/PITCH_3_ MODE_1_ BEAT_1.wav'),
  'PITCH_3_ MODE_1_ BEAT_2.wav': require('./samples/PITCH_3_ MODE_1_ BEAT_2.wav'),
  'PITCH_3_ MODE_1_ BEAT_3.wav': require('./samples/PITCH_3_ MODE_1_ BEAT_3.wav'),
  'PITCH_3_ MODE_2_ BEAT_1.wav': require('./samples/PITCH_3_ MODE_2_ BEAT_1.wav'),
  'PITCH_3_ MODE_2_ BEAT_2.wav': require('./samples/PITCH_3_ MODE_2_ BEAT_2.wav'),
  'PITCH_3_ MODE_2_ BEAT_3.wav': require('./samples/PITCH_3_ MODE_2_ BEAT_3.wav'),
  'PITCH_3_ MODE_3_ BEAT_1.wav': require('./samples/PITCH_3_ MODE_3_ BEAT_1.wav'),
  'PITCH_3_ MODE_3_ BEAT_2.wav': require('./samples/PITCH_3_ MODE_3_ BEAT_2.wav'),
  'PITCH_3_ MODE_3_ BEAT_3.wav': require('./samples/PITCH_3_ MODE_3_ BEAT_3.wav'),
  'PITCH_3_ MODE_4_ BEAT_1.wav': require('./samples/PITCH_3_ MODE_4_ BEAT_1.wav'),
  'PITCH_3_ MODE_4_ BEAT_2.wav': require('./samples/PITCH_3_ MODE_4_ BEAT_2.wav'),
  'PITCH_3_ MODE_4_ BEAT_3.wav': require('./samples/PITCH_3_ MODE_4_ BEAT_3.wav'),
  'PITCH_4_ MODE_1_ BEAT_1.wav': require('./samples/PITCH_4_ MODE_1_ BEAT_1.wav'),
  'PITCH_4_ MODE_1_ BEAT_2.wav': require('./samples/PITCH_4_ MODE_1_ BEAT_2.wav'),
  'PITCH_4_ MODE_1_ BEAT_3.wav': require('./samples/PITCH_4_ MODE_1_ BEAT_3.wav'),
  'PITCH_4_ MODE_2_ BEAT_1.wav': require('./samples/PITCH_4_ MODE_2_ BEAT_1.wav'),
  'PITCH_4_ MODE_2_ BEAT_2.wav': require('./samples/PITCH_4_ MODE_2_ BEAT_2.wav'),
  'PITCH_4_ MODE_2_ BEAT_3.wav': require('./samples/PITCH_4_ MODE_2_ BEAT_3.wav'),
  'PITCH_4_ MODE_3_ BEAT_1.wav': require('./samples/PITCH_4_ MODE_3_ BEAT_1.wav'),
  'PITCH_4_ MODE_3_ BEAT_2.wav': require('./samples/PITCH_4_ MODE_3_ BEAT_2.wav'),
  'PITCH_4_ MODE_3_ BEAT_3.wav': require('./samples/PITCH_4_ MODE_3_ BEAT_3.wav'),
  'PITCH_4_ MODE_4_ BEAT_1.wav': require('./samples/PITCH_4_ MODE_4_ BEAT_1.wav'),
  'PITCH_4_ MODE_4_ BEAT_2.wav': require('./samples/PITCH_4_ MODE_4_ BEAT_2.wav'),
  'PITCH_4_ MODE_4_ BEAT_3.wav': require('./samples/PITCH_4_ MODE_4_ BEAT_3.wav'),
  // BEAT 3 – _ALL for MODE 1 and MODE 4 (no spaces in filenames)
  'PITCH_1_MODE_1_BEAT_3_ALL.wav': require('./samples/PITCH_1_MODE_1_BEAT_3_ALL.wav'),
  'PITCH_2_MODE_1_BEAT_3_ALL.wav': require('./samples/PITCH_2_MODE_1_BEAT_3_ALL.wav'),
  'PITCH_3_MODE_1_BEAT_3_ALL.wav': require('./samples/PITCH_3_MODE_1_BEAT_3_ALL.wav'),
  'PITCH_4_MODE_1_BEAT_3_ALL.wav': require('./samples/PITCH_4_MODE_1_BEAT_3_ALL.wav'),
  'PITCH_1_MODE_4_BEAT_3_ALL.wav': require('./samples/PITCH_1_MODE_4_BEAT_3_ALL.wav'),
  'PITCH_2_MODE_4_BEAT_3_ALL.wav': require('./samples/PITCH_2_MODE_4_BEAT_3_ALL.wav'),
  'PITCH_3_MODE_4_BEAT_3_ALL.wav': require('./samples/PITCH_3_MODE_4_BEAT_3_ALL.wav'),
  'PITCH_4_MODE_4_BEAT_3_ALL.wav': require('./samples/PITCH_4_MODE_4_BEAT_3_ALL.wav'),
  // BEAT 4 – SIREN / TONE variants for MODE 1
  'PITCH_1_ MODE_1_ BEAT_4_SIREN_INTRO.wav': require('./samples/PITCH_1_ MODE_1_ BEAT_4_SIREN_INTRO.wav'),
  'PITCH_1_ MODE_1_ BEAT_4_SIREN_LOOP.wav': require('./samples/PITCH_1_ MODE_1_ BEAT_4_SIREN_LOOP.wav'),
  'PITCH_1_ MODE_1_ BEAT_4_SIREN_ALL.wav': require('./samples/PITCH_1_ MODE_1_ BEAT_4_SIREN_ALL.wav'),
  'PITCH_1_ MODE_1_ BEAT_4_SIREN_END.wav': require('./samples/PITCH_1_ MODE_1_ BEAT_4_SIREN_END.wav'),
  'PITCH_1_ MODE_1_ BEAT_4_TONE_INTRO.wav': require('./samples/PITCH_1_ MODE_1_ BEAT_4_TONE_INTRO.wav'),
  'PITCH_1_ MODE_1_ BEAT_4_TONE_LOOP.wav': require('./samples/PITCH_1_ MODE_1_ BEAT_4_TONE_LOOP.wav'),
  'PITCH_1_ MODE_1_ BEAT_4_TONE_ALL.wav': require('./samples/PITCH_1_ MODE_1_ BEAT_4_TONE_ALL.wav'),
  'PITCH_1_ MODE_1_ BEAT_4_TONE_END.wav': require('./samples/PITCH_1_ MODE_1_ BEAT_4_TONE_END_ALT.wav'),
  'PITCH_2_ MODE_1_ BEAT_4_SIREN_INTRO.wav': require('./samples/PITCH_2_ MODE_1_ BEAT_4_SIREN_INTRO.wav'),
  'PITCH_2_ MODE_1_ BEAT_4_SIREN_LOOP.wav': require('./samples/PITCH_2_ MODE_1_ BEAT_4_SIREN_LOOP.wav'),
  'PITCH_2_ MODE_1_ BEAT_4_SIREN_ALL.wav': require('./samples/PITCH_2_ MODE_1_ BEAT_4_SIREN_ALL.wav'),
  'PITCH_2_ MODE_1_ BEAT_4_SIREN_END.wav': require('./samples/PITCH_2_ MODE_1_ BEAT_4_SIREN_END.wav'),
  'PITCH_2_ MODE_1_ BEAT_4_TONE_INTRO.wav': require('./samples/PITCH_2_ MODE_1_ BEAT_4_TONE_INTRO.wav'),
  'PITCH_2_ MODE_1_ BEAT_4_TONE_LOOP.wav': require('./samples/PITCH_2_ MODE_1_ BEAT_4_TONE_LOOP.wav'),
  'PITCH_2_ MODE_1_ BEAT_4_TONE_ALL.wav': require('./samples/PITCH_2_ MODE_1_ BEAT_4_TONE_ALL.wav'),
  'PITCH_2_ MODE_1_ BEAT_4_TONE_END.wav': require('./samples/PITCH_2_ MODE_1_ BEAT_4_TONE_END_ALT.wav'),
  'PITCH_3_ MODE_1_ BEAT_4_SIREN_INTRO.wav': require('./samples/PITCH_3_ MODE_1_ BEAT_4_SIREN_INTRO.wav'),
  'PITCH_3_ MODE_1_ BEAT_4_SIREN_LOOP.wav': require('./samples/PITCH_3_ MODE_1_ BEAT_4_SIREN_LOOP.wav'),
  'PITCH_3_ MODE_1_ BEAT_4_SIREN_ALL.wav': require('./samples/PITCH_3_ MODE_1_ BEAT_4_SIREN_ALL.wav'),
  'PITCH_3_ MODE_1_ BEAT_4_SIREN_END.wav': require('./samples/PITCH_3_ MODE_1_ BEAT_4_SIREN_END.wav'),
  'PITCH_3_ MODE_1_ BEAT_4_TONE_INTRO.wav': require('./samples/PITCH_3_ MODE_1_ BEAT_4_TONE_INTRO.wav'),
  'PITCH_3_ MODE_1_ BEAT_4_TONE_LOOP.wav': require('./samples/PITCH_3_ MODE_1_ BEAT_4_TONE_LOOP.wav'),
  'PITCH_3_ MODE_1_ BEAT_4_TONE_ALL.wav': require('./samples/PITCH_3_ MODE_1_ BEAT_4_TONE_ALL.wav'),
  'PITCH_3_ MODE_1_ BEAT_4_TONE_END.wav': require('./samples/PITCH_3_ MODE_1_ BEAT_4_TONE_END_ALT.wav'),
  'PITCH_4_ MODE_1_ BEAT_4_SIREN_INTRO.wav': require('./samples/PITCH_4_ MODE_1_ BEAT_4_SIREN_INTRO.wav'),
  'PITCH_4_ MODE_1_ BEAT_4_SIREN_LOOP.wav': require('./samples/PITCH_4_ MODE_1_ BEAT_4_SIREN_LOOP.wav'),
  'PITCH_4_ MODE_1_ BEAT_4_SIREN_ALL.wav': require('./samples/PITCH_4_ MODE_1_ BEAT_4_SIREN_ALL.wav'),
  'PITCH_4_ MODE_1_ BEAT_4_SIREN_END.wav': require('./samples/PITCH_4_ MODE_1_ BEAT_4_SIREN_END.wav'),
  'PITCH_4_ MODE_1_ BEAT_4_TONE_INTRO.wav': require('./samples/PITCH_4_ MODE_1_ BEAT_4_TONE_INTRO.wav'),
  'PITCH_4_ MODE_1_ BEAT_4_TONE_LOOP.wav': require('./samples/PITCH_4_ MODE_1_ BEAT_4_TONE_LOOP.wav'),
  'PITCH_4_ MODE_1_ BEAT_4_TONE_ALL.wav': require('./samples/PITCH_4_ MODE_1_ BEAT_4_TONE_ALL.wav'),
  'PITCH_4_ MODE_1_ BEAT_4_TONE_END.wav': require('./samples/PITCH_4_ MODE_1_ BEAT_4_TONE_END_ALT.wav'),
} as const;

const sampleCache = new Map<string, Promise<AudioBuffer>>();

function buildFilename(key: SampleKey): string | null {
  const p = key.pitch + 1;
  const m = key.mode + 1;
  const b = key.beat + 1;

  // BEAT positions 1–3: single MAIN sample per combination; BEAT_3 + MODE_1/4 also have main_all
  if (b >= 1 && b <= 3) {
    if (key.variant === 'main_all') {
      if (b === 3 && (m === 1 || m === 4)) {
        return `PITCH_${p}_MODE_${m}_BEAT_3_ALL.wav`;
      }
      return null;
    }
    if (key.variant === 'main') {
      return `PITCH_${p}_ MODE_${m}_ BEAT_${b}.wav`;
    }
    return null;
  }

  // BEAT 4: only MODE 1 has SIREN/TONE intro/loop/end/all; others intentionally silent
  if (b === 4 && m === 1) {
    switch (key.variant) {
      case 'siren_intro':
        return `PITCH_${p}_ MODE_${m}_ BEAT_${b}_SIREN_INTRO.wav`;
      case 'siren_loop':
        return `PITCH_${p}_ MODE_${m}_ BEAT_${b}_SIREN_LOOP.wav`;
      case 'siren_all':
        return `PITCH_${p}_ MODE_${m}_ BEAT_${b}_SIREN_ALL.wav`;
      case 'siren_end':
        return `PITCH_${p}_ MODE_${m}_ BEAT_${b}_SIREN_END.wav`;
      case 'tone_intro':
        return `PITCH_${p}_ MODE_${m}_ BEAT_${b}_TONE_INTRO.wav`;
      case 'tone_loop':
        return `PITCH_${p}_ MODE_${m}_ BEAT_${b}_TONE_LOOP.wav`;
      case 'tone_all':
        return `PITCH_${p}_ MODE_${m}_ BEAT_${b}_TONE_ALL.wav`;
      case 'tone_end':
        return `PITCH_${p}_ MODE_${m}_ BEAT_${b}_TONE_END.wav`;
      case 'main':
        return null;
      default:
        return null;
    }
  }

  // No BEAT 4 samples for MODE 2–4: play nothing
  return null;
}

export function makeSampleKey(params: DubSirenParams, variant: SampleVariant): SampleKey {
  return {
    pitch: params.pitch,
    mode: params.mode,
    beat: params.beat,
    variant,
  };
}

export async function getSampleBuffer(key: SampleKey): Promise<AudioBuffer | null> {
  const filename = buildFilename(key);
  if (!filename) {
    return null;
  }

  const source = SAMPLE_MODULES[filename];
  if (!source) {
    // Missing file for this combination – intentionally silent
    return null;
  }

  let promise = sampleCache.get(filename);
  if (!promise) {
    promise = decodeAudioData(source)
      .then((buf) => {
        sampleCache.set(filename, Promise.resolve(buf));
        return buf;
      })
      .catch((e) => {
        sampleCache.delete(filename);
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[DubSiren] getSampleBuffer: decode failed', filename, e);
        }
        return null;
      });
    sampleCache.set(filename, promise);
  }
  return promise;
}

