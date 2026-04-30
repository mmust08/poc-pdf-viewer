import { scaleToNormalized, MIN_SCALE, MIN_NORMALIZED, MAX_NORMALIZED } from '../zoomUtils'

describe('scaleToNormalized', () => {
  const maxScale = 50

  it('returns MIN_NORMALIZED when scale equals MIN_SCALE', () => {
    expect(scaleToNormalized(MIN_SCALE, MIN_SCALE, maxScale)).toBe(MIN_NORMALIZED)
  })

  it('returns MAX_NORMALIZED when scale equals maxScale', () => {
    expect(scaleToNormalized(maxScale, MIN_SCALE, maxScale)).toBe(MAX_NORMALIZED)
  })

  it('returns midpoint for geometric mean of min and max', () => {
    const geometricMean = Math.sqrt(MIN_SCALE * maxScale)
    const result = scaleToNormalized(geometricMean, MIN_SCALE, maxScale)
    const expectedMidpoint = Math.round((MIN_NORMALIZED + MAX_NORMALIZED) / 2)
    expect(result).toBe(expectedMidpoint)
  })

  it('returns MIN_NORMALIZED when maxScale <= minScale', () => {
    expect(scaleToNormalized(1, MIN_SCALE, MIN_SCALE)).toBe(MIN_NORMALIZED)
    expect(scaleToNormalized(1, 5, 2)).toBe(MIN_NORMALIZED)
  })

  it('clamps values below minScale to MIN_NORMALIZED', () => {
    expect(scaleToNormalized(0.01, MIN_SCALE, maxScale)).toBe(MIN_NORMALIZED)
  })

  it('clamps values above maxScale to MAX_NORMALIZED', () => {
    expect(scaleToNormalized(100, MIN_SCALE, maxScale)).toBe(MAX_NORMALIZED)
  })

  it('returns an integer', () => {
    const result = scaleToNormalized(3.7, MIN_SCALE, maxScale)
    expect(result).toBe(Math.round(result))
  })

  it('increases monotonically with scale', () => {
    const scales = [0.5, 1, 2, 5, 10, 20, 40]
    const results = scales.map((s) => scaleToNormalized(s, MIN_SCALE, maxScale))
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toBeGreaterThanOrEqual(results[i - 1])
    }
  })
})
