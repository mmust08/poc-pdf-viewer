import { useRef, useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { PDFiumLibrary } from '@hyzyla/pdfium/browser/cdn'
import { useMarks } from './useMarks'
import MarksOverlay from './MarksOverlay'

const ZOOM_FACTOR = 1.25
const MIN_SCALE = 0.25
const MAX_SCALE = 50 // 5 000 %
const MAX_CANVAS_DIM = 16384 // browser canvas limit per axis
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

// @hyzyla/pdfium uses FPDF_REVERSE_BYTE_ORDER flag internally,
// so render output is already RGBA despite the 'BGRA' colorSpace name.
// No channel swap needed — data goes directly to ImageData.

export default function PdfiumRawViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRafRef = useRef<number | null>(null)
  const pendingZoomRef = useRef<PendingZoom | null>(null)
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null)

  // PDFium engine refs (not state — avoid re-renders)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const libraryRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentRef = useRef<any>(null)

  const [isPanning, setIsPanning] = useState(false)
  const [pdfName, setPdfName] = useState('sample-blueprint.pdf')
  const [pageGeometries, setPageGeometries] = useState<PageGeometry[]>([])
  const [scale, setScale] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scrollVersion, setScrollVersion] = useState(0)
  const [docVersion, setDocVersion] = useState(0) // bumped when document changes

  const { userMarks, addMark, clearMarks, restoreMarks, saveAndReset, getMarksForPage } =
    useMarks(pdfName, loading)

  const pageCount = pageGeometries.length
  const zoomPercent = Math.round(scale * 100)

  // ── Initialise PDFium WASM engine ────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const lib = await PDFiumLibrary.init({ disableCDNWarning: true })
        if (cancelled) { lib.destroy(); return }
        libraryRef.current = lib
        // Load default PDF
        await loadPdfFromUrl('/sample-blueprint.pdf', 'sample-blueprint.pdf')
      } catch (err) {
        if (!cancelled) setError(`Failed to initialise PDFium: ${err}`)
      }
    }

    init()
    return () => {
      cancelled = true
      if (documentRef.current) { documentRef.current.destroy(); documentRef.current = null }
      if (libraryRef.current) { libraryRef.current.destroy(); libraryRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load PDF from URL ────────────────────────────────────────────────
  async function loadPdfFromUrl(url: string, name: string) {
    const lib = libraryRef.current
    if (!lib) return

    setLoading(true)
    setError(null)
    setCurrentPage(1)
    setPageGeometries([])

    try {
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const buf = await resp.arrayBuffer()
      loadPdfFromBuffer(new Uint8Array(buf), name)
    } catch (err) {
      setError(`Failed to load PDF: ${err}`)
      setLoading(false)
    }
  }

  // ── Load PDF from ArrayBuffer ────────────────────────────────────────
  async function loadPdfFromBuffer(data: Uint8Array, name: string) {
    const lib = libraryRef.current
    if (!lib) return

    // Close previous document
    if (documentRef.current) {
      documentRef.current.destroy()
      documentRef.current = null
    }

    try {
      const doc = await lib.loadDocument(data)
      documentRef.current = doc

      const count = doc.getPageCount()
      const geometries: PageGeometry[] = []
      for (let i = 0; i < count; i++) {
        const page = doc.getPage(i)
        const size = page.getOriginalSize()
        geometries.push({ widthPt: size.originalWidth, heightPt: size.originalHeight })
      }

      setPageGeometries(geometries)
      setPdfName(name)

      // Fit-to-width
      if (geometries.length > 0 && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32
        setScale(containerWidth / geometries[0].widthPt)
      }

      restoreMarks(name)
      setDocVersion((v) => v + 1)
      setLoading(false)
    } catch (err) {
      setError(`Failed to parse PDF: ${err}`)
      setLoading(false)
    }
  }

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
        ? Math.min(MAX_SCALE, oldScale * ZOOM_FACTOR)
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

    const buf = await file.arrayBuffer()
    loadPdfFromBuffer(new Uint8Array(buf), file.name)
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
              onClick={clearMarks}
              style={{ ...btnStyle, background: '#6b1a1a' }}
              title="Remove all user marks"
            >
              Clear all
            </button>
          </>
        )}

        <span style={{ color: '#555', fontSize: '0.8rem', flexShrink: 0 }}>
          Click to place mark · Drag to pan · Ctrl+wheel to zoom
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
                documentRef={documentRef}
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
/*  Per-page canvas renderer                                           */
/*                                                                     */
/*  Rendering strategy                                                 */
/*  ──────────────────                                                 */
/*  1. The wrapper div is always sized to the full scaled page so the */
/*     scrollable layout is correct.                                   */
/*  2. PDFium renders the full page at an adaptive scale (capped at   */
/*     MAX_CANVAS_DIM). The rendered bitmap is cached as an offscreen */
/*     canvas. Only the visible viewport region is drawn to the       */
/*     display canvas via drawImage source rect.                       */
/*  3. Double-buffering: PDFium renders into an offscreen canvas.      */
/*     Only when complete is the visible canvas atomically updated.    */
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
  renderScale: number
}

