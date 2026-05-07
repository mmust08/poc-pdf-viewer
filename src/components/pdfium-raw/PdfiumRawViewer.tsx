import { useRef, useState, useCallback } from 'react'
import { useMarks } from './useMarks'
import MarksOverlay from './MarksOverlay'
import { useWorker } from './useWorker'
import { useZoom } from './useZoom'
import { usePan } from './usePan'
import { useVirtualization } from './useVirtualization'
import { PdfiumToolbar } from './PdfiumToolbar'
import { PageCanvas } from './PageCanvas'

const PAGE_GAP = 12

interface PageGeometry {
  widthPt: number
  heightPt: number
}

export default function PdfiumRawViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingNameRef = useRef('sample-blueprint.pdf')

  const [pdfName, setPdfName] = useState('sample-blueprint.pdf')
  const [pageGeometries, setPageGeometries] = useState<PageGeometry[]>([])
  const [docVersion, setDocVersion] = useState(0)
  const [maxScale, setMaxScale] = useState(50)

  const { scale, setScale, zoomPercent, handleZoom } = useZoom({ containerRef, maxScale })
  const { isPanning, handlePanStart, handlePanMove, handlePanEnd } = usePan({ containerRef })

  const onDocumentLoaded = useCallback((geometries: PageGeometry[], maxScaleVal: number) => {
    setPageGeometries(geometries)
    setMaxScale(maxScaleVal)
    const name = pendingNameRef.current
    setPdfName(name)

    if (geometries.length > 0 && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 32
      setScale(containerWidth / geometries[0].widthPt)
    }

    restoreMarksRef.current(name)
    setDocVersion((v) => v + 1)
  }, [setScale])

  const { requestRender, loading, error, rendering, loadBuffer, retry } = useWorker({
    createWorker: () => new Worker(new URL('./pdfium.worker.ts', import.meta.url), { type: 'module' }),
    onDocumentLoaded,
    defaultUrl: `${window.location.origin}${import.meta.env.BASE_URL}sample-blueprint.pdf`,
  })

  const { userMarks, addMark, clearMarks, restoreMarks, saveAndReset, getMarksForPage } =
    useMarks(pdfName, loading)

  const restoreMarksRef = useRef(restoreMarks)
  restoreMarksRef.current = restoreMarks

  const pageCount = pageGeometries.length

  const { currentPage, scrollVersion, visibleRange, handleScroll } = useVirtualization({
    containerRef, pageGeometries, scale,
  })

  const [visFirstPage, visLastPage] = visibleRange

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    saveAndReset()
    setPageGeometries([])

    pendingNameRef.current = file.name
    const buf = await file.arrayBuffer()
    loadBuffer(buf, window.devicePixelRatio || 1)
    e.target.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <PdfiumToolbar
        pdfName={pdfName}
        currentPage={currentPage}
        pageCount={pageCount}
        zoomPercent={zoomPercent}
        rendering={rendering}
        userMarkCount={userMarks.length}
        onZoom={handleZoom}
        onUploadClick={() => fileInputRef.current?.click()}
        onClearMarks={clearMarks}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div
        ref={containerRef}
        className="pdfium-container"
        onScroll={handleScroll}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        style={{
          flex: 1,
          overflow: 'auto',
          background: 'var(--clr-canvas-bg)',
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
              color: error ? '#C47070' : 'var(--clr-text-secondary)',
              zIndex: 10,
              textAlign: 'center',
            }}
          >
            {error ? (
              <>
                <div>{error}</div>
                <button
                  onClick={retry}
                  style={{
                    marginTop: 12,
                    padding: '8px 20px',
                    background: 'rgba(160, 60, 60, 0.12)',
                    color: '#C47070',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Retry
                </button>
              </>
            ) : (
              'Loading PDFium engine…'
            )}
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
                docVersion={docVersion}
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
