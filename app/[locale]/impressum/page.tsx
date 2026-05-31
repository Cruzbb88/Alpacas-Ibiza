import type { Metadata } from 'next'
import { Hero } from '@/components/hero'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n.config'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { isLegalContentLive } from '@/components/legal-content-pending-notice'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'

/**
 * Impressum / Legal notice (Aviso Legal) page.
 *
 * Required by:
 * - Spanish LSSI-CE Article 10 (§ identification of the service provider)
 * - German TMG § 5 (Impressumspflicht) for any EU-targeted commercial site
 *
 * LSSI-CE Art. 10 mandates that the following be plainly accessible:
 *   - registered company name
 *   - registered address
 *   - contact email
 *   - tax identification (CIF / NIF)
 *
 * Legal pages are intentionally CRAWLABLE (robots index:true) — unlike admin
 * pages — because regulators and consumers must be able to discover them.
 *
 * The actual identification values (company name, address, tax ID) are NOT
 * hardcoded here. They are stored as `__UNTRANSLATED__` sentinels in
 * translations/en.json under `impressum.*` so the owner fills the real values
 * before launch. The pending-notice gate (`LEGAL_CONTENT_LIVE=true`) keeps the
 * page from publishing placeholder text in production until those values are
 * supplied.
 */

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
    const { locale } = await params
    const tr = await getTranslations()
    return {
        title: tr('impressum.title'),
        description: tr('impressum.intro'),
        alternates: buildLocaleAlternates(locale, 'impressum'),
        robots: { index: true, follow: true },
    }
}

export default async function ImpressumPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params
    const translate = await getTranslations()
    const contactEmail = process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'

    if (!isLegalContentLive()) {
        return (
            <>
                <PageBreadcrumbs
                    locale={locale}
                    homeLabel={translate('nav.home')}
                    crumbs={[{ name: translate('impressum.title'), path: 'impressum' }]}
                />
                <Hero title={translate('impressum.title')} subtitle={translate('impressum.intro')} />
                {/*
                 * Mirrors LegalContentPendingNotice visual pattern. We cannot
                 * extend that component's `pageKind` union without touching
                 * components/* (out of scope for this change), so we inline the
                 * same amber-bordered notice here. Visually identical to the
                 * privacy / terms / cookies "content pending" notice.
                 */}
                <section className="w-full py-16 md:py-24 px-4 bg-background">
                    <div className="max-w-3xl mx-auto">
                        <div
                            role="status"
                            className="rounded-lg border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 p-6 md:p-8"
                        >
                            <h2 className="text-2xl font-bold text-foreground mb-3">
                                Legal notice — content pending
                            </h2>
                            <p className="text-foreground/80 mb-3">
                                We are finalising the legal notice (Impressum / Aviso Legal) with our
                                lawyers before publishing it here. In the meantime, you can reach us
                                by email and we will respond within 7 days.
                            </p>
                            <p className="text-foreground/80 mb-0">
                                Contact:{' '}
                                <a
                                    href={`mailto:${contactEmail}?subject=${encodeURIComponent('Legal notice enquiry')}`}
                                    className="underline font-semibold text-accent"
                                >
                                    {contactEmail}
                                </a>
                            </p>
                        </div>
                    </div>
                </section>
            </>
        )
    }

    return (
        <>
            <PageBreadcrumbs
                locale={locale}
                homeLabel={translate('nav.home')}
                crumbs={[{ name: translate('impressum.title'), path: 'impressum' }]}
            />
            <Hero title={translate('impressum.title')} subtitle={translate('impressum.intro')} />

            <section className="w-full py-16 md:py-24 px-4 bg-background">
                <div className="max-w-4xl mx-auto prose prose-lg max-w-none text-foreground/70">
                    <p>{translate('impressum.intro')}</p>

                    <dl className="not-prose grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 my-8">
                        <dt className="font-semibold text-foreground sm:col-span-1">
                            {translate('impressum.companyName')}
                        </dt>
                        <dd className="sm:col-span-2 text-foreground/80">
                            {translate('impressum.companyNameValue')}
                        </dd>

                        <dt className="font-semibold text-foreground sm:col-span-1">
                            {translate('impressum.registeredAddress')}
                        </dt>
                        <dd className="sm:col-span-2 text-foreground/80 whitespace-pre-line">
                            {translate('impressum.registeredAddressValue')}
                        </dd>

                        <dt className="font-semibold text-foreground sm:col-span-1">
                            {translate('impressum.taxId')}
                        </dt>
                        <dd className="sm:col-span-2 text-foreground/80">
                            {translate('impressum.taxIdValue')}
                        </dd>

                        <dt className="font-semibold text-foreground sm:col-span-1">
                            {translate('impressum.contactEmail')}
                        </dt>
                        <dd className="sm:col-span-2 text-foreground/80">
                            <a
                                href={`mailto:${contactEmail}`}
                                className="underline text-primary"
                            >
                                {contactEmail}
                            </a>
                        </dd>

                        <dt className="font-semibold text-foreground sm:col-span-1">
                            {translate('impressum.hostingProvider')}
                        </dt>
                        <dd className="sm:col-span-2 text-foreground/80">
                            {translate('impressum.hostingProviderValue')}
                        </dd>
                    </dl>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('impressum.disputeResolutionHeading')}
                    </h2>
                    <p>{translate('impressum.disputeResolutionBody')}</p>
                    <p>
                        <a
                            href="https://ec.europa.eu/consumers/odr"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-primary"
                        >
                            https://ec.europa.eu/consumers/odr
                        </a>
                    </p>

                    <p className="text-sm text-foreground/60 mt-8">
                        {translate('impressum.lastUpdated')}
                    </p>
                </div>
            </section>
        </>
    )
}
