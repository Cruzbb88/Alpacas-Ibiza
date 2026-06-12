/**
 * JSON-LD structured data helpers for AEO/SEO.
 * All schema objects are locale-aware via string params.
 */

// Mirror of SITE_BASE_URL in lib/config.ts — kept inline because
// structured-data.ts must stay free of @/ path-alias imports (required for
// node:test compatibility). If lib/config.ts changes the env fallback,
// update this too.
const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alpacasibiza.com').replace(/\/$/, '')

// ─── Tenant address (single source) ──────────────────────────────────────────
// Relative import (not @/ alias) — required for node:test compatibility.
// All address fields in schema functions MUST read from TENANT_ADDRESS.
// To correct address/postcode, update lib/tenants/alpacasibiza.ts only.
import { alpacasibiza as _tenant } from './tenants/alpacasibiza.ts'
const TENANT_ADDRESS = _tenant.address

/** Default FareHarbor booking URL — mirrors FAREHARBOR_BOOKING_URL in lib/config.ts.
 *  Inlined here to keep structured-data.ts free of @/ path-alias imports
 *  (required for node:test compatibility). If shortname changes, update both. */
const FAREHARBOR_BOOKING_URL =
    `https://fareharbor.com/embeds/book/${process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME ?? 'alpacasibiza'}/?full-items=yes`

// ─── Organization ────────────────────────────────────────────────────────────

/** Minimal tenant shape accepted by organizationSchema — avoids @/ path imports. */
interface OrganizationSchemaTenant {
    social?: { twitterHandle?: string | null } | null
}

export function organizationSchema(tenant?: OrganizationSchemaTenant) {
    const sameAs: string[] = [
        'https://www.facebook.com/people/Es-Currals-Alpacas-Ibiza/100066379310193/',
        'https://www.instagram.com/wishfulfillingweaving/',
    ]
    const rawHandle = tenant?.social?.twitterHandle
    if (rawHandle) {
        const handle = rawHandle.replace(/^@/, '')
        sameAs.push(`https://twitter.com/${handle}`)
    }

    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Alpacas Ibiza',
        url: BASE_URL,
        logo: `${BASE_URL}/images/brand/logo.png`,
        sameAs,
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+32475586544',
            contactType: 'customer service',
            // TODO: extend when owner confirms additional languages spoken on-site.
            availableLanguage: ['English', 'Dutch'],
        },
    }
}

// ─── LocalBusiness + TouristAttraction ───────────────────────────────────────

export function localBusinessSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': ['LocalBusiness', 'TouristAttraction'],
        name: 'Alpacas Ibiza – Es Currals',
        description:
            'Unique alpaca farm experience in Ibiza. Guided tours, alpaca trekking, artisan weaving workshops, and handmade alpaca wool products. Family-friendly eco-tourism in Santa Eulària.',
        url: BASE_URL,
        telephone: '+32475586544',
        email: 'info@alpacasibiza.com',
        image: `${BASE_URL}/images/heroes/home.jpg`,
        // priceRange removed — '€€' was an unsourced subjective tier (AI filler).
        // Re-add only with an owner-confirmed bracket.
        currenciesAccepted: 'EUR',
        // paymentAccepted removed — no confirmed source; omit rather than fabricate.
        address: {
            '@type': 'PostalAddress',
            streetAddress: TENANT_ADDRESS.streetAddress,
            addressLocality: 'Santa Eulària des Riu',
            addressRegion: 'Islas Baleares',
            addressCountry: TENANT_ADDRESS.addressCountry,
            postalCode: TENANT_ADDRESS.postalCode,
        },
        geo: {
            '@type': 'GeoCoordinates',
            latitude: 38.9861,
            longitude: 1.5228,
        },
        openingHoursSpecification: [
            {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                description: 'By appointment only — contact us to book',
            },
        ],
        // No aggregateRating: emitting an invented rating/reviewCount is a
        // Google structured-data policy violation (fake reviews). Re-add ONLY
        // when wired to real Google Places review data.
        touristType: ['Family', 'Couple', 'Adventure', 'Eco-tourism'],
    }
}

// ─── TouristTrip (Tour page) ──────────────────────────────────────────────────

