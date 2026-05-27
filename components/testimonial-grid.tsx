import { TestimonialCard } from '@/components/testimonial-card'
import type { TestimonialCardProps } from '@/components/testimonial-card'

interface TestimonialGridProps {
  items: TestimonialCardProps[]
  title: string
  /** Default: 3 */
  maxColumns?: 2 | 3 | 4
}

const colClass: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
}

/**
 * TestimonialGrid — responsive grid of TestimonialCard instances.
 * Pass title as a translated string; caller owns i18n key resolution.
 */
export function TestimonialGrid({ items, title, maxColumns = 3 }: TestimonialGridProps) {
  return (
    <section
      className="w-full py-16 md:py-24 px-4 bg-background"
      aria-labelledby="testimonials-heading"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2
            id="testimonials-heading"
            className="text-3xl md:text-4xl font-bold text-foreground mb-4"
          >
            {title}
          </h2>
        </div>

        <div className={`grid ${colClass[maxColumns]} gap-6`}>
          {items.map((item, idx) => (
            <TestimonialCard key={idx} {...item} />
          ))}
        </div>
      </div>
    </section>
  )
}
