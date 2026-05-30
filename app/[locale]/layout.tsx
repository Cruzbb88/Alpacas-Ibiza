import type { Metadata } from 'next'
import { Suspense } from 'react'
import { i18nConfig, type Locale } from '@/i18n.config'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { StickyBookingBar } from '@/components/booking/sticky-booking-bar'
import { CookieConsent } from '@/components/cookie-consent'
import { ScrollTracker } from '@/components/scroll-tracker'
import { OutboundLinkTracker } from '@/components/outbound-link-tracker'
import { WebVitals } from '@/components/web-vitals'
import { localBusinessSchema, organizationSchema, websiteSearchSchema, siteNavigationSchema, toJsonLd } from '@/lib/structured-data'
import { DEFAULT_OG_IMAGE } from '@/lib/og-images'
import { getTenant } from '@/lib/tenant'
import { FloatingWhatsApp } from '@/components/floating-whatsapp'
import { BackToTop } from '@/components/back-to-top'
import { ClientErrorReporter } from '@/components/client-error-reporter'
import { ServiceWorkerRegister } from '@/components/sw-register'
import { NavProgressBar } from '@/components/nav-progress-bar'
import { MobileStickyBookingBar } from '@/components/mobile-sticky-booking-bar'
import { VercelInstrumentation } from '@/components/vercel-instrumentation'

import { SITE_BASE_URL as BASE_URL } from '@/lib/config'
import { getLocaleTranslations } from '@/lib/translations'
import { LocaleTranslationsProvider } from '@/lib/locale-context'

export async function generateStaticParams() {
    return i18nConfig.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    // Use the shared helper so the locale-root page emits an `x-default`
    // hreflang entry (pointing at the default-locale URL) per Google's spec.
    // sub-pages already call buildLocaleAlternates(locale, '<path>') — this
    // centralizes the rule and prevents drift between root and sub-pages.
    const alternates = buildLocaleAlternates(locale, '')
    return {
        metadataBase: new URL(BASE_URL),
        alternates,
        openGraph: {
            siteName: 'Alpacas Ibiza',
            locale,
            type: 'website',
            // DEFAULT_OG_IMAGE — points at public/images/og/default.webp
            // Drop file there; no code change needed. See lib/og-images.ts.
            images: [
                {
                    url: DEFAULT_OG_IMAGE,
                    width: 1200,
                    height: 630,
                    alt: 'Alpaca Trekking Santa Eulària – Ibiza Eco-Tourism',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            images: [DEFAULT_OG_IMAGE],
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
    const tenant = await getTenant()
    const schemas = [localBusinessSchema(), organizationSchema(tenant), websiteSearchSchema(), siteNavigationSchema(locale)]

    const localeData = getLocaleTranslations(locale as import('@/i18n.config').Locale)

    return (
        <LocaleTranslationsProvider data={localeData}>
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
            <Footer
                legalName={tenant.legalName}
                cif={tenant.cif}
                address={tenant.address}
                phoneE164={tenant.phoneE164 ?? ''}
                whatsappE164={tenant.whatsappE164 ?? ''}
                contactEmail={tenant.contactEmail}
                social={tenant.social}
                brandName={tenant.brandName}
            />
            <StickyBookingBar />
            <FloatingWhatsApp e164={tenant.whatsappE164} brandName={tenant.brandName} />
            <BackToTop />
            <CookieConsent />
            <ScrollTracker />
            <OutboundLinkTracker />
            <WebVitals />
            <ClientErrorReporter />
            <ServiceWorkerRegister />
            <VercelInstrumentation />
            <Suspense>
                <NavProgressBar />
            </Suspense>
            <MobileStickyBookingBar locale={locale as Locale} />
        </div>
        </LocaleTranslationsProvider>
    )
}