/** Default base price — mirrors TOUR_BASE_PRICE_EUR in lib/config.ts.
 *  Inlined here to keep structured-data.ts free of @/ path-alias imports
 *  (required for node:test compatibility). If price changes, update both.
 *  21.19 = real FareHarbor "Alpaca Tour · From €21.19" (was 30, a third-party
 *  aggregator's reseller markup — corrected 2026-06-06, matches lib/config.ts). */
const TOUR_BASE_PRICE_EUR_DEFAULT = 21.19

export function touristTripSchema(opts?: {
    /** Base / lowest tier price. Defaults to TOUR_BASE_PRICE_EUR (21.19). */
    lowPriceEur?: number
    /** Upper tier price. Omit when UNMAPPED — emits plain Offer instead of AggregateOffer. */
    highPriceEur?: number
    /** Number of distinct offers in the aggregate. Defaults to 1. */
    offerCount?: number
    /** Page locale — keeps the schema `url` on the same locale as the page
     *  (was hardcoded /en/tours, which made non-EN pages emit an EN-URL). */
    locale?: string
}) {
    const low = opts?.lowPriceEur ?? TOUR_BASE_PRICE_EUR_DEFAULT
    const high = opts?.highPriceEur
    const offers =
        high != null && high > low
            ? {
                  '@type': 'AggregateOffer',
                  priceCurrency: 'EUR',
                  lowPrice: String(low),
                  highPrice: String(high),
                  offerCount: opts?.offerCount ?? 1,
                  availability: 'https://schema.org/InStock',
                  url: FAREHARBOR_BOOKING_URL,
              }
            : {
                  '@type': 'Offer',
                  priceCurrency: 'EUR',
                  price: String(low),
                  availability: 'https://schema.org/InStock',
                  url: FAREHARBOR_BOOKING_URL,
              }

    return {
        '@context': 'https://schema.org',
        '@type': 'TouristTrip',
        name: 'Alpaca Farm Experience – Guided Tour Ibiza',
        description:
            'Meet and feed our alpacas, learn about their care and wool production, and enjoy a unique eco-tourism experience in the heart of Ibiza. Suitable for all ages.',
        url: `${BASE_URL}/${opts?.locale ?? 'en'}/tours`,
        image: `${BASE_URL}/images/heroes/home.jpg`,
        touristType: ['Family', 'Solo', 'Couple', 'Group'],
        offers,
        provider: {
            '@type': 'LocalBusiness',
            name: 'Alpacas Ibiza',
            url: BASE_URL,
        },
    }
}

// ─── FAQPage ─────────────────────────────────────────────────────────────────

export interface FaqItem {
    question: string
    answer: string
}

export function faqPageSchema(items: FaqItem[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
            },
        })),
    }
}

// ─── Product ─────────────────────────────────────────────────────────────────

/**
 * Schema.org Product with Offer — for shop vouchers and physical products.
 * priceEur is a number so callers cannot accidentally supply a malformed string.
 * availability defaults to InStock when omitted (Rule 5 — no invented status).
 * Build #5: added priceEur / brand / availability params (spec section ii).
 *
 * When priceEur === 0 the `offers` field is omitted entirely.
 * Google accepts Product without Offer (schema.org/Product — offers is optional).
 * This prevents Google Rich Results surfacing "€0.00" for price-on-request items.
 * Callers should pass 0 as an explicit OWNER_INPUT_NEEDED sentinel; the product
 * will still appear in structured data (name/description/image/brand) without a price.
 */
export function productSchema(opts: {
    name: string
    description: string
    image: string
    priceEur: number
    brand?: string
    url?: string
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
}) {
    const offers =
        opts.priceEur === 0
            ? undefined
            : {
                  '@type': 'Offer',
                  url: opts.url ? (opts.url.startsWith('http') ? opts.url : `${BASE_URL}${opts.url}`) : undefined,
                  priceCurrency: 'EUR',
                  price: opts.priceEur.toFixed(2),
                  availability: `https://schema.org/${opts.availability ?? 'InStock'}`,
              }

    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: opts.name,
        description: opts.description,
        image: opts.image.startsWith('http') ? opts.image : `${BASE_URL}${opts.image}`,
        brand: { '@type': 'Brand', name: opts.brand ?? 'Alpacas Ibiza' },
        ...(offers !== undefined ? { offers } : {}),
    }
}

// ─── BreadcrumbList schema ───────────────────────────────────────────────────

