import { WorkerPool } from '../WorkerPool'

class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: ErrorEvent) => void) | null = null
  messages: Array<{ type: string; [key: string]: unknown }> = []
  terminated = false

  postMessage(msg: unknown, _transfer?: Transferable[]) {
    this.messages.push(msg as { type: string })
  }

  terminate() {
    this.terminated = true
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data } as MessageEvent)
  }
}

describe('WorkerPool', () => {
  let workers: MockWorker[]

  function createPool(poolSize = 2) {
    workers = []
    const createWorker = vi.fn(() => {
      const w = new MockWorker()
      workers.push(w)
      return w as unknown as Worker
    })
    const pool = new WorkerPool({ poolSize, createWorker })
    return { pool, createWorker }
  }

  describe('creation', () => {
    it('creates N workers', () => {
      const { createWorker } = createPool(3)
      expect(createWorker).toHaveBeenCalledTimes(3)
      expect(workers).toHaveLength(3)
    })

    it('sends init to each worker on creation', () => {
      createPool(2)
      for (const w of workers) {
        expect(w.messages).toContainEqual({ type: 'init' })
      }
    })

    it('transitions to ready only after ALL workers report ready', () => {
      const { pool } = createPool(2)
      const onReady = vi.fn()
      pool.onReady = onReady

      workers[0].simulateMessage({ type: 'ready' })
      expect(onReady).not.toHaveBeenCalled()

      workers[1].simulateMessage({ type: 'ready' })
      expect(onReady).toHaveBeenCalledTimes(1)
    })
  })

  describe('document loading', () => {
    it('sends loadUrl to ALL workers', () => {
      const { pool } = createPool(2)
      workers.forEach((w) => w.simulateMessage({ type: 'ready' }))

      pool.loadUrl('/test.pdf', 2)
      for (const w of workers) {
        const loadMsg = w.messages.find((m) => m.type === 'loadUrl')
        expect(loadMsg).toBeDefined()
        expect(loadMsg!.url).toBe('/test.pdf')
      }
    })

    it('sends loadBuffer to ALL workers with cloned buffers', () => {
      const { pool } = createPool(2)
      workers.forEach((w) => w.simulateMessage({ type: 'ready' }))

      const buf = new ArrayBuffer(100)
      pool.loadBuffer(buf, 2)
      for (const w of workers) {
        const loadMsg = w.messages.find((m) => m.type === 'loadBuffer')
        expect(loadMsg).toBeDefined()
      }
    })

    it('transitions to loaded only after ALL workers report loaded', () => {
      const { pool } = createPool(2)
      const onLoaded = vi.fn()
      pool.onLoaded = onLoaded
      workers.forEach((w) => w.simulateMessage({ type: 'ready' }))

      pool.loadUrl('/test.pdf', 2)
      const geoms = [{ widthPt: 595, heightPt: 842 }]

      workers[0].simulateMessage({ type: 'loaded', geometries: geoms, maxScale: 10 })
      expect(onLoaded).not.toHaveBeenCalled()

      workers[1].simulateMessage({ type: 'loaded', geometries: geoms, maxScale: 10 })
      expect(onLoaded).toHaveBeenCalledWith(geoms, 10)
    })
  })

  describe('dispatch', () => {
    function readyPool(size = 2) {
      const { pool } = createPool(size)
      workers.forEach((w) => w.simulateMessage({ type: 'ready' }))
      return pool
    }

    it('dispatches first render to worker 0 (round-robin)', () => {
      const pool = readyPool()
      pool.requestRender(0, 1, 2, vi.fn())
      expect(workers[0].messages.filter((m) => m.type === 'render')).toHaveLength(1)
      expect(workers[1].messages.filter((m) => m.type === 'render')).toHaveLength(0)
    })

    it('dispatches second render to worker 1', () => {
      const pool = readyPool()
      pool.requestRender(0, 1, 2, vi.fn())
      pool.requestRender(1, 1, 2, vi.fn())
      expect(workers[0].messages.filter((m) => m.type === 'render')).toHaveLength(1)
      expect(workers[1].messages.filter((m) => m.type === 'render')).toHaveLength(1)
    })

    it('wraps around after last worker', () => {
      const pool = readyPool()
      pool.requestRender(0, 1, 2, vi.fn())
      pool.requestRender(1, 1, 2, vi.fn())
      pool.requestRender(2, 1, 2, vi.fn())
      expect(workers[0].messages.filter((m) => m.type === 'render')).toHaveLength(2)
    })

    it('routes renderDone from correct worker to correct callback', () => {
      const pool = readyPool()
      const cb1 = vi.fn()
      const cb2 = vi.fn()

      const id1 = pool.requestRender(0, 1, 2, cb1)
      const id2 = pool.requestRender(1, 1, 2, cb2)

      workers[0].simulateMessage({ type: 'renderDone', id: id1, data: new ArrayBuffer(4), width: 1, height: 1, renderScale: 1 })
      expect(cb1).toHaveBeenCalledTimes(1)
      expect(cb2).not.toHaveBeenCalled()

      workers[1].simulateMessage({ type: 'renderDone', id: id2, data: new ArrayBuffer(4), width: 1, height: 1, renderScale: 1 })
      expect(cb2).toHaveBeenCalledTimes(1)
    })

    it('handles interleaved responses from multiple workers', () => {
      const pool = readyPool()
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      const cb3 = vi.fn()

      const id1 = pool.requestRender(0, 1, 2, cb1)
      const id2 = pool.requestRender(1, 1, 2, cb2)
      const id3 = pool.requestRender(2, 1, 2, cb3)

      // Worker 1 responds first
      workers[1].simulateMessage({ type: 'renderDone', id: id2, data: new ArrayBuffer(4), width: 1, height: 1, renderScale: 1 })
      expect(cb2).toHaveBeenCalledTimes(1)

      // Then worker 0
      workers[0].simulateMessage({ type: 'renderDone', id: id1, data: new ArrayBuffer(4), width: 1, height: 1, renderScale: 1 })
      expect(cb1).toHaveBeenCalledTimes(1)

      // Then worker 0 again (id3 was round-robin'd back)
      workers[0].simulateMessage({ type: 'renderDone', id: id3, data: new ArrayBuffer(4), width: 1, height: 1, renderScale: 1 })
      expect(cb3).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling', () => {
    it('handles init failure from one worker', () => {
      const { pool } = createPool(2)
      const onError = vi.fn()
      pool.onError = onError

      workers[0].simulateMessage({ type: 'ready' })
      workers[1].simulateMessage({ type: 'error', message: 'Init failed' })

      expect(onError).toHaveBeenCalledWith('Init failed')
    })

    it('handles render error from one worker', () => {
      const { pool } = createPool(2)
      workers.forEach((w) => w.simulateMessage({ type: 'ready' }))

      const cb = vi.fn()
      const id = pool.requestRender(0, 1, 2, cb)

      workers[0].simulateMessage({ type: 'renderDone', id, error: 'Render failed' })
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ error: 'Render failed' }))
    })
  })

  describe('teardown', () => {
    it('terminates all workers on destroy', () => {
      const { pool } = createPool(3)
      pool.destroy()
      for (const w of workers) {
        expect(w.terminated).toBe(true)
      }
    })

    it('clears all pending callbacks on destroy', () => {
      const { pool } = createPool(2)
      workers.forEach((w) => w.simulateMessage({ type: 'ready' }))

      const cb = vi.fn()
      pool.requestRender(0, 1, 2, cb)
      pool.destroy()

      // Simulate late response — callback should not fire
      workers[0].simulateMessage({ type: 'renderDone', id: 1, data: new ArrayBuffer(4), width: 1, height: 1, renderScale: 1 })
      expect(cb).not.toHaveBeenCalled()
    })
  })
})
