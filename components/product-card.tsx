'use client'

/**
 * ProductCard — e-commerce card for the shop (woven / commission / alcaca).
 *
 * Backward-compatible with the legacy API used by tests:
 *   - `category: 'woven' | 'commission' | 'alcaca'`
 *   - `image: string` (now `string | null`; `null` → UNMAPPED placeholder)
 *   - `description: string` (now optional)
 *   - `rating` / `reviews` (legacy alias; new code uses `reviewCount`)
 *   - `fareHarborItemId` (legacy booking link)
 *   - `onAddToCart` / `onWishlist` callbacks (still honored when passed)
 *
 * New additive fields:
 *   - `salePrice`, `hoverImage`, `badge`, `status`, `reviewCount`, `href`, `imageAlt`
 *
 * UNMAPPED placeholder pattern mirrors AlpacaCard:
 *   image === null  →  render named placeholder, never a broken <img>.
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart } from 'lucide-react'
import type { Locale } from '@/i18n.config'
import { useLocaleT } from '@/lib/locale-context'
import { getFareHarborCategoryUrl } from '@/lib/config'
import { formatPriceForLocale } from '@/lib/format-price'

export type ProductStatus = 'in-stock' | 'low-stock' | 'sold-out' | 'made-to-order'

export interface Product {
  id: string
  name: string
  /** in EUR */
  price: number
  /** Optional sale price — when set, original price shown struck-through. */
  salePrice?: number
  /** null = UNMAPPED placeholder */
  image: string | null
  imageAlt?: string
  /** Second image, cross-faded in on hover. */
  hoverImage?: string | null
  description?: string
  /** Legacy: category drives FareHarbor URL. Kept for back-compat. */
  category?: 'woven' | 'commission' | 'alcaca' | string
  /** Star rating 1–5. */
  rating?: number
  /** Review count (new name). */
  reviewCount?: number
  /** Legacy alias for reviewCount. */
  reviews?: number
  /** Badge label: "New", "Limited", etc. */
  badge?: string
  /** Inventory state — affects CTA. */
  status?: ProductStatus
  /** When set, image + title link here. */
  href?: string
  /** Legacy: per-item FareHarbor override. */
  fareHarborItemId?: string
}

export interface ProductCardProps {
  product: Product
  /** Optional — defaults to 'en' so legacy callers without locale still work. */
  locale?: Locale
  /** Compact variant for sidebars / related products. */
  variant?: 'default' | 'compact'
  /** Legacy callback — invoked from the cart button when provided. */
  onAddToCart?: () => void
  /** Legacy callback — invoked from the heart button when provided. */
  onWishlist?: () => void
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** @deprecated Replaced by formatPriceForLocale from @/lib/format-price */
function formatEUR(locale: Locale, amount: number): string {
  return formatPriceForLocale(amount, locale)
}

function Star({ filled, half }: { filled: boolean; half?: boolean }) {
  // Solid star path; `half` uses a clipPath to render the left half only.
  const id = `star-half-${Math.random().toString(36).slice(2, 9)}`
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${filled || half ? 'text-accent' : 'text-muted-foreground/30'}`}
      aria-hidden="true"
    >
      {half && (
        <defs>
          <clipPath id={id}>
            <rect x="0" y="0" width="10" height="20" />
          </clipPath>
        </defs>
      )}
      {filled && (
        <path
          fill="currentColor"
          d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85z"
        />
      )}
      {half && (
        <>
          <path
            fill="currentColor"
            clipPath={`url(#${id})`}
            d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85z"
          />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85z"
          />
        </>
      )}
      {!filled && !half && (
        <path
          fill="currentColor"
          d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85z"
        />
      )}
    </svg>
  )
}

function StarRating({ rating, count, label }: { rating: number; count?: number; label: string }) {
  const stars = [0, 1, 2, 3, 4].map((i) => {
    const filled = rating >= i + 1
    const half = !filled && rating > i && rating < i + 1
    return <Star key={i} filled={filled} half={half} />
  })
  return (
    <div
      className="flex items-center gap-1.5"
      role="img"
      aria-label={label}
    >
      <div className="flex gap-0.5">{stars}</div>
      {typeof count === 'number' && count > 0 && (
        <span className="text-xs text-foreground/50">({count})</span>
      )}
    </div>
  )
}

function buildLegacyHref(product: Product): string | undefined {
  if (!product.category) return undefined
  // Only the legacy 3-category union has a FareHarbor URL helper.
  if (product.category === 'woven' || product.category === 'commission' || product.category === 'alcaca') {
    const base = getFareHarborCategoryUrl(product.category)
    if (product.fareHarborItemId && base) {
      return base.replace(/items=[^&]+/, `items=${encodeURIComponent(product.fareHarborItemId)}`)
    }
    return base || `/shop/${product.category}/${product.id}`
  }
  return undefined
}

