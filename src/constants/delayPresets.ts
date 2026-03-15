/**
 * Delay presets for the Dub Siren.
 * Values derived from classic delay effect configurations.
 */

import type { DelayParams } from './audioParams';

export interface DelayPreset {
  id: string;
  label: string;
  params: Omit<DelayParams, 'enabled'>;
}

export const DELAY_PRESETS: DelayPreset[] = [
  {
    id: 'slapback',
    label: 'Slapback',
    params: {
      time: 0.08,
      feedback: 0,
      dryLevel: 0.65,
      wetLevel: 0.35,
      echoCount: 2,
    },
  },
  {
    id: 'dub',
    label: 'Dub',
    params: {
      time: 0.7,
      feedback: 0.3,
      dryLevel: 0.4,
      wetLevel: 0.6,
      echoCount: 8,
    },
  },
  {
    id: 'space-echo',
    label: 'Space Echo',
    params: {
      time: 0.6,
      feedback: 0.7,
      dryLevel: 0.5,
      wetLevel: 0.5,
      echoCount: 10,
    },
  },
  {
    id: 'rhythmic-tape',
    label: 'Rhythmic Tape',
    params: {
      time: 0.4,
      feedback: 0.5,
      dryLevel: 0.6,
      wetLevel: 0.4,
      echoCount: 6,
    },
  },
  {
    id: 'dub-techno',
    label: 'Dub Techno',
    params: {
      time: 0.4,
      feedback: 0.4,
      dryLevel: 0.6,
      wetLevel: 0.3,
      echoCount: 6,
    },
  },
  // Dotted 8th @ 120 BPM — syncopated bounce
  {
    id: 'dotted-8th',
    label: 'Dotted 8th',
    params: {
      time: 0.375,
      feedback: 0.3,
      dryLevel: 0.6,
      wetLevel: 0.4,
      echoCount: 4,
    },
  },
  // Roland 1/16D dub echo — snares / siren hits
  {
    id: 'sixteenth-dub',
    label: '1/16 Dubbed',
    params: {
      time: 0.22,
      feedback: 0.45,
      dryLevel: 0.5,
      wetLevel: 0.5,
      echoCount: 6,
    },
  },
  // Send-style 100% wet aux
  {
    id: 'send',
    label: 'Send',
    params: {
      time: 0.25,
      feedback: 0.3,
      dryLevel: 0.3,
      wetLevel: 0.7,
      echoCount: 5,
    },
  },
  // Black Ark style — pushed RE-201
  {
    id: 'black-ark',
    label: 'Black Ark',
    params: {
      time: 0.35,
      feedback: 0.5,
      dryLevel: 0.5,
      wetLevel: 0.5,
      echoCount: 7,
    },
  },
  // King Tubby style — long, washy
  {
    id: 'king-tubby',
    label: 'King Tubby',
    params: {
      time: 0.67,
      feedback: 0.55,
      dryLevel: 0.45,
      wetLevel: 0.55,
      echoCount: 8,
    },
  },
  // Self-oscillation / feedback monster
  {
    id: 'runaway',
    label: 'Runaway',
    params: {
      time: 0.5,
      feedback: 0.78,
      dryLevel: 0.45,
      wetLevel: 0.55,
      echoCount: 10,
    },
  },
];

const TOLERANCE = 0.02;

function paramsMatch(a: Omit<DelayParams, 'enabled'>, b: Omit<DelayParams, 'enabled'>): boolean {
  return (
    Math.abs(a.time - b.time) <= TOLERANCE &&
    Math.abs(a.feedback - b.feedback) <= TOLERANCE &&
    Math.abs(a.dryLevel - b.dryLevel) <= TOLERANCE &&
    Math.abs(a.wetLevel - b.wetLevel) <= TOLERANCE &&
    a.echoCount === b.echoCount
  );
}

export function findMatchingPreset(params: DelayParams): DelayPreset | null {
  const { enabled: _, ...rest } = params;
  return DELAY_PRESETS.find((p) => paramsMatch(p.params, rest)) ?? null;
}

export function applyPreset(preset: DelayPreset, currentEnabled: boolean): DelayParams {
  return {
    ...preset.params,
    enabled: currentEnabled,
  };
}