/**
 * Build a BreadcrumbList schema for a page.
 *
 * @example
 *   breadcrumbSchema([
 *     { name: 'Home', url: 'https://alpacasibiza.com/en' },
 *     { name: 'Tours', url: 'https://alpacasibiza.com/en/tours' },
 *   ])
 */
export function breadcrumbSchema(
    crumbs: ReadonlyArray<{ name: string; url: string }>
) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.name,
            item: c.url,
        })),
    }
}

// ─── Event (Yoga weekly sessions) ────────────────────────────────────────────

/**
 * Schema.org Event for the weekly yoga sessions.
 *
 * Verified live data (REALITY_CHECK Tier 2):
 *   - Recurring weekly: Wednesdays + Saturdays
 *   - 1 hour 15 minutes
 *   - €30 per person, max 6 attendees
 *   - Hatha style
 *
 * UNMAPPED (omitted to comply with Rule 5):
 *   - eventSchedule.startTime (exact time of day not confirmed)
 *   - eventSchedule.byMonth (which months — REALITY_CHECK doesn't confirm season)
 *   - performer (instructor name)
 *
 * Google's event-rich-results need at least: @type, name, startDate, location.
 * We use a forward-rolling startDate (next Wednesday) so the event is always "upcoming".
 */
export function yogaWeeklyEventSchema(opts?: { now?: Date }): object {
    // Forward-roll the startDate to the next Wednesday so search engines see an
    // upcoming event no matter when the page is crawled.
    const now = opts?.now ?? new Date()
    const day = now.getUTCDay() // 0=Sun, 3=Wed
    const daysUntilWed = (3 - day + 7) % 7 || 7
    const nextWed = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilWed))

    return {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Alpaca Yoga — weekly session at Es Currals',
        description:
            '1 hour 15 minute Hatha yoga sessions held outdoors alongside our alpacas. Max 6 attendees. Every Wednesday and Saturday.',
        startDate: nextWed.toISOString().split('T')[0], // ISO date — no time (Rule 5)
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        location: {
            '@type': 'Place',
            name: 'Es Currals Alpacas Ibiza',
            address: {
                '@type': 'PostalAddress',
                streetAddress: TENANT_ADDRESS.streetAddress,
                addressLocality: 'Santa Eulària des Riu',
                addressRegion: 'Balearic Islands',
                addressCountry: TENANT_ADDRESS.addressCountry,
                postalCode: TENANT_ADDRESS.postalCode,
            },
        },
        organizer: {
            '@type': 'Organization',
            name: 'Alpacas Ibiza',
            url: BASE_URL,
        },
        offers: {
            '@type': 'Offer',
            price: String(30),
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
            url: FAREHARBOR_BOOKING_URL,
        },
        // image: omitted — no yoga-event image confirmed
        // performer: omitted — instructor UNMAPPED
    }
}

// ─── WebSite + SearchAction (sitelinks search box) ───────────────────────────

/**
 * WebSite schema with `potentialAction: SearchAction` — enables Google sitelinks
 * search box for the brand (https://developers.google.com/search/docs/appearance/sitelinks-searchbox).
 *
 * The {search_term_string} placeholder is required by the spec. Site has no
 * server-side /search route yet — the header search is client-side. For Google
 * compliance we point at the journal index since that's the most search-relevant
 * destination; a future server-side /search endpoint can replace this.
 */
export function websiteSearchSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Alpacas Ibiza',
        url: BASE_URL,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${BASE_URL}/en/journal?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    }
}

// ─── Person ──────────────────────────────────────────────────────────────────

export interface PersonInput {
    name: string
    role?: string | null
    url?: string | null
    /** Organization name for worksFor → Organization node. */
    worksForOrgName?: string | null
    // image?: string | null  // omitted until owner provides photo per Rule 5
}

export function personSchema(p: PersonInput) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: p.name,
        ...(p.role ? { jobTitle: p.role } : {}),
        ...(p.url ? { url: p.url } : {}),
        ...(p.worksForOrgName
            ? {
                  worksFor: {
                      '@type': 'Organization',
                      name: p.worksForOrgName,
                      url: BASE_URL,
                  },
              }
            : {}),
    }
}

// ─── Service (Weddings / photoshoots) ────────────────────────────────────────

