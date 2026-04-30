import { RenderQueue, type RenderRequest } from '../RenderQueue'

describe('RenderQueue', () => {
  function makeRequest(pageIndex: number, priority = 0): RenderRequest {
    return { pageIndex, scale: 1, dpr: 2, callback: vi.fn(), priority }
  }

  describe('enqueue / dequeue', () => {
    it('enqueue adds item to queue', () => {
      const q = new RenderQueue()
      q.enqueue(makeRequest(0, 5))
      expect(q.size).toBe(1)
    })

    it('dequeue returns highest priority item (lowest distance)', () => {
      const q = new RenderQueue()
      q.enqueue(makeRequest(0, 100))
      q.enqueue(makeRequest(1, 10))
      q.enqueue(makeRequest(2, 50))

      const item = q.dequeue()
      expect(item!.pageIndex).toBe(1)
    })

    it('dequeue from empty queue returns undefined', () => {
      const q = new RenderQueue()
      expect(q.dequeue()).toBeUndefined()
    })

    it('re-enqueue same page updates its priority (no duplicates)', () => {
      const q = new RenderQueue()
      q.enqueue(makeRequest(5, 100))
      q.enqueue(makeRequest(5, 10))
      expect(q.size).toBe(1)

      const item = q.dequeue()
      expect(item!.priority).toBe(10)
    })

    it('size returns current queue length', () => {
      const q = new RenderQueue()
      q.enqueue(makeRequest(0))
      q.enqueue(makeRequest(1))
      q.enqueue(makeRequest(2))
      expect(q.size).toBe(3)

      q.dequeue()
      expect(q.size).toBe(2)
    })
  })

  describe('cancellation', () => {
    it('cancel marks request as cancelled', () => {
      const q = new RenderQueue()
      q.cancel(42)
      expect(q.isCancelled(42)).toBe(true)
    })

    it('cancelAllExcept cancels everything not in the set', () => {
      const q = new RenderQueue()
      q.enqueue(makeRequest(0))
      q.enqueue(makeRequest(1))
      q.enqueue(makeRequest(2))
      q.enqueue(makeRequest(3))

      q.cancelAllExcept([1, 2])

      expect(q.size).toBe(2)
      const first = q.dequeue()
      const second = q.dequeue()
      const pages = [first!.pageIndex, second!.pageIndex].sort()
      expect(pages).toEqual([1, 2])
    })

    it('cancel returns true if request was pending', () => {
      const q = new RenderQueue()
      q.cancel(99)
      expect(q.isCancelled(99)).toBe(true)
    })
  })

  describe('priority updates', () => {
    it('updatePriorities recalculates distances from viewport center', () => {
      const q = new RenderQueue()
      const geoms = Array.from({ length: 10 }, () => ({ widthPt: 595, heightPt: 842 }))

      q.enqueue(makeRequest(0, 999))
      q.enqueue(makeRequest(5, 999))
      q.enqueue(makeRequest(9, 999))

      const pageH = 842 * 1 + 12
      const centerY = 5 * pageH + pageH / 2
      q.updatePriorities(centerY, geoms, 1, 12)

      const first = q.dequeue()
      expect(first!.pageIndex).toBe(5)
    })
  })

  describe('clear', () => {
    it('removes all entries', () => {
      const q = new RenderQueue()
      q.enqueue(makeRequest(0))
      q.enqueue(makeRequest(1))
      q.clear()
      expect(q.size).toBe(0)
      expect(q.dequeue()).toBeUndefined()
    })
  })
})
