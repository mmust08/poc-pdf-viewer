import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { usePdfPageDataUrl } from '../../hooks/usePdfPage'
import { PdfMark, HARDCODED_MARKS } from '../../types/marks'

interface Props {
  pdfUrl: string
  marks: PdfMark[]
  isAdding: boolean
  onMarkAdded: (x: number, y: number) => void
}

const hardcodedIds = new Set(HARDCODED_MARKS.map((m) => m.id))

function makeIcon(label: string, isUser: boolean) {
  const dot = `
    background:${isUser ? 'rgba(80,180,255,0.9)' : 'rgba(255,80,80,0.9)'};
    width:20px;height:20px;border-radius:50%;border:2px solid white;
    flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,0.6);
  `
  const text = `
    background:rgba(0,0,0,0.7);color:white;
    font:bold 12px/1 system-ui,sans-serif;
    padding:2px 6px;border-radius:4px;white-space:nowrap;
  `
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;gap:6px;transform:translate(-50%,-50%)">
             <div style="${dot}"></div>
             <span style="${text}">${label}</span>
           </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

export default function LeafletViewer({ pdfUrl, marks, isAdding, onMarkAdded }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  // Keep latest values accessible in stable Leaflet event handlers
  const isAddingRef = useRef(isAdding)
  const onMarkAddedRef = useRef(onMarkAdded)
  const geometryRef = useRef({ pageWidthPt: 0, pageHeightPt: 0, canvasWidthPx: 0, canvasHeightPx: 0 })
  const markLayersRef = useRef<L.Layer[]>([])

  isAddingRef.current = isAdding
  onMarkAddedRef.current = onMarkAdded

  const { dataUrl, pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx, isLoading, error } =
    usePdfPageDataUrl(pdfUrl, 1.5)

  geometryRef.current = { pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx }

  // Initialize Leaflet map once
  useEffect(() => {
    const el = containerRef.current
    if (!el || mapRef.current) return

    const map = L.map(el, {
      crs: L.CRS.Simple,
      zoomSnap: 0.1,
      zoomDelta: 0.5,
      minZoom: -3,
      maxZoom: 4,
      attributionControl: false,
    })

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!isAddingRef.current) return
      const { pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx } = geometryRef.current
      if (!canvasWidthPx) return
      // CRS.Simple: lat = Y (increases upward), lng = X
      const pdfX = e.latlng.lng / (canvasWidthPx / pageWidthPt)
      const pdfY = e.latlng.lat / (canvasHeightPx / pageHeightPt)
      onMarkAddedRef.current(pdfX, pdfY)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update cursor style on the map container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.style.cursor = isAdding ? 'crosshair' : ''
  }, [isAdding])

  // Load image overlay when PDF data URL changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !dataUrl || !pageWidthPt) return

    // Remove all layers
    map.eachLayer((layer) => map.removeLayer(layer))
    markLayersRef.current = []

    const bounds: L.LatLngBoundsLiteral = [[0, 0], [canvasHeightPx, canvasWidthPx]]
    L.imageOverlay(dataUrl, bounds).addTo(map)
    map.fitBounds(bounds)
  }, [dataUrl, pageWidthPt, canvasWidthPx, canvasHeightPx])

  // Re-render marks whenever marks array changes (separate from image overlay)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !pageWidthPt || !canvasWidthPx) return

    // Remove only mark layers, not the image overlay
    markLayersRef.current.forEach((l) => map.removeLayer(l))
    markLayersRef.current = []

    const scaleX = canvasWidthPx / pageWidthPt
    const scaleY = canvasHeightPx / pageHeightPt

    marks.forEach((mark) => {
      const lat = mark.y * scaleY
      const lng = mark.x * scaleX
      const isUser = !hardcodedIds.has(mark.id)
      const marker = L.marker([lat, lng], { icon: makeIcon(mark.label, isUser) }).addTo(map)
      markLayersRef.current.push(marker)
    })
  }, [marks, pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {isLoading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: 'white', zIndex: 1000 }}>
          Loading PDF…
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'red', zIndex: 1000 }}>
          Error: {error}
        </div>
      )}
      {isAdding && (
        <div style={{
          position: 'absolute', top: '0.5rem', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(26,107,58,0.9)', color: '#4ade80', padding: '0.3rem 1rem',
          borderRadius: 6, fontSize: '0.85rem', fontWeight: 600, zIndex: 1000, pointerEvents: 'none',
        }}>
          Click anywhere on the PDF to place a mark
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#555' }} />
    </div>
  )
}
