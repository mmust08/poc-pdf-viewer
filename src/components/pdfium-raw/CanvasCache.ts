interface CacheEntry {
  canvas: HTMLCanvasElement
  bytes: number
  docVersion: number
}

export class CanvasCache {
  readonly budgetBytes: number
  private cache = new Map<string, CacheEntry>()
  private order: string[] = []
  private _totalBytes = 0

  constructor(budgetBytes: number = 512 * 1024 * 1024) {
    this.budgetBytes = budgetBytes
  }

  private key(pageIndex: number, renderScale: number, docVersion: number): string {
    return `${docVersion}:${pageIndex}:${renderScale}`
  }

  get(pageIndex: number, renderScale: number, docVersion: number): HTMLCanvasElement | undefined {
    const k = this.key(pageIndex, renderScale, docVersion)
    const entry = this.cache.get(k)
    if (!entry) return undefined
    this.promote(k)
    return entry.canvas
  }

  set(pageIndex: number, renderScale: number, docVersion: number, canvas: HTMLCanvasElement) {
    const k = this.key(pageIndex, renderScale, docVersion)
    const bytes = canvas.width * canvas.height * 4

    const existing = this.cache.get(k)
    if (existing) {
      this._totalBytes -= existing.bytes
      this.removeFromOrder(k)
    }

    this.cache.set(k, { canvas, bytes, docVersion })
    this.order.push(k)
    this._totalBytes += bytes

    this.evict()
  }

  invalidateDoc(docVersion: number) {
    for (const [k, entry] of this.cache) {
      if (entry.docVersion === docVersion) {
        this._totalBytes -= entry.bytes
        this.cache.delete(k)
        this.removeFromOrder(k)
      }
    }
  }

  clear() {
    this.cache.clear()
    this.order = []
    this._totalBytes = 0
  }

  get totalPixelBytes(): number {
    return this._totalBytes
  }

  get entryCount(): number {
    return this.cache.size
  }

  private promote(k: string) {
    this.removeFromOrder(k)
    this.order.push(k)
  }

  private removeFromOrder(k: string) {
    const idx = this.order.indexOf(k)
    if (idx !== -1) this.order.splice(idx, 1)
  }

  private evict() {
    while (this._totalBytes > this.budgetBytes && this.order.length > 1) {
      const oldest = this.order.shift()!
      const entry = this.cache.get(oldest)
      if (entry) {
        this._totalBytes -= entry.bytes
        this.cache.delete(oldest)
      }
    }
  }
}

export const globalCanvasCache = new CanvasCache()
