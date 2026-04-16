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
  pageCount: number
  isLoading: boolean
  error: string | null
}

export interface UsePdfPageDataUrlResult extends PdfPageGeometry {
  dataUrl: string | null
  pageCount: number
  isLoading: boolean
  error: string | null
}

/**
 * Renders a specific page of a PDF onto a <canvas> ref.
 * The document is loaded once per URL; page changes do not re-fetch the document.
 */
export function usePdfPage(pdfUrl: string, pageNumber = 1, scale = 1.5): UsePdfPageResult {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [geometry, setGeometry] = useState<PdfPageGeometry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load the PDF document whenever the URL changes
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    setPageCount(0)

    pdfjsLib.getDocument(pdfUrl).promise
      .then((doc) => {
        if (cancelled) { doc.destroy(); return }
        setPdfDoc((prev) => { prev?.destroy(); return doc })
        setPageCount(doc.numPages)
      })
      .catch((err) => { if (!cancelled) setError(String(err)) })

    return () => { cancelled = true }
  }, [pdfUrl])

  // Render the requested page whenever the document or page number changes
  useEffect(() => {
    if (!pdfDoc) return
    let cancelled = false

    async function render() {
      setIsLoading(true)
      try {
        const clampedPage = Math.max(1, Math.min(pageNumber, pdfDoc!.numPages))
        const page = await pdfDoc!.getPage(clampedPage)
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
        setGeometry({ pageWidthPt, pageHeightPt, canvasWidthPx: canvas.width, canvasHeightPx: canvas.height, scale })
      } catch (err) {
        if (!cancelled) setError(String(err))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    render()
    return () => { cancelled = true }
  }, [pdfDoc, pageNumber, scale])

  return {
    canvasRef,
    pageCount,
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
 * Renders a specific page of a PDF to an offscreen canvas and returns a data URL.
 * Use for Prototype 2 (Fabric.js) and Prototype 3 (Leaflet).
 */
export function usePdfPageDataUrl(pdfUrl: string, pageNumber = 1, scale = 1.5): UsePdfPageDataUrlResult {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [geometry, setGeometry] = useState<PdfPageGeometry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load document once per URL
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    setPageCount(0)

    pdfjsLib.getDocument(pdfUrl).promise
      .then((doc) => {
        if (cancelled) { doc.destroy(); return }
        setPdfDoc((prev) => { prev?.destroy(); return doc })
        setPageCount(doc.numPages)
      })
      .catch((err) => { if (!cancelled) setError(String(err)) })

    return () => { cancelled = true }
  }, [pdfUrl])

  // Render the requested page whenever doc or page number changes
  useEffect(() => {
    if (!pdfDoc) return
    let cancelled = false

    async function render() {
      setIsLoading(true)
      try {
        const clampedPage = Math.max(1, Math.min(pageNumber, pdfDoc!.numPages))
        const page = await pdfDoc!.getPage(clampedPage)
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
        setGeometry({ pageWidthPt, pageHeightPt, canvasWidthPx: canvas.width, canvasHeightPx: canvas.height, scale })
      } catch (err) {
        if (!cancelled) setError(String(err))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    render()
    return () => { cancelled = true }
  }, [pdfDoc, pageNumber, scale])

  return {
    dataUrl,
    pageCount,
    pageWidthPt: geometry?.pageWidthPt ?? 0,
    pageHeightPt: geometry?.pageHeightPt ?? 0,
    canvasWidthPx: geometry?.canvasWidthPx ?? 0,
    canvasHeightPx: geometry?.canvasHeightPx ?? 0,
    scale: geometry?.scale ?? scale,
    isLoading,
    error,
  }
}
