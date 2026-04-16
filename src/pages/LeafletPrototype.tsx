import { useState, useCallback } from 'react'
import Toolbar from '../components/shared/Toolbar'
import LeafletViewer from '../components/leaflet/LeafletViewer'
import { useMarks } from '../hooks/useMarks'

export default function LeafletPrototype() {
  const [pdfUrl, setPdfUrl] = useState('/sample-blueprint.pdf')
  const [pdfName, setPdfName] = useState('sample-blueprint.pdf')
  const [isAdding, setIsAdding] = useState(false)
  const { marks, userMarkCount, addMark, clearUserMarks } = useMarks()

  const handleMarkAdded = useCallback((x: number, y: number) => {
    addMark(x, y)
  }, [addMark])

  function handlePdfLoaded(url: string, name: string) {
    setPdfUrl(url)
    setPdfName(name)
    setIsAdding(false)
    clearUserMarks()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Toolbar
        title={`Prototype 3 — Leaflet.js · ${pdfName}`}
        hint={isAdding ? undefined : 'Scroll to zoom · Drag to pan'}
        isAdding={isAdding}
        onToggleAdding={() => setIsAdding((v) => !v)}
        userMarkCount={userMarkCount}
        onClearUserMarks={clearUserMarks}
        onPdfLoaded={handlePdfLoaded}
      />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <LeafletViewer
          pdfUrl={pdfUrl}
          marks={marks}
          isAdding={isAdding}
          onMarkAdded={handleMarkAdded}
        />
      </div>
    </div>
  )
}