export function weddingsServiceSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'Alpacas at Your Wedding or Photoshoot',
        description:
            'Bring our gentle herd to your wedding ceremony, engagement shoot, or branded photoshoot. On-farm at Es Currals or travel anywhere on Ibiza.',
        provider: {
            '@type': 'LocalBusiness',
            name: 'Alpacas Ibiza',
            url: BASE_URL,
        },
        serviceType: 'Animal experience for events',
        areaServed: {
            '@type': 'Place',
            name: 'Ibiza, Spain',
        },
        // offers omitted — pricing UNMAPPED per OWNER_INPUT_NEEDED.md
    }
}

// ─── HowTo (2-day weaving + spinning workshop) ────────────────────────────────

export function workshopHowToSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'Two-day Weaving + Spinning Workshop with San',
        description:
            'Learn to wash, spin, and weave alpaca wool into a finished scarf over two days at Es Currals.',
        totalTime: 'P2D', // ISO 8601 — 2 days
        step: [
            {
                '@type': 'HowToStep',
                name: 'Day 1 — Wash, card, and spin',
                text: 'Learn to wash raw alpaca fleece, card it into rolags, and spin yarn on a traditional wheel.',
            },
            {
                '@type': 'HowToStep',
                name: 'Day 2 — Weave on the loom',
                text: 'Set up a warp on the wooden loom, weave the yarn you spun, and take home your finished scarf.',
            },
        ],
        // tool, supply, image, estimatedCost — all omitted per Rule 5 (UNMAPPED)
    }
}

// ─── TouristAttraction (Herd / alpacas page) ─────────────────────────────────

/**
 * TouristAttraction schema for the /alpacas (meet the herd) page.
 * Signals Google that Es Currals is a destination, not just a service.
 * Appointment-based — isAccessibleForFree:false, publicAccess:false.
 */
export function herdAttractionSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'TouristAttraction',
        name: 'The Alpaca Herd of Es Currals',
        description:
            'Meet the 14 named alpacas of Es Currals — Barbarella, Avalon, Bardot, Chet, Dusty, Fela, Fonda, Lewis, Marron, Mojo, Moloko, Nelson, Suki, and Toots.',
        url: `${BASE_URL}/en/alpacas`,
        isAccessibleForFree: false,  // visits are appointment-based
        publicAccess: false,          // by appointment only
        address: {
            '@type': 'PostalAddress',
            streetAddress: TENANT_ADDRESS.streetAddress,
            addressLocality: 'Santa Eulària des Riu',
            addressRegion: 'Islas Baleares',
            addressCountry: TENANT_ADDRESS.addressCountry,
            postalCode: TENANT_ADDRESS.postalCode,
        },
        touristType: ['Family', 'Solo', 'Couple', 'Group', 'Animal lovers'],
    }
}

// ─── Service + Offer (Adopt an Alpaca symbolic sponsorship) ──────────────────

/**
 * Schema.org Service with two Offers for the symbolic alpaca adoption program.
 * Verified prices: €75/mo and €900/year (VERIFICATION_RESULTS.md #10).
 */
export function adoptAPacaServiceSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'Adopt an Alpaca — symbolic sponsorship',
        description:
            'Sponsor one of our 14 named alpacas at Es Currals. Monthly photo updates, annual visit invitation, supporter discount codes, and a welcome bundle.',
        provider: {
            '@type': 'LocalBusiness',
            name: 'Alpacas Ibiza',
            url: BASE_URL,
        },
        serviceType: 'Animal sponsorship subscription',
        areaServed: {
            '@type': 'AdministrativeArea',
            name: 'Worldwide (symbolic sponsorship; visits on Ibiza only)',
        },
        offers: [
            {
                '@type': 'Offer',
                name: 'Monthly adoption',
                price: '75',
                priceCurrency: 'EUR',
                priceSpecification: {
                    '@type': 'UnitPriceSpecification',
                    price: '75',
                    priceCurrency: 'EUR',
                    billingDuration: 'P1M',
                    billingIncrement: 1,
                },
                availability: 'https://schema.org/InStock',
            },
            {
                '@type': 'Offer',
                name: 'Yearly adoption',
                price: '900',
                priceCurrency: 'EUR',
                priceSpecification: {
                    '@type': 'UnitPriceSpecification',
                    price: '900',
                    priceCurrency: 'EUR',
                    billingDuration: 'P1Y',
                    billingIncrement: 1,
                },
                availability: 'https://schema.org/InStock',
            },
        ],
    }
}

