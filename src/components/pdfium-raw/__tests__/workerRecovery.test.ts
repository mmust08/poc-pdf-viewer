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

  simulateError(message = 'Worker crashed') {
    this.onerror?.({ message } as ErrorEvent)
  }
}

describe('WorkerPool crash recovery', () => {
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

  it('sets onerror handler on each worker', () => {
    createPool(2)
    for (const w of workers) {
      expect(w.onerror).toBeInstanceOf(Function)
    }
  })

  it('on worker error: notifies via onError callback', () => {
    const { pool } = createPool(2)
    const onError = vi.fn()
    pool.onError = onError

    workers[0].simulateError('WASM OOM')
    expect(onError).toHaveBeenCalledWith('WASM OOM')
  })

  it('on worker error: spawns replacement worker', () => {
    const { createWorker } = createPool(2)
    expect(createWorker).toHaveBeenCalledTimes(2)

    workers[0].simulateMessage({ type: 'ready' })
    workers[1].simulateMessage({ type: 'ready' })

    workers[0].simulateError('crash')

    // A new worker should have been created as replacement
    expect(createWorker).toHaveBeenCalledTimes(3)
  })

  it('replacement worker receives init message', () => {
    createPool(2)
    workers.forEach((w) => w.simulateMessage({ type: 'ready' }))

    workers[0].simulateError('crash')

    // The newest worker (workers[2]) should have init message
    const replacement = workers[workers.length - 1]
    expect(replacement.messages).toContainEqual({ type: 'init' })
  })

  it('pool still functions after one worker crashes and is replaced', () => {
    const { pool } = createPool(2)
    workers.forEach((w) => w.simulateMessage({ type: 'ready' }))

    // Crash worker 0
    workers[0].simulateError('crash')
    const replacement = workers[workers.length - 1]
    replacement.simulateMessage({ type: 'ready' })

    // Should still be able to dispatch renders
    const cb = vi.fn()
    pool.requestRender(0, 1, 2, cb)

    // One of the active workers should have the render message
    const allRenderMsgs = workers.flatMap((w) => w.messages.filter((m) => m.type === 'render'))
    expect(allRenderMsgs.length).toBeGreaterThan(0)
  })

  it('max respawn attempts prevents infinite respawn loop', () => {
    const { createWorker } = createPool(1)
    expect(createWorker).toHaveBeenCalledTimes(1)

    // Initial worker crashes
    workers[0].simulateMessage({ type: 'ready' })
    workers[0].simulateError('crash 1')
    // Replacement 1 crashes
    workers[workers.length - 1].simulateError('crash 2')
    // Replacement 2 crashes
    workers[workers.length - 1].simulateError('crash 3')
    // Replacement 3 crashes — should stop respawning after 3 retries
    const countBefore = createWorker.mock.calls.length
    workers[workers.length - 1].simulateError('crash 4')
    // Should not create another worker
    expect(createWorker.mock.calls.length).toBe(countBefore)
  })

  it('retryAll resets all slots from scratch', () => {
    const { pool, createWorker } = createPool(2)
    workers.forEach((w) => w.simulateMessage({ type: 'ready' }))

    // Crash all workers
    workers[0].simulateError('crash')
    workers[1].simulateError('crash')

    const countBefore = createWorker.mock.calls.length
    pool.retryAll()

    // Should create 2 fresh workers
    expect(createWorker).toHaveBeenCalledTimes(countBefore + 2)
  })
})
