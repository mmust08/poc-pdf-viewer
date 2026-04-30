import {
  getVisiblePageRange,
  computeCurrentPage,
  computeClipRegion,
  shouldSkipRender,
} from '../viewportUtils'

const PAGE_GAP = 12

describe('getVisiblePageRange', () => {
  const makeGeometries = (count: number, heightPt = 842) =>
    Array.from({ length: count }, () => ({ widthPt: 595, heightPt }))

  it('returns [0, N-1] when viewportHeight is 0 (fallback)', () => {
    const geoms = makeGeometries(10)
    expect(getVisiblePageRange({
      pageGeometries: geoms,
      scale: 1,
      scrollTop: 0,
      viewportHeight: 0,
      virtualizationViewports: 2,
      pageGap: PAGE_GAP,
    })).toEqual([0, 9])
  })

  it('returns [0, 0] for empty geometries', () => {
    expect(getVisiblePageRange({
      pageGeometries: [],
      scale: 1,
      scrollTop: 0,
      viewportHeight: 800,
      virtualizationViewports: 2,
      pageGap: PAGE_GAP,
    })).toEqual([0, 0])
  })

  it('returns full range for small document that fits in viewport', () => {
    const geoms = makeGeometries(2, 300)
    expect(getVisiblePageRange({
      pageGeometries: geoms,
      scale: 1,
      scrollTop: 0,
      viewportHeight: 2000,
      virtualizationViewports: 2,
      pageGap: PAGE_GAP,
    })).toEqual([0, 1])
  })

  it('returns correct range for middle of 100-page document', () => {
    const geoms = makeGeometries(100)
    const pageH = 842 * 1 + PAGE_GAP
    const scrollTop = 50 * pageH
    const [first, last] = getVisiblePageRange({
      pageGeometries: geoms,
      scale: 1,
      scrollTop,
      viewportHeight: 800,
      virtualizationViewports: 2,
      pageGap: PAGE_GAP,
    })
    expect(first).toBeGreaterThan(0)
    expect(last).toBeLessThan(99)
    expect(first).toBeLessThanOrEqual(50)
    expect(last).toBeGreaterThanOrEqual(50)
  })

  it('respects virtualizationViewports buffer', () => {
    const geoms = makeGeometries(100)
    const pageH = 842 * 1 + PAGE_GAP
    const scrollTop = 50 * pageH
    const viewportHeight = 800

    const narrow = getVisiblePageRange({
      pageGeometries: geoms, scale: 1, scrollTop, viewportHeight,
      virtualizationViewports: 0, pageGap: PAGE_GAP,
    })
    const wide = getVisiblePageRange({
      pageGeometries: geoms, scale: 1, scrollTop, viewportHeight,
      virtualizationViewports: 4, pageGap: PAGE_GAP,
    })

    expect(wide[1] - wide[0]).toBeGreaterThan(narrow[1] - narrow[0])
  })

  it('adjusts range when scale changes (pages become taller)', () => {
    const geoms = makeGeometries(50)
    const scrollTop = 0
    const viewportHeight = 800

    const atScale1 = getVisiblePageRange({
      pageGeometries: geoms, scale: 1, scrollTop, viewportHeight,
      virtualizationViewports: 2, pageGap: PAGE_GAP,
    })
    const atScale3 = getVisiblePageRange({
      pageGeometries: geoms, scale: 3, scrollTop, viewportHeight,
      virtualizationViewports: 2, pageGap: PAGE_GAP,
    })

    expect(atScale3[1]).toBeLessThan(atScale1[1])
  })

  it('handles single page document', () => {
    expect(getVisiblePageRange({
      pageGeometries: [{ widthPt: 595, heightPt: 842 }],
      scale: 1,
      scrollTop: 0,
      viewportHeight: 800,
      virtualizationViewports: 2,
      pageGap: PAGE_GAP,
    })).toEqual([0, 0])
  })

  it('clamps firstVisible >= 0', () => {
    const [first] = getVisiblePageRange({
      pageGeometries: makeGeometries(5),
      scale: 1,
      scrollTop: 0,
      viewportHeight: 800,
      virtualizationViewports: 2,
      pageGap: PAGE_GAP,
    })
    expect(first).toBeGreaterThanOrEqual(0)
  })

  it('clamps lastVisible <= pageCount - 1', () => {
    const geoms = makeGeometries(5)
    const [, last] = getVisiblePageRange({
      pageGeometries: geoms,
      scale: 1,
      scrollTop: 99999,
      viewportHeight: 800,
      virtualizationViewports: 2,
      pageGap: PAGE_GAP,
    })
    expect(last).toBeLessThanOrEqual(4)
  })
})

