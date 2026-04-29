import { useEffect, useRef, useState, useCallback } from 'react'
import NutrientViewer from '@nutrient-sdk/viewer'

NutrientViewer.preloadWorker({ useCDN: true })

interface PageGeometry {
  widthPt: number
  heightPt: number
}

interface UseNutrientInstanceResult {
  instance: InstanceType<typeof NutrientViewer.Instance> | null
  loading: boolean
  error: string | null
  pageCount: number
  getPageHeight: (pageIndex: number) => number
}

export function useNutrientInstance(
  containerRef: React.RefObject<HTMLDivElement | null>,
  documentUrl: string,
  licenseKey?: string,
): UseNutrientInstanceResult {
  const [instance, setInstance] = useState<InstanceType<typeof NutrientViewer.Instance> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const pageGeometriesRef = useRef<PageGeometry[]>([])

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    if (!container) return

    async function init() {
      try {
        setLoading(true)
        setError(null)

        NutrientViewer.unload(container!)

        const inst = await NutrientViewer.load({
          container: container!,
          document: documentUrl,
          licenseKey: licenseKey || undefined,
          useCDN: true,
          // toolbarItems: [],  // Temporarily show SDK toolbar for rendering quality testing
          autoSaveMode: NutrientViewer.AutoSaveMode.DISABLED,
          zoom: {
            zoomMode: NutrientViewer.ZoomMode.FIT_TO_WIDTH,
            wheelZoomMode: NutrientViewer.WheelZoomMode.ALWAYS,
            options: {
              enableKeyboardZoom: true,
              enableGestureZoom: true,
            },
          },
          styleSheets: ['/nutrient-perf.css'],
          tileSize: 2048,
        })

        if (cancelled) {
          NutrientViewer.unload(container!)
          return
        }

        const total = inst.totalPageCount
        const geometries: PageGeometry[] = []
        for (let i = 0; i < total; i++) {
          const info = inst.pageInfoForIndex(i)
          geometries.push({
            widthPt: info?.width ?? 612,
            heightPt: info?.height ?? 792,
          })
        }
        pageGeometriesRef.current = geometries

        setInstance(inst)
        setPageCount(total)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      cancelled = true
      if (container) {
        try { NutrientViewer.unload(container) } catch { /* already unloaded */ }
      }
      setInstance(null)
    }
  }, [documentUrl, licenseKey])

  const getPageHeight = useCallback((pageIndex: number): number => {
    return pageGeometriesRef.current[pageIndex]?.heightPt ?? 792
  }, [])

  return { instance, loading, error, pageCount, getPageHeight }
}
