export interface PageGeometry {
  widthPt: number
  heightPt: number
}

export interface RenderedRegion {
  clipLeft: number
  clipTop: number
  clipRight: number
  clipBottom: number
  scale: number
  renderScale: number
}

export interface ClipRegion {
  clipLeft: number
  clipTop: number
  clipW: number
  clipH: number
  fullPageFits: boolean
}

export function getVisiblePageRange(params: {
  pageGeometries: PageGeometry[]
  scale: number
  scrollTop: number
  viewportHeight: number
  virtualizationViewports: number
  pageGap: number
}): [number, number] {
  const { pageGeometries, scale, scrollTop, viewportHeight, virtualizationViewports, pageGap } = params

  if (pageGeometries.length === 0) return [0, 0]
  if (viewportHeight === 0) return [0, pageGeometries.length - 1]

  const bufferPx = viewportHeight * virtualizationViewports
  const viewTop = scrollTop - bufferPx
  const viewBottom = scrollTop + viewportHeight + bufferPx

  let firstVisible = 0
  let lastVisible = pageGeometries.length - 1
  let cumTop = 0

  for (let i = 0; i < pageGeometries.length; i++) {
    const pageH = pageGeometries[i].heightPt * scale + pageGap
    const pageBottom = cumTop + pageH
    if (pageBottom < viewTop) {
      firstVisible = i + 1
    }
    if (cumTop > viewBottom) {
      lastVisible = i - 1
      break
    }
    cumTop = pageBottom
  }

  return [Math.max(0, firstVisible), Math.min(pageGeometries.length - 1, lastVisible)]
}

export function computeCurrentPage(params: {
  scrollCenter: number
  pageGeometries: PageGeometry[]
  scale: number
  pageGap: number
}): number {
  const { scrollCenter, pageGeometries, scale, pageGap } = params

  let cumHeight = 0
  let page = pageGeometries.length
  for (let i = 0; i < pageGeometries.length; i++) {
    cumHeight += pageGeometries[i].heightPt * scale + pageGap
    if (scrollCenter < cumHeight) {
      page = i + 1
      break
    }
  }
  return page
}

export function computeClipRegion(params: {
  canvasWidth: number
  canvasHeight: number
  dpr: number
  maxCanvasDim: number
  visLeft: number
  visTop: number
  visRight: number
  visBottom: number
  wrapperLeft: number
  wrapperTop: number
  wrapperRight: number
  wrapperBottom: number
  viewportWidth: number
  viewportHeight: number
  marginFraction: number
  marginMinPx: number
}): ClipRegion | null {
  const {
    canvasWidth, canvasHeight, dpr, maxCanvasDim,
    visLeft, visTop, visRight, visBottom,
    wrapperLeft, wrapperTop, wrapperRight, wrapperBottom,
    viewportWidth, viewportHeight, marginFraction, marginMinPx,
  } = params

  if (visRight <= visLeft || visBottom <= visTop) return null

  const fullPagePxW = canvasWidth * dpr
  const fullPagePxH = canvasHeight * dpr
  const fullPageFits = fullPagePxW <= maxCanvasDim && fullPagePxH <= maxCanvasDim

  let clipLeft: number
  let clipTop: number
  let clipW: number
  let clipH: number

  if (fullPageFits) {
    clipLeft = 0
    clipTop = 0
    clipW = canvasWidth
    clipH = canvasHeight
  } else {
    const marginH = Math.max(marginMinPx, viewportWidth * marginFraction)
    const marginV = Math.max(marginMinPx, viewportHeight * marginFraction)

    const renderLeft = Math.max(wrapperLeft, visLeft - marginH)
    const renderTop = Math.max(wrapperTop, visTop - marginV)
    const renderRight = Math.min(wrapperRight, visRight + marginH)
    const renderBottom = Math.min(wrapperBottom, visBottom + marginV)

    clipLeft = Math.round(renderLeft - wrapperLeft)
    clipTop = Math.round(renderTop - wrapperTop)
    clipW = Math.round(renderRight - renderLeft)
    clipH = Math.round(renderBottom - renderTop)
  }

  if (clipW <= 0 || clipH <= 0) return null

  return { clipLeft, clipTop, clipW, clipH, fullPageFits }
}

export function shouldSkipRender(params: {
  renderedRegion: RenderedRegion | null
  visLeft: number
  visTop: number
  visRight: number
  visBottom: number
  scale: number
  threshold: number
}): boolean {
  const { renderedRegion, visLeft, visTop, visRight, visBottom, scale, threshold } = params

  if (!renderedRegion || renderedRegion.scale !== scale) return false

  return (
    visLeft >= renderedRegion.clipLeft + threshold &&
    visTop >= renderedRegion.clipTop + threshold &&
    visRight <= renderedRegion.clipRight - threshold &&
    visBottom <= renderedRegion.clipBottom - threshold
  )
}
