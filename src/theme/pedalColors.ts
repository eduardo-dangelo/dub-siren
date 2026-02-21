/**
 * Pedal-accurate colors for Dub Siren NJD UI
 * Reference: https://dub-siren.com/njd-sirens-c-1_25/dub-siren-njd-p-187
 */

export const pedalColors = {
  /** Brushed metallic grey enclosure */
  enclosure: '#7A7A7A',
  enclosureLight: '#8B8B8B',
  enclosureDark: '#2A2A2A',

  /** Knob cap colors */
  knobPitch: '#C41E3A',   // Red
  knobMode: '#F4C430',    // Yellow
  knobBeat: '#228B22',    // Green

  /** Controls */
  buttonBlack: '#1A1A1A',
  toggleChrome: '#C0C0C0',
  powerLedOn: '#00FF00',
  powerLedOff: '#003300',

  /** Labels and indicators */
  labelText: '#000000',
  indicatorWhite: '#FFFFFF',
  screwMetal: '#4A4A4A',

  /** Cable jack elements */
  jackMetal: '#252525',
  cableBlack: '#1A1A1A',
} as const;
