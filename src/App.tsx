import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import PdfJsPrototype from './pages/PdfJsPrototype'
import FabricPrototype from './pages/FabricPrototype'
import LeafletPrototype from './pages/LeafletPrototype'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/prototype/pdfjs" element={<PdfJsPrototype />} />
        <Route path="/prototype/fabric" element={<FabricPrototype />} />
        <Route path="/prototype/leaflet" element={<LeafletPrototype />} />
      </Routes>
    </BrowserRouter>
  )
}
