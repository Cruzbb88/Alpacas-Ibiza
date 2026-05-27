import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestimonialGrid } from './testimonial-grid'

// TestimonialGrid renders TestimonialCard — stub the same deps
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => {
    const { fill: _fill, ...rest } = props
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />
  },
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}))

vi.mock('@/lib/brand', () => ({
  BRAND_THEME_COLOR_HEX: '#6B7B5A',
}))

const items = [
  { author: 'Alice', body: 'Great!', rating: 5 as const },
  { author: 'Bob', body: 'Loved it.', rating: 4 as const },
  { author: 'Carol', body: 'Amazing.', rating: 5 as const },
]

describe('TestimonialGrid', () => {
  it('renders the title heading', () => {
    render(<TestimonialGrid items={items} title="What Visitors Say" />)
    expect(screen.getByRole('heading', { name: 'What Visitors Say' })).toBeInTheDocument()
  })

  it('heading id matches section aria-labelledby', () => {
    const { container } = render(<TestimonialGrid items={items} title="Reviews" />)
    const section = container.querySelector('section')
    const heading = container.querySelector('#testimonials-heading')
    expect(section).toHaveAttribute('aria-labelledby', 'testimonials-heading')
    expect(heading).toBeInTheDocument()
  })

  it('renders all items', () => {
    render(<TestimonialGrid items={items} title="Reviews" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carol')).toBeInTheDocument()
  })

  it('applies 2-column grid class when maxColumns=2', () => {
    const { container } = render(
      <TestimonialGrid items={items} title="T" maxColumns={2} />
    )
    const grid = container.querySelector('.grid')
    expect(grid?.className).toContain('md:grid-cols-2')
    expect(grid?.className).not.toContain('lg:grid-cols-3')
  })

  it('applies 4-column grid class when maxColumns=4', () => {
    const { container } = render(
      <TestimonialGrid items={items} title="T" maxColumns={4} />
    )
    const grid = container.querySelector('.grid')
    expect(grid?.className).toContain('lg:grid-cols-4')
  })

  it('defaults to 3-column grid', () => {
    const { container } = render(<TestimonialGrid items={items} title="T" />)
    const grid = container.querySelector('.grid')
    expect(grid?.className).toContain('lg:grid-cols-3')
  })
})
