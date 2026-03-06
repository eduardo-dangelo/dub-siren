import type { AudioBuffer, BaseAudioContext } from 'react-native-audio-api';
import {
  DEFAULT_DELAY_PARAMS,
  type DelayParams,
} from '../constants/audioParams';

/**
 * Creates an impulse response buffer that simulates delay with feedback.
 * Used with ConvolverNode to avoid react-native-audio-api's branching limitation.
 * Impulse: dry at sample 0, echoes at delayTime, 2*delayTime, ... with decay.
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

  let feedbackAcc = 1;
  let lastEchoIdx = 0;
  for (let i = 1; i <= echoCount; i++) {
    const idx = i * delaySamples;
    if (idx < length) {
      channel[idx] = wetLevel * feedbackAcc;
      feedbackAcc *= feedback;
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
