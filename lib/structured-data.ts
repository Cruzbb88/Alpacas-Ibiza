/**
 * JSON-LD structured data helpers for AEO/SEO.
 * All schema objects are locale-aware via string params.
 */

const BASE_URL = 'https://alpacasibiza.com'

/** Default FareHarbor booking URL — mirrors FAREHARBOR_BOOKING_URL in lib/config.ts.
 *  Inlined here to keep structured-data.ts free of @/ path-alias imports
 *  (required for node:test compatibility). If shortname changes, update both. */
const FAREHARBOR_BOOKING_URL =
    `https://fareharbor.com/embeds/book/${process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME ?? 'alpacasibiza'}/?full-items=yes`

// ─── Organization ────────────────────────────────────────────────────────────

export function organizationSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Alpacas Ibiza',
        url: BASE_URL,
        logo: `${BASE_URL}/images/logo.webp`,
        sameAs: [
            'https://www.facebook.com/alpacasibiza',
            'https://www.instagram.com/alpacasibiza',
        ],
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+32475586544',
            contactType: 'customer service',
            availableLanguage: ['English', 'Dutch', 'German', 'Spanish', 'French', 'Italian'],
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
        image: `${BASE_URL}/images/hero-alpacas.webp`,
        priceRange: '€€',
        currenciesAccepted: 'EUR',
        paymentAccepted: 'Cash, Credit Card',
        address: {
            '@type': 'PostalAddress',
            streetAddress: 'San Carlos',
            addressLocality: 'Santa Eulària des Riu',
            addressRegion: 'Islas Baleares',
            addressCountry: 'ES',
            postalCode: '07819',
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
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '5',
            reviewCount: '127',
            bestRating: '5',
            worstRating: '1',
        },
        touristType: ['Family', 'Couple', 'Adventure', 'Eco-tourism'],
    }
}

// ─── TouristTrip (Tour page) ──────────────────────────────────────────────────

export function touristTripSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'TouristTrip',
        name: 'Alpaca Farm Experience – Guided Tour Ibiza',
        description:
            'Meet and feed our alpacas, learn about their care and wool production, and enjoy a unique eco-tourism experience in the heart of Ibiza. Suitable for all ages.',
        url: `${BASE_URL}/en/tours`,
        image: `${BASE_URL}/images/tour-alpacas.webp`,
        touristType: ['Family', 'Solo', 'Couple', 'Group'],
        offers: {
            '@type': 'Offer',
            priceCurrency: 'EUR',
            price: '20',
            availability: 'https://schema.org/InStock',
            url: 'https://fareharbor.com/embeds/book/alpacasibiza/?full-items=yes',
        },
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

export function productSchema({
    name,
    description,
    image,
    url,
    price,
    priceCurrency = 'EUR',
}: {
    name: string
    description: string
    image: string
    url: string
    price: string
    priceCurrency?: string
}) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name,
        description,
        image: `${BASE_URL}${image}`,
        url: `${BASE_URL}${url}`,
        brand: {
            '@type': 'Brand',
            name: 'Alpacas Ibiza',
        },
        offers: {
            '@type': 'Offer',
            priceCurrency,
            price,
            availability: 'https://schema.org/InStock',
        },
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
                streetAddress: 'San Carlos',
                addressLocality: 'Santa Eulària des Riu',
                addressRegion: 'Balearic Islands',
                addressCountry: 'ES',
                postalCode: '07819',
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

// ─── Helper: inject as <script> tag string ────────────────────────────────────

export function toJsonLd(schema: object) {
    return JSON.stringify(schema)
}
