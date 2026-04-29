import { useState, useEffect, useCallback } from 'react'
import { PdfMark, HARDCODED_MARKS } from '../../types/marks'

const MARKS_STORAGE_PREFIX = 'pdfmarks:'

export function useMarks(pdfName: string, loading: boolean) {
  const [userMarks, setUserMarks] = useState<PdfMark[]>([])

  useEffect(() => {
    if (loading) return
    try {
      if (userMarks.length > 0) {
        localStorage.setItem(MARKS_STORAGE_PREFIX + pdfName, JSON.stringify(userMarks))
      } else {
        localStorage.removeItem(MARKS_STORAGE_PREFIX + pdfName)
      }
    } catch { /* storage full or unavailable */ }
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

  function deleteMark(id: string) {
    setUserMarks((prev) => prev.filter((m) => m.id !== id))
  }

  function clearMarks() {
    setUserMarks([])
  }

  function restoreMarks(filename: string) {
    try {
      const stored = localStorage.getItem(MARKS_STORAGE_PREFIX + filename)
      setUserMarks(stored ? JSON.parse(stored) : [])
    } catch {
      setUserMarks([])
    }
  }

  function saveAndReset() {
    try {
      if (userMarks.length > 0) {
        localStorage.setItem(MARKS_STORAGE_PREFIX + pdfName, JSON.stringify(userMarks))
      }
    } catch { /* ignore */ }
    setUserMarks([])
  }

  const getAllMarks = useCallback((): PdfMark[] => {
    const hardcoded = pdfName === 'sample-blueprint.pdf' ? HARDCODED_MARKS : []
    return [...hardcoded, ...userMarks]
  }, [pdfName, userMarks])

  function getMarksForPage(pageNumber: number): PdfMark[] {
    return [
      ...(pdfName === 'sample-blueprint.pdf'
        ? HARDCODED_MARKS.filter((m) => m.page === pageNumber)
        : []),
      ...userMarks.filter((m) => m.page === pageNumber),
    ]
  }

  function exportMarksJSON(): string {
    return JSON.stringify(getAllMarks(), null, 2)
  }

  return {
    userMarks,
    addMark,
    deleteMark,
    clearMarks,
    restoreMarks,
    saveAndReset,
    getAllMarks,
    getMarksForPage,
    exportMarksJSON,
  }
}
