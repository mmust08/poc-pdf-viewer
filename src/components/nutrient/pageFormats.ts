export interface PageFormat {
  name: string
  widthPt: number
  heightPt: number
}

const FORMATS: PageFormat[] = [
  { name: 'A4',      widthPt: 595.28,  heightPt: 841.89  },
  { name: 'A4 L',    widthPt: 841.89,  heightPt: 595.28  },
  { name: 'A3',      widthPt: 841.89,  heightPt: 1190.55 },
  { name: 'A3 L',    widthPt: 1190.55, heightPt: 841.89  },
  { name: 'A2',      widthPt: 1190.55, heightPt: 1681.89 },
  { name: 'A2 L',    widthPt: 1681.89, heightPt: 1190.55 },
  { name: 'A1',      widthPt: 1681.89, heightPt: 2383.94 },
  { name: 'A1 L',    widthPt: 2383.94, heightPt: 1681.89 },
  { name: 'A0',      widthPt: 2383.94, heightPt: 3370.39 },
  { name: 'A0 L',    widthPt: 3370.39, heightPt: 2383.94 },
  { name: 'Letter',  widthPt: 612,     heightPt: 792     },
  { name: 'Letter L',widthPt: 792,     heightPt: 612     },
  { name: 'Legal',   widthPt: 612,     heightPt: 1008    },
  { name: 'Tabloid', widthPt: 792,     heightPt: 1224    },
]

const TOLERANCE_PT = 5

export function detectPageFormat(widthPt: number, heightPt: number): string {
  for (const fmt of FORMATS) {
    if (
      Math.abs(widthPt - fmt.widthPt) <= TOLERANCE_PT &&
      Math.abs(heightPt - fmt.heightPt) <= TOLERANCE_PT
    ) {
      return fmt.name
    }
  }
  return `${Math.round(widthPt)}×${Math.round(heightPt)} pt`
}

export function optimalTileSize(
  pages: Array<{ widthPt: number; heightPt: number }>,
): number {
  if (pages.length === 0) return 2048
  let maxDim = 0
  for (const p of pages) {
    maxDim = Math.max(maxDim, p.widthPt, p.heightPt)
  }
  if (maxDim > 2000) return 4096
  if (maxDim > 1000) return 2048
  return 1024
}
