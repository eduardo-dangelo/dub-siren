import type { AudioBuffer, BaseAudioContext } from 'react-native-audio-api';
import {
  DELAY_DRY_LEVEL,
  DELAY_ECHO_COUNT,
  DELAY_FEEDBACK,
  DELAY_TIME,
  DELAY_WET_LEVEL,
} from '../constants/audioParams';

/**
 * Creates an impulse response buffer that simulates delay with feedback.
 * Used with ConvolverNode to avoid react-native-audio-api's branching limitation.
 * Impulse: dry at sample 0, echoes at delayTime, 2*delayTime, ... with decay.
 */
export function createDelayImpulseResponse(
  ctx: BaseAudioContext
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const delaySamples = Math.round(DELAY_TIME * sampleRate);
  const length = Math.ceil(DELAY_TIME * (DELAY_ECHO_COUNT + 1) * sampleRate);

  const buffer = ctx.createBuffer(1, length, sampleRate);
  const channel = buffer.getChannelData(0);

  channel.fill(0);
  channel[0] = DELAY_DRY_LEVEL;

  let feedback = 1;
  let lastEchoIdx = 0;
  for (let i = 1; i <= DELAY_ECHO_COUNT; i++) {
    const idx = i * delaySamples;
    if (idx < length) {
      channel[idx] = DELAY_WET_LEVEL * feedback;
      feedback *= DELAY_FEEDBACK;
      lastEchoIdx = idx;
    }
  }

  // Short decay after last echo to reduce truncation artifacts
  const fadeSamples = Math.min(Math.round(0.005 * sampleRate), length - lastEchoIdx - 1);
  const lastEchoValue = channel[lastEchoIdx];
  for (let i = 1; i <= fadeSamples; i++) {
    channel[lastEchoIdx + i] = lastEchoValue * (1 - i / (fadeSamples + 1));
  }

  return buffer;
}
