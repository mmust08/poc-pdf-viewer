// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RenderCallback = (msg: any) => void

export interface RenderRequest {
  pageIndex: number
  scale: number
  dpr: number
  callback: RenderCallback
  priority: number
}

export class RenderQueue {
  private queue = new Map<number, RenderRequest>()
  private cancelledIds = new Set<number>()

  enqueue(request: RenderRequest) {
    this.queue.set(request.pageIndex, request)
  }

  dequeue(): RenderRequest | undefined {
    if (this.queue.size === 0) return undefined

    let best: RenderRequest | undefined
    for (const req of this.queue.values()) {
      if (!best || req.priority < best.priority) {
        best = req
      }
    }

    if (best) {
      this.queue.delete(best.pageIndex)
    }
    return best
  }

  cancel(renderId: number) {
    this.cancelledIds.add(renderId)
  }

  isCancelled(renderId: number): boolean {
    return this.cancelledIds.has(renderId)
  }

  cancelAllExcept(visiblePageIndices: number[]) {
    const visibleSet = new Set(visiblePageIndices)
    for (const [pageIndex] of this.queue) {
      if (!visibleSet.has(pageIndex)) {
        this.queue.delete(pageIndex)
      }
    }
  }

  updatePriorities(
    viewportCenterY: number,
    pageGeometries: Array<{ widthPt: number; heightPt: number }>,
    scale: number,
    pageGap: number,
  ) {
    let cumTop = 0
    const pageCenters = new Map<number, number>()

    for (let i = 0; i < pageGeometries.length; i++) {
      const pageH = pageGeometries[i].heightPt * scale + pageGap
      pageCenters.set(i, cumTop + pageH / 2)
      cumTop += pageH
    }

    for (const [pageIndex, request] of this.queue) {
      const center = pageCenters.get(pageIndex)
      if (center !== undefined) {
        request.priority = Math.abs(center - viewportCenterY)
      }
    }
  }

  get size(): number {
    return this.queue.size
  }

  clear() {
    this.queue.clear()
    this.cancelledIds.clear()
  }
}
