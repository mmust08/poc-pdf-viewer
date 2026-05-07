import { useState, useEffect, useCallback } from 'react'
import { PdfMark, HARDCODED_MARKS } from '../types/marks'

const MARKS_STORAGE_PREFIX = 'pdfmarks:'

export interface CanvasMarksHook {
  marks: PdfMark[]
  selectedId: string | null
  addMark: (x: number, y: number) => void
  moveMark: (id: string, x: number, y: number) => void
  selectMark: (id: string | null) => void
  toggleSelectMark: (id: string) => void
  clearMarks: () => void
}

const MARK_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7']

function assignColor(id: string): string {
  const charCode = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  return MARK_COLORS[charCode % MARK_COLORS.length]
}

export function useCanvasMarks(pdfName: string): CanvasMarksHook {
  const [marks, setMarks] = useState<PdfMark[]>(
    HARDCODED_MARKS.map((m) => ({ ...m, color: assignColor(m.id) }))
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MARKS_STORAGE_PREFIX + pdfName)
      const userMarks = stored ? JSON.parse(stored) : []
      const allMarks = [
        ...HARDCODED_MARKS.map((m) => ({ ...m, color: assignColor(m.id) })),
        ...userMarks.map((m: PdfMark) => ({ ...m, color: m.color || assignColor(m.id) })),
      ]
      setMarks(allMarks)
    } catch {
      setMarks(HARDCODED_MARKS.map((m) => ({ ...m, color: assignColor(m.id) })))
    }
  }, [pdfName])

  useEffect(() => {
    try {
      const userMarks = marks.filter((m) => !HARDCODED_MARKS.some((h) => h.id === m.id))
      if (userMarks.length > 0) {
        localStorage.setItem(MARKS_STORAGE_PREFIX + pdfName, JSON.stringify(userMarks))
      } else {
        localStorage.removeItem(MARKS_STORAGE_PREFIX + pdfName)
      }
    } catch { /* ignore */ }
  }, [marks, pdfName])

  const addMark = useCallback((x: number, y: number) => {
    setMarks((prev) => {
      const userMarks = prev.filter((m) => !HARDCODED_MARKS.some((h) => h.id === m.id))
      const n = userMarks.length + 1
      const id = `U${n}`
      return [
        ...prev,
        {
          id,
          page: 1,
          x,
          y,
          label: `${id} — (${Math.round(x)}, ${Math.round(y)})`,
          color: assignColor(id),
        },
      ]
    })
  }, [])

  const moveMark = useCallback((id: string, x: number, y: number) => {
    setMarks((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, x, y, label: `${id} — (${Math.round(x)}, ${Math.round(y)})` }
          : m
      )
    )
  }, [])

  const selectMark = useCallback((id: string | null) => {
    setSelectedId(id)
  }, [])

  const toggleSelectMark = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }, [])

  const clearMarks = useCallback(() => {
    setMarks([...HARDCODED_MARKS])
    setSelectedId(null)
  }, [])

  return { marks, selectedId, addMark, moveMark, selectMark, toggleSelectMark, clearMarks }
}
