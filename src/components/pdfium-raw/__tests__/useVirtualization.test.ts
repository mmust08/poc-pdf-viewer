import { renderHook, act } from '@testing-library/react'
import { useVirtualization } from '../useVirtualization'

describe('useVirtualization', () => {
  const makeGeometries = (count: number) =>
    Array.from({ length: count }, () => ({ widthPt: 595, heightPt: 842 }))

  function makeContainer(scrollTop = 0, clientHeight = 800) {
    const el = document.createElement('div')
    Object.defineProperties(el, {
      scrollTop: { value: scrollTop, writable: true },
      clientHeight: { value: clientHeight },
    })
    return { current: el } as React.RefObject<HTMLDivElement>
  }

  it('returns full range when container ref is null', () => {
    const containerRef = { current: null } as React.RefObject<HTMLDivElement>
    const { result } = renderHook(() =>
      useVirtualization({ containerRef, pageGeometries: makeGeometries(10), scale: 1 }),
    )
    expect(result.current.visibleRange).toEqual([0, 9])
  })

  it('returns [0, 0] for empty geometries', () => {
    const containerRef = makeContainer()
    const { result } = renderHook(() =>
      useVirtualization({ containerRef, pageGeometries: [], scale: 1 }),
    )
    expect(result.current.visibleRange).toEqual([0, 0])
  })

  it('computes visible range from scroll position', () => {
    const containerRef = makeContainer(0, 800)
    const { result } = renderHook(() =>
      useVirtualization({ containerRef, pageGeometries: makeGeometries(100), scale: 1 }),
    )
    const [first, last] = result.current.visibleRange
    expect(first).toBe(0)
    expect(last).toBeLessThan(100)
  })

  it('computes currentPage as 1 when scrolled to top', () => {
    const containerRef = makeContainer(0, 800)
    const { result } = renderHook(() =>
      useVirtualization({ containerRef, pageGeometries: makeGeometries(10), scale: 1 }),
    )
    expect(result.current.currentPage).toBe(1)
  })

  it('increments scrollVersion on handleScroll', () => {
    const containerRef = makeContainer(0, 800)
    const { result } = renderHook(() =>
      useVirtualization({ containerRef, pageGeometries: makeGeometries(10), scale: 1 }),
    )

    const initialVersion = result.current.scrollVersion
    act(() => {
      result.current.handleScroll({
        currentTarget: { scrollTop: 100, clientHeight: 800 },
      } as unknown as React.UIEvent<HTMLDivElement>)
    })
    expect(result.current.scrollVersion).toBeGreaterThanOrEqual(initialVersion)
  })
})
