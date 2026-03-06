/**
 * Delay parameters for the Dub Siren sample playback.
 * These are used by `createDelayImpulseResponse` and the audio graph.
 */

export interface DelayParams {
  enabled: boolean;
  time: number; // seconds
  feedback: number; // decay per repeat
  dryLevel: number; // direct signal
  wetLevel: number; // first echo
  echoCount: number; // number of echoes in impulse
}

export const DEFAULT_DELAY_PARAMS: DelayParams = {
  enabled: false,
  time: 0.65,
  feedback: 0.28,
  dryLevel: 0.65,
  wetLevel: 0.36,
  echoCount: 10,
};

// Legacy exports for backward compatibility
export const DELAY_ENABLED = DEFAULT_DELAY_PARAMS.enabled;
export const DELAY_TIME = DEFAULT_DELAY_PARAMS.time;
export const DELAY_FEEDBACK = DEFAULT_DELAY_PARAMS.feedback;
export const DELAY_DRY_LEVEL = DEFAULT_DELAY_PARAMS.dryLevel;
export const DELAY_WET_LEVEL = DEFAULT_DELAY_PARAMS.wetLevel;
export const DELAY_ECHO_COUNT = DEFAULT_DELAY_PARAMS.echoCount;
