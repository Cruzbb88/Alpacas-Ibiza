'use client'

import Link from 'next/link'
import type { ComponentType, SVGProps } from 'react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export interface FeatureItem {
  /** Emoji (length <= 4) OR one of the named inline-SVG icon keys. */
  icon?: string
  title: string
  description: string
  /** Optional href to make the entire card clickable. */
  href?: string
  /** Optional small "kicker" text above the title, e.g., "01 · Trust". */
  kicker?: string
  /** When set, an accent-coloured badge in the corner: "New" / "Award-winning". */
  badge?: string
}

export interface FeaturesProps {
  items: FeatureItem[]
  title?: string
  subtitle?: string
  /**
   * Layout:
   *  - '3'          → 1/2/3 column grid (default)
   *  - '6'          → same grid, wraps to 2 rows
   *  - 'asymmetric' → first card spans 2 cols on lg as a hero feature
   */
  layout?: '3' | '6' | 'asymmetric'
  /**
   * Visual style:
   *  - 'cards'    → bordered cards (default)
   *  - 'minimal'  → no borders, icon-left list
   *  - 'icon-top' → centred card, large icon on top
   */
  variant?: 'cards' | 'minimal' | 'icon-top'
  /** Section background variant. */
  background?: 'default' | 'muted' | 'gradient'
  className?: string
}

/* ------------------------------------------------------------------ */
/* Inline SVG icon set (24×24, currentColor stroke)                    */
/* ------------------------------------------------------------------ */

type IconProps = SVGProps<SVGSVGElement>

const svgBase: IconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

function LeafIcon(props: IconProps) {
  return (
    <svg {...svgBase} {...props}>
      <path d="M11 20A7 7 0 0 1 4 13c0-6 7-9 16-9 0 9-3 16-9 16Z" />
      <path d="M4 20c4-6 8-9 13-11" />
    </svg>
  )
}

