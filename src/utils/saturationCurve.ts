/**
 * Soft-clipping curve for WaveShaperNode (saturation / tube-style grit).
 * Sigmoid-style mapping: (Math.PI + amount) * x / (Math.PI + amount * |x|)
 */

const CURVE_LENGTH = 256;

export function makeSoftClipCurve(amount: number): Float32Array {
  const curve = new Float32Array(CURVE_LENGTH);
  for (let i = 0; i < CURVE_LENGTH; i++) {
    const x = (i * 2) / CURVE_LENGTH - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}