// ─── SiteNavigationElement ────────────────────────────────────────────────────

/**
 * SiteNavigationElement schema — tells Google the canonical nav structure.
 * Routes verified against app/sitemap.ts (all exist as pages on disk).
 */
export function siteNavigationSchema(locale: string) {
    const items = [
        { name: 'Tours', path: '/tours' },
        { name: 'Experiences', path: '/experiences' },
        { name: 'Plan Your Visit', path: '/visit' },
        { name: 'Meet the Herd', path: '/alpacas' },
        { name: 'Adopt', path: '/adopt' },
        { name: 'Weaving', path: '/weaving' },
        { name: 'Shop', path: '/shop' },
        { name: 'Gift Vouchers', path: '/gifts' },
        { name: 'Alpaca Yoga', path: '/yoga' },
        { name: 'Workshops', path: '/workshops' },
        { name: 'Weddings', path: '/weddings' },
        { name: 'About', path: '/about' },
        { name: 'Herd Diary', path: '/herd-diary' },
        { name: 'Journal', path: '/journal' },
        { name: 'Contact', path: '/contact' },
    ]
    return {
        '@context': 'https://schema.org',
        '@type': 'SiteNavigationElement',
        name: items.map((i) => i.name),
        url: items.map((i) => `${BASE_URL}/${locale}${i.path}`),
    }
}

// ─── ItemList + Product (shop category pages) ────────────────────────────────

/**
 * Emits a Schema.org ItemList containing Product entries for shop category pages.
 * Empty items array is valid — emits numberOfItems: 0.
 * image is omitted when null (Rule 5).
 */
export function shopCategoryItemListSchema(opts: {
    categoryName: string
    baseUrl: string
    items: ReadonlyArray<{ name: string; url: string; image?: string | null; description?: string }>
}) {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: opts.categoryName,
        url: opts.baseUrl,
        numberOfItems: opts.items.length,
        itemListElement: opts.items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
                '@type': 'Product',
                name: item.name,
                url: item.url,
                ...(item.description ? { description: item.description } : {}),
                ...(item.image ? { image: item.image } : {}),
                brand: { '@type': 'Brand', name: 'Alpacas Ibiza' },
            },
        })),
    }
}

// ─── BreadcrumbList (locale-aware convenience wrapper) ────────────────────────

/**
 * Schema.org BreadcrumbList — emitted alongside any PageBreadcrumbs render.
 * `crumbs` is the same array passed to PageBreadcrumbs; `homeLabel` is the
 * label for the first item; `locale` defines the URL prefix.
 */
export function breadcrumbListSchema(opts: {
    locale: string
    homeLabel: string
    crumbs: ReadonlyArray<{ name: string; path: string }>
}) {
    const items = [
        {
            '@type': 'ListItem',
            position: 1,
            name: opts.homeLabel,
            item: `${BASE_URL}/${opts.locale}`,
        },
        ...opts.crumbs.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 2,
            name: c.name,
            item: `${BASE_URL}/${opts.locale}/${c.path}`,
        })),
    ]
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items,
    }
}

// ─── Animal (per-alpaca detail page) ─────────────────────────────────────────

/**
 * Schema.org Animal schema for a single alpaca detail page.
 * Uses `Thing` properties — schema.org/Animal is a valid subtype of Thing
 * and is accepted by Google's Rich Results validator.
 *
 * Callers MUST omit this schema entirely when `description` and `image` are
 * both null (nothing meaningful to emit, and Rule 5 forbids inventing values).
 */
export interface AnimalSchemaInput {
  name: string
  /** Bio or localised bio. Caller resolves locale before passing. Null = omit. */
  description: string | null
  /** Canonical portrait URL. Null = omit (caller should skip schema). */
  image: string | null
  /** Breed descriptor, e.g. "Huacaya". Null = omit. */
  breed?: string | null
}

export function animalSchema({ name, description, image, breed }: AnimalSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Animal',
    name,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(breed ? { breed } : {}),
  }
}

// ─── Helper: inject as <script> tag string ────────────────────────────────────

/**
 * Serialise a schema object for use in a <script type="application/ld+json"> tag.
 * Escapes </script> sequences so injected JSON cannot break the surrounding HTML.
 */
export function toJsonLd(schema: object) {
    return JSON.stringify(schema).replace(/<\/script>/gi, '<\\/script>')
}
