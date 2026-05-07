import { useRef, useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { useMarks } from './useMarks'
import MarksOverlay from './MarksOverlay'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker as string

const MIN_SCALE = 0.1
const MAX_SCALE = 50 // 5 000 %
// Predefined step list: 10pp increments up to 100%, then Firefox-style above
const ZOOM_STEPS = [
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
  1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0, 10.0, 50.0,
]
const CONTAINER_H_PADDING = 32
const CONTAINER_V_PADDING = 16
const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200, 300, 400] as const

type ZoomMode = 'page-width' | 'page-fit' | 'auto' | 'actual-size' | 'custom'

function computeScaleForMode(
  mode: ZoomMode,
  containerWidth: number,
  containerHeight: number,
  firstPageWidth: number,
  firstPageHeight: number,
): number {
  switch (mode) {
    case 'page-width':  return (containerWidth - CONTAINER_H_PADDING) / firstPageWidth
    case 'page-fit':    return Math.min(
                          (containerWidth  - CONTAINER_H_PADDING) / firstPageWidth,
                          (containerHeight - CONTAINER_V_PADDING) / firstPageHeight
                        )
    case 'auto':        return Math.max(
                          (containerWidth  - CONTAINER_H_PADDING) / firstPageWidth,
                          (containerHeight - CONTAINER_V_PADDING) / firstPageHeight
                        )
    case 'actual-size': return 1
    default:            return (containerWidth - CONTAINER_H_PADDING) / firstPageWidth
  }
}
const MAX_CANVAS_DIM = 16384 // max canvas pixels per axis (browser limit)
const PAGE_GAP = 12

// Dynamic pre-render margin: fraction of viewport dimension, with a floor.
const MARGIN_FRACTION = 0.75
const MARGIN_MIN_PX = 800

// Skip-render threshold: don't re-render if the viewport edge is still this
// far inside the already-rendered region.
const RERENDER_THRESHOLD_PX = 200
const ZOOM_RENDER_DEBOUNCE_MS = 150

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
  anchorViewportX?: number // pointer offset for wheel zoom
  anchorViewportY?: number
}

