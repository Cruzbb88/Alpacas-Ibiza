import Image from 'next/image'
import Link from 'next/link'
import { t } from '@/lib/translations'
import type { Locale } from '@/i18n.config'
import { ADOPT_PRICE_MONTHLY_EUR, ADOPT_PRICE_YEARLY_EUR } from '@/lib/config'

interface AdoptCrossSellProps {
    locale: string
    /** Optional URL for the herd photo. Falls back to /placeholder.svg if not supplied. */
    photoSrc?: string
}

/**
 * Post-tour cross-sell card: encourages repeat visitors to adopt an alpaca.
 * Economic angle: emphasises "tours included" value over conservation framing.
 *
 * i18n: EN + NL real translations; other locales fall back to EN via getTranslation().
 * Locale-aware: "Adopt now" link resolves to /[locale]/adopt.
 *
 * Fail-quiet: no async calls, no env gates — always renders on tour pages.
 * Photo falls back to /placeholder.svg when owner hasn't supplied an image.
 */
export function AdoptCrossSell({ locale, photoSrc }: AdoptCrossSellProps) {
    const translate = t(locale as Locale)

    const heading = translate(
        'tours.adoptCrossSell.heading',
        'Coming back often?',
    )
    const body = translate(
        'tours.adoptCrossSell.body',
        'Adopt an alpaca — your tour fees for the year are included.',
    )
    const cta = translate(
        'tours.adoptCrossSell.cta',
        'Become a sponsor →',
    )

    const resolvedPhoto = photoSrc ?? '/placeholder.svg'

    return (
        <section
            aria-labelledby="adopt-cross-sell-heading"
            className="w-full py-16 px-4 bg-[#F5F5DC]/30"
        >
            <div className="max-w-4xl mx-auto">
                <div className="rounded-2xl overflow-hidden border border-[#F5F5DC] shadow-sm bg-white flex flex-col md:flex-row">
                    {/* Photo */}
                    <div className="relative w-full md:w-2/5 min-h-[220px] md:min-h-0">
                        <Image
                            src={resolvedPhoto}
                            alt="One of the alpaca herd at Es Currals, Ibiza"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 40vw"
                        />
                    </div>

                    {/* Copy */}
                    <div className="flex-1 p-8 flex flex-col justify-center gap-4">
                        <h2
                            id="adopt-cross-sell-heading"
                            className="text-2xl font-bold text-[#556B2F]"
                        >
                            {heading}
                        </h2>

                        <p className="text-[#708090] text-base leading-relaxed">
                            {body}
                        </p>

                        {/* Practical price signal */}
                        <p className="text-sm text-[#708090]/80">
                            <span className="font-semibold text-[#556B2F]">
                                &euro;{ADOPT_PRICE_MONTHLY_EUR}/mo
                            </span>
                            {' '}or{' '}
                            <span className="font-semibold text-[#556B2F]">
                                &euro;{ADOPT_PRICE_YEARLY_EUR}/yr
                            </span>
                            {' '}
                            <span className="italic">— all tour visits included.</span>
                        </p>

                        <Link
                            href={`/${locale}/adopt`}
                            className="self-start inline-flex items-center gap-2 rounded-lg bg-[#556B2F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#556B2F]/90 transition-colors"
                        >
                            {cta}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
