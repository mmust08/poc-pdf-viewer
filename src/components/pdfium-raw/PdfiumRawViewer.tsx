import { useRef, useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useMarks } from './useMarks'
import MarksOverlay from './MarksOverlay'

const ZOOM_FACTOR = 1.25
const MIN_SCALE = 0.25
const MAX_CANVAS_DIM = 16384
const PAGE_GAP = 12

const MARGIN_FRACTION = 0.75
const MARGIN_MIN_PX = 800
const RERENDER_THRESHOLD_PX = 200
const VIRTUALIZATION_VIEWPORTS = 2

// Debounce delay for re-render after zoom (ms).
// During this window the old canvas is CSS-stretched for instant feedback.
const ZOOM_RENDER_DEBOUNCE_MS = 150

interface PageGeometry {
  widthPt: number
  heightPt: number
}

interface PendingZoom {
  pdfX: number
  pdfY: number
  newScale: number
  anchorViewportX?: number
  anchorViewportY?: number
}

// ── Render request callback registry ────────────────────────────────────
// The parent holds one worker.onmessage handler and dispatches renderDone
// results to the correct PageCanvas via this callback map.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RenderCallback = (msg: any) => void

export default function PdfiumRawViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRafRef = useRef<number | null>(null)
  const pendingZoomRef = useRef<PendingZoom | null>(null)
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null)

  // Web Worker for off-thread PDFium rendering
  const workerRef = useRef<Worker | null>(null)
  const renderIdRef = useRef(0)
  const renderCallbacksRef = useRef<Map<number, RenderCallback>>(new Map())
  // Track pending file name so we can apply it after the worker loads
  const pendingNameRef = useRef('sample-blueprint.pdf')

  const [isPanning, setIsPanning] = useState(false)
  const [pdfName, setPdfName] = useState('sample-blueprint.pdf')
  const [pageGeometries, setPageGeometries] = useState<PageGeometry[]>([])
  const [scale, setScale] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scrollVersion, setScrollVersion] = useState(0)
  const [docVersion, setDocVersion] = useState(0)
  const [maxScale, setMaxScale] = useState(50)

  const { userMarks, addMark, clearMarks, restoreMarks, saveAndReset, getMarksForPage } =
    useMarks(pdfName, loading)

  const pageCount = pageGeometries.length
  const zoomPercent = Math.round(scale * 100)

  // ── Request a render from the worker ──────────────────────────────────
  const requestRender = useCallback(
    (pageIndex: number, renderScale: number, dpr: number, callback: RenderCallback): number => {
      const id = ++renderIdRef.current
      renderCallbacksRef.current.set(id, callback)
      workerRef.current?.postMessage({ type: 'render', id, pageIndex, scale: renderScale, dpr })
      return id
    },
    [],
  )

  // ── Initialise Web Worker + PDFium engine ─────────────────────────────
  useEffect(() => {
    const worker = new Worker(
      new URL('./pdfium.worker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    worker.onmessage = (e) => {
      const msg = e.data

      switch (msg.type) {
        case 'ready':
          // Engine initialised — load the default PDF
          worker.postMessage({
            type: 'loadUrl',
            url: `${window.location.origin}/sample-blueprint.pdf`,
            dpr: window.devicePixelRatio || 1,
          })
          break

        case 'loaded': {
          const geometries: PageGeometry[] = msg.geometries
          const name = pendingNameRef.current

          setPageGeometries(geometries)
          setPdfName(name)
          setMaxScale(msg.maxScale)

          // Fit-to-width
          if (geometries.length > 0 && containerRef.current) {
            const containerWidth = containerRef.current.clientWidth - 32
            setScale(containerWidth / geometries[0].widthPt)
          }

          restoreMarks(name)
          setDocVersion((v) => v + 1)
          setLoading(false)
          break
        }

        case 'error':
          setError(msg.message)
          setLoading(false)
          break

        case 'renderDone': {
          const cb = renderCallbacksRef.current.get(msg.id)
          if (cb) {
            renderCallbacksRef.current.delete(msg.id)
            cb(msg)
          }
          break
        }
      }
    }

    // Start WASM initialisation
    worker.postMessage({ type: 'init' })

    return () => {
      worker.terminate()
      workerRef.current = null
      renderCallbacksRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Apply scroll adjustment after zoom ────────────────────────────────
  useEffect(() => {
    const pending = pendingZoomRef.current
    const container = containerRef.current
    if (!pending || !container || pending.newScale !== scale) return
    pendingZoomRef.current = null

    const anchorX = pending.anchorViewportX ?? container.clientWidth / 2
    const anchorY = pending.anchorViewportY ?? container.clientHeight / 2

    container.scrollLeft = pending.pdfX * scale - anchorX
    container.scrollTop = pending.pdfY * scale - anchorY
  }, [scale])

  // ── Ctrl+wheel / pinch zoom ──────────────────────────────────────────
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

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (pageGeometries.length > 0) {
      const scrollCenter = e.currentTarget.scrollTop + e.currentTarget.clientHeight / 3
      let cumHeight = 0
      let page = pageGeometries.length
      for (let i = 0; i < pageGeometries.length; i++) {
        cumHeight += pageGeometries[i].heightPt * scale + PAGE_GAP
        if (scrollCenter < cumHeight) {
          page = i + 1
          break
        }
      }
      setCurrentPage(page)
    }

    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current)
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      setScrollVersion((v) => v + 1)
    })
  }

  // ── Grab-to-pan ──────────────────────────────────────────────────────
  function handlePanStart(e: React.MouseEvent<HTMLDivElement>) {
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
  }

  function handlePanMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!panRef.current) return
    const container = containerRef.current
    if (!container) return
    container.scrollLeft = panRef.current.scrollLeft - (e.clientX - panRef.current.startX)
    container.scrollTop = panRef.current.scrollTop - (e.clientY - panRef.current.startY)
  }

  function handlePanEnd() {
    panRef.current = null
    setIsPanning(false)
  }

  // ── Zoom handler (button zoom — centres on viewport) ─────────────────
  function handleZoom(direction: 'in' | 'out') {
    const container = containerRef.current
    if (!container) return

    const oldScale = scale
    const newScale =
      direction === 'in'
        ? Math.min(maxScale, oldScale * ZOOM_FACTOR)
        : Math.max(MIN_SCALE, oldScale / ZOOM_FACTOR)
    if (newScale === oldScale) return

    const pdfX = (container.scrollLeft + container.clientWidth / 2) / oldScale
    const pdfY = (container.scrollTop + container.clientHeight / 2) / oldScale

    pendingZoomRef.current = { pdfX, pdfY, newScale }
    setScale(newScale)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    saveAndReset()
    setLoading(true)
    setPageGeometries([])

    pendingNameRef.current = file.name
    const buf = await file.arrayBuffer()
    workerRef.current?.postMessage(
      { type: 'loadBuffer', buffer: buf, dpr: window.devicePixelRatio || 1 },
      [buf], // transfer
    )
    e.target.value = ''
  }

  // ── Page virtualisation — compute which pages to mount ────────────────
  const getVisiblePageRange = useCallback((): [number, number] => {
    const container = containerRef.current
    if (!container || pageGeometries.length === 0) return [0, pageGeometries.length - 1]

    const viewportH = container.clientHeight
    const scrollTop = container.scrollTop
    const bufferPx = viewportH * VIRTUALIZATION_VIEWPORTS

    const viewTop = scrollTop - bufferPx
    const viewBottom = scrollTop + viewportH + bufferPx

    let firstVisible = 0
    let lastVisible = pageGeometries.length - 1
    let cumTop = 0

    for (let i = 0; i < pageGeometries.length; i++) {
      const pageH = pageGeometries[i].heightPt * scale + PAGE_GAP
      const pageBottom = cumTop + pageH
      if (pageBottom < viewTop) {
        firstVisible = i + 1
      }
      if (cumTop > viewBottom) {
        lastVisible = i - 1
        break
      }
      cumTop = pageBottom
    }

    return [Math.max(0, firstVisible), Math.min(pageGeometries.length - 1, lastVisible)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageGeometries, scale, scrollVersion])

  const [visFirstPage, visLastPage] = getVisiblePageRange()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Toolbar */}
      <header
        style={{
          background: '#16213e',
          padding: '0.55rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          borderBottom: '1px solid #2a4080',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <Link to="/" style={{ color: '#7eb8f7', flexShrink: 0 }}>
          ← Back
        </Link>
        <h2 style={{ margin: 0, fontSize: '0.9rem', flexShrink: 0, color: '#ccc' }}>
          Prototype 5 — PDFium Raw WASM · {pdfName}
        </h2>
        <div style={{ flex: 1 }} />

        {pageCount > 0 && (
          <span style={{ color: '#aaa', fontSize: '0.85rem', flexShrink: 0 }}>
            Page {currentPage} / {pageCount}
          </span>
        )}

        <div style={{ width: 1, height: 24, background: '#2a4080' }} />

        {/* Zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
          <button onClick={() => handleZoom('out')} style={btnStyle} title="Zoom out">
            −
          </button>
          <span style={{ color: '#e0e0e0', fontSize: '0.85rem', minWidth: 55, textAlign: 'center' }}>
            {zoomPercent}%
          </span>
          <button onClick={() => handleZoom('in')} style={btnStyle} title="Zoom in">
            +
          </button>
        </div>

        <div style={{ width: 1, height: 24, background: '#2a4080' }} />

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button onClick={() => fileInputRef.current?.click()} style={btnStyle} title="Upload a PDF">
          Upload PDF
        </button>

        {userMarks.length > 0 && (
          <>
            <div style={{ width: 1, height: 24, background: '#2a4080' }} />
            <span style={{ color: '#aaa', fontSize: '0.82rem' }}>
              {userMarks.length} user mark{userMarks.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={clearMarks}
              style={{ ...btnStyle, background: '#6b1a1a' }}
              title="Remove all user marks"
            >
              Clear all
            </button>
          </>
        )}

        <span style={{ color: '#555', fontSize: '0.8rem', flexShrink: 0 }}>
          Click to place mark · Drag to pan · Ctrl+wheel to zoom · Max {Math.round(maxScale * 100)}%
        </span>
      </header>

      {/* Scrollable PDF container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#555',
          padding: '8px 0',
          position: 'relative',
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
      >
        {(loading || error) && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              color: error ? '#ff6b6b' : 'white',
              zIndex: 10,
              textAlign: 'center',
            }}
          >
            {error || 'Loading PDFium engine…'}
          </div>
        )}

        {!loading &&
          !error &&
          pageGeometries.map((geo, i) => {
            if (i < visFirstPage || i > visLastPage) {
              return (
                <div
                  key={`p${i}-${docVersion}`}
                  style={{
                    width: Math.round(geo.widthPt * scale),
                    height: Math.round(geo.heightPt * scale),
                    margin: `0 auto ${PAGE_GAP}px`,
                  }}
                />
              )
            }
            return (
              <PageCanvas
                key={`p${i}-${docVersion}`}
                requestRender={requestRender}
                pageIndex={i}
                scale={scale}
                widthPt={geo.widthPt}
                heightPt={geo.heightPt}
                containerRef={containerRef}
                scrollVersion={scrollVersion}
              >
                <MarksOverlay
                  marks={getMarksForPage(i + 1)}
                  scale={scale}
                  heightPt={geo.heightPt}
                  canvasWidth={Math.round(geo.widthPt * scale)}
                  canvasHeight={Math.round(geo.heightPt * scale)}
                  onMarkAdded={(x, y) => addMark(i + 1, x, y)}
                />
              </PageCanvas>
            )
          })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Per-page canvas renderer (off-thread via Web Worker)               */
/*                                                                     */
/*  1. Wrapper div sized to full scaled page (scroll layout).          */
/*  2. On zoom: instantly CSS-stretch old canvas (GPU, 0ms).           */
/*  3. After debounce: post render request to worker.                  */
/*  4. Worker renders in background — main thread stays at 60fps.      */
/*  5. On renderDone: build ImageData, atomic swap to visible canvas.  */
/* ------------------------------------------------------------------ */

interface RenderedRegion {
  clipLeft: number
  clipTop: number
  clipRight: number
  clipBottom: number
  scale: number
  renderScale: number
}

function PageCanvas({
  requestRender,
  pageIndex,
  scale,
  widthPt,
  heightPt,
  containerRef,
  scrollVersion,
  children,
}: {
  requestRender: (pageIndex: number, scale: number, dpr: number, cb: RenderCallback) => number
  pageIndex: number
  scale: number
  widthPt: number
  heightPt: number
  containerRef: React.RefObject<HTMLDivElement>
  scrollVersion: number
  children?: React.ReactNode
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const renderedRegionRef = useRef<RenderedRegion | null>(null)
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestIdRef = useRef(0) // to discard stale worker responses

  // Cache the rendered full-page bitmap as an offscreen canvas
  const offscreenCacheRef = useRef<{
    canvas: HTMLCanvasElement
    renderScale: number
  } | null>(null)

  const canvasWidth = Math.round(widthPt * scale)
  const canvasHeight = Math.round(heightPt * scale)

  useEffect(() => {
    let cancelled = false

    // ── Immediate CSS stretch for smooth zoom feedback ───────────────
    const canvas = canvasRef.current
    const rr = renderedRegionRef.current
    if (canvas && rr && rr.scale !== scale && canvas.width > 0) {
      const ratio = scale / rr.scale
      canvas.style.width = `${(rr.clipRight - rr.clipLeft) * ratio}px`
      canvas.style.height = `${(rr.clipBottom - rr.clipTop) * ratio}px`
      canvas.style.left = `${rr.clipLeft * ratio}px`
      canvas.style.top = `${rr.clipTop * ratio}px`
    }

    // ── Debounce on scale change, immediate on scroll ───────────────
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

      if (visRight <= visLeft || visBottom <= visTop) {
        cvs.width = 0
        cvs.height = 0
        renderedRegionRef.current = null
        return
      }

      // ── Determine clip region ─────────────────────────────────────
      const dpr = window.devicePixelRatio || 1

      // Check if full page fits in canvas limits (the worker enforces
      // the memory limit, we just need to decide clip vs full here).
      const fullPagePxW = canvasWidth * dpr
      const fullPagePxH = canvasHeight * dpr
      const fullPageFits = fullPagePxW <= MAX_CANVAS_DIM && fullPagePxH <= MAX_CANVAS_DIM

      let clipLeft: number
      let clipTop: number
      let clipW: number
      let clipH: number

      if (fullPageFits) {
        clipLeft = 0
        clipTop = 0
        clipW = canvasWidth
        clipH = canvasHeight
      } else {
        const viewportW = cRect.width
        const viewportH = cRect.height
        const marginH = Math.max(MARGIN_MIN_PX, viewportW * MARGIN_FRACTION)
        const marginV = Math.max(MARGIN_MIN_PX, viewportH * MARGIN_FRACTION)

        const renderLeft = Math.max(wRect.left, visLeft - marginH)
        const renderTop = Math.max(wRect.top, visTop - marginV)
        const renderRight = Math.min(wRect.right, visRight + marginH)
        const renderBottom = Math.min(wRect.bottom, visBottom + marginV)

        clipLeft = Math.round(renderLeft - wRect.left)
        clipTop = Math.round(renderTop - wRect.top)
        clipW = Math.round(renderRight - renderLeft)
        clipH = Math.round(renderBottom - renderTop)
      }

      if (clipW <= 0 || clipH <= 0) return

      // ── Skip-render check ─────────────────────────────────────────
      const rrNow = renderedRegionRef.current
      if (rrNow && rrNow.scale === scale) {
        const vL = Math.round(visLeft - wRect.left)
        const vT = Math.round(visTop - wRect.top)
        const vR = Math.round(visRight - wRect.left)
        const vB = Math.round(visBottom - wRect.top)

        if (
          vL >= rrNow.clipLeft + RERENDER_THRESHOLD_PX &&
          vT >= rrNow.clipTop + RERENDER_THRESHOLD_PX &&
          vR <= rrNow.clipRight - RERENDER_THRESHOLD_PX &&
          vB <= rrNow.clipBottom - RERENDER_THRESHOLD_PX
        ) {
          return
        }
      }

      // ── Check offscreen cache — skip worker call if same renderScale ─
      const cache = offscreenCacheRef.current
      if (cache && cache.renderScale === scale) {
        // Same scale cached — just blit the visible clip region
        blitToCanvas(cvs, cache.canvas, clipLeft, clipTop, clipW, clipH, canvasWidth, canvasHeight, fullPageFits, scale, cache.renderScale, dpr)
        renderedRegionRef.current = { clipLeft, clipTop, clipRight: clipLeft + clipW, clipBottom: clipTop + clipH, scale, renderScale: cache.renderScale }
        return
      }

      // ── Post render request to worker ─────────────────────────────
      const id = requestRender(pageIndex, scale, dpr, (msg) => {
        if (cancelled || id !== latestIdRef.current) return // stale
        if (msg.error) return

        // Build offscreen canvas from transferred pixel data
        const rgba = new Uint8ClampedArray(msg.data)
        const imgData = new ImageData(rgba, msg.width, msg.height)
        const offFull = document.createElement('canvas')
        offFull.width = msg.width
        offFull.height = msg.height
        const ctx = offFull.getContext('2d')
        if (!ctx) return
        ctx.putImageData(imgData, 0, 0)

        offscreenCacheRef.current = { canvas: offFull, renderScale: msg.renderScale }

        // Blit to visible canvas
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
  }, [requestRender, pageIndex, scale, widthPt, heightPt, containerRef, scrollVersion, canvasWidth, canvasHeight])

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

/** Blit a region from the full-page offscreen canvas to the visible canvas. */
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

  // Atomic swap
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

const btnStyle: React.CSSProperties = {
  background: '#2a4080',
  color: 'white',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 5,
  padding: '0.32rem 0.7rem',
  cursor: 'pointer',
  fontSize: '0.83rem',
  fontWeight: 500,
  flexShrink: 0,
}
