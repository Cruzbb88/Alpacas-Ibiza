/**
 * JSON-LD structured data helpers for AEO/SEO.
 * All schema objects are locale-aware via string params.
 */

const BASE_URL = 'https://alpacasibiza.com'

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

// ─── Helper: inject as <script> tag string ────────────────────────────────────

export function toJsonLd(schema: object) {
    return JSON.stringify(schema)
}
