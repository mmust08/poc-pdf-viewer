import { computeMaxScale, computeWorstMaxScale } from '../renderMath'

const DEFAULT_MAX_CANVAS_DIM = 16384
const DEFAULT_MAX_BITMAP_PIXELS = 100_000_000

describe('computeMaxScale', () => {
  it('returns correct max for standard A4 (595x842pt) at dpr=1', () => {
    const result = computeMaxScale(595, 842, 1)
    const expectedByW = DEFAULT_MAX_CANVAS_DIM / (595 * 1)
    const expectedByH = DEFAULT_MAX_CANVAS_DIM / (842 * 1)
    const expectedByMem = Math.sqrt(DEFAULT_MAX_BITMAP_PIXELS / (595 * 842)) / 1
    expect(result).toBeCloseTo(Math.min(expectedByW, expectedByH, expectedByMem), 5)
  })

  it('returns correct max for large A0 (2384x3370pt) at dpr=2', () => {
    const result = computeMaxScale(2384, 3370, 2)
    const expectedByW = DEFAULT_MAX_CANVAS_DIM / (2384 * 2)
    const expectedByH = DEFAULT_MAX_CANVAS_DIM / (3370 * 2)
    const expectedByMem = Math.sqrt(DEFAULT_MAX_BITMAP_PIXELS / (2384 * 3370)) / 2
    expect(result).toBeCloseTo(Math.min(expectedByW, expectedByH, expectedByMem), 5)
  })

  it('is limited by MAX_CANVAS_DIM for wide pages', () => {
    const widePage = { widthPt: 5000, heightPt: 100 }
    const result = computeMaxScale(widePage.widthPt, widePage.heightPt, 1)
    const maxByW = DEFAULT_MAX_CANVAS_DIM / (5000 * 1)
    expect(result).toBeLessThanOrEqual(maxByW)
  })

  it('is limited by MAX_CANVAS_DIM for tall pages', () => {
    const tallPage = { widthPt: 100, heightPt: 5000 }
    const result = computeMaxScale(tallPage.widthPt, tallPage.heightPt, 1)
    const maxByH = DEFAULT_MAX_CANVAS_DIM / (5000 * 1)
    expect(result).toBeLessThanOrEqual(maxByH)
  })

  it('is limited by MAX_BITMAP_PIXELS for large area pages', () => {
    const largePage = { widthPt: 3000, heightPt: 3000 }
    const result = computeMaxScale(largePage.widthPt, largePage.heightPt, 1)
    const maxByMem = Math.sqrt(DEFAULT_MAX_BITMAP_PIXELS / (3000 * 3000)) / 1
    expect(result).toBeCloseTo(maxByMem, 5)
  })

  it('returns the minimum of all three constraints', () => {
    const result = computeMaxScale(595, 842, 1)
    const byW = DEFAULT_MAX_CANVAS_DIM / (595 * 1)
    const byH = DEFAULT_MAX_CANVAS_DIM / (842 * 1)
    const byMem = Math.sqrt(DEFAULT_MAX_BITMAP_PIXELS / (595 * 842)) / 1
    expect(result).toBeCloseTo(Math.min(byW, byH, byMem), 5)
  })

  it('scales inversely with dpr', () => {
    const result1 = computeMaxScale(595, 842, 1)
    const result2 = computeMaxScale(595, 842, 2)
    expect(result2).toBeCloseTo(result1 / 2, 1)
  })

  it('accepts custom maxCanvasDim and maxBitmapPixels', () => {
    const customDim = 4096
    const customPixels = 10_000_000
    const result = computeMaxScale(595, 842, 1, customDim, customPixels)
    const byW = customDim / (595 * 1)
    const byH = customDim / (842 * 1)
    const byMem = Math.sqrt(customPixels / (595 * 842)) / 1
    expect(result).toBeCloseTo(Math.min(byW, byH, byMem), 5)
  })
})

describe('computeWorstMaxScale', () => {
  it('returns the most restrictive maxScale across all pages', () => {
    const geometries = [
      { widthPt: 595, heightPt: 842 },
      { widthPt: 2384, heightPt: 3370 },
    ]
    const result = computeWorstMaxScale(geometries, 1)
    const scaleA4 = computeMaxScale(595, 842, 1)
    const scaleA0 = computeMaxScale(2384, 3370, 1)
    expect(result).toBeCloseTo(Math.min(scaleA4, scaleA0), 5)
  })

  it('returns Infinity for empty geometries', () => {
    expect(computeWorstMaxScale([], 1)).toBe(Infinity)
  })

  it('handles single-page document', () => {
    const geometries = [{ widthPt: 595, heightPt: 842 }]
    const result = computeWorstMaxScale(geometries, 2)
    expect(result).toBeCloseTo(computeMaxScale(595, 842, 2), 5)
  })
})
