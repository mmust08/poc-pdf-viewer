const DEFAULT_MAX_CANVAS_DIM = 16384
const DEFAULT_MAX_BITMAP_PIXELS = 100_000_000

export interface PageGeometry {
  widthPt: number
  heightPt: number
}

export function computeMaxScale(
  widthPt: number,
  heightPt: number,
  dpr: number,
  maxCanvasDim: number = DEFAULT_MAX_CANVAS_DIM,
  maxBitmapPixels: number = DEFAULT_MAX_BITMAP_PIXELS,
): number {
  const maxByDimW = maxCanvasDim / (widthPt * dpr)
  const maxByDimH = maxCanvasDim / (heightPt * dpr)
  const maxByMemory = Math.sqrt(maxBitmapPixels / (widthPt * heightPt)) / dpr
  return Math.min(maxByDimW, maxByDimH, maxByMemory)
}

export function computeWorstMaxScale(
  geometries: PageGeometry[],
  dpr: number,
  maxCanvasDim: number = DEFAULT_MAX_CANVAS_DIM,
  maxBitmapPixels: number = DEFAULT_MAX_BITMAP_PIXELS,
): number {
  let worst = Infinity
  for (const g of geometries) {
    worst = Math.min(worst, computeMaxScale(g.widthPt, g.heightPt, dpr, maxCanvasDim, maxBitmapPixels))
  }
  return worst
}
