import { useRef, useState, useEffect, useCallback } from 'react'
import { WorkerPool } from './WorkerPool'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RenderCallback = (msg: any) => void

interface UseWorkerParams {
  createWorker: () => Worker
  onDocumentLoaded: (geometries: Array<{ widthPt: number; heightPt: number }>, maxScale: number) => void
  defaultUrl?: string
  poolSize?: number
}

export function useWorker({ createWorker, onDocumentLoaded, defaultUrl, poolSize }: UseWorkerParams) {
  const poolRef = useRef<WorkerPool | null>(null)
  const renderingCountRef = useRef(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)

  const onDocumentLoadedRef = useRef(onDocumentLoaded)
  onDocumentLoadedRef.current = onDocumentLoaded
  const defaultUrlRef = useRef(defaultUrl)
  defaultUrlRef.current = defaultUrl

  useEffect(() => {
    const size = poolSize ?? Math.min(4, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2)
    const pool = new WorkerPool({ poolSize: size, createWorker })
    poolRef.current = pool

    pool.onReady = () => {
      const url = defaultUrlRef.current
      if (url) {
        pool.loadUrl(url, window.devicePixelRatio || 1)
      }
    }

    pool.onLoaded = (geometries, maxScale) => {
      setLoading(false)
      setError(null)
      onDocumentLoadedRef.current(geometries, maxScale)
    }

    pool.onError = (message) => {
      setError(message)
      setLoading(false)
    }

    return () => {
      pool.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const requestRender = useCallback(
    (pageIndex: number, renderScale: number, dpr: number, callback: RenderCallback): number => {
      renderingCountRef.current++
      setRendering(true)
      const wrappedCallback: RenderCallback = (msg) => {
        renderingCountRef.current = Math.max(0, renderingCountRef.current - 1)
        if (renderingCountRef.current === 0) setRendering(false)
        callback(msg)
      }
      return poolRef.current!.requestRender(pageIndex, renderScale, dpr, wrappedCallback)
    },
    [],
  )

  const loadBuffer = useCallback((buffer: ArrayBuffer, dpr: number) => {
    setLoading(true)
    poolRef.current?.loadBuffer(buffer, dpr)
  }, [])

  const loadUrl = useCallback((url: string, dpr: number) => {
    setLoading(true)
    poolRef.current?.loadUrl(url, dpr)
  }, [])

  const retry = useCallback(() => {
    setError(null)
    setLoading(true)
    renderingCountRef.current = 0
    setRendering(false)
    poolRef.current?.retryAll()
  }, [])

  return { requestRender, loading, error, rendering, loadBuffer, loadUrl, retry }
}
