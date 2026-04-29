export const MIN_SCALE = 0.25
export const MIN_NORMALIZED = 25
export const MAX_NORMALIZED = 500

export function scaleToNormalized(scale: number, minScale: number, maxScale: number): number {
  if (maxScale <= minScale) return MIN_NORMALIZED
  const clamped = Math.max(minScale, Math.min(maxScale, scale))
  const t = (Math.log(clamped) - Math.log(minScale)) / (Math.log(maxScale) - Math.log(minScale))
  return Math.round(MIN_NORMALIZED + t * (MAX_NORMALIZED - MIN_NORMALIZED))
}
