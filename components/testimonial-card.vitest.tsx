import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestimonialCard } from './testimonial-card'

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => {
    const { fill: _fill, ...rest } = props
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />
  },
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}))

vi.mock('@/lib/brand', () => ({
  BRAND_THEME_COLOR_HEX: '#6B7B5A',
}))

describe('TestimonialCard', () => {
  it('renders author name', () => {
    render(<TestimonialCard author="Jane Doe" body="Great visit!" />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('renders body text', () => {
    render(<TestimonialCard author="Jane" body="Loved the alpacas." />)
    expect(screen.getByText(/Loved the alpacas/)).toBeInTheDocument()
  })

  it('star row aria-label reflects rating', () => {
    render(<TestimonialCard author="Jane" body="Nice" rating={4} />)
    expect(screen.getByRole('img', { name: '4 out of 5 stars' })).toBeInTheDocument()
  })

  it('omits stars when rating is null', () => {
    render(<TestimonialCard author="Jane" body="Nice" rating={null} />)
    expect(screen.queryByRole('img', { name: /stars/ })).not.toBeInTheDocument()
  })

  it('renders skeleton (not blockquote) when body === __UNMAPPED__', () => {
    render(<TestimonialCard author="Jane" body="__UNMAPPED__" />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
    expect(screen.queryByRole('blockquote')).not.toBeInTheDocument()
  })

  it('renders blockquote for normal body', () => {
    render(<TestimonialCard author="Jane" body="Normal text" />)
    expect(screen.queryAllByTestId('skeleton')).toHaveLength(0)
  })

  it('renders Google source badge', () => {
    render(<TestimonialCard author="Jane" body="Good" source="google" />)
    expect(screen.getByText('Google')).toBeInTheDocument()
  })

  it('renders Tripadvisor source badge', () => {
    render(<TestimonialCard author="Jane" body="Good" source="tripadvisor" />)
    expect(screen.getByText('Tripadvisor')).toBeInTheDocument()
  })

  it('renders Facebook source badge', () => {
    render(<TestimonialCard author="Jane" body="Good" source="facebook" />)
    expect(screen.getByText('Facebook')).toBeInTheDocument()
  })

  it('omits source badge when source is null', () => {
    render(<TestimonialCard author="Jane" body="Good" source={null} />)
    expect(screen.queryByText('Google')).not.toBeInTheDocument()
  })

  it('renders date when provided', () => {
    render(<TestimonialCard author="Jane" body="Good" date="March 2024" />)
    expect(screen.getByText('March 2024')).toBeInTheDocument()
  })
})
