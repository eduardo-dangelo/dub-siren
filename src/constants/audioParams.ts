/**
 * Audio parameters for Dub Siren NJD synthesis
 * Based on NJD SE-1 circuit and fallais/njd-siren reference
 */

/** Base frequencies (Hz) for PITCH knob positions 1-4 */
export const PITCH_FREQUENCIES = [200, 400, 700, 1100] as const;

/** LFO rates (Hz) for BEAT knob positions 1-3; position 4 = OFF */
export const BEAT_RATES = [2, 5, 8] as const;

/** LFO modulation depth (Hz) - how much the LFO sweeps the main oscillator */
export const LFO_MODULATION_DEPTH = 300;

/** Waveform types for MODE knob positions 1-4 */
export type OscillatorType = 'sine' | 'triangle' | 'square' | 'sawtooth';

export const MODE_WAVEFORMS: OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth'];

/** Lowpass filter cutoff (Hz) - softens square wave harshness */
export const LOWPASS_CUTOFF = 3000;
