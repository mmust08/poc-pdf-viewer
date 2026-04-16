import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker as string

interface PdfPageGeometry {
  pageWidthPt: number
  pageHeightPt: number
  canvasWidthPx: number
  canvasHeightPx: number
  scale: number
}

export interface UsePdfPageResult extends PdfPageGeometry {
  canvasRef: RefObject<HTMLCanvasElement>
  isLoading: boolean
  error: string | null
}

export interface UsePdfPageDataUrlResult extends PdfPageGeometry {
  dataUrl: string | null
  isLoading: boolean
  error: string | null
}

/**
 * Renders page 1 of a PDF onto a <canvas> ref.
 * Use for Prototype 1 (PDF.js + react-zoom-pan-pinch).
 */
export function usePdfPage(pdfUrl: string, scale = 1.5): UsePdfPageResult {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [geometry, setGeometry] = useState<PdfPageGeometry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function render() {
      setIsLoading(true)
      setError(null)
      try {
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise
        if (cancelled) return
        const page = await pdf.getPage(1)
        if (cancelled) return

        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current
        if (!canvas) return

        canvas.width = Math.round(viewport.width)
        canvas.height = Math.round(viewport.height)

        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise
        if (cancelled) return

        const [, , pageWidthPt, pageHeightPt] = page.view
        setGeometry({
          pageWidthPt,
          pageHeightPt,
          canvasWidthPx: canvas.width,
          canvasHeightPx: canvas.height,
          scale,
        })
      } catch (err) {
        if (!cancelled) setError(String(err))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    render()
    return () => { cancelled = true }
  }, [pdfUrl, scale])

  return {
    canvasRef,
    pageWidthPt: geometry?.pageWidthPt ?? 0,
    pageHeightPt: geometry?.pageHeightPt ?? 0,
    canvasWidthPx: geometry?.canvasWidthPx ?? 0,
    canvasHeightPx: geometry?.canvasHeightPx ?? 0,
    scale: geometry?.scale ?? scale,
    isLoading,
    error,
  }
}

/**
 * Renders page 1 of a PDF into an offscreen canvas and returns a data URL.
 * Use for Prototype 2 (Fabric.js) and Prototype 3 (Leaflet).
 */
export function usePdfPageDataUrl(pdfUrl: string, scale = 1.5): UsePdfPageDataUrlResult {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [geometry, setGeometry] = useState<PdfPageGeometry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function render() {
      setIsLoading(true)
      setError(null)
      try {
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise
        if (cancelled) return
        const page = await pdf.getPage(1)
        if (cancelled) return

        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(viewport.width)
        canvas.height = Math.round(viewport.height)

        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise
        if (cancelled) return

        const [, , pageWidthPt, pageHeightPt] = page.view
        setDataUrl(canvas.toDataURL('image/png'))
        setGeometry({
          pageWidthPt,
          pageHeightPt,
          canvasWidthPx: canvas.width,
          canvasHeightPx: canvas.height,
          scale,
        })
      } catch (err) {
        if (!cancelled) setError(String(err))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    render()
    return () => { cancelled = true }
  }, [pdfUrl, scale])

  return {
    dataUrl,
    pageWidthPt: geometry?.pageWidthPt ?? 0,
    pageHeightPt: geometry?.pageHeightPt ?? 0,
    canvasWidthPx: geometry?.canvasWidthPx ?? 0,
    canvasHeightPx: geometry?.canvasHeightPx ?? 0,
    scale: geometry?.scale ?? scale,
    isLoading,
    error,
  }
}
