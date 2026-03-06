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
  enabled: true,
  time: 0.4, // 1/8 note @ 120 BPM (common dub techno)
  feedback: 0.4, // 40% - within 30-60% dub range
  dryLevel: 0.6,
  wetLevel: 0.3,
  echoCount: 6, // Siren-appropriate (fewer repetitions)
};

// Legacy exports for backward compatibility
export const DELAY_ENABLED = DEFAULT_DELAY_PARAMS.enabled;
export const DELAY_TIME = DEFAULT_DELAY_PARAMS.time;
export const DELAY_FEEDBACK = DEFAULT_DELAY_PARAMS.feedback;
export const DELAY_DRY_LEVEL = DEFAULT_DELAY_PARAMS.dryLevel;
export const DELAY_WET_LEVEL = DEFAULT_DELAY_PARAMS.wetLevel;
export const DELAY_ECHO_COUNT = DEFAULT_DELAY_PARAMS.echoCount;
