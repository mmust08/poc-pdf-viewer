import { useState, useCallback, useRef } from 'react'
import Toolbar from '../components/shared/Toolbar'
import FabricViewer from '../components/fabric/FabricViewer'
import { useMarks } from '../hooks/useMarks'

export default function FabricPrototype() {
  const [pdfUrl, setPdfUrl] = useState('/sample-blueprint.pdf')
  const [pdfName, setPdfName] = useState('sample-blueprint.pdf')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const { marks, userMarkCount, addMark, clearUserMarks } = useMarks(currentPage)

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
        title={`Prototype 2 — Fabric.js · ${pdfName}`}
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
        <FabricViewer
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
