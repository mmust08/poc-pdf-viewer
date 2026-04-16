import { useEffect, useRef } from 'react'
import { Canvas, Circle, FabricImage, FabricText, Point } from 'fabric'
import { usePdfPageDataUrl } from '../../hooks/usePdfPage'
import { HARDCODED_MARKS } from '../../types/marks'

interface Props {
  pdfUrl: string
}

export default function FabricViewer({ pdfUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)

  const { dataUrl, pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx, isLoading, error } =
    usePdfPageDataUrl(pdfUrl, 1.5)

  // Initialize Fabric canvas once
  useEffect(() => {
    const el = canvasElRef.current
    if (!el) return

    const fc = new Canvas(el, {
      selection: false,
      backgroundColor: '#888',
    })
    fabricRef.current = fc

    // Zoom with mouse wheel
    fc.on('mouse:wheel', (opt) => {
      const e = opt.e as WheelEvent
      let zoom = fc.getZoom()
      zoom *= 0.999 ** e.deltaY
      zoom = Math.min(Math.max(zoom, 0.2), 10)
      fc.zoomToPoint(new Point(e.offsetX, e.offsetY), zoom)
      e.preventDefault()
      e.stopPropagation()
    })

    // Pan with mouse drag
    let isPanning = false
    let lastX = 0
    let lastY = 0

    fc.on('mouse:down', (opt) => {
      isPanning = true
      const me = opt.e as MouseEvent
      lastX = me.clientX
      lastY = me.clientY
    })
    fc.on('mouse:move', (opt) => {
      if (!isPanning) return
      const me = opt.e as MouseEvent
      const vpt = fc.viewportTransform
      vpt[4] += me.clientX - lastX
      vpt[5] += me.clientY - lastY
      fc.requestRenderAll()
      lastX = me.clientX
      lastY = me.clientY
    })
    fc.on('mouse:up', () => { isPanning = false })

    // Resize canvas to fill container
    function resize() {
      if (!containerRef.current) return
      fc.setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })
    }
    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      fc.dispose()
      fabricRef.current = null
    }
  }, [])

  // Load PDF image + marks into Fabric whenever PDF data is ready
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || !dataUrl || !pageWidthPt) return

    async function loadContent() {
      if (!fc) return
      fc.clear()

      const img = await FabricImage.fromURL(dataUrl!)
      img.set({ left: 0, top: 0, selectable: false, evented: false })
      fc.add(img)

      const scaleX = canvasWidthPx / pageWidthPt
      const scaleY = canvasHeightPx / pageHeightPt

      for (const mark of HARDCODED_MARKS) {
        const left = Math.round(mark.x * scaleX)
        const top = Math.round((pageHeightPt - mark.y) * scaleY)

        const circle = new Circle({
          left: left - 10,
          top: top - 10,
          radius: 10,
          fill: 'rgba(255,80,80,0.85)',
          stroke: 'white',
          strokeWidth: 2,
          selectable: false,
          evented: false,
        })

        const label = new FabricText(mark.label, {
          left: left + 14,
          top: top - 8,
          fontSize: 13,
          fontWeight: 'bold',
          fill: 'white',
          stroke: 'black',
          strokeWidth: 2,
          paintFirst: 'stroke',
          selectable: false,
          evented: false,
        })

        fc.add(circle, label)
      }

      fc.requestRenderAll()
    }

    loadContent()
  }, [dataUrl, pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {isLoading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: 'white', zIndex: 10 }}>
          Loading PDF…
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'red', zIndex: 10 }}>
          Error: {error}
        </div>
      )}
      <canvas ref={canvasElRef} />
    </div>
  )
}
