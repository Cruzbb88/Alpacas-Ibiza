'use client'

/**
 * Universal booking CTA component.
 *
 * Wraps every FareHarbor booking link on the site. Accepts a product slug,
 * resolves the URL via the central product registry, fires analytics, and
 * renders via the shadcn Button (asChild + Radix Slot).
 *
 * Fail-open: unknown slug OR unset item ID → main FareHarbor calendar.
 * Named in CLAUDE.md failsafe map: "BookingButton / getProductBookingUrl fail-open"
 *
 * Usage:
 *   <BookingButton product="meet-herd" />
 *   <BookingButton product="gift-card" label="Buy a gift card" size="lg" />
 *   <BookingButton product="general" label="Book Tour" variant="outline" />
 */
import { Button } from '@/components/ui/button'
import type { ButtonProps } from '@/components/ui/button'
import { getProductBookingUrl } from '@/lib/fareharbor-products'
import type { FareHarborProduct } from '@/lib/fareharbor-products'
import { trackConversion } from '@/lib/analytics'

export interface BookingButtonProps extends Omit<ButtonProps, 'asChild'> {
  /** FareHarbor product slug. Defaults to 'general' (main calendar). */
  product?: FareHarborProduct
  /** Button label. Defaults to 'Book now'. */
  label?: string
  /** Extra metadata passed to analytics. Defaults to label value. */
  analyticsLabel?: string
  /** Optional extra props forwarded to the inner <a> tag (e.g. target, rel). */
  anchorProps?: React.AnchorHTMLAttributes<HTMLAnchorElement>
}

export function BookingButton({
  product = 'general',
  label = 'Book now',
  analyticsLabel,
  className,
  anchorProps,
  ...rest
}: BookingButtonProps) {
  const url = getProductBookingUrl(product)

  function handleClick() {
    try {
      // trackConversion.bookTourClick() takes no args in the current analytics.ts
      trackConversion.bookTourClick()
    } catch {
      // analytics fail-quiet — never block the navigation
    }
  }

  return (
    <Button asChild className={className} {...rest}>
      <a
        href={url}
        onClick={handleClick}
        {...anchorProps}
      >
        {label}
      </a>
    </Button>
  )
}
