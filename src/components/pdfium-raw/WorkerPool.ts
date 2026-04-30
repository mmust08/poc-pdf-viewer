// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RenderCallback = (msg: any) => void

interface WorkerPoolOptions {
  poolSize: number
  createWorker: () => Worker
}

const MAX_RESPAWN_ATTEMPTS = 3

interface WorkerSlot {
  worker: Worker
  state: 'initializing' | 'ready' | 'loaded' | 'dead'
  respawnCount: number
}

export class WorkerPool {
  private slots: WorkerSlot[]
  private createWorker: () => Worker
  private nextWorker = 0
  private callbacks = new Map<number, RenderCallback>()
  private nextId = 0
  private readyCount = 0
  private loadedCount = 0
  private loadedGeometries: Array<{ widthPt: number; heightPt: number }> | null = null
  private loadedMaxScale = 0
  private destroyed = false
  private poolSize: number

  onReady?: () => void
  onLoaded?: (geometries: Array<{ widthPt: number; heightPt: number }>, maxScale: number) => void
  onError?: (message: string) => void

  constructor({ poolSize, createWorker }: WorkerPoolOptions) {
    this.poolSize = poolSize
    this.createWorker = createWorker
    this.slots = []
    for (let i = 0; i < poolSize; i++) {
      this.addSlot()
    }
  }

  private addSlot(): WorkerSlot {
    const worker = this.createWorker()
    const slot: WorkerSlot = { worker, state: 'initializing', respawnCount: 0 }
    this.slots.push(slot)
    this.setupWorker(slot)
    worker.postMessage({ type: 'init' })
    return slot
  }

  private setupWorker(slot: WorkerSlot) {
    const worker = slot.worker

    worker.onmessage = (e: MessageEvent) => {
      if (this.destroyed) return
      const msg = e.data

      switch (msg.type) {
        case 'ready': {
          slot.state = 'ready'
          this.readyCount++
          if (this.readyCount === this.activeSlotCount) {
            this.onReady?.()
          }
          break
        }
        case 'loaded': {
          slot.state = 'loaded'
          this.loadedCount++
          this.loadedGeometries = msg.geometries
          this.loadedMaxScale = msg.maxScale
          if (this.loadedCount === this.activeSlotCount) {
            this.onLoaded?.(this.loadedGeometries!, this.loadedMaxScale)
          }
          break
        }
        case 'error': {
          this.onError?.(msg.message)
          break
        }
        case 'renderDone': {
          const cb = this.callbacks.get(msg.id)
          if (cb) {
            this.callbacks.delete(msg.id)
            cb(msg)
          }
          break
        }
      }
    }

    worker.onerror = (e: ErrorEvent) => {
      if (this.destroyed) return
      this.onError?.(e.message)

      slot.state = 'dead'
      slot.worker.terminate()

      if (slot.respawnCount < MAX_RESPAWN_ATTEMPTS) {
        this.respawnSlot(slot)
      }
    }
  }

  private respawnSlot(deadSlot: WorkerSlot) {
    const idx = this.slots.indexOf(deadSlot)
    if (idx === -1) return

    const newWorker = this.createWorker()
    const newSlot: WorkerSlot = {
      worker: newWorker,
      state: 'initializing',
      respawnCount: deadSlot.respawnCount + 1,
    }
    this.slots[idx] = newSlot
    this.setupWorker(newSlot)
    newWorker.postMessage({ type: 'init' })
  }

  private get activeSlotCount(): number {
    return this.slots.filter((s) => s.state !== 'dead').length
  }

  get workers(): Worker[] {
    return this.slots.map((s) => s.worker)
  }

  loadUrl(url: string, dpr: number) {
    this.loadedCount = 0
    this.loadedGeometries = null
    for (const slot of this.slots) {
      if (slot.state !== 'dead') {
        slot.worker.postMessage({ type: 'loadUrl', url, dpr })
      }
    }
  }

  loadBuffer(buffer: ArrayBuffer, dpr: number) {
    this.loadedCount = 0
    this.loadedGeometries = null
    const activeSlots = this.slots.filter((s) => s.state !== 'dead')
    for (let i = 0; i < activeSlots.length; i++) {
      const buf = i < activeSlots.length - 1 ? buffer.slice(0) : buffer
      activeSlots[i].worker.postMessage({ type: 'loadBuffer', buffer: buf, dpr }, [buf])
    }
  }

  requestRender(pageIndex: number, scale: number, dpr: number, callback: RenderCallback): number {
    const id = ++this.nextId
    this.callbacks.set(id, callback)

    const activeSlots = this.slots.filter((s) => s.state !== 'dead')
    if (activeSlots.length === 0) {
      this.callbacks.delete(id)
      callback({ type: 'renderDone', id, error: 'All workers are dead' })
      return id
    }

    const slot = activeSlots[this.nextWorker % activeSlots.length]
    this.nextWorker = (this.nextWorker + 1) % activeSlots.length

    slot.worker.postMessage({ type: 'render', id, pageIndex, scale, dpr })
    return id
  }

  retryAll() {
    for (const slot of this.slots) {
      slot.worker.terminate()
    }

    this.slots = []
    this.readyCount = 0
    this.loadedCount = 0
    this.nextWorker = 0
    this.callbacks.clear()

    for (let i = 0; i < this.poolSize; i++) {
      this.addSlot()
    }
  }

  destroy() {
    this.destroyed = true
    this.callbacks.clear()
    for (const slot of this.slots) {
      slot.worker.terminate()
    }
  }
}
