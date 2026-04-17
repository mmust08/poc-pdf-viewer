import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Viewport } from '@embedpdf/plugin-viewport/react'
import { Scroller, useScroll } from '@embedpdf/plugin-scroll/react'
import { RenderLayer } from '@embedpdf/plugin-render/react'
import { useZoom, ZoomGestureWrapper } from '@embedpdf/plugin-zoom/react'
import { useDocumentManagerCapability } from '@embedpdf/plugin-document-manager/react'
import { HARDCODED_MARKS, PdfMark } from '../../types/marks'

const CLICK_THRESHOLD_SQ = 25 // 5px movement threshold to distinguish click from drag
const hardcodedIds = new Set(HARDCODED_MARKS.map((m) => m.id))

interface Props {
  documentId: string
}

export default function EmbedPdfViewer({ documentId }: Props) {
  const { provides: docManager } = useDocumentManagerCapability()
  const { state: zoomState, provides: zoomScope } = useZoom(documentId)
  const { state: scrollState } = useScroll(documentId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)
  const [userMarks, setUserMarks] = useState<PdfMark[]>([])

  const doc = docManager?.getDocument(documentId)
  const zoomPercent = Math.round((zoomState?.currentZoomLevel ?? 1) * 100)

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
    const reader = new FileReader()
    reader.onload = () => {
      docManager?.openDocumentBuffer({
        buffer: reader.result as ArrayBuffer,
        name: file.name,
        autoActivate: true,
      })
    }
    reader.readAsArrayBuffer(file)
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
          Prototype 4 — embedPdf (Headless)
        </h2>

        <div style={{ flex: 1 }} />

        {/* Page info */}
        {scrollState && scrollState.totalPages > 0 && (
          <span style={{ color: '#aaa', fontSize: '0.85rem', flexShrink: 0 }}>
            Page {scrollState.currentPage} / {scrollState.totalPages}
          </span>
        )}

        <div style={{ width: 1, height: 24, background: '#2a4080' }} />

        {/* Zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
          <button onClick={() => zoomScope?.zoomOut()} style={btnStyle} title="Zoom out">
            −
          </button>
          <span style={{ color: '#e0e0e0', fontSize: '0.85rem', minWidth: 45, textAlign: 'center' }}>
            {zoomPercent}%
          </span>
          <button onClick={() => zoomScope?.zoomIn()} style={btnStyle} title="Zoom in">
            +
          </button>
        </div>

        <div style={{ width: 1, height: 24, background: '#2a4080' }} />

        {/* PDF upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={btnStyle}
          title="Upload a PDF file from your computer"
        >
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
              title="Remove all user-placed marks"
            >
              Clear all
            </button>
          </>
        )}

        <span style={{ color: '#555', fontSize: '0.8rem', flexShrink: 0 }}>
          Click to place mark · Ctrl+Scroll to zoom · Drag to pan
        </span>
      </header>

      {/* PDF Viewer */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Viewport documentId={documentId} style={{ width: '100%', height: '100%', backgroundColor: '#555' }}>
          <ZoomGestureWrapper documentId={documentId} style={{ width: '100%', height: '100%' }}>
            <Scroller
              documentId={documentId}
              renderPage={({ width, height, pageIndex, pageNumber }) => {
                const pageSize = doc?.pages[pageIndex]?.size
                const marksForPage = [
                  ...HARDCODED_MARKS.filter((m) => m.page === pageNumber),
                  ...userMarks.filter((m) => m.page === pageNumber),
                ]

                return (
                  <div
                    style={{ width, height, position: 'relative' }}
                    onPointerDown={(e) => {
                      pointerDownRef.current = { x: e.clientX, y: e.clientY }
                    }}
                    onClick={(e) => {
                      if (!pageSize) return
                      // Distinguish click from drag: ignore if pointer moved more than threshold
                      if (pointerDownRef.current) {
                        const dx = e.clientX - pointerDownRef.current.x
                        const dy = e.clientY - pointerDownRef.current.y
                        pointerDownRef.current = null
                        if (dx * dx + dy * dy > CLICK_THRESHOLD_SQ) return
                      }
                      const rect = e.currentTarget.getBoundingClientRect()
                      const relX = e.clientX - rect.left
                      const relY = e.clientY - rect.top
                      const pdfX = relX * (pageSize.width / rect.width)
                      const pdfY = pageSize.height - relY * (pageSize.height / rect.height)
                      addMark(pageNumber, pdfX, pdfY)
                    }}
                  >
                    <RenderLayer
                      documentId={documentId}
                      pageIndex={pageIndex}
                      style={{ width: '100%', height: '100%', display: 'block' }}
                    />
                    {pageSize && marksForPage.length > 0 && (
                      <svg
                        width={width}
                        height={height}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          pointerEvents: 'none',
                          overflow: 'visible',
                        }}
                      >
                        {marksForPage.map((mark) => {
                          const cx = mark.x * (width / pageSize.width)
                          const cy = (pageSize.height - mark.y) * (height / pageSize.height)
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
              }}
            />
          </ZoomGestureWrapper>
        </Viewport>
      </div>
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
