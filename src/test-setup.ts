import '@testing-library/jest-dom'

Object.defineProperty(window, 'devicePixelRatio', { value: 2 })

const canvasMock = {
  putImageData: vi.fn(),
  drawImage: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  clip: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  canvas: { width: 0, height: 0 },
}

HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement, _contextId: string) {
  canvasMock.canvas = this
  return canvasMock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any
