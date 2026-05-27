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
import { t } from '@/lib/translations'
import { getTenant } from '@/lib/tenants/server'
import { tenantMetadata } from '@/lib/tenants/metadata'
import { localBusinessSchema, toJsonLd } from '@/lib/structured-data'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { GradientPageHero, PageSection, OwnerConfirmBanner } from '@/components/layout'
import { PhotoGallery } from '@/components/photo-gallery'
import { hasLiveMedia } from '@/lib/data/media'

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const tenant = await getTenant()
    return tenantMetadata(tenant, {
        locale,
        route: '/media',
        titleOverride: 'Media & Gallery | Alpacas Ibiza — Es Currals Farm',
        descriptionOverride:
            'Photos from the farm, the alpaca herd, Wishfulfilling Weaving, and events at Es Currals Alpacas Ibiza.',
    })
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function MediaPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params
    const translate = t(locale)

    const schema = localBusinessSchema()
    const livePhotosExist = hasLiveMedia()

    return (
        <main>
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
                /* ── Empty state — shown publicly until owner supplies photos ── */
                <PageSection>
                    <div className="py-16 text-center">
                        <h2 className="text-2xl font-bold text-foreground mb-4">
                            {translate('media.emptyTitle') || 'Photos coming soon'}
                        </h2>
                        <p className="text-foreground/70 max-w-md mx-auto">
                            {translate('media.emptyBody') ||
                                "We're building the gallery. Follow us on Instagram for updates."}
                        </p>
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
        </main>
    )
}
