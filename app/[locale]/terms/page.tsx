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
        title: tr('terms.title'),
        alternates: buildLocaleAlternates(locale, 'terms'),
    }
}

export default async function TermsPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params
    const translate = t(locale)
    const translateArray = ta(locale)

    return (
        <>
            <Hero
                title={translate('terms.title')}
                subtitle={translate('terms.subtitle')}
            />

            <section className="w-full py-16 md:py-24 px-4 bg-background">
                <div className="max-w-4xl mx-auto prose prose-lg max-w-none text-foreground/70">
                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('terms.section1Title')}
                    </h2>
                    <p>{translate('terms.section1Intro')}</p>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {translateArray('terms.section1Items').map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('terms.section2Title')}
                    </h2>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {translateArray('terms.section2Items').map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('terms.section3Title')}
                    </h2>
                    <p>{translate('terms.section3Intro')}</p>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {translateArray('terms.section3Items').map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('terms.section4Title')}
                    </h2>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {translateArray('terms.section4Items').map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('terms.section5Title')}
                    </h2>
                    <p>{translate('terms.section5Text')}</p>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('terms.section6Title')}
                    </h2>
                    <p>{translate('terms.section6Text')}</p>

                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                        {translate('terms.section7Title')}
                    </h2>
                    <ul className="list-disc list-inside space-y-2 mb-6">
                        {translateArray('terms.section7Items').map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>

                    <p className="text-sm text-foreground/60 mt-8">
                        {translate('terms.lastUpdated')}
                    </p>
                </div>
            </section>
        </>
    )
}
