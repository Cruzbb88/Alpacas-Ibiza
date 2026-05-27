import { cn } from '@/lib/utils'

// uft-003 #2 — SectionHeading: title + optional subtitle block
// Fixed heading levels via `as` prop ('h2' default, 'h3' for sub-sections).
// No CVA, no forwardRef — opinionated per uft-003 recommendation.

type HeadingLevel = 'h2' | 'h3'
type Align = 'center' | 'left'
type Size = 'lg' | 'md'

interface SectionHeadingProps {
  title: string
  subtitle?: string
  align?: Align
  size?: Size
  /** Semantic heading element — default h2, use h3 for sub-sections */
  as?: HeadingLevel
  className?: string
}

export function SectionHeading({
  title,
  subtitle,
  align = 'center',
  size = 'lg',
  as: Heading = 'h2',
  className,
}: SectionHeadingProps) {
  const isCenter = align === 'center'

  const titleClass =
    size === 'lg'
      ? 'text-3xl md:text-4xl font-bold text-foreground mb-4'
      : 'text-2xl font-bold text-foreground mb-3'

  return (
    <div
      className={cn(
        'mb-12',
        isCenter && 'text-center',
        className,
      )}
    >
      <Heading className={titleClass}>{title}</Heading>
      {subtitle && (
        <p
          className={cn(
            'text-foreground/70',
            isCenter && 'max-w-2xl mx-auto',
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
