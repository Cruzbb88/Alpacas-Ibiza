import type { Metadata } from 'next'
import { i18nConfig } from '@/i18n.config'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { StickyBookingBar } from '@/components/booking/sticky-booking-bar'
import { CookieConsent } from '@/components/cookie-consent'
import { ScrollTracker } from '@/components/scroll-tracker'
import { OutboundLinkTracker } from '@/components/outbound-link-tracker'
import { localBusinessSchema, organizationSchema, toJsonLd } from '@/lib/structured-data'

const BASE_URL = 'https://alpacasibiza.com'

export async function generateStaticParams() {
    return i18nConfig.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    return {
        metadataBase: new URL(BASE_URL),
        alternates: {
            canonical: `/${locale}`,
            languages: Object.fromEntries(
                i18nConfig.locales.map((l) => [l, `/${l}`])
            ),
        },
        openGraph: {
            siteName: 'Alpacas Ibiza',
            locale,
            type: 'website',
            images: [
                {
                    url: '/images/og-default.webp',
                    width: 1200,
                    height: 630,
                    alt: 'Alpaca Trekking Santa Eulària – Ibiza Eco-Tourism',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            images: ['/images/og-default.webp'],
        },
    }
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const schemas = [localBusinessSchema(), organizationSchema()]

    return (
        <div className="flex min-h-screen flex-col">
            {schemas.map((schema, i) => (
                <script
                    key={i}
                    id={`json-ld-${i}`}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: toJsonLd(schema) }}
                />
            ))}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[1001] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:shadow-lg"
            >
                Skip to main content
            </a>
            <Header />
            <main id="main-content" className="flex-1">{children}</main>
            <Footer />
            <StickyBookingBar />
            <CookieConsent />
            <ScrollTracker />
            <OutboundLinkTracker />
        </div>
    )
}
