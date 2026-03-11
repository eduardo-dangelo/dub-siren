import type { AudioBuffer, BaseAudioContext } from 'react-native-audio-api';
import {
  DEFAULT_DELAY_PARAMS,
  type DelayParams,
} from '../constants/audioParams';

/**
 * Geometric series 1 + r + r^2 + ... + r^(n-1). Returns n if r >= 1.
 */
function geometricSum(r: number, n: number): number {
  if (n <= 0) return 0;
  if (r >= 1) return n;
  return (1 - Math.pow(r, n)) / (1 - r);
}

/** Target sum for impulse response (headroom to avoid clipping/crackle). */
const IMPULSE_SUM_TARGET = 0.92;

/**
 * Creates an impulse response buffer that simulates delay with feedback.
 * Used with ConvolverNode to avoid react-native-audio-api's branching limitation.
 * Impulse: dry at sample 0, echoes at delayTime, 2*delayTime, ... with decay.
 * Scaling ensures total impulse sum ≤ IMPULSE_SUM_TARGET to prevent clipping/crackle.
 */
export function createDelayImpulseResponse(
  ctx: BaseAudioContext,
  params: DelayParams = DEFAULT_DELAY_PARAMS
): AudioBuffer {
  const { time, feedback, dryLevel, wetLevel, echoCount } = params;
  const sampleRate = ctx.sampleRate;
  const delaySamples = Math.round(time * sampleRate);
  const length = Math.ceil(time * (echoCount + 1) * sampleRate);

  const buffer = ctx.createBuffer(1, length, sampleRate);
  const channel = buffer.getChannelData(0);

  channel.fill(0);
  channel[0] = dryLevel;

  const wetSum = wetLevel * geometricSum(feedback, echoCount);
  const totalSum = dryLevel + wetSum;
  const scale = totalSum > IMPULSE_SUM_TARGET ? IMPULSE_SUM_TARGET / totalSum : 1;

  let feedbackAcc = 1;
  let lastEchoIdx = 0;
  for (let i = 1; i <= echoCount; i++) {
    const idx = i * delaySamples;
    if (idx < length) {
      channel[idx] = wetLevel * feedbackAcc * scale;
      feedbackAcc *= feedback;
      lastEchoIdx = idx;
    }
  }
  if (scale !== 1) {
    channel[0] = dryLevel * scale;
  }

  // Short decay after last echo to reduce truncation artifacts
  const fadeSamples = Math.min(Math.round(0.005 * sampleRate), length - lastEchoIdx - 1);
  const lastEchoValue = channel[lastEchoIdx];
  for (let i = 1; i <= fadeSamples; i++) {
    channel[lastEchoIdx + i] = lastEchoValue * (1 - i / (fadeSamples + 1));
  }

  // Final normalize: fade adds energy not in totalSum, so ensure full impulse sum ≤ target
  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += channel[i];
  }
  if (sum > IMPULSE_SUM_TARGET) {
    const norm = IMPULSE_SUM_TARGET / sum;
    for (let i = 0; i < length; i++) {
      channel[i] *= norm;
    }
  }

  return buffer;
}
