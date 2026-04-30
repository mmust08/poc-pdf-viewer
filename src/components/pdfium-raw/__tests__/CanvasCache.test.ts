import { CanvasCache } from '../CanvasCache'

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function pixelBytes(w: number, h: number): number {
  return w * h * 4
}

describe('CanvasCache', () => {
  describe('get / set / delete basics', () => {
    it('returns undefined for cache miss', () => {
      const cache = new CanvasCache()
      expect(cache.get(0, 1, 1)).toBeUndefined()
    })

    it('stores and retrieves a canvas', () => {
      const cache = new CanvasCache()
      const canvas = makeCanvas(100, 100)
      cache.set(0, 1, 1, canvas)
      expect(cache.get(0, 1, 1)).toBe(canvas)
    })

    it('distinguishes by pageIndex, renderScale, and docVersion', () => {
      const cache = new CanvasCache()
      const c1 = makeCanvas(10, 10)
      const c2 = makeCanvas(20, 20)
      const c3 = makeCanvas(30, 30)

      cache.set(0, 1, 1, c1)
      cache.set(0, 2, 1, c2)
      cache.set(0, 1, 2, c3)

      expect(cache.get(0, 1, 1)).toBe(c1)
      expect(cache.get(0, 2, 1)).toBe(c2)
      expect(cache.get(0, 1, 2)).toBe(c3)
    })

    it('tracks entry count', () => {
      const cache = new CanvasCache()
      cache.set(0, 1, 1, makeCanvas(10, 10))
      cache.set(1, 1, 1, makeCanvas(10, 10))
      expect(cache.entryCount).toBe(2)
    })

    it('tracks total pixel bytes', () => {
      const cache = new CanvasCache()
      cache.set(0, 1, 1, makeCanvas(100, 200))
      expect(cache.totalPixelBytes).toBe(pixelBytes(100, 200))
    })

    it('overwriting same key updates size tracking', () => {
      const cache = new CanvasCache()
      cache.set(0, 1, 1, makeCanvas(100, 100))
      cache.set(0, 1, 1, makeCanvas(200, 200))
      expect(cache.entryCount).toBe(1)
      expect(cache.totalPixelBytes).toBe(pixelBytes(200, 200))
    })
  })

  describe('LRU eviction', () => {
    it('evicts least recently used when over budget', () => {
      const budget = pixelBytes(100, 100) * 2 + 1
      const cache = new CanvasCache(budget)

      cache.set(0, 1, 1, makeCanvas(100, 100))
      cache.set(1, 1, 1, makeCanvas(100, 100))
      // Both fit within budget
      expect(cache.entryCount).toBe(2)

      // Adding a third should evict the LRU (page 0)
      cache.set(2, 1, 1, makeCanvas(100, 100))
      expect(cache.get(0, 1, 1)).toBeUndefined()
      expect(cache.get(1, 1, 1)).toBeDefined()
      expect(cache.get(2, 1, 1)).toBeDefined()
    })

    it('promotes on access so recently used items survive', () => {
      const budget = pixelBytes(100, 100) * 2 + 1
      const cache = new CanvasCache(budget)

      cache.set(0, 1, 1, makeCanvas(100, 100))
      cache.set(1, 1, 1, makeCanvas(100, 100))
      // Access page 0 to promote it
      cache.get(0, 1, 1)
      // Now page 1 is LRU
      cache.set(2, 1, 1, makeCanvas(100, 100))
      expect(cache.get(0, 1, 1)).toBeDefined()
      expect(cache.get(1, 1, 1)).toBeUndefined()
    })

    it('single oversized entry is allowed (evicts everything else)', () => {
      const budget = pixelBytes(100, 100)
      const cache = new CanvasCache(budget)

      cache.set(0, 1, 1, makeCanvas(100, 100))
      // Insert a canvas bigger than budget
      const big = makeCanvas(500, 500)
      cache.set(1, 1, 1, big)
      expect(cache.get(1, 1, 1)).toBe(big)
      expect(cache.get(0, 1, 1)).toBeUndefined()
      expect(cache.entryCount).toBe(1)
    })
  })

  describe('invalidateDoc', () => {
    it('clears all entries for a specific docVersion', () => {
      const cache = new CanvasCache()
      cache.set(0, 1, 1, makeCanvas(10, 10))
      cache.set(1, 1, 1, makeCanvas(10, 10))
      cache.set(0, 1, 2, makeCanvas(10, 10))

      cache.invalidateDoc(1)

      expect(cache.get(0, 1, 1)).toBeUndefined()
      expect(cache.get(1, 1, 1)).toBeUndefined()
      expect(cache.get(0, 1, 2)).toBeDefined()
      expect(cache.entryCount).toBe(1)
    })

    it('updates totalPixelBytes after invalidation', () => {
      const cache = new CanvasCache()
      cache.set(0, 1, 1, makeCanvas(100, 100))
      cache.set(1, 1, 2, makeCanvas(100, 100))
      cache.invalidateDoc(1)
      expect(cache.totalPixelBytes).toBe(pixelBytes(100, 100))
    })
  })

  describe('clear', () => {
    it('removes all entries and resets byte tracking', () => {
      const cache = new CanvasCache()
      cache.set(0, 1, 1, makeCanvas(100, 100))
      cache.set(1, 1, 1, makeCanvas(100, 100))
      cache.clear()
      expect(cache.entryCount).toBe(0)
      expect(cache.totalPixelBytes).toBe(0)
      expect(cache.get(0, 1, 1)).toBeUndefined()
    })
  })

  describe('budget default', () => {
    it('defaults to 512MB budget', () => {
      const cache = new CanvasCache()
      expect(cache.budgetBytes).toBe(512 * 1024 * 1024)
    })

    it('accepts custom budget', () => {
      const cache = new CanvasCache(1024)
      expect(cache.budgetBytes).toBe(1024)
    })
  })
})
