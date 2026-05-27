import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookTourLink } from './book-tour-link'

vi.mock('@/lib/analytics', () => ({
  trackConversion: {
    bookTourClick: vi.fn(),
  },
}))

describe('BookTourLink', () => {
  it('renders an anchor element', () => {
    render(<BookTourLink href="https://fareharbor.com/book">Book</BookTourLink>)
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  it('href is set correctly', () => {
    render(<BookTourLink href="https://fareharbor.com/book">Book</BookTourLink>)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://fareharbor.com/book')
  })

  it('renders children', () => {
    render(<BookTourLink href="/book">Click here</BookTourLink>)
    expect(screen.getByText('Click here')).toBeInTheDocument()
  })

  it('passes target prop to anchor', () => {
    render(<BookTourLink href="/book" target="_blank">Book</BookTourLink>)
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank')
  })

  it('passes rel prop to anchor', () => {
    render(<BookTourLink href="/book" rel="noopener noreferrer">Book</BookTourLink>)
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('applies custom className', () => {
    render(<BookTourLink href="/book" className="btn-primary">Book</BookTourLink>)
    expect(screen.getByRole('link')).toHaveClass('btn-primary')
  })

  it('calls onClick callback when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<BookTourLink href="/book" onClick={onClick}>Book</BookTourLink>)
    await user.click(screen.getByRole('link'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('fires trackConversion.bookTourClick on click', async () => {
    const { trackConversion } = await import('@/lib/analytics')
    const user = userEvent.setup()
    render(<BookTourLink href="/book">Book</BookTourLink>)
    await user.click(screen.getByRole('link'))
    expect(trackConversion.bookTourClick).toHaveBeenCalled()
  })
})
