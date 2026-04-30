import { useRef, useEffect } from 'react'
import { computeClipRegion, shouldSkipRender, type RenderedRegion } from './viewportUtils'
import { globalCanvasCache } from './CanvasCache'

const MAX_CANVAS_DIM = 16384
const PAGE_GAP = 12
const MARGIN_FRACTION = 0.75
const MARGIN_MIN_PX = 800
const RERENDER_THRESHOLD_PX = 200
const ZOOM_RENDER_DEBOUNCE_MS = 150

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RenderCallback = (msg: any) => void

interface PageCanvasProps {
  requestRender: (pageIndex: number, scale: number, dpr: number, cb: RenderCallback) => number
  pageIndex: number
  scale: number
  widthPt: number
  heightPt: number
  containerRef: React.RefObject<HTMLDivElement | null>
  scrollVersion: number
  docVersion: number
  children?: React.ReactNode
}

export function PageCanvas({
  requestRender,
  pageIndex,
  scale,
  widthPt,
  heightPt,
  containerRef,
  scrollVersion,
  docVersion,
  children,
}: PageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const renderedRegionRef = useRef<RenderedRegion | null>(null)
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestIdRef = useRef(0)

  const canvasWidth = Math.round(widthPt * scale)
  const canvasHeight = Math.round(heightPt * scale)

  useEffect(() => {
    let cancelled = false

    const canvas = canvasRef.current
    const rr = renderedRegionRef.current
    if (canvas && rr && rr.scale !== scale && canvas.width > 0) {
      const ratio = scale / rr.scale
      canvas.style.width = `${(rr.clipRight - rr.clipLeft) * ratio}px`
      canvas.style.height = `${(rr.clipBottom - rr.clipTop) * ratio}px`
      canvas.style.left = `${rr.clipLeft * ratio}px`
      canvas.style.top = `${rr.clipTop * ratio}px`
    }

    if (renderTimerRef.current) {
      clearTimeout(renderTimerRef.current)
      renderTimerRef.current = null
    }
    const scaleChanged = !rr || rr.scale !== scale
    const delay = scaleChanged ? ZOOM_RENDER_DEBOUNCE_MS : 0

    if (delay > 0) {
      renderTimerRef.current = setTimeout(() => {
        renderTimerRef.current = null
        if (!cancelled) startRender()
      }, delay)
    } else {
      startRender()
    }

    function startRender() {
      const cvs = canvasRef.current
      const wrapper = wrapperRef.current
      const container = containerRef.current
      if (!cvs || !wrapper || !container) return

      const wRect = wrapper.getBoundingClientRect()
      const cRect = container.getBoundingClientRect()

      const visLeft = Math.max(wRect.left, cRect.left)
      const visTop = Math.max(wRect.top, cRect.top)
      const visRight = Math.min(wRect.right, cRect.right)
      const visBottom = Math.min(wRect.bottom, cRect.bottom)

      const dpr = window.devicePixelRatio || 1

      const clipResult = computeClipRegion({
        canvasWidth, canvasHeight, dpr, maxCanvasDim: MAX_CANVAS_DIM,
        visLeft, visTop, visRight, visBottom,
        wrapperLeft: wRect.left, wrapperTop: wRect.top,
        wrapperRight: wRect.right, wrapperBottom: wRect.bottom,
        viewportWidth: cRect.width, viewportHeight: cRect.height,
        marginFraction: MARGIN_FRACTION, marginMinPx: MARGIN_MIN_PX,
      })

      if (!clipResult) {
        cvs.width = 0
        cvs.height = 0
        renderedRegionRef.current = null
        return
      }

      const { clipLeft, clipTop, clipW, clipH, fullPageFits } = clipResult

      if (shouldSkipRender({
        renderedRegion: renderedRegionRef.current,
        visLeft: Math.round(visLeft - wRect.left),
        visTop: Math.round(visTop - wRect.top),
        visRight: Math.round(visRight - wRect.left),
        visBottom: Math.round(visBottom - wRect.top),
        scale,
        threshold: RERENDER_THRESHOLD_PX,
      })) {
        return
      }

      const cached = globalCanvasCache.get(pageIndex, scale, docVersion)
      if (cached) {
        blitToCanvas(cvs, cached, clipLeft, clipTop, clipW, clipH, canvasWidth, canvasHeight, fullPageFits, scale, scale, dpr)
        renderedRegionRef.current = { clipLeft, clipTop, clipRight: clipLeft + clipW, clipBottom: clipTop + clipH, scale, renderScale: scale }
        return
      }

      const id = requestRender(pageIndex, scale, dpr, (msg) => {
        if (cancelled || id !== latestIdRef.current) return
        if (msg.error) return

        const rgba = new Uint8ClampedArray(msg.data)
        const imgData = new ImageData(rgba, msg.width, msg.height)
        const offFull = document.createElement('canvas')
        offFull.width = msg.width
        offFull.height = msg.height
        const ctx = offFull.getContext('2d')
        if (!ctx) return
        ctx.putImageData(imgData, 0, 0)

        globalCanvasCache.set(pageIndex, msg.renderScale, docVersion, offFull)

        const cvs2 = canvasRef.current
        if (!cvs2) return
        blitToCanvas(cvs2, offFull, clipLeft, clipTop, clipW, clipH, canvasWidth, canvasHeight, fullPageFits, scale, msg.renderScale, dpr)

        renderedRegionRef.current = { clipLeft, clipTop, clipRight: clipLeft + clipW, clipBottom: clipTop + clipH, scale, renderScale: msg.renderScale }
      })
      latestIdRef.current = id
    }

    return () => {
      cancelled = true
      if (renderTimerRef.current) {
        clearTimeout(renderTimerRef.current)
        renderTimerRef.current = null
      }
    }
  }, [requestRender, pageIndex, scale, widthPt, heightPt, containerRef, scrollVersion, docVersion, canvasWidth, canvasHeight])

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        width: canvasWidth,
        height: canvasHeight,
        margin: `0 auto ${PAGE_GAP}px`,
        background: '#fff',
      }}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute' }} />
      {children}
    </div>
  )
}

