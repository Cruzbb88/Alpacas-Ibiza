import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionHeader } from './section-header'

describe('SectionHeader', () => {
  it('renders title text', () => {
    render(<SectionHeader title="Hello World" />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders optional subtitle when provided', () => {
    render(<SectionHeader title="T" subtitle="Sub text" />)
    expect(screen.getByText('Sub text')).toBeInTheDocument()
  })

  it('omits subtitle element when not provided', () => {
    render(<SectionHeader title="T" />)
    expect(screen.queryByText(/sub/i)).not.toBeInTheDocument()
  })

  it('defaults to h2', () => {
    render(<SectionHeader title="Default level" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Default level')
  })

  it('renders h1 when level=1', () => {
    render(<SectionHeader title="Top" level={1} />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('renders h3 when level=3', () => {
    render(<SectionHeader title="Sub" level={3} />)
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
  })

  it('applies text-center class for center alignment (default)', () => {
    const { container } = render(<SectionHeader title="T" />)
    expect(container.firstChild).toHaveClass('text-center')
  })

  it('applies text-left class for left alignment', () => {
    const { container } = render(<SectionHeader title="T" alignment="left" />)
    expect(container.firstChild).toHaveClass('text-left')
  })

  it('appends custom className to wrapper', () => {
    const { container } = render(<SectionHeader title="T" className="mt-0" />)
    expect(container.firstChild).toHaveClass('mt-0')
  })
})
