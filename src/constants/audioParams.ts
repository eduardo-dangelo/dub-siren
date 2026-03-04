/**
 * Delay parameters for the Dub Siren sample playback.
 * These are used by `createDelayImpulseResponse` and the audio graph.
 */
export const DELAY_ENABLED = false;
export const DELAY_TIME = 0.65;        // seconds (550ms)
export const DELAY_FEEDBACK = 0.28;   // decay per repeat
export const DELAY_DRY_LEVEL = 0.65;   // direct signal
export const DELAY_WET_LEVEL = 0.36;   // first echo (closer to fallais 0.4)
export const DELAY_ECHO_COUNT = 10;   // number of echoes in impulse
