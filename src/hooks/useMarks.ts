import { useState } from 'react'
import { HARDCODED_MARKS, PdfMark } from '../types/marks'

export interface UseMarksResult {
  marks: PdfMark[]
  userMarkCount: number
  addMark: (x: number, y: number) => void
  clearUserMarks: () => void
}

export function useMarks(): UseMarksResult {
  const [userMarks, setUserMarks] = useState<PdfMark[]>([])

  const marks = [...HARDCODED_MARKS, ...userMarks]

  function addMark(x: number, y: number) {
    const n = userMarks.length + 1
    const id = `U${n}`
    setUserMarks((prev) => [
      ...prev,
      { id, x: Math.round(x), y: Math.round(y), label: `${id} — (${Math.round(x)}, ${Math.round(y)})` },
    ])
  }

  function clearUserMarks() {
    setUserMarks([])
  }

  return { marks, userMarkCount: userMarks.length, addMark, clearUserMarks }
}
