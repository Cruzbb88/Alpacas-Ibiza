'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Heart } from 'lucide-react'
import { getFareHarborCategoryUrl } from '@/lib/config'

export interface Product {
  id: string
  name: string
  price: number
  image: string
  category: 'woven' | 'commission' | 'alcaca'
  description: string
  rating?: number
  reviews?: number
  fareHarborItemId?: string
}

interface ProductCardProps {
  product: Product
  onAddToCart?: () => void
  onWishlist?: () => void
}

export function ProductCard({
  product,
  onAddToCart,
  onWishlist,
}: ProductCardProps) {
  // determine booking link: use specific item (if product contains one) or category URL
  const bookingHref =
    product.fareHarborItemId
      ? getFareHarborCategoryUrl(product.category)?.replace(
          /items=[^&]+/,
          `items=${encodeURIComponent(product.fareHarborItemId)}`
        )
      : getFareHarborCategoryUrl(product.category) || `/shop/${product.category}/${product.id}`

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow border-border/50 group">
      {/* Image */}
      <Link href={bookingHref}>
        <div className="relative aspect-square bg-secondary/20 overflow-hidden">
          <img
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-medium">
            {product.category}
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link href={`/shop/${product.category}/${product.id}`}>
          <h3 className="font-semibold text-foreground hover:text-accent transition-colors mb-1 line-clamp-2">
            {product.name}
          </h3>
        </Link>

        <p className="text-sm text-foreground/70 mb-3 line-clamp-2">
          {product.description}
        </p>

        {product.rating && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={i < Math.floor(product.rating!) ? 'text-accent' : 'text-muted'}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-xs text-foreground/50">
              ({product.reviews || 0})
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-bold text-primary">
            {new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR' }).format(product.price)}
          </div>
          <div className="flex gap-2">
            {onWishlist && (
              <button
                onClick={onWishlist}
                className="p-2 hover:bg-secondary rounded-lg transition-colors text-foreground/60 hover:text-accent"
              >
                <Heart className="h-4 w-4" />
              </button>
            )}
            {onAddToCart && (
              <Button
                onClick={onAddToCart}
                size="sm"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <ShoppingCart className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

interface ProductGridProps {
  products: Product[]
  onAddToCart?: (product: Product) => void
  onWishlist?: (product: Product) => void
}

export function ProductGrid({
  products,
  onAddToCart,
  onWishlist,
}: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={() => onAddToCart?.(product)}
          onWishlist={() => onWishlist?.(product)}
        />
      ))}
    </div>
  )
}
