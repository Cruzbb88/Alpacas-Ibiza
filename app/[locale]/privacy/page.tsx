import type { Metadata } from 'next'
import { Hero } from '@/components/hero'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n.config'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { isLegalContentLive } from '@/components/legal-content-pending-notice'
import { buildPrivacyPolicy, buildTenantAddress, DRAFT_NOTICE_TEXT } from '@/lib/legal/auto-policy'
import { DraftPolicyRenderer } from '@/components/legal/draft-policy-renderer'
import { getTenant } from '@/lib/tenant'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
    const { locale } = await params
    const tr = await getTranslations()
    return {
        title: tr('privacy.title'),
        alternates: buildLocaleAlternates(locale, 'privacy'),
    }
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params
    const translate = await getTranslations()
    if (!isLegalContentLive()) {
        const tenant = await getTenant()
        const address = buildTenantAddress(tenant.address)
        const draftMd = buildPrivacyPolicy({
            tenantName: tenant.legalName,
            contactEmail: tenant.contactEmail,
            address,
            locale,
        })
        return (
            <>
                <Hero title={translate('privacy.title')} subtitle={translate('privacy.subtitle')} />
                <section className="w-full py-8 px-4 bg-background">
                    <div className="max-w-4xl mx-auto">
                        <div
                            role="alert"
                            className="rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-5 py-4 mb-8 text-sm font-semibold text-amber-900 dark:text-amber-200"
                        >
                            {DRAFT_NOTICE_TEXT}
                        </div>
                        <DraftPolicyRenderer markdown={draftMd} className="max-w-none" />
                    </div>
                </section>
            </>
        )
    }

    return (
        <>
            <Hero
                title={translate('privacy.title')}
                subtitle={translate('privacy.subtitle')}
            />

            <section className="w-full py-16 md:py-24 px-4 bg-background">
                <div className="max-w-4xl mx-auto prose prose-lg max-w-none text-muted-foreground">
                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('privacy.section1Title')}
                    </h2>
                    <p>{translate('privacy.section1Intro')}</p>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {(translate.raw('privacy.section1Items') as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('privacy.section2Title')}
                    </h2>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {(translate.raw('privacy.section2Items') as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('privacy.section3Title')}
                    </h2>
                    <p>{translate('privacy.section3Intro')}</p>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {(translate.raw('privacy.section3Items') as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('privacy.section4Title')}
                    </h2>
                    <p>{translate('privacy.section4Text')}</p>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('privacy.section5Title')}
                    </h2>
                    <p>{translate('privacy.section5Intro')}</p>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {(translate.raw('privacy.section5Items') as string[]).map((item, i) => (
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

                    <p className="text-sm text-muted-foreground mt-8">
                        {translate('privacy.lastUpdated')}
                    </p>
                </div>
            </section>
        </>
    )
}
