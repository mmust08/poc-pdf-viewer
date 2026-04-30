import { scaleToNormalized, MIN_SCALE, MIN_NORMALIZED, MAX_NORMALIZED } from '../zoomUtils'

describe('canary', () => {
  it('1 + 1 equals 2', () => {
    expect(1 + 1).toBe(2)
  })

  it('imports from zoomUtils resolve correctly', () => {
    expect(MIN_SCALE).toBe(0.25)
    expect(MIN_NORMALIZED).toBe(25)
    expect(MAX_NORMALIZED).toBe(500)
    expect(typeof scaleToNormalized).toBe('function')
  })
})
