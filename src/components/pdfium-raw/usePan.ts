import { useRef, useState, useCallback } from 'react'

interface UsePanParams {
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function usePan({ containerRef }: UsePanParams) {
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const container = containerRef.current
    if (!container) return
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    }
    setIsPanning(true)
  }, [containerRef])

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!panRef.current) return
    const container = containerRef.current
    if (!container) return
    container.scrollLeft = panRef.current.scrollLeft - (e.clientX - panRef.current.startX)
    container.scrollTop = panRef.current.scrollTop - (e.clientY - panRef.current.startY)
  }, [containerRef])

  const handlePanEnd = useCallback(() => {
    panRef.current = null
    setIsPanning(false)
  }, [])

  return { isPanning, handlePanStart, handlePanMove, handlePanEnd }
}