function blitToCanvas(
  cvs: HTMLCanvasElement,
  offFull: HTMLCanvasElement,
  clipLeft: number,
  clipTop: number,
  clipW: number,
  clipH: number,
  canvasWidth: number,
  canvasHeight: number,
  fullPageFits: boolean,
  scale: number,
  renderScale: number,
  dpr: number,
) {
  const offscreen = document.createElement('canvas')

  if (fullPageFits) {
    offscreen.width = Math.round(canvasWidth * dpr)
    offscreen.height = Math.round(canvasHeight * dpr)
    const ctx = offscreen.getContext('2d')
    if (!ctx) return
    ctx.drawImage(offFull, 0, 0, offscreen.width, offscreen.height)
  } else {
    const scaleRatio = renderScale / scale
    const srcX = clipLeft * scaleRatio * dpr
    const srcY = clipTop * scaleRatio * dpr
    const srcW = clipW * scaleRatio * dpr
    const srcH = clipH * scaleRatio * dpr

    offscreen.width = Math.round(clipW * dpr)
    offscreen.height = Math.round(clipH * dpr)
    const ctx = offscreen.getContext('2d')
    if (!ctx) return
    ctx.drawImage(offFull, srcX, srcY, srcW, srcH, 0, 0, offscreen.width, offscreen.height)
  }

  cvs.width = offscreen.width
  cvs.height = offscreen.height
  cvs.style.width = `${clipW}px`
  cvs.style.height = `${clipH}px`
  cvs.style.left = `${clipLeft}px`
  cvs.style.top = `${clipTop}px`
  const visCtx = cvs.getContext('2d')
  if (!visCtx) return
  visCtx.drawImage(offscreen, 0, 0)
}