function PageCanvas({
  documentRef,
  pageIndex,
  scale,
  widthPt,
  heightPt,
  containerRef,
  scrollVersion,
  children,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  documentRef: React.RefObject<any>
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

  // Cache the PDFium-rendered full-page bitmap as an offscreen canvas
  // so panning at the same zoom doesn't re-render via PDFium.
  const offscreenCacheRef = useRef<{
    canvas: HTMLCanvasElement
    renderScale: number
    pxW: number
    pxH: number
  } | null>(null)

  const canvasWidth = Math.round(widthPt * scale)
  const canvasHeight = Math.round(heightPt * scale)

  useEffect(() => {
    let cancelled = false

    async function render() {
      const doc = documentRef.current
      const canvas = canvasRef.current
      const wrapper = wrapperRef.current
      const container = containerRef.current
      if (!doc || !canvas || !wrapper || !container) return

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
      const dpr = window.devicePixelRatio || 1

      // Calculate the max scale at which the full page fits in canvas limits
      const maxRenderScale = Math.min(
        MAX_CANVAS_DIM / (widthPt * dpr),
        MAX_CANVAS_DIM / (heightPt * dpr),
      )
      const renderScale = Math.min(scale, maxRenderScale)
      const fullPageFits = scale <= maxRenderScale

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
      if (rr && rr.scale === scale && rr.renderScale === renderScale) {
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

      // ── Render with PDFium (or use cache) ─────────────────────────
      const cache = offscreenCacheRef.current
      let offscreenFull: HTMLCanvasElement

      if (cache && cache.renderScale === renderScale) {
        // Reuse cached full-page render (same zoom level)
        offscreenFull = cache.canvas
      } else {
        // Render the full page at renderScale via PDFium
        const page = doc.getPage(pageIndex)
        const result = await page.render({
          scale: renderScale * dpr,
          render: 'bitmap' as const,
        })

        if (cancelled) return

        // Data is already RGBA (library uses REVERSE_BYTE_ORDER flag)
        const imgData = new ImageData(
          new Uint8ClampedArray(result.data.buffer, result.data.byteOffset, result.data.byteLength),
          result.width,
          result.height,
        )

        offscreenFull = document.createElement('canvas')
        offscreenFull.width = result.width
        offscreenFull.height = result.height
        const offCtx = offscreenFull.getContext('2d')
        if (!offCtx) return
        offCtx.putImageData(imgData, 0, 0)

        offscreenCacheRef.current = {
          canvas: offscreenFull,
          renderScale,
          pxW: result.width,
          pxH: result.height,
        }
      }

      if (cancelled) return

      // ── Blit visible clip from full-page render to display canvas ──
      const offscreen = document.createElement('canvas')

      if (fullPageFits) {
        // Full page fits — display it directly
        offscreen.width = Math.round(canvasWidth * dpr)
        offscreen.height = Math.round(canvasHeight * dpr)
        const ctx = offscreen.getContext('2d')
        if (!ctx) return
        ctx.drawImage(offscreenFull, 0, 0, offscreen.width, offscreen.height)
      } else {
        // Viewport clipping — map clip region to source coordinates in the
        // rendered bitmap, then draw with upscaling if needed
        const scaleRatio = renderScale / scale // <1 when zoom > maxRenderScale
        const srcX = clipLeft * scaleRatio * dpr
        const srcY = clipTop * scaleRatio * dpr
        const srcW = clipW * scaleRatio * dpr
        const srcH = clipH * scaleRatio * dpr

        offscreen.width = Math.round(clipW * dpr)
        offscreen.height = Math.round(clipH * dpr)
        const ctx = offscreen.getContext('2d')
        if (!ctx) return
        ctx.drawImage(
          offscreenFull,
          srcX, srcY, srcW, srcH,
          0, 0, offscreen.width, offscreen.height,
        )
      }

      if (cancelled) return

      // ── Atomic swap ───────────────────────────────────────────────
      canvas.width = offscreen.width
      canvas.height = offscreen.height
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
        renderScale,
      }
    }

    render()
    return () => { cancelled = true }
  }, [documentRef, pageIndex, scale, widthPt, heightPt, containerRef, scrollVersion, canvasWidth, canvasHeight])

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
