/**
 * Audio parameters for Dub Siren NJD synthesis
 * Based on NJD SE-1 circuit and fallais/njd-siren reference
 */

/** Base frequencies (Hz) for PITCH knob positions 1-4 */
export const PITCH_FREQUENCIES = [150, 250, 400, 600] as const;

/** LFO rates (Hz) for BEAT knob positions 1-3; position 4 = OFF */
export const BEAT_RATES = [2, 5, 8] as const;

/** LFO modulation depth (Hz) - how much the LFO sweeps the main oscillator */
export const LFO_MODULATION_DEPTH = 300;

/** Waveform types for MODE knob positions 1-4 */
export type OscillatorType = 'sine' | 'triangle' | 'square' | 'sawtooth';

export const MODE_WAVEFORMS: OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth'];

/** Lowpass filter cutoff (Hz) - softens square wave harshness */
export const LOWPASS_CUTOFF = 3000;

/** Delay effect - fixed params (low speed, high feedback) */
export const DELAY_TIME = 0.55;        // seconds (550ms)
export const DELAY_FEEDBACK = 0.48;   // decay per repeat
export const DELAY_DRY_LEVEL = 0.65;  // direct signal
export const DELAY_WET_LEVEL = 0.3;   // first echo
export const DELAY_ECHO_COUNT = 10;   // number of echoes in impulse
