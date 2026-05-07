import { useState, useEffect } from 'react'
import { PdfJsCanvasViewer } from '../components/PdfJsCanvasViewer/PdfJsCanvasViewer'

export default function PdfJsCanvasViewerPrototype() {
  const [pdfUrl, setPdfUrl] = useState(`${import.meta.env.BASE_URL}sample-blueprint.pdf`)
  const [prevBlobUrl, setPrevBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (prevBlobUrl && prevBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prevBlobUrl)
      }
    }
  }, [prevBlobUrl])

  const handleFileUpload = (fileUrl: string) => {
    if (prevBlobUrl && prevBlobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(prevBlobUrl)
    }
    setPrevBlobUrl(fileUrl)
    setPdfUrl(fileUrl)
  }

  return <PdfJsCanvasViewer pdfUrl={pdfUrl} onFileChange={handleFileUpload} />
}
