import type { Metadata } from 'next'
import { Hero } from '@/components/hero'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/translations'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const tr = t(locale as any)
    return {
        title: tr('romantic.title'),
        alternates: buildLocaleAlternates(locale, 'experiences/romantic-sunset'),
    }
}

export default async function RomanticPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const translate = t(locale as any)

    return (
        <main>
            <Hero
                title={translate('romantic.title')}
                subtitle={translate('romantic.subtitle')}
                cta={{
                    label: translate('romantic.cta'),
                    href: 'https://fareharbor.com/embeds/book/alpacasibiza/?full-items=yes',
                }}
                backgroundImage="/images/sunset-bg.jpg" // Placeholder
            />

            <section className="w-full py-16 md:py-24 px-4 bg-background">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl font-serif text-foreground mb-6 italic">
                        {translate('romantic.quote')}
                    </h2>
                    <p className="text-lg text-foreground/70 leading-relaxed mb-8">
                        {translate('romantic.description')}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                        <div className="text-center">
                            <span className="text-4xl mb-3 block">🥂</span>
                            <h3 className="text-lg font-semibold mb-2">{translate('romantic.champagne.title')}</h3>
                            <p className="text-sm text-foreground/60">{translate('romantic.champagne.desc')}</p>
                        </div>
                        <div className="text-center">
                            <span className="text-4xl mb-3 block">📸</span>
                            <h3 className="text-lg font-semibold mb-2">{translate('romantic.photos.title')}</h3>
                            <p className="text-sm text-foreground/60">{translate('romantic.photos.desc')}</p>
                        </div>
                        <div className="text-center">
                            <span className="text-4xl mb-3 block">🤫</span>
                            <h3 className="text-lg font-semibold mb-2">{translate('romantic.privacy.title')}</h3>
                            <p className="text-sm text-foreground/60">{translate('romantic.privacy.desc')}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="w-full py-16 px-4 bg-accent/5">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold text-foreground mb-4">{translate('romantic.proposalTitle')}</h2>
                        <p className="text-foreground/70 mb-6">
                            {translate('romantic.proposalText')}
                        </p>
                        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                            {translate('romantic.proposalCta')}
                        </Button>
                    </div>
                    <div className="flex-1 h-64 bg-muted animate-pulse rounded-lg flex items-center justify-center text-muted-foreground">
                        {/* Placeholder for Proposal Image */}
                        Proposal Image
                    </div>
                </div>
            </section>
        </main>
    )
}