function HeartIcon(props: IconProps) {
  return (
    <svg {...svgBase} {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  )
}

function SparkleIcon(props: IconProps) {
  return (
    <svg {...svgBase} {...props}>
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="m5.6 5.6 2.8 2.8" />
      <path d="m15.6 15.6 2.8 2.8" />
      <path d="m5.6 18.4 2.8-2.8" />
      <path d="m15.6 8.4 2.8-2.8" />
    </svg>
  )
}

function ShieldIcon(props: IconProps) {
  return (
    <svg {...svgBase} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function PawIcon(props: IconProps) {
  return (
    <svg {...svgBase} {...props}>
      <circle cx="6" cy="11" r="1.6" />
      <circle cx="10" cy="6" r="1.6" />
      <circle cx="14" cy="6" r="1.6" />
      <circle cx="18" cy="11" r="1.6" />
      <path d="M8 18a4 4 0 0 1 8 0c0 2-1.8 3-4 3s-4-1-4-3Z" />
    </svg>
  )
}

function CompassIcon(props: IconProps) {
  return (
    <svg {...svgBase} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5.5-5.5 2 2-5.5 5.5-2Z" />
    </svg>
  )
}

function MountainIcon(props: IconProps) {
  return (
    <svg {...svgBase} {...props}>
      <path d="m3 20 6-10 4 6 2-3 6 7Z" />
      <circle cx="17" cy="6" r="1.5" />
    </svg>
  )
}

function GiftIcon(props: IconProps) {
  return (
    <svg {...svgBase} {...props}>
      <rect x="3" y="8" width="18" height="13" rx="1.5" />
      <path d="M3 12h18" />
      <path d="M12 8v13" />
      <path d="M12 8s-3-5-5.5-3S6 8 12 8Z" />
      <path d="M12 8s3-5 5.5-3S18 8 12 8Z" />
    </svg>
  )
}

function MessageIcon(props: IconProps) {
  return (
    <svg {...svgBase} {...props}>
      <path d="M21 12a8 8 0 0 1-11.6 7.2L4 21l1.8-5.4A8 8 0 1 1 21 12Z" />
    </svg>
  )
}

function SunIcon(props: IconProps) {
  return (
    <svg {...svgBase} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.9 4.9 1.5 1.5" />
      <path d="m17.6 17.6 1.5 1.5" />
      <path d="m4.9 19.1 1.5-1.5" />
      <path d="m17.6 6.4 1.5-1.5" />
    </svg>
  )
}

function AwardIcon(props: IconProps) {
  return (
    <svg {...svgBase} {...props}>
      <circle cx="12" cy="9" r="6" />
      <path d="m8.5 14-1.8 7L12 18l5.3 3-1.8-7" />
    </svg>
  )
}

const ICON_MAP: Record<string, ComponentType<IconProps>> = {
  leaf: LeafIcon,
  heart: HeartIcon,
  sparkle: SparkleIcon,
  shield: ShieldIcon,
  paw: PawIcon,
  compass: CompassIcon,
  mountain: MountainIcon,
  gift: GiftIcon,
  message: MessageIcon,
  sun: SunIcon,
  award: AwardIcon,
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function renderIconContent(icon: string | undefined) {
  if (!icon) return null
  const named = ICON_MAP[icon]
  if (named) {
    const Cmp = named
    return <Cmp />
  }
  // Treat short strings (typically emoji) as a glyph.
  // Emojis frequently span 2–4 code units (surrogate pairs + variation selectors).
  if ([...icon].length <= 2 || icon.length <= 4) {
    return <span aria-hidden="true">{icon}</span>
  }
  return <span aria-hidden="true">{icon}</span>
}

function iconWrapperClass(variant: NonNullable<FeaturesProps['variant']>) {
  switch (variant) {
    case 'minimal':
      return 'w-10 h-10 rounded-lg bg-accent/10 text-accent inline-flex items-center justify-center text-xl shrink-0'
    case 'icon-top':
      return 'inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 text-accent text-3xl mb-5 mx-auto'
    case 'cards':
    default:
      return 'inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent text-2xl mb-4'
  }
}

function backgroundClass(bg: NonNullable<FeaturesProps['background']>) {
  switch (bg) {
    case 'muted':
      return 'bg-secondary/30'
    case 'gradient':
      return 'bg-gradient-to-br from-secondary/40 via-background to-accent/5'
    case 'default':
    default:
      return 'bg-background'
  }
}

function gridClass(layout: NonNullable<FeaturesProps['layout']>) {
  // All three layouts share the same base grid; 'asymmetric' adds first-child spans below.
  return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8'
}

function firstItemSpanClass(
  layout: NonNullable<FeaturesProps['layout']>,
  itemCount: number,
) {
  if (layout === 'asymmetric' && itemCount >= 5) {
    return 'lg:col-span-2 lg:row-span-2'
  }
  return ''
}

/* ------------------------------------------------------------------ */
/* Card rendering                                                      */
/* ------------------------------------------------------------------ */

interface CardInnerProps {
  item: FeatureItem
  variant: NonNullable<FeaturesProps['variant']>
  isHero?: boolean
}

function CardInner({ item, variant, isHero }: CardInnerProps) {
  const iconNode = renderIconContent(item.icon)

  if (variant === 'minimal') {
    return (
      <div className="flex gap-4 items-start">
        {iconNode && (
          <span className={iconWrapperClass('minimal')}>{iconNode}</span>
        )}
        <div className="flex-1">
          {item.kicker && (
            <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-1">
              {item.kicker}
            </div>
          )}
          <h3 className="text-lg font-bold text-foreground mb-1 font-display">
            {item.title}
          </h3>
          <p className="text-foreground/75 text-sm leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>
    )
  }

  if (variant === 'icon-top') {
    return (
      <div className="text-center">
        {iconNode && (
          <span className={iconWrapperClass('icon-top')}>{iconNode}</span>
        )}
        {item.kicker && (
          <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-2">
            {item.kicker}
          </div>
        )}
        <h3
          className={cn(
            'font-bold text-foreground mb-3 font-display',
            isHero ? 'text-2xl md:text-3xl' : 'text-xl',
          )}
        >
          {item.title}
        </h3>
        <p className="text-foreground/75 leading-relaxed max-w-prose mx-auto">
          {item.description}
        </p>
      </div>
    )
  }

  // 'cards' (default)
  return (
    <>
      {iconNode && (
        <span className={iconWrapperClass('cards')}>{iconNode}</span>
      )}
      {item.kicker && (
        <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-2">
          {item.kicker}
        </div>
      )}
      <h3
        className={cn(
          'font-bold text-foreground mb-3 font-display',
          isHero ? 'text-2xl md:text-3xl' : 'text-xl',
        )}
      >
        {item.title}
      </h3>
      <p className="text-foreground/75 leading-relaxed">{item.description}</p>
    </>
  )
}

interface FeatureCardProps {
  item: FeatureItem
  variant: NonNullable<FeaturesProps['variant']>
  spanClass: string
  isHero: boolean
}

function FeatureCard({ item, variant, spanClass, isHero }: FeatureCardProps) {
  // Minimal variant: no border / no background — just a content block.
  if (variant === 'minimal') {
    const minimalClasses = cn('relative', spanClass)
    if (item.href) {
      return (
        <Link
          href={item.href}
          className={cn(
            minimalClasses,
            'group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          <CardInner item={item} variant={variant} isHero={isHero} />
        </Link>
      )
    }
    return (
      <article className={minimalClasses}>
        {item.badge && (
          <span className="absolute top-0 right-0 inline-flex items-center px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold uppercase">
            {item.badge}
          </span>
        )}
        <CardInner item={item} variant={variant} isHero={isHero} />
      </article>
    )
  }

  // Cards / icon-top: bordered card surface.
  const cardClasses = cn(
    'relative bg-background border border-border rounded-2xl p-6 md:p-8 shadow-sm transition-all duration-300',
    'hover:shadow-lg hover:-translate-y-1',
    spanClass,
  )

  const badge = item.badge && (
    <span className="absolute top-4 right-4 inline-flex items-center px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold uppercase z-10">
      {item.badge}
    </span>
  )

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={cn(
          cardClasses,
          'block group outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      >
        {badge}
        <CardInner item={item} variant={variant} isHero={isHero} />
      </Link>
    )
  }

  return (
    <article className={cardClasses}>
      {badge}
      <CardInner item={item} variant={variant} isHero={isHero} />
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Top-level component                                                 */
/* ------------------------------------------------------------------ */

export function Features({
  items,
  title,
  subtitle,
  layout = '3',
  variant = 'cards',
  background = 'default',
  className,
}: FeaturesProps) {
  const bgClass = backgroundClass(background)
  const grid = gridClass(layout)
  const hasSectionHeader = Boolean(title || subtitle)

  const content = (
    <div className={grid}>
      {items.map((item, i) => {
        const span = i === 0 ? firstItemSpanClass(layout, items.length) : ''
        const isHero = Boolean(span)
        return (
          <FeatureCard
            key={i}
            item={item}
            variant={variant}
            spanClass={span}
            isHero={isHero}
          />
        )
      })}
    </div>
  )

  return (
    <section className={cn('w-full py-16 md:py-24 px-4', bgClass, className)}>
      <div className="max-w-6xl mx-auto">
        {hasSectionHeader && (
          <div className="mb-12">
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-3 font-display">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-foreground/70 text-center max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {content}
      </div>
    </section>
  )
}

export default Features
