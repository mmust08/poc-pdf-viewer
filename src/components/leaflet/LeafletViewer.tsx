import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { usePdfPageDataUrl } from '../../hooks/usePdfPage'
import { HARDCODED_MARKS } from '../../types/marks'

interface Props {
  pdfUrl: string
}

export default function LeafletViewer({ pdfUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  const { dataUrl, pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx, isLoading, error } =
    usePdfPageDataUrl(pdfUrl, 1.5)

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

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Load image overlay and marks once PDF data URL is ready
  useEffect(() => {
    const map = mapRef.current
    if (!map || !dataUrl || !pageWidthPt) return

    // Remove all existing layers
    map.eachLayer((layer) => map.removeLayer(layer))

    // In Leaflet CRS.Simple with no projection:
    //   [lat, lng] maps to [y, x] on screen
    //   Y increases upward (south is 0, north is pageHeightPx)
    // We place the image filling [[0, 0], [pageHeightPx, pageWidthPx]]
    const bounds: L.LatLngBoundsLiteral = [
      [0, 0],
      [canvasHeightPx, canvasWidthPx],
    ]

    L.imageOverlay(dataUrl, bounds).addTo(map)
    map.fitBounds(bounds)

    const scaleX = canvasWidthPx / pageWidthPt
    const scaleY = canvasHeightPx / pageHeightPt

    HARDCODED_MARKS.forEach((mark) => {
      // Convert PDF coords → Leaflet CRS.Simple coords
      // PDF Y origin=bottom, Leaflet Y increases upward from 0
      const lat = mark.y * scaleY
      const lng = mark.x * scaleX

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            gap: 6px;
            transform: translate(-50%, -50%);
          ">
            <div style="
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: rgba(255,80,80,0.9);
              border: 2px solid white;
              flex-shrink: 0;
              box-shadow: 0 1px 4px rgba(0,0,0,0.6);
            "></div>
            <span style="
              background: rgba(0,0,0,0.7);
              color: white;
              font: bold 12px/1 system-ui, sans-serif;
              padding: 2px 6px;
              border-radius: 4px;
              white-space: nowrap;
            ">${mark.label}</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      L.marker([lat, lng], { icon }).addTo(map)
    })
  }, [dataUrl, pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx])

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
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#555' }} />
    </div>
  )
}
