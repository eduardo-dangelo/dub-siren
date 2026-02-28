/**
 * Audio parameters for Dub Siren NJD synthesis
 * Based on NJD SE-1 circuit and fallais/njd-siren reference
 */

/** Base frequencies (Hz) for PITCH knob positions 1-4 */
export const PITCH_FREQUENCIES = [45, 215, 570, 1280] as const;

/** LFO rates (Hz) for BEAT knob positions 1-3; position 4 = OFF */
export const BEAT_RATES = [1.5, 4, 7] as const;

/** LFO modulation depth (Hz) - how much the LFO sweeps the main oscillator */
export const LFO_MODULATION_DEPTH = 96;

/** Release envelope duration (ms) - prevents click when stopping oscillators */
export const RELEASE_MS = 100;

/** Waveform types for MODE knob positions 1-4 */
export type OscillatorType = 'sine' | 'triangle' | 'square' | 'sawtooth';

export const MODE_WAVEFORMS: OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth'];

/** Lowpass filter cutoff (Hz) - lower = softer, less clucky */
export const LOWPASS_CUTOFF = 6600;

/** Main oscillator waveform - 'square' / 'sawtooth' for more biting synthy tone (classic dub); 'triangle' is softer */
export const MAIN_OSC_WAVEFORM: OscillatorType = 'square';

/** Smooth LFO modulation to reduce abrupt pitch jumps (clucking) */
export const SMOOTH_LFO = true;

/** LFO smoothing filter cutoff (Hz) - rounds off square/sawtooth LFO */
export const LFO_SMOOTH_CUTOFF = 12;

/** Saturation / grit stage (soft clip) - classic dub siren character. Uses WaveShaper when available (e.g. web). */
export const SATURATION_ENABLED = true;

/** Soft-clip curve strength (higher = more grit). Typical 20–100. */
export const SATURATION_AMOUNT = 50;

/** Pre-gain into saturation (filter drive emulation). */
export const SATURATION_DRIVE_PRE = 1.6;

/** Post-gain after saturation to compensate level. */
export const SATURATION_DRIVE_POST = 0.65;

/** Set to false to bypass the delay effect */
export const DELAY_ENABLED = true;

/** Delay effect - fixed params (low speed, high feedback) */
export const DELAY_TIME = 0.65;        // seconds (550ms)
export const DELAY_FEEDBACK = 0.28;   // decay per repeat
export const DELAY_DRY_LEVEL = 0.65;   // direct signal
export const DELAY_WET_LEVEL = 0.36;   // first echo (closer to fallais 0.4)
export const DELAY_ECHO_COUNT = 10;   // number of echoes in impulse
