import { useMemo } from 'react'
import { createPluginRegistration } from '@embedpdf/core'
import { EmbedPDF } from '@embedpdf/core/react'
import { usePdfiumEngine } from '@embedpdf/engines/react'
import { DocumentManagerPluginPackage, DocumentContent } from '@embedpdf/plugin-document-manager/react'
import { ViewportPluginPackage } from '@embedpdf/plugin-viewport/react'
import { ScrollPluginPackage } from '@embedpdf/plugin-scroll/react'
import { RenderPluginPackage } from '@embedpdf/plugin-render/react'
import { ZoomPluginPackage, ZoomMode } from '@embedpdf/plugin-zoom/react'
import { PanPluginPackage } from '@embedpdf/plugin-pan/react'
import { InteractionManagerPluginPackage } from '@embedpdf/plugin-interaction-manager'
import EmbedPdfViewer from '../components/embedpdf/EmbedPdfViewer'

export default function EmbedPdfPrototype() {
  const { engine, isLoading } = usePdfiumEngine()

  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: '/sample-blueprint.pdf' }],
      }),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(ScrollPluginPackage),
      createPluginRegistration(RenderPluginPackage),
      createPluginRegistration(InteractionManagerPluginPackage),
      createPluginRegistration(ZoomPluginPackage, {
        defaultZoomLevel: ZoomMode.FitWidth,
      }),
      createPluginRegistration(PanPluginPackage, {
        defaultMode: 'always' as const,
      }),
    ],
    [],
  )

  if (isLoading || !engine) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: 'white',
        }}
      >
        Loading PDF engine…
      </div>
    )
  }

  return (
    <EmbedPDF engine={engine} plugins={plugins}>
      {({ activeDocumentId }) =>
        activeDocumentId ? (
          <DocumentContent documentId={activeDocumentId}>
            {({ isLoaded }) =>
              isLoaded ? (
                <EmbedPdfViewer documentId={activeDocumentId} />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    color: 'white',
                  }}
                >
                  Loading document…
                </div>
              )
            }
          </DocumentContent>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100vh',
              color: 'white',
            }}
          >
            No document loaded
          </div>
        )
      }
    </EmbedPDF>
  )
}
