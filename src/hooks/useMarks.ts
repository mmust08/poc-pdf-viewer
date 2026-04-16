import { useState } from 'react'
import { HARDCODED_MARKS, PdfMark } from '../types/marks'

export interface UseMarksResult {
  marks: PdfMark[]          // marks for the current page only
  allMarks: PdfMark[]       // all marks across all pages
  userMarkCount: number     // user marks on the current page
  addMark: (x: number, y: number) => void
  clearUserMarks: () => void
}

export function useMarks(currentPage: number): UseMarksResult {
  const [userMarks, setUserMarks] = useState<PdfMark[]>([])

  const hardcodedForPage = HARDCODED_MARKS.filter((m) => m.page === currentPage)
  const userForPage = userMarks.filter((m) => m.page === currentPage)
  const marks = [...hardcodedForPage, ...userForPage]

  function addMark(x: number, y: number) {
    const n = userMarks.length + 1
    const id = `U${n}`
    setUserMarks((prev) => [
      ...prev,
      {
        id,
        page: currentPage,
        x: Math.round(x),
        y: Math.round(y),
        label: `${id} — (${Math.round(x)}, ${Math.round(y)})`,
      },
    ])
  }

  function clearUserMarks() {
    setUserMarks([])
  }

  return {
    marks,
    allMarks: [...HARDCODED_MARKS, ...userMarks],
    userMarkCount: userForPage.length,
    addMark,
    clearUserMarks,
  }
}
