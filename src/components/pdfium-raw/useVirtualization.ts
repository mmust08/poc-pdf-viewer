import { useRef, useState, useCallback } from 'react'
import { getVisiblePageRange as getVisiblePageRangePure, computeCurrentPage as computeCurrentPagePure, type PageGeometry } from './viewportUtils'

const PAGE_GAP = 12
const VIRTUALIZATION_VIEWPORTS = 2

interface UseVirtualizationParams {
  containerRef: React.RefObject<HTMLDivElement | null>
  pageGeometries: PageGeometry[]
  scale: number
}

export function useVirtualization({ containerRef, pageGeometries, scale }: UseVirtualizationParams) {
  const scrollRafRef = useRef<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [scrollVersion, setScrollVersion] = useState(0)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (pageGeometries.length > 0) {
      const scrollCenter = e.currentTarget.scrollTop + e.currentTarget.clientHeight / 3
      setCurrentPage(computeCurrentPagePure({ scrollCenter, pageGeometries, scale, pageGap: PAGE_GAP }))
    }

    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current)
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      setScrollVersion((v) => v + 1)
    })
  }, [pageGeometries, scale])

  const computeVisibleRange = useCallback((): [number, number] => {
    const container = containerRef.current
    if (!container || pageGeometries.length === 0) return [0, Math.max(0, pageGeometries.length - 1)]

    return getVisiblePageRangePure({
      pageGeometries,
      scale,
      scrollTop: container.scrollTop,
      viewportHeight: container.clientHeight,
      virtualizationViewports: VIRTUALIZATION_VIEWPORTS,
      pageGap: PAGE_GAP,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, pageGeometries, scale, scrollVersion])

  const visibleRange = computeVisibleRange()

  return { currentPage, scrollVersion, visibleRange, handleScroll }
}
