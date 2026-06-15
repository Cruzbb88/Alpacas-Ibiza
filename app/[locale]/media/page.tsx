/**
 * Media & Gallery page — Alpacas Ibiza
 *
 * Renders photos from lib/data/media.ts grouped by category.
 * Fail-quiet: shows public "coming soon" state when no photos are live.
 * Owner activates by editing lib/data/media.ts only — no other file needed.
 *
 * Nav placement: NOT added to header.tsx. Owner decides after first photos land.
 */

import type { Metadata } from 'next'
import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'
import { getTenant } from '@/lib/tenants/server'
import { tenantMetadata } from '@/lib/tenants/metadata'
import { localBusinessSchema, toJsonLd } from '@/lib/structured-data'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { GradientPageHero, PageSection, OwnerConfirmBanner } from '@/components/layout'
import { PhotoGallery } from '@/components/photo-gallery'
import { hasLiveMedia } from '@/lib/data/media'
import { getOgImage } from '@/lib/og-images'

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const tenant = await getTenant()
    const base = tenantMetadata(tenant, {
        locale,
        route: '/media',
        titleOverride: 'Media & Gallery | Alpacas Ibiza — Es Currals Farm',
        descriptionOverride:
            'Photos from the farm, the alpaca herd, Wishfulfilling Weaving, and events at Es Currals Alpacas Ibiza.',
    })
    const ogImage = getOgImage('media', 'Media & Gallery – Alpacas Ibiza')
    return {
        ...base,
        robots: { index: false, follow: true },
        openGraph: { ...base.openGraph, images: [ogImage] },
        twitter: { ...base.twitter, images: [ogImage.url] },
    }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function MediaPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params
    const translate = await getTranslations()

    const schema = localBusinessSchema()
    const livePhotosExist = hasLiveMedia()

    return (
        <>
            {/* JSON-LD: LocalBusiness */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: toJsonLd(schema) }}
            />

            <PageBreadcrumbs
                locale={locale}
                homeLabel={translate('nav.home') || 'Home'}
                crumbs={[
                    {
                        name: translate('media.title') || 'Media & Gallery',
                        path: 'media',
                    },
                ]}
            />

            {/* Hero */}
            <GradientPageHero
                title={translate('media.title') || 'Media & Gallery'}
                subtitle={translate('media.subtitle') || 'A glimpse of life on the farm — by us, by guests, by the press.'}
            />

            {livePhotosExist ? (
                <>
                    {/* Farm life */}
                    <PageSection>
                        <PhotoGallery
                            title={translate('media.categoryFarm') || 'Farm life'}
                            category="farm"
                        />
                    </PageSection>

                    {/* The herd */}
                    <PageSection>
                        <PhotoGallery
                            title={translate('media.categoryAlpacas') || 'The herd'}
                            category="alpacas"
                        />
                    </PageSection>

                    {/* Weaving */}
                    <PageSection>
                        <PhotoGallery
                            title={translate('media.categoryWeaving') || 'Wishfulfilling Weaving'}
                            category="weaving"
                        />
                    </PageSection>

                    {/* Events */}
                    <PageSection>
                        <PhotoGallery
                            title={translate('media.categoryEvents') || 'Events & weddings'}
                            category="events"
                        />
                    </PageSection>

                    {/* Press */}
                    <PageSection>
                        <PhotoGallery
                            title={translate('media.categoryPress') || 'Press coverage'}
                            category="press"
                        />
                    </PageSection>
                </>
            ) : (
                /* ── Empty state — redirects visitors to real content instead of a dead grid ── */
                <PageSection>
                    <div className="py-16 text-center max-w-lg mx-auto">
                        <p className="text-muted-foreground mb-8">
                            {translate('media.emptyBody') ||
                                'See the alpacas, the farm, and Wishfulfilling Weaving in our photo gallery.'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a
                                href={`/${locale}#gallery`}
                                className="inline-block bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-[16px] hover:bg-primary/90 transition-colors"
                            >
                                {translate('media.emptyCta') || 'View gallery'}
                            </a>
                            <a
                                href="https://www.instagram.com/wishfulfillingweaving/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block border border-primary text-primary font-semibold px-8 py-3 rounded-[16px] hover:bg-primary/5 transition-colors"
                            >
                                Instagram
                            </a>
                        </div>
                    </div>
                </PageSection>
            )}

            {/* Owner-confirm banner — dev/staging only, hidden in production */}
            <OwnerConfirmBanner
                heading={translate('media.ownerConfirmHeader') || 'Owner: drop photos to activate'}
                body={translate('media.ownerConfirmBody') ||
                    "Add files to public/images/gallery/ and entries to lib/data/media.ts with status: 'live'. Empty state shows publicly until then."}
                variant="banner"
            />
        </>
    )
}
