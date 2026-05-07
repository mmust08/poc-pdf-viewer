import { useEffect, useRef, useState, useCallback } from 'react'
import NutrientViewer from '@nutrient-sdk/viewer'
import { detectPageFormat, optimalTileSize } from './pageFormats'

NutrientViewer.preloadWorker({ document: '', useCDN: true })

interface PageGeometry {
  widthPt: number
  heightPt: number
  format: string
}

interface UseNutrientInstanceResult {
  instance: InstanceType<typeof NutrientViewer.Instance> | null
  loading: boolean
  error: string | null
  pageCount: number
  getPageHeight: (pageIndex: number) => number
  getPageFormat: (pageIndex: number) => string
  documentFormat: string | null
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
  const [documentFormat, setDocumentFormat] = useState<string | null>(null)
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
          autoSaveMode: NutrientViewer.AutoSaveMode.DISABLED,
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
          const w = info?.width ?? 612
          const h = info?.height ?? 792
          geometries.push({
            widthPt: w,
            heightPt: h,
            format: detectPageFormat(w, h),
          })
        }
        pageGeometriesRef.current = geometries

        const formats = new Set(geometries.map((g) => g.format))
        setDocumentFormat(formats.size === 1 ? [...formats][0] : 'Mixed')

        const needed = optimalTileSize(geometries)
        if (needed !== 2048) {
          NutrientViewer.unload(container!)
          if (cancelled) return

          const reinstated = await NutrientViewer.load({
            container: container!,
            document: documentUrl,
            licenseKey: licenseKey || undefined,
            useCDN: true,
            autoSaveMode: NutrientViewer.AutoSaveMode.DISABLED,
            styleSheets: ['/nutrient-perf.css'],
            tileSize: needed,
          })

          if (cancelled) {
            NutrientViewer.unload(container!)
            return
          }

          reinstated.setViewState((v) =>
            v.set('zoomStep', 1.1).set('prerenderedPageSpreads', 3).set('zoom', NutrientViewer.ZoomMode.FIT_TO_WIDTH),
          )
          setInstance(reinstated)
        } else {
          inst.setViewState((v) =>
            v.set('zoomStep', 1.1).set('prerenderedPageSpreads', 3).set('zoom', NutrientViewer.ZoomMode.FIT_TO_WIDTH),
          )
          setInstance(inst)
        }

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

  const getPageFormat = useCallback((pageIndex: number): string => {
    return pageGeometriesRef.current[pageIndex]?.format ?? 'Unknown'
  }, [])

  return { instance, loading, error, pageCount, getPageHeight, getPageFormat, documentFormat }
}
