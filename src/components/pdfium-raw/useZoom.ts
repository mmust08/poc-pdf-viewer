import { useRef, useState, useEffect, useCallback } from 'react'
import { scaleToNormalized, MIN_SCALE } from './zoomUtils'

const ZOOM_FACTOR = 1.25

export interface PendingZoom {
  pdfX: number
  pdfY: number
  newScale: number
  anchorViewportX?: number
  anchorViewportY?: number
}

interface UseZoomParams {
  containerRef: React.RefObject<HTMLDivElement | null>
  maxScale: number
  initialScale?: number
}

export function useZoom({ containerRef, maxScale, initialScale = 1 }: UseZoomParams) {
  const [scale, setScale] = useState(initialScale)
  const pendingZoomRef = useRef<PendingZoom | null>(null)

  const zoomPercent = scaleToNormalized(scale, MIN_SCALE, maxScale)

  // Apply scroll adjustment after zoom
  useEffect(() => {
    const pending = pendingZoomRef.current
    const container = containerRef.current
    if (!pending || !container || pending.newScale !== scale) return
    pendingZoomRef.current = null

    const anchorX = pending.anchorViewportX ?? container.clientWidth / 2
    const anchorY = pending.anchorViewportY ?? container.clientHeight / 2

    container.scrollLeft = pending.pdfX * scale - anchorX
    container.scrollTop = pending.pdfY * scale - anchorY
  }, [scale, containerRef])

  // Ctrl+wheel / pinch zoom
  const wheelScaleRef = useRef(scale)
  wheelScaleRef.current = scale
  const wheelMaxScaleRef = useRef(maxScale)
  wheelMaxScaleRef.current = maxScale

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return
      if (!container) return
      e.preventDefault()

      const oldScale = wheelScaleRef.current
      const cap = wheelMaxScaleRef.current
      const newScale =
        e.deltaY < 0
          ? Math.min(cap, oldScale * ZOOM_FACTOR)
          : Math.max(MIN_SCALE, oldScale / ZOOM_FACTOR)
      if (newScale === oldScale) return

      const rect = container.getBoundingClientRect()
      const pointerViewportX = e.clientX - rect.left
      const pointerViewportY = e.clientY - rect.top
      const pdfX = (pointerViewportX + container.scrollLeft) / oldScale
      const pdfY = (pointerViewportY + container.scrollTop) / oldScale

      pendingZoomRef.current = {
        pdfX,
        pdfY,
        newScale,
        anchorViewportX: pointerViewportX,
        anchorViewportY: pointerViewportY,
      }
      setScale(newScale)
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    const container = containerRef.current
    if (!container) return

    setScale((oldScale) => {
      const newScale =
        direction === 'in'
          ? Math.min(maxScale, oldScale * ZOOM_FACTOR)
          : Math.max(MIN_SCALE, oldScale / ZOOM_FACTOR)
      if (newScale === oldScale) return oldScale

      const pdfX = (container.scrollLeft + container.clientWidth / 2) / oldScale
      const pdfY = (container.scrollTop + container.clientHeight / 2) / oldScale

      pendingZoomRef.current = { pdfX, pdfY, newScale }
      return newScale
    })
  }, [containerRef, maxScale])

  return { scale, setScale, zoomPercent, handleZoom, pendingZoomRef }
}
