export function pdfYToNutrient(pdfY: number, pageHeightPt: number): number {
  return pageHeightPt - pdfY
}

export function nutrientYToPdf(nutrientY: number, pageHeightPt: number): number {
  return pageHeightPt - nutrientY
}