describe('computeCurrentPage', () => {
  const makeGeometries = (count: number, heightPt = 842) =>
    Array.from({ length: count }, () => ({ widthPt: 595, heightPt }))

  it('returns 1 when scrolled to top', () => {
    expect(computeCurrentPage({
      scrollCenter: 100,
      pageGeometries: makeGeometries(10),
      scale: 1,
      pageGap: PAGE_GAP,
    })).toBe(1)
  })

  it('returns last page when scrolled to bottom', () => {
    const geoms = makeGeometries(10)
    const totalHeight = geoms.reduce((acc, g) => acc + g.heightPt * 1 + PAGE_GAP, 0)
    expect(computeCurrentPage({
      scrollCenter: totalHeight,
      pageGeometries: geoms,
      scale: 1,
      pageGap: PAGE_GAP,
    })).toBe(10)
  })

  it('returns correct page when scroll center is in middle', () => {
    const geoms = makeGeometries(10)
    const pageH = 842 * 1 + PAGE_GAP
    const scrollCenter = 4.5 * pageH
    expect(computeCurrentPage({
      scrollCenter,
      pageGeometries: geoms,
      scale: 1,
      pageGap: PAGE_GAP,
    })).toBe(5)
  })

  it('accounts for scale in page heights', () => {
    const geoms = makeGeometries(10)
    const pageH_s2 = 842 * 2 + PAGE_GAP
    const scrollCenter = 2.5 * pageH_s2
    expect(computeCurrentPage({
      scrollCenter,
      pageGeometries: geoms,
      scale: 2,
      pageGap: PAGE_GAP,
    })).toBe(3)
  })

  it('returns pageCount for empty geometries', () => {
    expect(computeCurrentPage({
      scrollCenter: 0,
      pageGeometries: [],
      scale: 1,
      pageGap: PAGE_GAP,
    })).toBe(0)
  })
})

describe('computeClipRegion', () => {
  const maxCanvasDim = 16384

  it('returns full page when page fits within MAX_CANVAS_DIM', () => {
    const result = computeClipRegion({
      canvasWidth: 595,
      canvasHeight: 842,
      dpr: 1,
      maxCanvasDim,
      visLeft: 0,
      visTop: 0,
      visRight: 595,
      visBottom: 842,
      wrapperLeft: 0,
      wrapperTop: 0,
      wrapperRight: 595,
      wrapperBottom: 842,
      viewportWidth: 1000,
      viewportHeight: 800,
      marginFraction: 0.75,
      marginMinPx: 800,
    })
    expect(result).toEqual({
      clipLeft: 0,
      clipTop: 0,
      clipW: 595,
      clipH: 842,
      fullPageFits: true,
    })
  })

  it('computes margin-based clip for oversized pages', () => {
    const bigWidth = 20000
    const bigHeight = 20000
    const result = computeClipRegion({
      canvasWidth: bigWidth,
      canvasHeight: bigHeight,
      dpr: 1,
      maxCanvasDim,
      visLeft: 500,
      visTop: 500,
      visRight: 1500,
      visBottom: 1300,
      wrapperLeft: 0,
      wrapperTop: 0,
      wrapperRight: bigWidth,
      wrapperBottom: bigHeight,
      viewportWidth: 1000,
      viewportHeight: 800,
      marginFraction: 0.75,
      marginMinPx: 800,
    })
    expect(result!.fullPageFits).toBe(false)
    expect(result!.clipW).toBeGreaterThan(0)
    expect(result!.clipH).toBeGreaterThan(0)
    expect(result!.clipLeft).toBeGreaterThanOrEqual(0)
    expect(result!.clipTop).toBeGreaterThanOrEqual(0)
  })

  it('returns null when visible region has zero area', () => {
    const result = computeClipRegion({
      canvasWidth: 595,
      canvasHeight: 842,
      dpr: 1,
      maxCanvasDim,
      visLeft: 100,
      visTop: 100,
      visRight: 100,
      visBottom: 100,
      wrapperLeft: 0,
      wrapperTop: 0,
      wrapperRight: 595,
      wrapperBottom: 842,
      viewportWidth: 1000,
      viewportHeight: 800,
      marginFraction: 0.75,
      marginMinPx: 800,
    })
    expect(result).toBeNull()
  })
})

describe('shouldSkipRender', () => {
  const renderedRegion = {
    clipLeft: 100,
    clipTop: 100,
    clipRight: 900,
    clipBottom: 700,
    scale: 1,
    renderScale: 1,
  }

  it('returns true when viewport is well within current rendered region', () => {
    expect(shouldSkipRender({
      renderedRegion,
      visLeft: 350,
      visTop: 350,
      visRight: 650,
      visBottom: 500,
      scale: 1,
      threshold: 200,
    })).toBe(true)
  })

  it('returns false when viewport exceeds threshold on left', () => {
    expect(shouldSkipRender({
      renderedRegion,
      visLeft: 150,
      visTop: 350,
      visRight: 650,
      visBottom: 500,
      scale: 1,
      threshold: 200,
    })).toBe(false)
  })

  it('returns false when scale has changed', () => {
    expect(shouldSkipRender({
      renderedRegion,
      visLeft: 350,
      visTop: 350,
      visRight: 650,
      visBottom: 500,
      scale: 2,
      threshold: 200,
    })).toBe(false)
  })

  it('returns false when no previous render exists', () => {
    expect(shouldSkipRender({
      renderedRegion: null,
      visLeft: 350,
      visTop: 350,
      visRight: 650,
      visBottom: 500,
      scale: 1,
      threshold: 200,
    })).toBe(false)
  })
})
