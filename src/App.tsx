import { HashRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import PdfJsPrototype from './pages/PdfJsPrototype'
import PdfJsCanvasViewerPrototype from './pages/PdfJsCanvasViewerPrototype'
import FabricPrototype from './pages/FabricPrototype'
import LeafletPrototype from './pages/LeafletPrototype'
import EmbedPdfPrototype from './pages/EmbedPdfPrototype'
import PdfiumRawPrototype from './pages/PdfiumRawPrototype'
import NutrientPrototype from './pages/NutrientPrototype'
import DecisionMatrixPage from './pages/DecisionMatrixPage'
import PdfJsVariantsMatrixPage from './pages/PdfJsVariantsMatrixPage'
import NotesPage from './pages/NotesPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/prototype/pdfjs" element={<PdfJsPrototype />} />
        <Route path="/prototype/pdfjs-canvas" element={<PdfJsCanvasViewerPrototype />} />
        <Route path="/prototype/fabric" element={<FabricPrototype />} />
        <Route path="/prototype/leaflet" element={<LeafletPrototype />} />
        <Route path="/prototype/embedpdf" element={<EmbedPdfPrototype />} />
        <Route path="/prototype/pdfium-raw" element={<PdfiumRawPrototype />} />
        <Route path="/prototype/nutrient" element={<NutrientPrototype />} />
        <Route path="/decision-matrix" element={<DecisionMatrixPage />} />
        <Route path="/decision-matrix/pdfjs-variants" element={<PdfJsVariantsMatrixPage />} />
        <Route path="/notes/:filename" element={<NotesPage />} />
      </Routes>
    </HashRouter>
  )
}
