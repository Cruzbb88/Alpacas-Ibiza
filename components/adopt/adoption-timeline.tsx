/**
 * AdoptionTimeline — visual journey of what arrives after a donor adopts.
 *
 * Drives conversion by making the abstract €75/mo concrete. Each step has an
 * icon, name, and "when" timing label. Steps are ordered by typical delivery
 * cadence. All copy comes from i18n with English defaults so the component
 * works on day one for non-EN locales while translations catch up.
 *
 * Visual: horizontal on desktop (5 columns), vertical timeline on mobile with
 * a connecting line down the left edge.
 */

import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'

interface TimelineStep {
  /** Translation key under `adopt.timeline.<key>`. Component appends `.title` / `.when` / `.desc`. */
  key: 'certificate' | 'tours' | 'gifts' | 'photoshoot' | 'fibre'
  /** Emoji or symbol — decorative, aria-hidden. */
  icon: string
  /** English defaults used when the locale's translation file lacks the key. */
  defaults: { title: string; when: string; desc: string }
}

const STEPS: ReadonlyArray<TimelineStep> = [
  {
    key: 'certificate',
    icon: '📜',
    defaults: {
      title: 'Adoption certificate',
      when: 'Posted within 7-10 days',
      desc: 'Personalised certificate with your chosen alpaca\'s name.',
    },
  },
  {
    key: 'tours',
    icon: '📅',
    defaults: {
      title: 'Farm tours',
      when: 'Bookable any time',
      desc: '6 tours per year, up to 4 guests each. Just mention your adoption when booking.',
    },
  },
  {
    key: 'gifts',
    icon: '📦',
    defaults: {
      title: 'Welcome gift bundle',
      when: 'Ships in 2-3 weeks',
      desc: 'Branded calendar, planner, keychain, and framed photo of your alpaca.',
    },
  },
  {
    key: 'photoshoot',
    icon: '📸',
    defaults: {
      title: 'Professional photoshoot',
      when: 'Scheduled with you',
      desc: 'An hour with your alpaca and our photographer. Digital downloads included.',
    },
  },
  {
    key: 'fibre',
    icon: '🌱',
    defaults: {
      title: 'Alcaca fibre shipping',
      when: 'Spring + autumn',
      desc: '5 kg of premium alpaca-derived garden amendment per year, in two seasonal batches.',
    },
  },
] as const

interface AdoptionTimelineProps {
  locale: Locale
  /** Optional translated section heading. Component supplies a default. */
  heading?: string
  /** Optional translated section subheading. */
  subheading?: string
}

export async function AdoptionTimeline({ locale, heading, subheading }: AdoptionTimelineProps) {
  const translate = await getTranslations()
  const headingText = heading ?? translate('adopt.timeline.heading')
  const subheadingText =
    subheading ?? translate('adopt.timeline.subheading')

  return (
    <section aria-labelledby="adoption-timeline-heading">
      <header className="text-center mb-10">
        <h2 id="adoption-timeline-heading" className="text-2xl font-bold text-foreground mb-2">
          {headingText}
        </h2>
        <p className="text-sm text-muted-foreground">{subheadingText}</p>
      </header>

      {/* Mobile (≤md): vertical timeline with connecting line on the left */}
      <ol className="md:hidden relative space-y-6 pl-10 before:absolute before:top-2 before:bottom-2 before:left-4 before:w-px before:bg-primary/30">
        {STEPS.map((step) => {
          const title = translate(`adopt.timeline.${step.key}.title` as Parameters<typeof translate>[0])
          const when = translate(`adopt.timeline.${step.key}.when` as Parameters<typeof translate>[0])
          const desc = translate(`adopt.timeline.${step.key}.desc` as Parameters<typeof translate>[0])
          return (
            <li key={step.key} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-10 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-2 ring-background text-base"
              >
                {step.icon}
              </span>
              <h3 className="font-semibold text-foreground text-base leading-tight">{title}</h3>
              <p className="text-xs font-medium text-primary mt-0.5">{when}</p>
              <p className="text-sm text-muted-foreground mt-1">{desc}</p>
            </li>
          )
        })}
      </ol>

      {/* Desktop (≥md): horizontal 5-column grid */}
      <ol className="hidden md:grid md:grid-cols-5 gap-6">
        {STEPS.map((step, index) => {
          const title = translate(`adopt.timeline.${step.key}.title` as Parameters<typeof translate>[0])
          const when = translate(`adopt.timeline.${step.key}.when` as Parameters<typeof translate>[0])
          const desc = translate(`adopt.timeline.${step.key}.desc` as Parameters<typeof translate>[0])
          return (
            <li key={step.key} className="relative text-center">
              {/* Connecting line to next step — omitted on the last item */}
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="hidden md:block absolute top-6 left-[60%] right-[-40%] h-px bg-primary/20"
                />
              )}
              <span
                aria-hidden="true"
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-4 ring-background text-xl mb-3"
              >
                {step.icon}
              </span>
              <h3 className="font-semibold text-foreground text-sm leading-tight">{title}</h3>
              <p className="text-xs font-medium text-primary mt-1">{when}</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{desc}</p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
