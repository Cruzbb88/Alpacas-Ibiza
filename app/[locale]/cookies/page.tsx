import type { Metadata } from 'next'
import { Hero } from '@/components/hero'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n.config'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { LegalContentPendingNotice, isLegalContentLive } from '@/components/legal-content-pending-notice'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
    const { locale } = await params
    const tr = await getTranslations()
    return {
        title: tr('cookies.title'),
        alternates: buildLocaleAlternates(locale, 'cookies'),
    }
}

export default async function CookiesPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params
    const translate = await getTranslations()
    if (!isLegalContentLive()) {
        return (
            <>
                <Hero title={translate('cookies.title')} subtitle={translate('cookies.subtitle')} />
                <LegalContentPendingNotice pageKind="cookies" />
            </>
        )
    }

    return (
        <>
            <Hero
                title={translate('cookies.title')}
                subtitle={translate('cookies.subtitle')}
            />

            <section className="w-full py-16 md:py-24 px-4 bg-background">
                <div className="max-w-4xl mx-auto prose prose-lg max-w-none text-foreground/70">
                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('cookies.whatTitle')}
                    </h2>
                    <p>{translate('cookies.whatText')}</p>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('cookies.typesTitle')}
                    </h2>

                    <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">
                        {translate('cookies.essentialTitle')}
                    </h3>
                    <p>{translate('cookies.essentialText')}</p>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {(translate.raw('cookies.essentialItems') as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">
                        {translate('cookies.preferenceTitle')}
                    </h3>
                    <p>{translate('cookies.preferenceText')}</p>

                    <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">
                        {translate('cookies.analyticsTitle')}
                    </h3>
                    <p>{translate('cookies.analyticsText')}</p>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {(translate.raw('cookies.analyticsItems') as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">
                        {translate('cookies.marketingTitle')}
                    </h3>
                    <p>{translate('cookies.marketingText')}</p>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('cookies.choicesTitle')}
                    </h2>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {(translate.raw('cookies.choicesItems') as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('cookies.thirdPartyTitle')}
                    </h2>
                    <p>{translate('cookies.thirdPartyText')}</p>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {(translate.raw('cookies.thirdPartyItems') as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('cookies.manageTitle')}
                    </h2>
                    <p>{translate('cookies.manageText')}</p>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {(translate.raw('cookies.manageItems') as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>
                    <p>{translate('cookies.manageNote')}</p>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('cookies.gdprTitle')}
                    </h2>
                    <p>{translate('cookies.gdprText')}</p>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {(translate.raw('cookies.gdprItems') as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        Your GDPR rights
                    </h2>
                    <p>
                        Under GDPR Articles 15 and 17 you may request a copy of your personal data or ask
                        us to delete it. We respond within 30 days.
                    </p>
                    <p>
                        <a
                            href={`mailto:info@alpacasibiza.com?subject=GDPR%20data%20request&body=Type%20(export%2Fdeletion)%3A%0AEmail%3A`}
                            className="underline text-primary"
                        >
                            Request your data (export or deletion)
                        </a>
                    </p>

                    <p className="text-sm text-foreground/60 mt-8">
                        {translate('cookies.lastUpdated')}
                    </p>
                </div>
            </section>
        </>
    )
}
