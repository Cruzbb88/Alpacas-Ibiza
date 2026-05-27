import type { Metadata } from 'next'
import { Hero } from '@/components/hero'
import { t, ta } from '@/lib/translations'
import type { Locale } from '@/i18n.config'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
    const { locale } = await params
    const tr = t(locale)
    return {
        title: tr('privacy.title'),
        alternates: buildLocaleAlternates(locale, 'privacy'),
    }
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params
    const translate = t(locale)
    const translateArray = ta(locale)

    return (
        <>
            <Hero
                title={translate('privacy.title')}
                subtitle={translate('privacy.subtitle')}
            />

            <section className="w-full py-16 md:py-24 px-4 bg-background">
                <div className="max-w-4xl mx-auto prose prose-lg max-w-none text-foreground/70">
                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('privacy.section1Title')}
                    </h2>
                    <p>{translate('privacy.section1Intro')}</p>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {translateArray('privacy.section1Items').map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('privacy.section2Title')}
                    </h2>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {translateArray('privacy.section2Items').map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('privacy.section3Title')}
                    </h2>
                    <p>{translate('privacy.section3Intro')}</p>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {translateArray('privacy.section3Items').map((item, i) => (
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
                        {translateArray('privacy.section5Items').map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <p className="text-sm text-foreground/60 mt-8">
                        {translate('privacy.lastUpdated')}
                    </p>
                </div>
            </section>
        </>
    )
}
