/**
 * Coordinates are in PDF user-space units (points).
 * Origin is bottom-left of the page, per the PDF specification.
 * 1 PDF point = 1/72 inch.
 *
 * Y-axis conversion to screen pixels:
 *   screenY = (pageHeightPt - mark.y) * scale
 */
export interface PdfMark {
  id: string;
  page: number;  // 1-based PDF page number
  x: number;     // PDF points from left edge
  y: number;     // PDF points from bottom edge (PDF coordinate space)
  label: string;
}

export const HARDCODED_MARKS: PdfMark[] = [
  { id: 'M1', page: 1, x: 200,  y: 2100, label: 'M1 — Column A' },
  { id: 'M2', page: 1, x: 840,  y: 1800, label: 'M2 — Stairwell' },
  { id: 'M3', page: 1, x: 1400, y: 1200, label: 'M3 — Electrical panel' },
  { id: 'M4', page: 1, x: 400,  y: 600,  label: 'M4 — Exit door' },
  { id: 'M5', page: 1, x: 1200, y: 300,  label: 'M5 — Ground anchor' },
];
