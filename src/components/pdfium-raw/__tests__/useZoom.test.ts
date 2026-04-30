import { renderHook, act } from '@testing-library/react'
import { useZoom } from '../useZoom'
import { MIN_SCALE } from '../zoomUtils'

const ZOOM_FACTOR = 1.25

describe('useZoom', () => {
  function makeContainer() {
    const el = document.createElement('div')
    Object.defineProperties(el, {
      clientWidth: { value: 1000 },
      clientHeight: { value: 800 },
      scrollLeft: { value: 0, writable: true },
      scrollTop: { value: 0, writable: true },
      getBoundingClientRect: { value: () => ({ left: 0, top: 0, width: 1000, height: 800, right: 1000, bottom: 800 }) },
    })
    return { current: el } as React.RefObject<HTMLDivElement>
  }

  it('initializes with default scale', () => {
    const containerRef = makeContainer()
    const { result } = renderHook(() => useZoom({ containerRef, maxScale: 50, initialScale: 1 }))
    expect(result.current.scale).toBe(1)
  })

  it('handleZoom("in") multiplies scale by ZOOM_FACTOR', () => {
    const containerRef = makeContainer()
    const { result } = renderHook(() => useZoom({ containerRef, maxScale: 50, initialScale: 1 }))
    act(() => result.current.handleZoom('in'))
    expect(result.current.scale).toBeCloseTo(1 * ZOOM_FACTOR)
  })

  it('handleZoom("out") divides scale by ZOOM_FACTOR', () => {
    const containerRef = makeContainer()
    const { result } = renderHook(() => useZoom({ containerRef, maxScale: 50, initialScale: 2 }))
    act(() => result.current.handleZoom('out'))
    expect(result.current.scale).toBeCloseTo(2 / ZOOM_FACTOR)
  })

  it('clamps zoom in at maxScale', () => {
    const containerRef = makeContainer()
    const { result } = renderHook(() => useZoom({ containerRef, maxScale: 1.5, initialScale: 1.5 }))
    act(() => result.current.handleZoom('in'))
    expect(result.current.scale).toBe(1.5)
  })

  it('clamps zoom out at MIN_SCALE', () => {
    const containerRef = makeContainer()
    const { result } = renderHook(() => useZoom({ containerRef, maxScale: 50, initialScale: MIN_SCALE }))
    act(() => result.current.handleZoom('out'))
    expect(result.current.scale).toBe(MIN_SCALE)
  })

  it('setScale updates scale directly', () => {
    const containerRef = makeContainer()
    const { result } = renderHook(() => useZoom({ containerRef, maxScale: 50, initialScale: 1 }))
    act(() => result.current.setScale(3))
    expect(result.current.scale).toBe(3)
  })

  it('computes zoomPercent from scale', () => {
    const containerRef = makeContainer()
    const { result } = renderHook(() => useZoom({ containerRef, maxScale: 50, initialScale: 1 }))
    expect(result.current.zoomPercent).toBeGreaterThan(0)
    expect(result.current.zoomPercent).toBeLessThanOrEqual(500)
  })
})
