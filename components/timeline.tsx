'use client'

import Image from 'next/image'
import Link from 'next/link'

export interface TimelineStep {
  /** Optional anchor id (for deep linking). */
  id?: string
  /** Optional time label, e.g. "10:00" or "Week 1". */
  time?: string
  /** Step title. */
  title: string
  /** Step description (1-3 sentences). */
  description: string
  /** Emoji or symbol — falls back to step number when numbering='icon'. */
  icon?: string
  /** Optional small image illustrating the step (e.g., a photo from the farm). null = no image. */
  image?: string | null
  /** Alt text for image. Required for a11y when image is set. */
  imageAlt?: string
  /** Optional CTA at the end of a step (e.g., "Submit a commission inquiry"). */
  cta?: { label: string; href: string }
}

/**
 * Legacy item shape — preserved so existing call sites
 * (`<Timeline items={...} />`) keep working without changes.
 */
export interface TimelineItem {
  time: string
  title: string
  description: string
}

export interface TimelineProps {
  /** New API. Preferred. */
  steps?: TimelineStep[]
  /** Legacy API — kept for backwards compat with /tours and any other call sites. */
  items?: TimelineItem[]
  /** Optional section title above the timeline. */
  title?: string
  /** Optional section subtitle below the title. */
  subtitle?: string
  /**
   * Layout variant.
   * - 'vertical' (default): center spine on md+, alternating left/right cards; all stacked on mobile.
   * - 'horizontal': horizontal snap-scroll track on md+, vertical fallback on mobile.
   */
  orientation?: 'vertical' | 'horizontal'
  /**
   * Number style.
   * - 'count' (default): "01", "02"...
   * - 'icon': use step.icon (emoji/short string); falls back to count when icon is missing.
   */
  numbering?: 'count' | 'icon'
}

function normalize(steps?: TimelineStep[], items?: TimelineItem[]): TimelineStep[] {
  if (steps && steps.length > 0) return steps
  if (items && items.length > 0) {
    return items.map((it) => ({
      time: it.time,
      title: it.title,
      description: it.description,
    }))
  }
  return []
}

function markerLabel(step: TimelineStep, i: number, numbering: 'count' | 'icon'): string {
  if (numbering === 'icon' && step.icon) return step.icon
  return String(i + 1).padStart(2, '0')
}

interface StepCardProps {
  step: TimelineStep
  index: number
  numbering: 'count' | 'icon'
}

function StepCard({ step, index, numbering }: StepCardProps) {
  const label = markerLabel(step, index, numbering)
  return (
    <div className="bg-background border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow max-w-md w-full">
      {step.image ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg mb-4 bg-muted">
          <Image
            src={step.image}
            alt={step.imageAlt ?? step.title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
        </div>
      ) : null}

      {step.time ? (
        <p className="text-accent text-xs font-semibold tracking-widest uppercase mb-1">
          {step.time}
        </p>
      ) : null}

      <h3 className="text-xl font-bold text-foreground mb-2 font-display">
        {step.title}
      </h3>

      <p className="text-foreground/75 leading-relaxed mb-3">
        {step.description}
      </p>

      {step.cta ? (
        <Link
          href={step.cta.href}
          aria-label={`${step.cta.label} — step ${label}: ${step.title}`}
          className="inline-flex items-center gap-1 text-accent font-semibold hover:text-accent/80 text-sm"
        >
          <span>{step.cta.label}</span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  )
}

interface MarkerProps {
  step: TimelineStep
  index: number
  numbering: 'count' | 'icon'
  /** Larger ring/font for prominent layouts. */
  size?: 'md' | 'lg'
}

function Marker({ step, index, numbering, size = 'md' }: MarkerProps) {
  const label = markerLabel(step, index, numbering)
  const dims =
    size === 'lg'
      ? 'w-14 h-14 text-base'
      : 'w-12 h-12 text-sm'
  return (
    <span
      aria-hidden="true"
      className={`${dims} flex items-center justify-center rounded-full bg-accent text-accent-foreground font-bold ring-4 ring-background shadow-sm select-none`}
    >
      {label}
    </span>
  )
}

interface VerticalTimelineProps {
  steps: TimelineStep[]
  numbering: 'count' | 'icon'
}

function VerticalTimeline({ steps, numbering }: VerticalTimelineProps) {
  const single = steps.length === 1
  return (
    <ol className="relative max-w-4xl mx-auto">
      {/* Spine — mobile: left-4, md+: center */}
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 w-0.5 bg-border left-4 md:left-1/2 md:-translate-x-1/2"
      />

      <div className="space-y-12 md:space-y-16">
        {steps.map((step, i) => {
          const isLeft = !single && i % 2 === 0
          return (
            <li
              key={step.id ?? `${i}-${step.title}`}
              id={step.id}
              className="relative"
            >
              {/* Mobile layout: marker on the left spine, card to the right */}
              <div className="md:hidden flex gap-4 items-start pl-0">
                <div className="relative z-10 flex-shrink-0">
                  <Marker step={step} index={i} numbering={numbering} />
                </div>
                <div className="flex-1 min-w-0">
                  <StepCard step={step} index={i} numbering={numbering} />
                </div>
              </div>

              {/* Desktop layout: alternating sides around center spine */}
              <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-start gap-6">
                <div className={isLeft ? 'flex justify-end' : ''}>
                  {isLeft ? (
                    <StepCard step={step} index={i} numbering={numbering} />
                  ) : null}
                </div>

                <div className="relative z-10 flex justify-center pt-2">
                  <Marker step={step} index={i} numbering={numbering} size="lg" />
                </div>

                <div className={!isLeft ? 'flex justify-start' : ''}>
                  {!isLeft ? (
                    <StepCard step={step} index={i} numbering={numbering} />
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </div>
    </ol>
  )
}

interface HorizontalTimelineProps {
  steps: TimelineStep[]
  numbering: 'count' | 'icon'
}

function HorizontalTimeline({ steps, numbering }: HorizontalTimelineProps) {
  return (
    <>
      {/* Mobile fallback: vertical layout */}
      <div className="md:hidden">
        <VerticalTimeline steps={steps} numbering={numbering} />
      </div>

      {/* Desktop: horizontal snap-scroll */}
      <ol
        className="hidden md:flex relative overflow-x-auto snap-x snap-mandatory gap-6 pb-4 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Timeline (horizontal)"
      >
        {/* Connector line behind markers */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-[44px] h-0.5 bg-border"
        />

        {steps.map((step, i) => (
          <li
            key={step.id ?? `${i}-${step.title}`}
            id={step.id}
            className="snap-start shrink-0 w-80 flex flex-col items-center"
          >
            <div className="relative z-10 mb-4">
              <Marker step={step} index={i} numbering={numbering} size="lg" />
            </div>
            <StepCard step={step} index={i} numbering={numbering} />
          </li>
        ))}
      </ol>
    </>
  )
}

export function Timeline({
  steps,
  items,
  title,
  subtitle,
  orientation = 'vertical',
  numbering = 'count',
}: TimelineProps) {
  const normalized = normalize(steps, items)
  if (normalized.length === 0) return null

  const body =
    orientation === 'horizontal' ? (
      <HorizontalTimeline steps={normalized} numbering={numbering} />
    ) : (
      <VerticalTimeline steps={normalized} numbering={numbering} />
    )

  return (
    <section className="w-full py-16 md:py-24 px-4 bg-background">
      {title ? (
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 font-display">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}

      {body}
    </section>
  )
}
