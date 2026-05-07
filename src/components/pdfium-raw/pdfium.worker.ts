/**
 * PDFium Web Worker — all heavy WASM rendering happens here,
 * keeping the main thread free for smooth zoom / pan / UI.
 */
import { PDFiumLibrary } from '@hyzyla/pdfium/browser/cdn'
import { computeMaxScale, computeWorstMaxScale, type PageGeometry } from './renderMath'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let library: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let doc: any = null
let pageGeometries: PageGeometry[] = []

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

        ;(self as unknown as Worker).postMessage(
          {
            type: 'renderDone',
            id,
            data: buf,
            width: result.width,
            height: result.height,
            renderScale,
          },
          [buf],
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

  const worstMax = computeWorstMaxScale(pageGeometries, dpr)
  const maxScale = Math.max(1, Math.floor(worstMax * 100) / 100)

  self.postMessage({
    type: 'loaded',
    geometries: pageGeometries,
    maxScale,
  })
}
