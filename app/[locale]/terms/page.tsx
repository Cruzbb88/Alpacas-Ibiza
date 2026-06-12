import type { Metadata } from 'next'
import { Hero } from '@/components/hero'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n.config'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { LegalContentPendingNotice, isLegalContentLive } from '@/components/legal-content-pending-notice'
import { alpacasibiza } from '@/lib/tenants/alpacasibiza'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
    const { locale } = await params
    const tr = await getTranslations()
    return {
        title: tr('terms.title'),
        alternates: buildLocaleAlternates(locale, 'terms'),
    }
}

// Articles rendered with a list of items (art1, art2, art10)
const ARTICLES_WITH_ITEMS = [1, 2, 10] as const
// Articles rendered with a single text block
const ARTICLES_WITH_TEXT = [3, 4, 5, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18] as const
// Article 6 has three sub-texts (product, services, extended)
// All 18 article numbers
const ALL_ARTICLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const

export default async function TermsPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params
    const translate = await getTranslations()
    if (!isLegalContentLive()) {
        return (
            <>
                <Hero title={translate('terms.title')} subtitle={translate('terms.subtitle')} />
                <LegalContentPendingNotice pageKind="terms" />
            </>
        )
    }

    return (
        <>
            <Hero
                title={translate('terms.title')}
                subtitle={translate('terms.subtitle')}
            />

            <section className="w-full py-16 md:py-24 px-4 bg-background">
                <div className="max-w-4xl mx-auto prose prose-lg max-w-none text-foreground/70">

                    {/* Article 1 — Definitions (list) */}
                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('terms.art1Title')}
                    </h2>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {(translate.raw('terms.art1Items') as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    {/* Article 2 — Entrepreneur identity (sourced from tenant config, NOT i18n strings)
                        Single source of truth: lib/tenants/alpacasibiza.ts
                        Never hardcode legal identifiers in translation files (consumer-contract risk). */}
                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('terms.art2Title')}
                    </h2>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        <li>{translate('terms.art2Name')}: {alpacasibiza.legalName}</li>
                        <li>
                            {translate('terms.art2Address')}: {alpacasibiza.address.streetAddress},{' '}
                            {alpacasibiza.address.postalCode} {alpacasibiza.address.addressLocality},{' '}
                            {alpacasibiza.address.addressRegion}, {alpacasibiza.address.addressCountry}
                        </li>
                        <li>{translate('terms.art2Phone')}: {alpacasibiza.whatsappE164}</li>
                        <li>{translate('terms.art2Email')}: {alpacasibiza.contactEmail}</li>
                        {alpacasibiza.vatNumber != null && (
                            <li>{translate('terms.art2Vat')}: {alpacasibiza.vatNumber}</li>
                        )}
                    </ul>

                    {/* Articles 3–5 — single text paragraphs */}
                    {([3, 4, 5] as const).map((n) => (
                        <div key={n}>
                            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                                {translate(`terms.art${n}Title` as Parameters<typeof translate>[0])}
                            </h2>
                            <p>{translate(`terms.art${n}Text` as Parameters<typeof translate>[0])}</p>
                        </div>
                    ))}

                    {/* Article 6 — Right of withdrawal (three sub-texts) */}
                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('terms.art6Title')}
                    </h2>
                    <p className="mb-3">{translate('terms.art6ProductText')}</p>
                    <p className="mb-3">{translate('terms.art6ServicesText')}</p>
                    <p>{translate('terms.art6ExtendedText')}</p>

                    {/* Articles 7–9 — single text paragraphs */}
                    {([7, 8, 9] as const).map((n) => (
                        <div key={n}>
                            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                                {translate(`terms.art${n}Title` as Parameters<typeof translate>[0])}
                            </h2>
                            <p>{translate(`terms.art${n}Text` as Parameters<typeof translate>[0])}</p>
                        </div>
                    ))}

                    {/* Article 10 — Exclusions (intro + list) */}
                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('terms.art10Title')}
                    </h2>
                    <p className="mb-3">{translate('terms.art10Text')}</p>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {(translate.raw('terms.art10Items') as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    {/* Articles 11–18 — single text paragraphs */}
                    {([11, 12, 13, 14, 15, 16, 17, 18] as const).map((n) => (
                        <div key={n}>
                            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                                {translate(`terms.art${n}Title` as Parameters<typeof translate>[0])}
                            </h2>
                            <p>{translate(`terms.art${n}Text` as Parameters<typeof translate>[0])}</p>
                        </div>
                    ))}

                    <p className="text-sm text-foreground/60 mt-8">
                        {translate('terms.lastUpdated')}
                    </p>
                </div>
            </section>
        </>
    )
}