export default function PdfJsViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRafRef = useRef<number | null>(null)
  const pendingZoomRef = useRef<PendingZoom | null>(null)
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null)

  const [isPanning, setIsPanning] = useState(false)

  const [pdfUrl, setPdfUrl] = useState(`${import.meta.env.BASE_URL}sample-blueprint.pdf`)
  const [pdfName, setPdfName] = useState('sample-blueprint.pdf')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [pageGeometries, setPageGeometries] = useState<PageGeometry[]>([])
  const [scale, setScale] = useState(1)
  const [zoomMode, setZoomMode] = useState<ZoomMode>('page-width')
  const [zoomInputValue, setZoomInputValue] = useState('100')
  const [zoomInputFocused, setZoomInputFocused] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [scrollVersion, setScrollVersion] = useState(0)

  const { userMarks, addMark, clearMarks, restoreMarks, saveAndReset, getMarksForPage } =
    useMarks(pdfName, loading)

  const pageCount = pageGeometries.length
  const zoomPercent = Math.round(scale * 100)

  // ── Load PDF document and compute fit-to-width scale ──────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setCurrentPage(1)
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
          const newScale = computeScaleForMode(
            'page-width',
            containerRef.current.clientWidth,
            containerRef.current.clientHeight,
            geometries[0].widthPt,
            geometries[0].heightPt,
          )
          setZoomMode('page-width')
          zoomModeRef.current = 'page-width'
          setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale)))
        }

        restoreMarks(pdfName)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      loadingTask.destroy()
    }
  }, [pdfUrl, pdfName])

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

  // ── Sync zoom input display with scale (when not focused) ────────────
  useEffect(() => {
    if (!zoomInputFocused) {
      setZoomInputValue(String(Math.round(scale * 100)))
    }
  }, [scale, zoomInputFocused])

  // ── Ctrl+wheel / pinch zoom ──────────────────────────────────────────
  // Scale is read via a ref so we attach the listener once (non-passive to
  // preventDefault) without re-creating it on every scale change.
  const wheelScaleRef = useRef(scale)
  wheelScaleRef.current = scale

  const zoomModeRef = useRef<ZoomMode>('page-width')
  zoomModeRef.current = zoomMode

  const pageGeometriesRef = useRef<PageGeometry[]>([])
  pageGeometriesRef.current = pageGeometries

  const wheelZoomModeRef = useRef<ZoomMode>('page-width')
  wheelZoomModeRef.current = zoomMode

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return
      if (!container) return
      e.preventDefault()

      const oldScale = wheelScaleRef.current
      let newScale: number
      if (e.deltaY < 0) {
        newScale = ZOOM_STEPS.find((s) => s > oldScale + 1e-9) ?? MAX_SCALE
      } else {
        newScale = [...ZOOM_STEPS].reverse().find((s) => s < oldScale - 1e-9) ?? MIN_SCALE
      }
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))
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
      if (wheelZoomModeRef.current !== 'custom') {
        setZoomMode('custom')
        wheelZoomModeRef.current = 'custom'
      }
      setScale(newScale)
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── ResizeObserver: recompute scale on container resize (named modes) ─
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      const mode = zoomModeRef.current
      if (mode === 'custom') return
      const geoms = pageGeometriesRef.current
      if (geoms.length === 0) return
      const newScale = computeScaleForMode(
        mode,
        container.clientWidth,
        container.clientHeight,
        geoms[0].widthPt,
        geoms[0].heightPt,
      )
      setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale)))
    })
    ro.observe(container)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Keyboard shortcuts: Ctrl++/−/0 ───────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (!e.ctrlKey && !e.metaKey) return
      if (e.key === '+' || e.key === '=' || e.key === 'Add') {
        e.preventDefault()
        handleZoom('in')
      } else if (e.key === '-' || e.key === 'Subtract') {
        e.preventDefault()
        handleZoom('out')
      } else if (e.key === '0') {
        e.preventDefault()
        setZoomMode('actual-size')
        zoomModeRef.current = 'actual-size'
        const container = containerRef.current
        if (container) {
          pendingZoomRef.current = {
            pdfX: (container.scrollLeft + container.clientWidth / 2) / scale,
            pdfY: (container.scrollTop + container.clientHeight / 2) / scale,
            newScale: 1,
          }
        }
        setScale(1)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [scale])

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
    // Only pan with the primary (left) mouse button
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

  // ── Zoom mode helpers ─────────────────────────────────────────────────
  function applyZoomMode(mode: ZoomMode) {
    const container = containerRef.current
    if (!container || mode === 'custom' || pageGeometries.length === 0) return
    const newScale = computeScaleForMode(
      mode,
      container.clientWidth,
      container.clientHeight,
      pageGeometries[0].widthPt,
      pageGeometries[0].heightPt,
    )
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))
    if (clamped === scale) return
    const pdfX = (container.scrollLeft + container.clientWidth / 2) / scale
    const pdfY = (container.scrollTop + container.clientHeight / 2) / scale
    pendingZoomRef.current = { pdfX, pdfY, newScale: clamped }
    setScale(clamped)
  }

  function handleZoomMode(newMode: ZoomMode) {
    setZoomMode(newMode)
    zoomModeRef.current = newMode
    applyZoomMode(newMode)
  }

  function commitZoomInput() {
    const parsed = parseInt(zoomInputValue, 10)
    const minPct = Math.round(MIN_SCALE * 100)
    const maxPct = Math.round(MAX_SCALE * 100)
    if (!isNaN(parsed) && parsed >= minPct && parsed <= maxPct) {
      const newScale = parsed / 100
      const container = containerRef.current
      if (container) {
        pendingZoomRef.current = {
          pdfX: (container.scrollLeft + container.clientWidth / 2) / scale,
          pdfY: (container.scrollTop + container.clientHeight / 2) / scale,
          newScale,
        }
      }
      setScale(newScale)
      setZoomMode('custom')
      zoomModeRef.current = 'custom'
    } else {
      setZoomInputValue(String(Math.round(scale * 100)))
    }
    setZoomInputFocused(false)
  }

  // ── Zoom handler (button zoom — centres on viewport) ─────────────────
  function handleZoom(direction: 'in' | 'out') {
    const container = containerRef.current
    if (!container) return

    setZoomMode('custom')
    zoomModeRef.current = 'custom'

    const oldScale = scale
    let newScale: number
    if (direction === 'in') {
      newScale = ZOOM_STEPS.find((s) => s > oldScale + 1e-9) ?? MAX_SCALE
    } else {
      newScale = [...ZOOM_STEPS].reverse().find((s) => s < oldScale - 1e-9) ?? MIN_SCALE
    }
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))
    if (newScale === oldScale) return

    const pdfX = (container.scrollLeft + container.clientWidth / 2) / oldScale
    const pdfY = (container.scrollTop + container.clientHeight / 2) / oldScale

    pendingZoomRef.current = { pdfX, pdfY, newScale }
    setScale(newScale)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    saveAndReset()
    setLoading(true)

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
          background: 'rgba(10, 9, 18, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '0.55rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <Link to="/" style={{ color: '#a78bfa', flexShrink: 0, fontSize: '0.875rem', fontWeight: 500 }}>
          ← Back
        </Link>
        <h2 style={{ margin: 0, fontSize: '0.875rem', flexShrink: 0, color: '#a9a7c0', fontWeight: 500 }}>
          Prototype 1.1 — PDF.js · {pdfName}
        </h2>
        <div style={{ flex: 1 }} />

        {pageCount > 0 && (
          <span style={{ color: '#67647c', fontSize: '0.82rem', flexShrink: 0 }}>
            Page {currentPage} / {pageCount}
          </span>
        )}

        <div style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.08)' }} />

        {/* Zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
          <button onClick={() => handleZoom('out')} style={btnStyle} title="Zoom out (Ctrl+−)">−</button>

          <input
            type="text"
            value={zoomInputValue}
            onFocus={(e) => { setZoomInputFocused(true); e.target.select() }}
            onBlur={commitZoomInput}
            onChange={(e) => setZoomInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { commitZoomInput(); (e.target as HTMLInputElement).blur() }
              if (e.key === 'Escape') {
                setZoomInputValue(String(Math.round(scale * 100)))
                setZoomInputFocused(false);
                (e.target as HTMLInputElement).blur()
              }
            }}
            style={{
              width: 40, textAlign: 'right',
              background: 'rgba(139, 92, 246, 0.08)', color: '#a9a7c0',
              border: '1px solid rgba(139, 92, 246, 0.2)', borderRight: 'none',
              borderRadius: '5px 0 0 5px', padding: '0.32rem 0.3rem 0.32rem 0.4rem',
              fontSize: '0.83rem', outline: 'none',
            }}
            title="Zoom level — type a value and press Enter"
          />
          <span style={{
            background: 'rgba(139, 92, 246, 0.08)', color: '#a9a7c0',
            border: '1px solid rgba(139, 92, 246, 0.2)', borderLeft: 'none', borderRight: 'none',
            padding: '0.32rem 0.2rem 0.32rem 0',
            fontSize: '0.83rem', lineHeight: '1.2', userSelect: 'none',
          }}>%</span>

          <select
            value={zoomMode === 'custom' ? '__custom__' : zoomMode}
            onChange={(e) => {
              const v = e.target.value
              if (v === '__custom__') return
              if (v.startsWith('__preset_')) {
                const pct = parseInt(v.replace('__preset_', ''), 10)
                const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pct / 100))
                const container = containerRef.current
                if (container) {
                  pendingZoomRef.current = {
                    pdfX: (container.scrollLeft + container.clientWidth / 2) / scale,
                    pdfY: (container.scrollTop + container.clientHeight / 2) / scale,
                    newScale,
                  }
                }
                setScale(newScale)
                setZoomMode('custom')
                zoomModeRef.current = 'custom'
              } else {
                handleZoomMode(v as ZoomMode)
              }
            }}
            style={{
              background: 'rgba(139, 92, 246, 0.1)', color: '#a9a7c0',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '0 5px 5px 0', padding: '0.32rem 0.3rem 0.32rem 0.2rem',
              fontSize: '0.83rem', cursor: 'pointer', outline: 'none',
            }}
            title="Zoom preset"
          >
            <option value="auto">Automatic Zoom</option>
            <option value="actual-size">Actual Size</option>
            <option value="page-fit">Page Fit</option>
            <option value="page-width">Page Width</option>
            <option disabled>──────────</option>
            {ZOOM_PRESETS.map((p) => (
              <option key={p} value={`__preset_${p}`}>{p}%</option>
            ))}
            {zoomMode === 'custom' && <option value="__custom__">{zoomPercent}%</option>}
          </select>

          <button onClick={() => handleZoom('in')} style={btnStyle} title="Zoom in (Ctrl++)">+</button>
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.08)' }} />

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
            <div style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.08)' }} />
            <span style={{ color: '#67647c', fontSize: '0.82rem' }}>
              {userMarks.length} user mark{userMarks.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={clearMarks}
              style={{ ...btnStyle, background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.18)' }}
              title="Remove all user marks"
            >
              Clear all
            </button>
          </>
        )}

        <span style={{ color: '#67647c', fontSize: '0.78rem', flexShrink: 0 }}>
          Click to place mark · Drag to pan · Ctrl+wheel to zoom · Ctrl+0 actual size
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
          background: '#3c3a48',
          padding: '8px 0',
          position: 'relative',
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
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
  containerRef,
  scrollVersion,
  children,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any
  pageNumber: number
  scale: number
  widthPt: number
  heightPt: number
  containerRef: React.RefObject<HTMLDivElement>
  scrollVersion: number
  children?: React.ReactNode
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
    let debounceTimer: ReturnType<typeof setTimeout> | undefined

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

      // ── Interim CSS rescale (eliminates white flash during zoom) ─────────
      // Stretch the old bitmap to visually approximate the new zoom level.
      // The atomic swap at the end of this effect will replace these values
      // with the correct crisp ones once the new render completes.
      const rrOld = renderedRegionRef.current
      if (rrOld && rrOld.scale !== scale) {
        const ratio = scale / rrOld.scale
        canvas.style.width  = `${(rrOld.clipRight - rrOld.clipLeft) * ratio}px`
        canvas.style.height = `${(rrOld.clipBottom - rrOld.clipTop) * ratio}px`
        canvas.style.left   = `${rrOld.clipLeft * ratio}px`
        canvas.style.top    = `${rrOld.clipTop * ratio}px`
      }

      // ── Debounce ─────────────────────────────────────────────────────────
      // Wait for rapid zoom events to settle before starting a full render.
      // The cleanup function cancels this timer if a newer effect fires.
      await new Promise<void>(resolve => {
        debounceTimer = setTimeout(resolve, ZOOM_RENDER_DEBOUNCE_MS)
      })
      if (cancelled) return

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
      if (debounceTimer !== undefined) clearTimeout(debounceTimer)
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
        renderTaskRef.current = null
      }
    }
  }, [pdfDoc, pageNumber, scale, scrollVersion, containerRef])

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
  background: 'rgba(139, 92, 246, 0.1)',
  color: '#a78bfa',
  border: '1px solid rgba(139, 92, 246, 0.2)',
  borderRadius: 5,
  padding: '0.32rem 0.7rem',
  cursor: 'pointer',
  fontSize: '0.83rem',
  fontWeight: 500,
  flexShrink: 0,
}
