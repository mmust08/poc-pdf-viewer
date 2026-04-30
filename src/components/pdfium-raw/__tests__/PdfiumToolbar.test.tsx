import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PdfiumToolbar } from '../PdfiumToolbar'

function renderToolbar(overrides = {}) {
  const props = {
    pdfName: 'test.pdf',
    currentPage: 3,
    pageCount: 10,
    zoomPercent: 150,
    rendering: false,
    userMarkCount: 0,
    onZoom: vi.fn(),
    onFileChange: vi.fn(),
    onClearMarks: vi.fn(),
    onUploadClick: vi.fn(),
    ...overrides,
  }
  return {
    ...render(
      <MemoryRouter>
        <PdfiumToolbar {...props} />
      </MemoryRouter>,
    ),
    props,
  }
}

describe('PdfiumToolbar', () => {
  it('renders page count display', () => {
    renderToolbar()
    expect(screen.getByText('Page 3 / 10')).toBeInTheDocument()
  })

  it('renders zoom percentage', () => {
    renderToolbar()
    expect(screen.getByText('150%')).toBeInTheDocument()
  })

  it('calls onZoom("in") when + button clicked', () => {
    const { props } = renderToolbar()
    fireEvent.click(screen.getByTitle('Zoom in'))
    expect(props.onZoom).toHaveBeenCalledWith('in')
  })

  it('calls onZoom("out") when - button clicked', () => {
    const { props } = renderToolbar()
    fireEvent.click(screen.getByTitle('Zoom out'))
    expect(props.onZoom).toHaveBeenCalledWith('out')
  })

  it('calls onUploadClick when Upload PDF button clicked', () => {
    const { props } = renderToolbar()
    fireEvent.click(screen.getByTitle('Upload a PDF'))
    expect(props.onUploadClick).toHaveBeenCalled()
  })

  it('renders mark count and clear button when marks exist', () => {
    renderToolbar({ userMarkCount: 3 })
    expect(screen.getByText('3 user marks')).toBeInTheDocument()
    expect(screen.getByTitle('Remove all user marks')).toBeInTheDocument()
  })

  it('does not render mark controls when no marks', () => {
    renderToolbar({ userMarkCount: 0 })
    expect(screen.queryByText(/user mark/)).not.toBeInTheDocument()
  })

  it('calls onClearMarks when clear button clicked', () => {
    const { props } = renderToolbar({ userMarkCount: 2 })
    fireEvent.click(screen.getByTitle('Remove all user marks'))
    expect(props.onClearMarks).toHaveBeenCalled()
  })

  it('renders PDF filename', () => {
    renderToolbar({ pdfName: 'my-doc.pdf' })
    expect(screen.getByText(/my-doc\.pdf/)).toBeInTheDocument()
  })
})
