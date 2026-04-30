import { renderHook, act } from '@testing-library/react'
import { useWorker } from '../useWorker'

class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: ErrorEvent) => void) | null = null
  messages: Array<{ type: string; [key: string]: unknown }> = []
  terminated = false

  postMessage(msg: unknown) {
    this.messages.push(msg as { type: string })
  }

  terminate() {
    this.terminated = true
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data } as MessageEvent)
  }
}

describe('useWorker', () => {
  let mockWorker: MockWorker

  function setup(opts: { defaultUrl?: string } = {}) {
    mockWorker = new MockWorker()
    const createWorker = vi.fn(() => mockWorker as unknown as Worker)
    const onDocumentLoaded = vi.fn()

    const result = renderHook(() =>
      useWorker({
        createWorker,
        onDocumentLoaded,
        defaultUrl: opts.defaultUrl,
        poolSize: 1,
      }),
    )

    return { ...result, createWorker, onDocumentLoaded, mockWorker }
  }

  it('creates worker on mount', () => {
    const { createWorker } = setup()
    expect(createWorker).toHaveBeenCalledTimes(1)
  })

  it('sends init message on mount', () => {
    setup()
    expect(mockWorker.messages).toContainEqual({ type: 'init' })
  })

  it('handles ready message and sends loadUrl when defaultUrl provided', () => {
    setup({ defaultUrl: '/test.pdf' })
    act(() => mockWorker.simulateMessage({ type: 'ready' }))
    const loadMsg = mockWorker.messages.find((m) => m.type === 'loadUrl')
    expect(loadMsg).toBeDefined()
    expect(loadMsg!.url).toBe('/test.pdf')
  })

  it('handles loaded message and calls onDocumentLoaded', () => {
    const { onDocumentLoaded } = setup({ defaultUrl: '/test.pdf' })
    const geoms = [{ widthPt: 595, heightPt: 842 }]

    act(() => mockWorker.simulateMessage({ type: 'ready' }))
    act(() => mockWorker.simulateMessage({ type: 'loaded', geometries: geoms, maxScale: 10 }))

    expect(onDocumentLoaded).toHaveBeenCalledWith(geoms, 10)
  })

  it('handles error message and sets error state', () => {
    const { result } = setup()

    act(() => mockWorker.simulateMessage({ type: 'error', message: 'Something broke' }))

    expect(result.current.error).toBe('Something broke')
  })

  it('dispatches renderDone to correct callback by id', () => {
    const { result } = setup()
    const callback = vi.fn()

    act(() => mockWorker.simulateMessage({ type: 'ready' }))

    let renderId: number
    act(() => {
      renderId = result.current.requestRender(0, 1, 2, callback)
    })

    act(() => mockWorker.simulateMessage({ type: 'renderDone', id: renderId!, data: new ArrayBuffer(4), width: 1, height: 1, renderScale: 1 }))

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('cleans up stale callbacks on renderDone', () => {
    const { result } = setup()
    const callback = vi.fn()

    act(() => mockWorker.simulateMessage({ type: 'ready' }))

    let renderId: number
    act(() => {
      renderId = result.current.requestRender(0, 1, 2, callback)
    })

    act(() => mockWorker.simulateMessage({ type: 'renderDone', id: renderId!, data: new ArrayBuffer(4), width: 1, height: 1, renderScale: 1 }))

    // Second call with same id should not invoke callback again
    act(() => mockWorker.simulateMessage({ type: 'renderDone', id: renderId!, data: new ArrayBuffer(4), width: 1, height: 1, renderScale: 1 }))

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('terminates worker on unmount', () => {
    const { unmount } = setup()
    unmount()
    expect(mockWorker.terminated).toBe(true)
  })

  it('requestRender increments render ID', () => {
    const { result } = setup()
    act(() => mockWorker.simulateMessage({ type: 'ready' }))

    let id1: number, id2: number
    act(() => { id1 = result.current.requestRender(0, 1, 2, vi.fn()) })
    act(() => { id2 = result.current.requestRender(1, 1, 2, vi.fn()) })
    expect(id2!).toBeGreaterThan(id1!)
  })

  it('tracks rendering state', () => {
    const { result } = setup()
    expect(result.current.rendering).toBe(false)

    act(() => mockWorker.simulateMessage({ type: 'ready' }))

    act(() => { result.current.requestRender(0, 1, 2, vi.fn()) })
    expect(result.current.rendering).toBe(true)
  })

  it('sets loading to false after document loaded', () => {
    const { result } = setup({ defaultUrl: '/test.pdf' })
    expect(result.current.loading).toBe(true)

    act(() => mockWorker.simulateMessage({ type: 'ready' }))
    act(() => mockWorker.simulateMessage({ type: 'loaded', geometries: [], maxScale: 10 }))

    expect(result.current.loading).toBe(false)
  })

  it('retry clears error and resets loading', () => {
    const { result } = setup()

    act(() => mockWorker.simulateMessage({ type: 'error', message: 'WASM OOM' }))
    expect(result.current.error).toBe('WASM OOM')
    expect(result.current.loading).toBe(false)

    act(() => result.current.retry())
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(true)
  })
})
