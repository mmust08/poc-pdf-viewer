import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../ThemeToggle'
import NutrientSDK from '@nutrient-sdk/viewer'
import { useNutrientInstance } from './useNutrientInstance'
import { useMarks } from './useMarks'
import { pdfYToNutrient, nutrientYToPdf } from './coordConversion'
import MarksSidebar from './MarksSidebar'
import type { PdfMark } from '../../types/marks'

const DEFAULT_PDF = `${import.meta.env.BASE_URL}sample-blueprint.pdf`
const MARK_SIZE = 24

const LICENSE_KEY = typeof import.meta !== 'undefined'
  ? (import.meta as unknown as { env: Record<string, string> }).env.VITE_NUTRIENT_LICENSE_KEY
  : undefined

export default function NutrientViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const annotationMapRef = useRef<Map<string, string>>(new Map())

  const [pdfUrl, setPdfUrl] = useState(DEFAULT_PDF)
  const [pdfName, setPdfName] = useState('sample-blueprint.pdf')
  const [isAdding, setIsAdding] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const { instance, loading, error, getPageHeight, documentFormat } =
    useNutrientInstance(containerRef, pdfUrl, LICENSE_KEY)

  const handleZoomIn = useCallback(() => {
    if (!instance) return
    const next = instance.currentZoomLevel * 1.1
    if (next <= instance.maximumZoomLevel) {
      instance.setViewState((v) => v.set('zoom', next))
    }
  }, [instance])

  const handleZoomOut = useCallback(() => {
    if (!instance) return
    const next = instance.currentZoomLevel / 1.1
    if (next >= instance.minimumZoomLevel) {
      instance.setViewState((v) => v.set('zoom', next))
    }
  }, [instance])

  const handleFitWidth = useCallback(() => {
    if (!instance) return
    instance.setViewState((v) => v.set('zoom', NutrientSDK.ZoomMode.FIT_TO_WIDTH))
  }, [instance])

  const handleFitPage = useCallback(() => {
    if (!instance) return
    instance.setViewState((v) => v.set('zoom', NutrientSDK.ZoomMode.FIT_TO_VIEWPORT))
  }, [instance])

  const {
    userMarks, addMark, deleteMark, clearMarks,
    restoreMarks, saveAndReset, getAllMarks, exportMarksJSON,
  } = useMarks(pdfName, loading)

  const allMarks = useMemo(() => getAllMarks(), [getAllMarks])

  // Restore persisted marks when a new PDF loads
  useEffect(() => {
    if (!loading) restoreMarks(pdfName)
  }, [pdfName, loading])

  // Sync all marks as NoteAnnotations whenever instance or marks change
  useEffect(() => {
    if (!instance || loading) return

    const allMarks = getAllMarks()

    async function syncAnnotations() {
      const currentMap = annotationMapRef.current
      const desiredIds = new Set(allMarks.map((m) => m.id))

      // Remove annotations for marks that no longer exist
      for (const [markId, annotationId] of currentMap.entries()) {
        if (!desiredIds.has(markId)) {
          try { await instance!.delete(annotationId) } catch { /* already gone */ }
          currentMap.delete(markId)
        }
      }

      // Create annotations for new marks
      for (const mark of allMarks) {
        if (currentMap.has(mark.id)) continue
        try {
          const pageHeight = getPageHeight(mark.page - 1)
          const nutrientY = pdfYToNutrient(mark.y, pageHeight)
          const isHardcoded = mark.id.startsWith('M')

          const annotation = new NutrientSDK.Annotations.NoteAnnotation({
            pageIndex: mark.page - 1,
            boundingBox: new NutrientSDK.Geometry.Rect({
              left: mark.x - MARK_SIZE / 2,
              top: nutrientY - MARK_SIZE / 2,
              width: MARK_SIZE,
              height: MARK_SIZE,
            }),
            text: { format: 'plain' as const, value: `${mark.label}\n(${Math.round(mark.x)}, ${Math.round(mark.y)})` },
            color: isHardcoded
              ? new NutrientSDK.Color({ r: 239, g: 68, b: 68 })
              : new NutrientSDK.Color({ r: 59, g: 130, b: 246 }),
            icon: 'COMMENT' as const,
          })

          const created = await instance!.create(annotation)
          if (created?.[0]) {
            const createdAnnotation = created[0] as InstanceType<typeof NutrientSDK.Annotations.NoteAnnotation>
            currentMap.set(mark.id, createdAnnotation.id as unknown as string)
          }
        } catch (err) {
          console.warn(`Failed to create annotation for mark ${mark.id}:`, err)
        }
      }
    }

    syncAnnotations()
  }, [instance, loading, getAllMarks, getPageHeight])

  // Wire up page.press for adding marks
  const isAddingRef = useRef(isAdding)
  isAddingRef.current = isAdding

  useEffect(() => {
    if (!instance) return

    const handler = (event: { pageIndex: number; point: { x: number; y: number } }) => {
      if (!isAddingRef.current) return
      const pageHeight = getPageHeight(event.pageIndex)
      const pdfX = event.point.x
      const pdfY = nutrientYToPdf(event.point.y, pageHeight)
      addMark(event.pageIndex + 1, pdfX, pdfY)
    }

    instance.addEventListener('page.press', handler)
    return () => {
      try { instance.removeEventListener('page.press', handler) } catch { /* instance gone */ }
    }
  }, [instance, getPageHeight, addMark])

  const navigateToMark = useCallback((mark: PdfMark) => {
    if (!instance) return
    const pageHeight = getPageHeight(mark.page - 1)
    const nutrientY = pdfYToNutrient(mark.y, pageHeight)
    instance.jumpToRect(
      mark.page - 1,
      new NutrientSDK.Geometry.Rect({
        left: mark.x - 150,
        top: nutrientY - 150,
        width: 300,
        height: 300,
      }),
    )
  }, [instance, getPageHeight])

  const handleDeleteMark = useCallback((markId: string) => {
    const annotationId = annotationMapRef.current.get(markId)
    if (annotationId && instance) {
      instance.delete(annotationId).catch(() => {})
    }
    annotationMapRef.current.delete(markId)
    deleteMark(markId)
  }, [instance, deleteMark])

  const handleClearAll = useCallback(() => {
    // Remove all user annotations from the viewer
    for (const [markId, annotationId] of annotationMapRef.current.entries()) {
      if (!markId.startsWith('M') && instance) {
        instance.delete(annotationId).catch(() => {})
      }
    }
    // Clean up map for user marks only
    for (const key of [...annotationMapRef.current.keys()]) {
      if (!key.startsWith('M')) annotationMapRef.current.delete(key)
    }
    clearMarks()
  }, [instance, clearMarks])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    saveAndReset()
    annotationMapRef.current.clear()
    const url = URL.createObjectURL(file)
    setPdfUrl(url)
    setPdfName(file.name)
    e.target.value = ''
  }

  function handleExport() {
    const json = exportMarksJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `marks-${pdfName.replace(/\.pdf$/i, '')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Toolbar */}
      <header
        style={{
          background: 'var(--clr-toolbar-bg)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          padding: '0.55rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          borderBottom: '1px solid var(--clr-toolbar-border)',
          boxShadow: 'var(--clr-toolbar-shadow)',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <Link to="/" style={{ color: 'var(--clr-accent-500)', flexShrink: 0, fontSize: '0.875rem', fontWeight: 500 }}>
          ← Back
        </Link>
        <h2 style={{ margin: 0, fontSize: '0.875rem', flexShrink: 0, color: 'var(--clr-text-secondary)', fontWeight: 500 }}>
          Prototype 6 — Nutrient SDK
        </h2>

        {pdfName !== 'sample-blueprint.pdf' && (
          <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>{pdfName}</span>
        )}

        {documentFormat && (
          <span style={{
            background: 'rgba(78, 110, 126, 0.08)',
            color: 'var(--clr-accent-500)',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '0.18rem 0.55rem',
            borderRadius: 4,
            border: '1px solid rgba(78, 110, 126, 0.18)',
            letterSpacing: '0.02em',
          }}>
            {documentFormat}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Upload PDF */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button onClick={() => fileInputRef.current?.click()} style={btnStyle('#2a4080')}>
          Upload PDF
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--clr-divider)' }} />

        {/* Zoom controls */}
        <button onClick={handleZoomOut} style={btnStyle('#2a4080')} title="Zoom out">
          −
        </button>
        <ZoomDisplay instance={instance} />
        <button onClick={handleZoomIn} style={btnStyle('#2a4080')} title="Zoom in">
          +
        </button>
        <button onClick={handleFitWidth} style={btnStyle('#2a4080')} title="Fit to width">
          Fit W
        </button>
        <button onClick={handleFitPage} style={btnStyle('#2a4080')} title="Fit full page">
          Fit Page
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--clr-divider)' }} />

        {/* Add mark toggle */}
        <button
          onClick={() => setIsAdding((v) => !v)}
          style={btnStyle(isAdding ? '#1a6b3a' : '#2a4080', isAdding ? '#4ade80' : undefined)}
        >
          {isAdding ? 'Adding… (click PDF)' : 'Add Mark'}
        </button>

        {userMarks.length > 0 && (
          <>
            <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>
              {userMarks.length} user mark{userMarks.length !== 1 ? 's' : ''}
            </span>
            <button onClick={handleClearAll} style={btnStyle('#6b1a1a')}>
              Clear all
            </button>
          </>
        )}

        <button onClick={handleExport} style={btnStyle('#2a4080')}>
          Export JSON
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--clr-divider)' }} />

        <button onClick={() => setSidebarOpen((v) => !v)} style={btnStyle('#2a4080')}>
          {sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        </button>

        <ThemeToggle />
      </header>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Nutrient container */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            height: '100%',
            contain: 'layout style paint',
            cursor: isAdding ? 'crosshair' : undefined,
          }}
        />

        {/* Error overlay */}
        {error && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(248, 113, 113, 0.08)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            color: '#f87171',
            padding: '1.5rem 2rem',
            borderRadius: 12,
            maxWidth: 500,
            zIndex: 100,
          }}>
            <strong style={{ color: '#fca5a5' }}>Error loading PDF</strong>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#f87171' }}>{error}</p>
          </div>
        )}

        {/* Loading overlay */}
        {loading && !error && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'var(--clr-text-secondary)',
            background: 'var(--clr-toolbar-bg)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid var(--clr-toolbar-border)',
            padding: '0.5rem 1.25rem',
            borderRadius: 8,
            fontSize: '0.875rem',
            zIndex: 100,
            whiteSpace: 'nowrap' as const,
          }}>
            Loading PDF…
          </div>
        )}

        {/* Sidebar */}
        {sidebarOpen && (
          <MarksSidebar
            marks={allMarks}
            onNavigate={navigateToMark}
            onDelete={handleDeleteMark}
          />
        )}
      </div>
    </div>
  )
}

const ZOOM_DEBOUNCE_MS = 150

function ZoomDisplay({ instance }: { instance: InstanceType<typeof NutrientSDK.Instance> | null }) {
  const [zoom, setZoom] = useState(1)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!instance) return
    setZoom(instance.currentZoomLevel)
    const handler = (z: number) => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setZoom(z), ZOOM_DEBOUNCE_MS)
    }
    instance.addEventListener('viewState.zoom.change', handler)
    return () => {
      clearTimeout(timerRef.current)
      try { instance.removeEventListener('viewState.zoom.change', handler) } catch { /* gone */ }
    }
  }, [instance])

  return (
    <span style={{ color: 'var(--clr-text-secondary)', fontSize: '0.83rem', minWidth: 48, textAlign: 'center' }}>
      {Math.round(zoom * 100)}%
    </span>
  )
}

function btnStyle(bg: string, color?: string): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 5,
    padding: '0.32rem 0.7rem',
    cursor: 'pointer',
    fontSize: '0.83rem',
    fontWeight: 500,
    flexShrink: 0,
  }
  if (bg === '#6b1a1a') {
    return { ...base, background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.18)' }
  }
  if (bg === '#1a6b3a') {
    return { ...base, background: 'rgba(52, 211, 153, 0.12)', color: color ?? '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)' }
  }
  return { ...base, background: 'rgba(78, 110, 126, 0.08)', color: color ?? 'var(--clr-accent-500)', border: '1px solid rgba(78, 110, 126, 0.18)' }
}
