/**
 * PDFium Web Worker — all heavy WASM rendering happens here,
 * keeping the main thread free for smooth zoom / pan / UI.
 */
import { PDFiumLibrary } from '@hyzyla/pdfium/browser/cdn'

// Same constant as main thread — keep in sync
const MAX_CANVAS_DIM = 16384
const MAX_BITMAP_PIXELS = 100_000_000

interface PageGeo {
  widthPt: number
  heightPt: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let library: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let doc: any = null
let pageGeometries: PageGeo[] = []

function computeMaxScale(widthPt: number, heightPt: number, dpr: number): number {
  const maxByDimW = MAX_CANVAS_DIM / (widthPt * dpr)
  const maxByDimH = MAX_CANVAS_DIM / (heightPt * dpr)
  const maxByMemory = Math.sqrt(MAX_BITMAP_PIXELS / (widthPt * heightPt)) / dpr
  return Math.min(maxByDimW, maxByDimH, maxByMemory)
}

// ── Message handler ─────────────────────────────────────────────────────
self.onmessage = async (e: MessageEvent) => {
  const msg = e.data

  switch (msg.type) {
    // ── Initialise PDFium WASM engine ─────────────────────────────────
    case 'init': {
      try {
        library = await PDFiumLibrary.init({ disableCDNWarning: true })
        self.postMessage({ type: 'ready' })
      } catch (err) {
        self.postMessage({ type: 'error', message: `Init failed: ${err}` })
      }
      break
    }

    // ── Load PDF from URL (worker fetches it) ─────────────────────────
    case 'loadUrl': {
      if (!library) { self.postMessage({ type: 'error', message: 'Not initialised' }); break }
      try {
        if (doc) { doc.destroy(); doc = null }
        const resp = await fetch(msg.url)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const buf = await resp.arrayBuffer()
        await loadDocument(new Uint8Array(buf), msg.dpr)
      } catch (err) {
        self.postMessage({ type: 'error', message: `Load failed: ${err}` })
      }
      break
    }

    // ── Load PDF from transferred ArrayBuffer ─────────────────────────
    case 'loadBuffer': {
      if (!library) { self.postMessage({ type: 'error', message: 'Not initialised' }); break }
      try {
        if (doc) { doc.destroy(); doc = null }
        await loadDocument(new Uint8Array(msg.buffer), msg.dpr)
      } catch (err) {
        self.postMessage({ type: 'error', message: `Load failed: ${err}` })
      }
      break
    }

    // ── Render a page region ──────────────────────────────────────────
    case 'render': {
      if (!doc) { self.postMessage({ type: 'renderDone', id: msg.id, error: 'No document' }); break }
      try {
        const { id, pageIndex, scale, dpr } = msg
        const geo = pageGeometries[pageIndex]
        if (!geo) throw new Error(`Invalid page ${pageIndex}`)

        const maxRenderScale = computeMaxScale(geo.widthPt, geo.heightPt, dpr)
        const renderScale = Math.min(scale, maxRenderScale)

        const page = doc.getPage(pageIndex)
        const result = await page.render({
          scale: renderScale * dpr,
          render: 'bitmap' as const,
        })

        // Copy into a transferable ArrayBuffer
        const buf = result.data.buffer.slice(
          result.data.byteOffset,
          result.data.byteOffset + result.data.byteLength,
        )

        self.postMessage(
          {
            type: 'renderDone',
            id,
            data: buf,
            width: result.width,
            height: result.height,
            renderScale,
          },
          [buf], // transfer (zero-copy)
        )
      } catch (err) {
        self.postMessage({ type: 'renderDone', id: msg.id, error: `${err}` })
      }
      break
    }
  }
}

async function loadDocument(data: Uint8Array, dpr: number) {
  doc = await library.loadDocument(data)

  const count = doc.getPageCount()
  pageGeometries = []
  for (let i = 0; i < count; i++) {
    const page = doc.getPage(i)
    const size = page.getOriginalSize()
    pageGeometries.push({ widthPt: size.originalWidth, heightPt: size.originalHeight })
  }

  // Compute max safe zoom from the largest page
  let worstMax = Infinity
  for (const g of pageGeometries) {
    worstMax = Math.min(worstMax, computeMaxScale(g.widthPt, g.heightPt, dpr))
  }
  const maxScale = Math.max(1, Math.floor(worstMax * 100) / 100)

  self.postMessage({
    type: 'loaded',
    geometries: pageGeometries,
    maxScale,
  })
}
