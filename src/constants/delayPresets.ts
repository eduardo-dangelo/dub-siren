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
