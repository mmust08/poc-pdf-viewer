import { useState, useCallback, useRef } from 'react'
import Toolbar from '../components/shared/Toolbar'
import PdfJsViewer from '../components/pdfjs/PdfJsViewer'
import { useMarks } from '../hooks/useMarks'

export default function PdfJsPrototype() {
  const [pdfUrl, setPdfUrl] = useState('/sample-blueprint.pdf')
  const [pdfName, setPdfName] = useState('sample-blueprint.pdf')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const { marks, userMarkCount, addMark, clearUserMarks } = useMarks(currentPage)

  // Avoid re-render loops: only propagate pageCount changes
  const lastPageCount = useRef(0)
  function handlePageCountKnown(count: number) {
    if (count !== lastPageCount.current) {
      lastPageCount.current = count
      setPageCount(count)
    }
  }

  const handleMarkAdded = useCallback((x: number, y: number) => { addMark(x, y) }, [addMark])

  function handlePdfLoaded(url: string, name: string) {
    setPdfUrl(url)
    setPdfName(name)
    setCurrentPage(1)
    setPageCount(1)
    setIsAdding(false)
    clearUserMarks()
    lastPageCount.current = 0
  }

  function handlePageChange(page: number) {
    setCurrentPage(Math.max(1, Math.min(page, pageCount)))
    setIsAdding(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Toolbar
        title={`Prototype 1 — PDF.js + react-zoom-pan-pinch · ${pdfName}`}
        hint="Scroll to zoom · Drag to pan"
        currentPage={currentPage}
        pageCount={pageCount}
        onPageChange={handlePageChange}
        isAdding={isAdding}
        onToggleAdding={() => setIsAdding((v) => !v)}
        userMarkCount={userMarkCount}
        onClearUserMarks={clearUserMarks}
        onPdfLoaded={handlePdfLoaded}
      />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <PdfJsViewer
          pdfUrl={pdfUrl}
          pageNumber={currentPage}
          onPageCountKnown={handlePageCountKnown}
          marks={marks}
          isAdding={isAdding}
          onMarkAdded={handleMarkAdded}
        />
      </div>
    </div>
  )
}
