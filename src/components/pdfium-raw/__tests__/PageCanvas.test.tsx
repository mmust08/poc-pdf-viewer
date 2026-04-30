import { render } from '@testing-library/react'
import { PageCanvas } from '../PageCanvas'

describe('PageCanvas', () => {
  function makeContainer() {
    const el = document.createElement('div')
    Object.defineProperties(el, {
      clientWidth: { value: 1000 },
      clientHeight: { value: 800 },
      scrollTop: { value: 0, writable: true },
      scrollLeft: { value: 0, writable: true },
      getBoundingClientRect: {
        value: () => ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800 }),
      },
    })
    return { current: el } as React.RefObject<HTMLDivElement>
  }

  it('renders a wrapper div with correct dimensions', () => {
    const requestRender = vi.fn(() => 1)
    const containerRef = makeContainer()

    const { container } = render(
      <PageCanvas
        requestRender={requestRender}
        pageIndex={0}
        scale={2}
        widthPt={595}
        heightPt={842}
        containerRef={containerRef}
        scrollVersion={0}
        docVersion={1}
      />,
    )

    const wrapper = container.firstChild as HTMLDivElement
    expect(wrapper.style.width).toBe(`${Math.round(595 * 2)}px`)
    expect(wrapper.style.height).toBe(`${Math.round(842 * 2)}px`)
  })

  it('renders children (MarksOverlay slot)', () => {
    const requestRender = vi.fn(() => 1)
    const containerRef = makeContainer()

    const { getByText } = render(
      <PageCanvas
        requestRender={requestRender}
        pageIndex={0}
        scale={1}
        widthPt={595}
        heightPt={842}
        containerRef={containerRef}
        scrollVersion={0}
        docVersion={1}
      >
        <div>Test Overlay</div>
      </PageCanvas>,
    )

    expect(getByText('Test Overlay')).toBeInTheDocument()
  })

  it('calls requestRender when page is visible', async () => {
    const requestRender = vi.fn(() => 1)
    const containerRef = makeContainer()

    const { container } = render(
      <PageCanvas
        requestRender={requestRender}
        pageIndex={0}
        scale={1}
        widthPt={595}
        heightPt={842}
        containerRef={containerRef}
        scrollVersion={0}
        docVersion={1}
      />,
    )

    // Mock getBoundingClientRect so the page appears visible within the container
    const wrapper = container.firstChild as HTMLElement
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 595, bottom: 842, width: 595, height: 842, x: 0, y: 0, toJSON: () => {},
    })

    // Trigger re-render by changing scrollVersion (via key change or rerender)
    render(
      <PageCanvas
        requestRender={requestRender}
        pageIndex={0}
        scale={1}
        widthPt={595}
        heightPt={842}
        containerRef={containerRef}
        scrollVersion={1}
        docVersion={1}
      />,
      { container },
    )

    await vi.waitFor(() => {
      expect(requestRender).toHaveBeenCalled()
    })
  })

  it('skips requestRender when page is not visible (zero-size rect)', () => {
    const requestRender = vi.fn(() => 1)
    const containerRef = makeContainer()

    render(
      <PageCanvas
        requestRender={requestRender}
        pageIndex={5}
        scale={1}
        widthPt={595}
        heightPt={842}
        containerRef={containerRef}
        scrollVersion={0}
        docVersion={1}
      />,
    )

    // In happy-dom, getBoundingClientRect returns zeros, so the component
    // correctly determines the page is not visible and skips rendering
    expect(requestRender).not.toHaveBeenCalled()
  })
})
