import { useRef, useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { PdfMark, HARDCODED_MARKS } from '../../types/marks'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker as string

const ZOOM_FACTOR = 1.25
const MIN_SCALE = 0.25
const MAX_SCALE = 50 // 5 000 %
const MAX_CANVAS_DIM = 16384 // max canvas pixels per axis (browser limit)
const CLICK_THRESHOLD_SQ = 25
const PAGE_GAP = 12

// Dynamic pre-render margin: fraction of viewport dimension, with a floor.
const MARGIN_FRACTION = 0.75
const MARGIN_MIN_PX = 800

// Skip-render threshold: don't re-render if the viewport edge is still this
// far inside the already-rendered region.
const RERENDER_THRESHOLD_PX = 200

// Page virtualisation: only mount PageCanvas for pages within this many
// viewport-heights of the visible area.
const VIRTUALIZATION_VIEWPORTS = 2

const hardcodedIds = new Set(HARDCODED_MARKS.map((m) => m.id))

interface PageGeometry {
  widthPt: number
  heightPt: number
}

interface PendingZoom {
  pdfX: number
  pdfY: number
  newScale: number
  anchorViewportX?: number // pointer offset for wheel zoom
  anchorViewportY?: number
}

export default function PdfJsViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)
  const scrollRafRef = useRef<number | null>(null)
  const pendingZoomRef = useRef<PendingZoom | null>(null)

  const [pdfUrl, setPdfUrl] = useState('/sample-blueprint.pdf')
  const [pdfName, setPdfName] = useState('sample-blueprint.pdf')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [pageGeometries, setPageGeometries] = useState<PageGeometry[]>([])
  const [scale, setScale] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [userMarks, setUserMarks] = useState<PdfMark[]>([])
  const [loading, setLoading] = useState(true)
  const [scrollVersion, setScrollVersion] = useState(0)

  const pageCount = pageGeometries.length
  const zoomPercent = Math.round(scale * 100)

  // ── Load PDF document and compute fit-to-width scale ──────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setCurrentPage(1)
    setUserMarks([])
    setPdfDoc(null)
    setPageGeometries([])

    const loadingTask = pdfjsLib.getDocument(pdfUrl)
    loadingTask.promise
      .then(async (doc) => {
        if (cancelled) {
          doc.destroy()
          return
        }

        const geometries: PageGeometry[] = []
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i)
          if (cancelled) return
          const vp = page.getViewport({ scale: 1 })
          geometries.push({ widthPt: vp.width, heightPt: vp.height })
        }
        if (cancelled) return

        setPdfDoc(doc)
        setPageGeometries(geometries)

        if (geometries.length > 0 && containerRef.current) {
          const containerWidth = containerRef.current.clientWidth - 32
          setScale(containerWidth / geometries[0].widthPt)
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      loadingTask.destroy()
    }
  }, [pdfUrl])

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
  // Scale is read via a ref so we attach the listener once (non-passive to
  // preventDefault) without re-creating it on every scale change.
  const wheelScaleRef = useRef(scale)
  wheelScaleRef.current = scale

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return
      if (!container) return
      e.preventDefault()

      const oldScale = wheelScaleRef.current
      const newScale =
        e.deltaY < 0
          ? Math.min(MAX_SCALE, oldScale * ZOOM_FACTOR)
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

  // ── Zoom handler (button zoom — centres on viewport) ─────────────────
  function handleZoom(direction: 'in' | 'out') {
    const container = containerRef.current
    if (!container) return

    const oldScale = scale
    const newScale =
      direction === 'in'
        ? Math.min(MAX_SCALE, oldScale * ZOOM_FACTOR)
        : Math.max(MIN_SCALE, oldScale / ZOOM_FACTOR)
    if (newScale === oldScale) return

    const pdfX = (container.scrollLeft + container.clientWidth / 2) / oldScale
    const pdfY = (container.scrollTop + container.clientHeight / 2) / oldScale

    pendingZoomRef.current = { pdfX, pdfY, newScale }
    setScale(newScale)
  }

  function addMark(page: number, x: number, y: number) {
    setUserMarks((prev) => {
      const n = prev.length + 1
      const id = `U${n}`
      return [
        ...prev,
        { id, page, x: Math.round(x), y: Math.round(y), label: `${id} — (${Math.round(x)}, ${Math.round(y)})` },
      ]
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfUrl(URL.createObjectURL(file))
    setPdfName(file.name)
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
          Prototype 1 — PDF.js · {pdfName}
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
          <span style={{ color: '#e0e0e0', fontSize: '0.85rem', minWidth: 45, textAlign: 'center' }}>
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
              onClick={() => setUserMarks([])}
              style={{ ...btnStyle, background: '#6b1a1a' }}
              title="Remove all user marks"
            >
              Clear all
            </button>
          </>
        )}

        <span style={{ color: '#555', fontSize: '0.8rem', flexShrink: 0 }}>
          Click to place mark · Scroll to navigate · Ctrl+wheel to zoom
        </span>
      </header>

      {/* Scrollable PDF container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflow: 'auto', background: '#555', padding: '8px 0', position: 'relative' }}
      >
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              color: 'white',
              zIndex: 10,
            }}
          >
            Loading PDF…
          </div>
        )}

        {pdfDoc &&
          pageGeometries.map((geo, i) => {
            if (i < visFirstPage || i > visLastPage) {
              // Placeholder — correct height so scroll layout is stable
              return (
                <div
                  key={`${pdfUrl}-p${i}`}
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
                key={`${pdfUrl}-p${i}`}
                pdfDoc={pdfDoc}
                pageNumber={i + 1}
                scale={scale}
                widthPt={geo.widthPt}
                heightPt={geo.heightPt}
                marks={[
                  ...HARDCODED_MARKS.filter((m) => m.page === i + 1),
                  ...userMarks.filter((m) => m.page === i + 1),
                ]}
                onMarkAdded={(x, y) => addMark(i + 1, x, y)}
                pointerDownRef={pointerDownRef}
                containerRef={containerRef}
                scrollVersion={scrollVersion}
              />
            )
          })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Per-page canvas renderer                                           */
/*                                                                     */
/*  Rendering strategy                                                 */
/*  ──────────────────                                                 */
/*  1. The wrapper div is always sized to the full scaled page so the */
/*     scrollable layout is correct.                                   */
/*  2. The canvas covers only the visible region of the page plus a   */
/*     dynamic pre-render margin above/below and left/right.  This    */
/*     keeps canvas dimensions within browser limits at any zoom      */
/*     level and means small scrolls reveal already-rendered content. */
/*  3. Double-buffering: PDF.js renders into an offscreen canvas.     */
/*     Only when the render completes is the visible canvas atomically */
/*     updated (resize + drawImage in the same JS task).  This means  */
/*     the old frame stays visible during the entire render — no grey */
/*     flash, no breaks between page slides.                          */
/*  4. Skip-render: if the viewport is fully within the previously    */
/*     rendered region (with threshold), no new render is triggered.  */
/*  5. HiDPI: canvas bitmap is sized at devicePixelRatio resolution   */
/*     but displayed at CSS pixel size for crisp lines and text.      */
/* ------------------------------------------------------------------ */

interface RenderedRegion {
  clipLeft: number
  clipTop: number
  clipRight: number
  clipBottom: number
  scale: number
}

function PageCanvas({
  pdfDoc,
  pageNumber,
  scale,
  widthPt,
  heightPt,
  marks,
  onMarkAdded,
  pointerDownRef,
  containerRef,
  scrollVersion,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any
  pageNumber: number
  scale: number
  widthPt: number
  heightPt: number
  marks: PdfMark[]
  onMarkAdded: (x: number, y: number) => void
  pointerDownRef: React.MutableRefObject<{ x: number; y: number } | null>
  containerRef: React.RefObject<HTMLDivElement>
  scrollVersion: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Track the clip region currently painted on the visible canvas so we
  // can skip re-renders when the viewport hasn't moved outside it.
  const renderedRegionRef = useRef<RenderedRegion | null>(null)

  // Active PDF.js RenderTask — cancel before starting a new one.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = useRef<any>(null)

  const canvasWidth = Math.round(widthPt * scale)
  const canvasHeight = Math.round(heightPt * scale)

  useEffect(() => {
    let cancelled = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfDoc.getPage(pageNumber).then(async (page: any) => {
      if (cancelled) return

      const canvas = canvasRef.current
      const wrapper = wrapperRef.current
      const container = containerRef.current
      if (!canvas || !wrapper || !container) return

      const wRect = wrapper.getBoundingClientRect()
      const cRect = container.getBoundingClientRect()

      // Strict visible intersection
      const visLeft = Math.max(wRect.left, cRect.left)
      const visTop = Math.max(wRect.top, cRect.top)
      const visRight = Math.min(wRect.right, cRect.right)
      const visBottom = Math.min(wRect.bottom, cRect.bottom)

      if (visRight <= visLeft || visBottom <= visTop) {
        canvas.width = 0
        canvas.height = 0
        renderedRegionRef.current = null
        return
      }

      // ── Determine clip region ─────────────────────────────────────
      // Render the full page when it fits within browser canvas limits
      // so large-format pages (A3, A2, …) appear completely without
      // partial-render artefacts.  Fall back to margin-based clipping
      // at very high zoom levels where the full page would exceed the
      // browser's maximum canvas size.
      const dpr = window.devicePixelRatio || 1
      const fullPageFits =
        Math.round(canvasWidth * dpr) <= MAX_CANVAS_DIM &&
        Math.round(canvasHeight * dpr) <= MAX_CANVAS_DIM

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
      const rr = renderedRegionRef.current
      if (rr && rr.scale === scale) {
        const vL = Math.round(visLeft - wRect.left)
        const vT = Math.round(visTop - wRect.top)
        const vR = Math.round(visRight - wRect.left)
        const vB = Math.round(visBottom - wRect.top)

        if (
          vL >= rr.clipLeft + RERENDER_THRESHOLD_PX &&
          vT >= rr.clipTop + RERENDER_THRESHOLD_PX &&
          vR <= rr.clipRight - RERENDER_THRESHOLD_PX &&
          vB <= rr.clipBottom - RERENDER_THRESHOLD_PX
        ) {
          return // viewport is well within the already-rendered region
        }
      }

      // ── Cancel stale render ───────────────────────────────────────
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
        renderTaskRef.current = null
      }

      const offscreen = document.createElement('canvas')
      offscreen.width = Math.round(clipW * dpr)
      offscreen.height = Math.round(clipH * dpr)
      const offCtx = offscreen.getContext('2d')
      if (!offCtx) return

      const viewport = page.getViewport({
        scale: scale * dpr,
        offsetX: -clipLeft * dpr,
        offsetY: -clipTop * dpr,
      })

      const renderTask = page.render({ canvasContext: offCtx, viewport })
      renderTaskRef.current = renderTask

      try {
        await renderTask.promise
      } catch {
        return // RenderingCancelledException or other error
      }

      renderTaskRef.current = null
      if (cancelled) return

      // ── Atomic swap ───────────────────────────────────────────────
      canvas.width = Math.round(clipW * dpr)
      canvas.height = Math.round(clipH * dpr)
      canvas.style.width = `${clipW}px`
      canvas.style.height = `${clipH}px`
      canvas.style.left = `${clipLeft}px`
      canvas.style.top = `${clipTop}px`
      const visCtx = canvas.getContext('2d')
      if (!visCtx) return
      visCtx.drawImage(offscreen, 0, 0)

      renderedRegionRef.current = {
        clipLeft,
        clipTop,
        clipRight: clipLeft + clipW,
        clipBottom: clipTop + clipH,
        scale,
      }
    })

    return () => {
      cancelled = true
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
        renderTaskRef.current = null
      }
    }
  }, [pdfDoc, pageNumber, scale, scrollVersion, containerRef])

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (pointerDownRef.current) {
      const dx = e.clientX - pointerDownRef.current.x
      const dy = e.clientY - pointerDownRef.current.y
      pointerDownRef.current = null
      if (dx * dx + dy * dy > CLICK_THRESHOLD_SQ) return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const pdfX = (e.clientX - rect.left) * (widthPt / rect.width)
    const pdfY = heightPt - (e.clientY - rect.top) * (heightPt / rect.height)
    onMarkAdded(pdfX, pdfY)
  }

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
      onPointerDown={(e) => {
        pointerDownRef.current = { x: e.clientX, y: e.clientY }
      }}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute' }} />

      {marks.length > 0 && (
        <svg
          width={canvasWidth}
          height={canvasHeight}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
        >
          {marks.map((mark) => {
            const cx = mark.x * (canvasWidth / widthPt)
            const cy = (heightPt - mark.y) * (canvasHeight / heightPt)
            const isUser = !hardcodedIds.has(mark.id)
            return (
              <g key={mark.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={10}
                  fill={isUser ? 'rgba(80,180,255,0.9)' : 'rgba(255,80,80,0.85)'}
                  stroke="white"
                  strokeWidth={2}
                />
                <text
                  x={cx + 14}
                  y={cy + 5}
                  fill="white"
                  fontSize={12}
                  fontWeight="bold"
                  paintOrder="stroke"
                  stroke="black"
                  strokeWidth={3}
                >
                  {mark.label}
                </text>
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
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
