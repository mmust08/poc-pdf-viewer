import { useState, useEffect } from 'react'
import { PdfMark, HARDCODED_MARKS } from '../../types/marks'

const MARKS_STORAGE_PREFIX = 'pdfmarks:'

export function useMarks(pdfName: string, loading: boolean) {
  const [userMarks, setUserMarks] = useState<PdfMark[]>([])

  // ── Persist user marks to localStorage per filename ──────────────────
  useEffect(() => {
    if (loading) return
    try {
      if (userMarks.length > 0) {
        localStorage.setItem(MARKS_STORAGE_PREFIX + pdfName, JSON.stringify(userMarks))
      } else {
        localStorage.removeItem(MARKS_STORAGE_PREFIX + pdfName)
      }
    } catch { /* storage full or unavailable — silently ignore */ }
  }, [userMarks, pdfName, loading])

  function addMark(page: number, x: number, y: number) {
    setUserMarks((prev) => {
      const n = prev.length + 1
      const id = `U${n}`
      return [
        ...prev,
        { id, page, x, y, label: `${id} — (${Math.round(x)}, ${Math.round(y)})` },
      ]
    })
  }

  function clearMarks() {
    setUserMarks([])
  }

  /** Load persisted marks for a filename from localStorage. */
  function restoreMarks(filename: string) {
    try {
      const stored = localStorage.getItem(MARKS_STORAGE_PREFIX + filename)
      setUserMarks(stored ? JSON.parse(stored) : [])
    } catch {
      setUserMarks([])
    }
  }

  /** Persist current marks under the current filename, then clear state.
   *  Call before switching to a different PDF. */
  function saveAndReset() {
    try {
      if (userMarks.length > 0) {
        localStorage.setItem(MARKS_STORAGE_PREFIX + pdfName, JSON.stringify(userMarks))
      }
    } catch { /* ignore */ }
    setUserMarks([])
  }

  /** Combined hardcoded + user marks for a specific page. */
  function getMarksForPage(pageNumber: number): PdfMark[] {
    return [
      ...(pdfName === 'sample-blueprint.pdf'
        ? HARDCODED_MARKS.filter((m) => m.page === pageNumber)
        : []),
      ...userMarks.filter((m) => m.page === pageNumber),
    ]
  }

  return { userMarks, addMark, clearMarks, restoreMarks, saveAndReset, getMarksForPage }
}
