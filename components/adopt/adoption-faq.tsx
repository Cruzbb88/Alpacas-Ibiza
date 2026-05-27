/**
 * AdoptionFAQ — pre-baked Adopt-a-Paca FAQ block.
 *
 * Renders a native <details>/<summary> accordion (zero JS, keyboard-accessible
 * by default, AT-friendly without ARIA). The first item starts open via the
 * `open` prop to give the donor immediate context without forcing a click.
 *
 * Emits FAQPage JSON-LD for Rich Results — Google can display the questions
 * as expanding answers directly in the search snippet.
 *
 * Default 8 questions cover: cancellation, gift adoption, alpaca selection,
 * payment processor, photo delivery timing, tour booking flow, fibre shipping,
 * tax-deductibility. Each is replaceable per tenant via the `items` prop.
 */

import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { faqPageSchema, toJsonLd } from '@/lib/structured-data'

export interface FaqEntry {
  q: string
  a: string
}

const DEFAULT_ITEMS: ReadonlyArray<{ key: string; q: string; a: string }> = [
  {
    key: 'cancel',
    q: 'Can I cancel my monthly adoption?',
    a: 'Yes — cancel any time from the billing portal link on the adopt page. No questions, no retention call.',
  },
  {
    key: 'gift',
    q: 'Can I adopt on behalf of someone else?',
    a: 'Yes. At checkout, enter the recipient\'s name in the notes — we\'ll personalise the certificate and email them when you ask us to.',
  },
  {
    key: 'choose',
    q: 'Can I pick a specific alpaca?',
    a: 'Yes — the picker on the adopt page lists all 14 alpacas. If you have no preference, "Pick for me" matches you with the next alpaca that needs a sponsor.',
  },
  {
    key: 'tax',
    q: 'Is adoption tax-deductible?',
    a: 'Adoption is a symbolic sponsorship, not a registered charitable donation, so it isn\'t deductible. We can issue a payment receipt for your records.',
  },
  {
    key: 'photo',
    q: 'When will I get my certificate and welcome gift?',
    a: 'Certificate posts within 7-10 days. Welcome gift bundle (calendar, planner, keychain, framed photo) ships within 2-3 weeks.',
  },
  {
    key: 'tours',
    q: 'How do I book my farm tours?',
    a: 'Visit our tours page and book any tour — mention your adoption in the notes and we\'ll waive the fee against your 6 yearly visits.',
  },
  {
    key: 'fibre',
    q: 'What is the Alcaca fibre and when does it arrive?',
    a: '5 kg of premium alpaca-derived garden amendment ships in two seasonal batches — once in spring, once in autumn. We\'ll email you tracking each time.',
  },
  {
    key: 'change-payment',
    q: 'How do I update my card or change my address?',
    a: 'Use the billing portal link at the bottom of the adopt page. It\'s the same self-serve dashboard you\'d find at any subscription business.',
  },
]

interface AdoptionFAQProps {
  locale: Locale
  /** Section heading. Defaults to translated copy. */
  heading?: string
  /** Override the default 8 FAQs (per-tenant customisation). */
  items?: ReadonlyArray<FaqEntry>
  /** When true (default), the first item renders open. */
  openFirst?: boolean
  /** Optional `className` for the outer <section>. */
  className?: string
}

export function AdoptionFAQ({
  locale,
  heading,
  items,
  openFirst = true,
  className,
}: AdoptionFAQProps) {
  const translate = t(locale)
  const headingText = heading ?? translate('adopt.faq.heading', 'Common questions')

  // Resolve the list — either caller-supplied or the 8 defaults with translations.
  const resolved: FaqEntry[] = items
    ? [...items]
    : DEFAULT_ITEMS.map(({ key, q, a }) => ({
        q: translate(`adopt.faq.${key}.q`, q),
        a: translate(`adopt.faq.${key}.a`, a),
      }))

  return (
    <section aria-labelledby="adopt-faq-heading" className={className}>
      <h2
        id="adopt-faq-heading"
        className="text-2xl font-bold text-foreground text-center mb-8"
      >
        {headingText}
      </h2>

      <div className="space-y-3 max-w-2xl mx-auto">
        {resolved.map((item, index) => (
          <details
            key={item.q}
            open={openFirst && index === 0}
            className="group bg-card border border-border rounded-lg overflow-hidden"
          >
            <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset">
              <span className="font-semibold text-foreground text-sm sm:text-base">
                {item.q}
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 text-primary transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
              >
                +
              </span>
            </summary>
            <div className="px-5 pb-5 pt-1 text-sm text-foreground/80 leading-relaxed">
              {item.a}
            </div>
          </details>
        ))}
      </div>

      {/* FAQPage JSON-LD — search engines display questions as expandable
          snippets directly in results. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            faqPageSchema(resolved.map((item) => ({ question: item.q, answer: item.a }))),
          ),
        }}
      />
    </section>
  )
}
