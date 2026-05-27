import { cn } from '@/lib/utils'

// uft-003 #1 — PageSection: section wrapper + container combined
// Fixed <section> element. No polymorphic/asChild — single-tenant site, no library need.

type Bg = 'default' | 'muted' | 'gradient' | 'card' | 'accent'
type Width = 'wide' | 'narrow' | 'tight'
type Padding = 'sm' | 'md' | 'lg'

const BG: Record<Bg, string> = {
  default: 'bg-background',
  muted: 'bg-muted',
  gradient: 'bg-gradient-to-br from-primary/10 to-accent/10',
  card: 'bg-card',
  accent: 'bg-accent text-accent-foreground',
}

const WIDTH: Record<Width, string> = {
  wide: 'max-w-6xl',
  narrow: 'max-w-4xl',
  tight: 'max-w-2xl',
}

const PAD: Record<Padding, string> = {
  sm: 'py-8 md:py-12',
  md: 'py-16 md:py-24',
  lg: 'py-20 md:py-32',
}

interface PageSectionProps {
  bg?: Bg
  width?: Width
  padding?: Padding
  className?: string
  innerClassName?: string
  children: React.ReactNode
  /** Accessible label for the section landmark */
  ariaLabel?: string
  /** HTML id — for anchor targets like #booking */
  id?: string
  /** Adds border-t border-border above the section */
  borderTop?: boolean
}

export function PageSection({
  bg = 'default',
  width = 'wide',
  padding = 'md',
  className,
  innerClassName,
  children,
  ariaLabel,
  id,
  borderTop,
}: PageSectionProps) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={cn('w-full px-4', BG[bg], PAD[padding], borderTop && 'border-t border-border', className)}
    >
      <div className={cn('mx-auto', WIDTH[width], innerClassName)}>
        {children}
      </div>
    </section>
  )
}
