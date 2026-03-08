/**
 * Color utilities for hex/HSL conversion and Sass-style lighten/darken.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace(/^#/, '');
  const len = normalized.length;
  if (len !== 3 && len !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  const expand = len === 3;
  const r = parseInt(expand ? normalized[0] + normalized[0] : normalized.slice(0, 2), 16);
  const g = parseInt(expand ? normalized[1] + normalized[1] : normalized.slice(2, 4), 16);
  const b = parseInt(expand ? normalized[2] + normalized[2] : normalized.slice(4, 6), 16);
  return {
    r: Math.min(255, Math.max(0, isNaN(r) ? 0 : r)),
    g: Math.min(255, Math.max(0, isNaN(g) ? 0 : g)),
    b: Math.min(255, Math.max(0, isNaN(b) ? 0 : b)),
  };
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function hslToHex(h: number, s: number, l: number): string {
  const H = ((h % 360) + 360) % 360 / 360;
  const S = Math.min(100, Math.max(0, s)) / 100;
  const L = Math.min(100, Math.max(0, l)) / 100;

  let r: number;
  let g: number;
  let b: number;

  if (S === 0) {
    r = g = b = L;
  } else {
    const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
    const p = 2 * L - q;
    r = hueToRgb(p, q, H + 1 / 3);
    g = hueToRgb(p, q, H);
    b = hueToRgb(p, q, H - 1 / 3);
  }

  const toHex = (x: number) => {
    const n = Math.round(Math.min(255, Math.max(0, x * 255)));
    return n.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Sass-style lighten: add amount to lightness (0–100). Result clamped to 0–100.
 */
export function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const newL = Math.min(100, Math.max(0, l + amount));
  return hslToHex(h, s, newL);
}

/**
 * Sass-style darken: subtract amount from lightness (0–100). Result clamped to 0–100.
 */
export function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const newL = Math.min(100, Math.max(0, l - amount));
  return hslToHex(h, s, newL);
}