export function ProductCard({
  product,
  locale = 'en' as Locale,
  variant = 'default',
  onAddToCart,
  onWishlist,
}: ProductCardProps) {
  const translate = useLocaleT()
  const [hovered, setHovered] = useState(false)

  const isCompact = variant === 'compact'
  const status: ProductStatus = product.status ?? 'in-stock'
  const isSoldOut = status === 'sold-out'
  const isLowStock = status === 'low-stock'
  const isMadeToOrder = status === 'made-to-order'

  const reviewCount = product.reviewCount ?? product.reviews
  const hasRating = typeof product.rating === 'number' && product.rating > 0
  const hasImage = product.image != null && product.image !== ''
  const hasHoverImage = product.hoverImage != null && product.hoverImage !== ''

  // Resolve link target. Priority: explicit href → legacy FareHarbor URL → undefined.
  const linkHref = product.href ?? buildLegacyHref(product)

  const contactEmail =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CONTACT_EMAIL) ||
    'info@alpacasibiza.com'

  const slug = slugify(product.name)
  const priceLabel = formatEUR(locale, product.price)
  const salePriceLabel =
    typeof product.salePrice === 'number' ? formatEUR(locale, product.salePrice) : undefined
  const hasSale = salePriceLabel !== undefined

  // CTA resolution.
  let ctaLabel = translate('shop.cta.addToCart', 'Add to cart')
  let ctaHref =
    `mailto:${contactEmail}?subject=` + encodeURIComponent(`Order: ${product.name}`)
  let ctaEvent = 'add_to_cart_click'

  if (isSoldOut) {
    ctaLabel = translate('shop.cta.notifyMe', 'Notify me')
    ctaHref =
      `mailto:${contactEmail}?subject=` + encodeURIComponent(`Notify me: ${product.name}`)
    ctaEvent = 'notify_me_click'
  } else if (isMadeToOrder) {
    ctaLabel = translate('shop.cta.commission', 'Commission this')
    ctaHref = `/${locale}/shop/commission?item=${encodeURIComponent(slug)}`
    ctaEvent = 'commission_click'
  }

  // Card chrome
  const aspect = isCompact ? 'aspect-square' : 'aspect-[3/4]'
  const titleId = `prod-${product.id}-title`

  // Title — optionally wrapped in a Link
  const titleEl = (
    <h3
      id={titleId}
      className={`font-semibold text-foreground line-clamp-2 ${
        isCompact ? 'text-sm' : 'text-base'
      } ${linkHref ? 'group-hover:text-accent transition-colors' : ''}`}
    >
      {product.name}
    </h3>
  )

  return (
    <article
      aria-labelledby={titleId}
      className="group relative bg-background rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image area ───────────────────────────────────────────── */}
      <div
        className={`relative ${aspect} bg-secondary/40 overflow-hidden`}
        aria-label={isSoldOut ? translate('shop.status.soldOut', 'Sold out') : undefined}
      >
        {hasImage ? (
          <ImageOrLink href={linkHref} ariaLabel={product.name}>
            <Image
              src={product.image as string}
              alt={product.imageAlt ?? product.name}
              fill
              sizes={
                isCompact
                  ? '(max-width: 640px) 50vw, 200px'
                  : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
              }
              className={`object-cover transition-transform duration-500 ${
                isSoldOut ? '' : 'group-hover:scale-105'
              } ${hasHoverImage ? 'transition-opacity' : ''} ${
                hasHoverImage && hovered ? 'opacity-0' : 'opacity-100'
              }`}
              priority={false}
            />
            {hasHoverImage && (
              <Image
                src={product.hoverImage as string}
                alt={product.imageAlt ?? product.name}
                fill
                sizes={
                  isCompact
                    ? '(max-width: 640px) 50vw, 200px'
                    : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
                }
                className={`object-cover transition-opacity duration-500 ${
                  isSoldOut ? '' : 'group-hover:scale-105'
                } ${hovered ? 'opacity-100' : 'opacity-0'}`}
                aria-hidden="true"
              />
            )}
          </ImageOrLink>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            aria-label={`${translate('shop.imageComingSoon', 'Photo coming soon')}: ${product.name}`}
          >
            <span className="text-lg font-bold text-muted-foreground/40 px-4 text-center">
              {product.name}
            </span>
          </div>
        )}

        {/* Badge top-left */}
        {product.badge && (
          <span className="absolute top-3 left-3 z-10 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-semibold tracking-wide shadow-sm">
            {product.badge}
          </span>
        )}

        {/* Made-to-order chip top-right */}
        {isMadeToOrder && !isSoldOut && (
          <span className="absolute top-3 right-3 z-10 bg-background/90 text-foreground px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-widest border border-border">
            {translate('shop.status.madeToOrder', 'Made to order')}
          </span>
        )}

        {/* Sold-out overlay */}
        {isSoldOut && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-foreground/40 backdrop-blur-[1px]"
            aria-hidden="true"
          >
            <span className="bg-background/95 text-foreground px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow">
              {translate('shop.status.soldOut', 'Sold out')}
            </span>
          </div>
        )}

        {/* Legacy wishlist (only when callback provided) */}
        {onWishlist && !isSoldOut && (
          <button
            type="button"
            onClick={onWishlist}
            aria-label={translate('shop.cta.wishlist', 'Add to wishlist')}
            className="absolute bottom-3 right-3 z-10 p-2 rounded-full bg-background/90 text-foreground/70 hover:text-accent hover:bg-background transition-colors shadow-sm"
          >
            <Heart className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className={`flex flex-col gap-2 ${isCompact ? 'p-3' : 'p-4'} flex-1`}>
        {/* Category tag */}
        {product.category && (
          <span className="text-xs text-accent uppercase tracking-widest font-semibold">
            {product.category}
          </span>
        )}

        {/* Title (link when href available) */}
        {linkHref ? (
          <Link
            href={linkHref}
            className="focus:outline-none focus:ring-2 focus:ring-accent/50 rounded"
          >
            {titleEl}
          </Link>
        ) : (
          titleEl
        )}

        {/* Description (skipped in compact) */}
        {!isCompact && product.description && (
          <p className="text-sm text-foreground/70 line-clamp-2">{product.description}</p>
        )}

        {/* Rating (skipped in compact) */}
        {!isCompact && hasRating && (
          <StarRating
            rating={product.rating as number}
            count={reviewCount}
            label={`${product.rating} ${translate('shop.outOf5', 'out of 5 stars')}`}
          />
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto pt-1">
          {hasSale ? (
            <>
              <span className="text-lg font-bold text-primary">{salePriceLabel}</span>
              <span className="text-sm text-foreground/50 line-through">{priceLabel}</span>
            </>
          ) : (
            <span className={`${isCompact ? 'text-base' : 'text-lg'} font-bold text-primary`}>
              {priceLabel}
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-1 pt-2">
          {onAddToCart && !isSoldOut && !isMadeToOrder ? (
            // Legacy callback path — preserves prior behavior for existing tests.
            <button
              type="button"
              onClick={onAddToCart}
              data-analytics-event={ctaEvent}
              className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90 transition-colors rounded-lg px-4 py-2 text-sm font-semibold"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              {ctaLabel}
            </button>
          ) : (
            <Link
              href={ctaHref}
              data-analytics-event={ctaEvent}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                isSoldOut
                  ? 'bg-secondary text-foreground hover:bg-secondary/80'
                  : 'bg-accent text-accent-foreground hover:bg-accent/90'
              }`}
            >
              {!isSoldOut && !isMadeToOrder && (
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              )}
              {ctaLabel}
            </Link>
          )}

          {isLowStock && (
            <p className="text-xs font-semibold text-destructive" role="status">
              {translate('shop.status.lowStock', 'Only a few left')}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

/**
 * Helper — wraps image children in a Link when href is set, otherwise renders raw.
 * Keeps the image clickable (alongside the title) without requiring nested anchors.
 */
function ImageOrLink({
  href,
  ariaLabel,
  children,
}: {
  href?: string
  ariaLabel: string
  children: React.ReactNode
}) {
  if (!href) return <>{children}</>
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="absolute inset-0 block focus:outline-none focus:ring-2 focus:ring-accent/50"
    >
      {children}
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────
// ProductGrid — legacy convenience wrapper (kept for back-compat).
// ─────────────────────────────────────────────────────────────────

interface ProductGridProps {
  products: Product[]
  locale?: Locale
  onAddToCart?: (product: Product) => void
  onWishlist?: (product: Product) => void
}

export function ProductGrid({ products, locale, onAddToCart, onWishlist }: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          locale={locale}
          onAddToCart={onAddToCart ? () => onAddToCart(product) : undefined}
          onWishlist={onWishlist ? () => onWishlist(product) : undefined}
        />
      ))}
    </div>
  )
}
