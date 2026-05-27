import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductCard } from './product-card'
import type { Product } from './product-card'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
}))

vi.mock('@/lib/config', () => ({
  getFareHarborCategoryUrl: (_cat: string) => 'https://fareharbor.com/embeds/book/alpacasibiza/',
}))

const product: Product = {
  id: 'weave-01',
  name: 'Woven Bag',
  price: 49.99,
  image: '/bag.jpg',
  category: 'woven',
  description: 'Hand-woven alpaca bag.',
}

describe('ProductCard', () => {
  it('renders product name', () => {
    render(<ProductCard product={product} />)
    expect(screen.getByText('Woven Bag')).toBeInTheDocument()
  })

  it('renders formatted price with € symbol', () => {
    render(<ProductCard product={product} />)
    expect(screen.getByText('€49.99')).toBeInTheDocument()
  })

  it('renders product description', () => {
    render(<ProductCard product={product} />)
    expect(screen.getByText('Hand-woven alpaca bag.')).toBeInTheDocument()
  })

  it('wishlist button calls onWishlist when provided', async () => {
    const user = userEvent.setup()
    const onWishlist = vi.fn()
    render(<ProductCard product={product} onWishlist={onWishlist} />)
    // Heart icon button — find by its parent button (no aria-label on button itself in source)
    const heartBtn = screen.getByRole('button', { name: '' })
    await user.click(heartBtn)
    expect(onWishlist).toHaveBeenCalledOnce()
  })

  it('wishlist button is absent when onWishlist not provided', () => {
    render(<ProductCard product={product} />)
    // no buttons rendered when neither callback is provided
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('cart button calls onAddToCart when provided', async () => {
    const user = userEvent.setup()
    const onAddToCart = vi.fn()
    render(<ProductCard product={product} onAddToCart={onAddToCart} />)
    await user.click(screen.getByRole('button'))
    expect(onAddToCart).toHaveBeenCalledOnce()
  })

  it('booking link uses category URL when fareHarborItemId is absent', () => {
    render(<ProductCard product={product} />)
    const links = screen.getAllByRole('link') as HTMLAnchorElement[]
    expect(links.some((a) => a.href.includes('fareharbor.com'))).toBe(true)
  })

  it('fareHarborItemId overrides booking URL with item substitution', () => {
    render(<ProductCard product={{ ...product, fareHarborItemId: 'ITEM-42' }} />)
    const links = screen.getAllByRole('link') as HTMLAnchorElement[]
    const bookingLink = links.find((a) => a.href.includes('fareharbor.com'))
    expect(bookingLink?.href).toContain('ITEM-42')
  })
})
