import { renderHook, act } from '@testing-library/react'
import { usePan } from '../usePan'

describe('usePan', () => {
  function makeContainer() {
    const el = document.createElement('div')
    Object.defineProperties(el, {
      scrollLeft: { value: 0, writable: true },
      scrollTop: { value: 0, writable: true },
    })
    return { current: el } as React.RefObject<HTMLDivElement>
  }

  function mouseEvent(overrides: Partial<React.MouseEvent> = {}) {
    return { button: 0, clientX: 100, clientY: 100, ...overrides } as React.MouseEvent
  }

  it('isPanning starts false', () => {
    const containerRef = makeContainer()
    const { result } = renderHook(() => usePan({ containerRef }))
    expect(result.current.isPanning).toBe(false)
  })

  it('handlePanStart sets isPanning true', () => {
    const containerRef = makeContainer()
    const { result } = renderHook(() => usePan({ containerRef }))
    act(() => result.current.handlePanStart(mouseEvent()))
    expect(result.current.isPanning).toBe(true)
  })

  it('handlePanMove updates scroll position based on delta', () => {
    const containerRef = makeContainer()
    const { result } = renderHook(() => usePan({ containerRef }))

    act(() => result.current.handlePanStart(mouseEvent({ clientX: 100, clientY: 100 })))
    act(() => result.current.handlePanMove(mouseEvent({ clientX: 150, clientY: 120 })))

    expect(containerRef.current!.scrollLeft).toBe(-50)
    expect(containerRef.current!.scrollTop).toBe(-20)
  })

  it('handlePanEnd resets isPanning to false', () => {
    const containerRef = makeContainer()
    const { result } = renderHook(() => usePan({ containerRef }))

    act(() => result.current.handlePanStart(mouseEvent()))
    act(() => result.current.handlePanEnd())
    expect(result.current.isPanning).toBe(false)
  })

  it('ignores non-left-button mousedown', () => {
    const containerRef = makeContainer()
    const { result } = renderHook(() => usePan({ containerRef }))
    act(() => result.current.handlePanStart(mouseEvent({ button: 2 })))
    expect(result.current.isPanning).toBe(false)
  })

  it('handlePanMove is no-op when not panning', () => {
    const containerRef = makeContainer()
    const { result } = renderHook(() => usePan({ containerRef }))
    act(() => result.current.handlePanMove(mouseEvent({ clientX: 200, clientY: 200 })))
    expect(containerRef.current!.scrollLeft).toBe(0)
    expect(containerRef.current!.scrollTop).toBe(0)
  })
})
