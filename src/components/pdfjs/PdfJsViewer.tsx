import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { PdfMark, HARDCODED_MARKS } from '../../types/marks'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker as string

const ZOOM_FACTOR = 1.25
const MIN_SCALE = 0.25
const MAX_SCALE = 5
const CLICK_THRESHOLD_SQ = 25
const PAGE_GAP = 12
const hardcodedIds = new Set(HARDCODED_MARKS.map((m) => m.id))

interface PageGeometry {
  widthPt: number
  heightPt: number
}

export default function PdfJsViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)

  const [pdfUrl, setPdfUrl] = useState('/sample-blueprint.pdf')
  const [pdfName, setPdfName] = useState('sample-blueprint.pdf')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [pageGeometries, setPageGeometries] = useState<PageGeometry[]>([])
  const [scale, setScale] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [userMarks, setUserMarks] = useState<PdfMark[]>([])
  const [loading, setLoading] = useState(true)

  const pageCount = pageGeometries.length
  const zoomPercent = Math.round(scale * 100)

  // Load PDF document and compute fit-to-width scale
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
          const [x0, y0, x1, y1] = page.view
          geometries.push({ widthPt: x1 - x0, heightPt: y1 - y0 })
        }
        if (cancelled) return

        setPdfDoc(doc)
        setPageGeometries(geometries)

        // Fit first page to container width
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

  // Detect current page from scroll position
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (pageGeometries.length === 0) return
    const scrollCenter = e.currentTarget.scrollTop + e.currentTarget.clientHeight / 3
    let cumHeight = 0
    for (let i = 0; i < pageGeometries.length; i++) {
      cumHeight += pageGeometries[i].heightPt * scale + PAGE_GAP
      if (scrollCenter < cumHeight) {
        setCurrentPage(i + 1)
        return
      }
    }
    setCurrentPage(pageGeometries.length)
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
          <button
            onClick={() => setScale((s) => Math.max(MIN_SCALE, s / ZOOM_FACTOR))}
            style={btnStyle}
            title="Zoom out"
          >
            −
          </button>
          <span style={{ color: '#e0e0e0', fontSize: '0.85rem', minWidth: 45, textAlign: 'center' }}>
            {zoomPercent}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(MAX_SCALE, s * ZOOM_FACTOR))}
            style={btnStyle}
            title="Zoom in"
          >
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
          Click to place mark · Scroll to navigate
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
          pageGeometries.map((geo, i) => (
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
            />
          ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Per-page canvas renderer                                          */
/* ------------------------------------------------------------------ */

function PageCanvas({
  pdfDoc,
  pageNumber,
  scale,
  widthPt,
  heightPt,
  marks,
  onMarkAdded,
  pointerDownRef,
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
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const canvasWidth = Math.round(widthPt * scale)
  const canvasHeight = Math.round(heightPt * scale)

  // Render page to canvas when doc or scale changes
  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfDoc.getPage(pageNumber).then((page: any) => {
      if (cancelled) return
      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      page.render({ canvasContext: ctx, viewport }).promise.catch(() => {})
    })
    return () => {
      cancelled = true
    }
  }, [pdfDoc, pageNumber, scale])

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    // Ignore if the pointer moved (drag / scroll gesture)
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
      style={{ position: 'relative', width: canvasWidth, margin: `0 auto ${PAGE_GAP}px` }}
      onPointerDown={(e) => {
        pointerDownRef.current = { x: e.clientX, y: e.clientY }
      }}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />

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
