/**
 * Tests for lib/tenants/metadata.ts — tenantMetadata().
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { tenantMetadata } from './tenants/metadata.ts'
import type { Tenant } from './tenants/_types.ts'

// ── Minimal test-fixture tenants ──────────────────────────────────────────────

const alpaca: Tenant = Object.freeze({
  slug: 'alpacasibiza',
  brandName: 'Alpacas Ibiza',
  legalName: 'Es Currals Alpacas Ibiza',
  cif: null,
  tagline: 'The very first alpaca farm on Ibiza',
  siteUrl: 'https://alpacasibiza.com',
  hosts: Object.freeze(['alpacasibiza.com']),
  contactEmail: 'info@alpacasibiza.com',
  noreplyEmail: null,
  phoneE164: '+32475586544',
  whatsappE164: '+32475586544',
  address: Object.freeze({
    streetAddress: 'San Carlos',
    addressLocality: 'Santa Eulària des Riu',
    addressRegion: 'Balearic Islands',
    addressCountry: 'ES',
    postalCode: '07819',
  }),
  geo: Object.freeze({ latitude: 38.9861, longitude: 1.5228 }),
  mapsQuery: 'Alpacas Ibiza, San Carlos, Ibiza',
  brandColors: Object.freeze({ primary: '#556B2F', secondary: '#F5F5DC', themeColor: '#6da855' }),
  logoUrl: null,
  ogImageUrl: null, // intentionally null
  social: Object.freeze({ instagramUrl: null, facebookUrl: null, googleReviewUrl: null, twitterHandle: null }),
  fareHarbor: Object.freeze({
    shortname: 'alpacasibiza',
    flowId: '1257173',
    itemIds: Object.freeze({
      tourMeetHerd: undefined, tourWeavingWorkshop: undefined,
      tourFarmExperience: undefined, tourPhotoSession: undefined,
      yoga: undefined, woven: undefined, commission: undefined, alcaca: undefined,
    }),
  }),
  analytics: Object.freeze({ ga4MeasurementId: 'G-Y946QDVVQV', gtmContainerId: 'GTM-KR3CGLS6' }),
  locales: Object.freeze(['en', 'de', 'it', 'es', 'nl', 'fr'] as const),
  defaultLocale: 'en',
} as const satisfies Tenant)

const vineyard: Tenant = Object.freeze({
  slug: 'example-vineyard',
  brandName: 'Vineyard Acres',
  legalName: 'Vineyard Acres Demo S.L.',
  cif: null,
  tagline: 'A family vineyard in the Spanish countryside',
  siteUrl: 'https://example-vineyard.alpacaplatform.com',
  hosts: Object.freeze(['example-vineyard.alpacaplatform.com']),
  contactEmail: 'hello@example-vineyard.test',
  noreplyEmail: null,
  phoneE164: '+34000000000',
  whatsappE164: null,
  address: Object.freeze({
    streetAddress: '1 Vineyard Lane',
    addressLocality: 'Toledo',
    addressRegion: 'Castilla–La Mancha',
    addressCountry: 'ES',
    postalCode: '45001',
  }),
  geo: Object.freeze({ latitude: 39.8628, longitude: -4.0273 }),
  mapsQuery: 'Vineyard Acres Demo, Toledo, Spain',
  brandColors: Object.freeze({ primary: '#722F37', secondary: '#F5E6CA', themeColor: '#722F37' }),
  logoUrl: null,
  ogImageUrl: '/foo.webp', // intentionally set
  social: Object.freeze({ instagramUrl: null, facebookUrl: null, googleReviewUrl: null, twitterHandle: null }),
  fareHarbor: Object.freeze({
    shortname: '',
    flowId: '',
    itemIds: Object.freeze({
      tourMeetHerd: undefined, tourWeavingWorkshop: undefined,
      tourFarmExperience: undefined, tourPhotoSession: undefined,
      yoga: undefined, woven: undefined, commission: undefined, alcaca: undefined,
    }),
  }),
  analytics: Object.freeze({ ga4MeasurementId: null, gtmContainerId: null }),
  locales: Object.freeze(['es', 'en'] as const),
  defaultLocale: 'es',
} as const satisfies Tenant)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('tenantMetadata — canonical URL', () => {
  it('alpacasibiza + /tours → correct canonical', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/tours' })
    assert.equal(meta.alternates?.canonical, 'https://alpacasibiza.com/en/tours')
  })

  it('vineyard + / → canonical is Spanish-first (es locale)', () => {
    const meta = tenantMetadata(vineyard, { locale: 'es', route: '/' })
    assert.equal(meta.alternates?.canonical, 'https://example-vineyard.alpacaplatform.com/es')
  })

  it('trailing slash on route is stripped', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/tours/' })
    assert.equal(meta.alternates?.canonical, 'https://alpacasibiza.com/en/tours')
  })

  it('root route / produces no double-slash', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/' })
    assert.equal(meta.alternates?.canonical, 'https://alpacasibiza.com/en')
  })
})

describe('tenantMetadata — alternates.languages', () => {
  it('alpacasibiza emits 6 language alternates plus x-default', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/tours' })
    const langs = meta.alternates?.languages as Record<string, string>
    assert.equal(Object.keys(langs).length, 7)
    assert.equal(langs['en'], 'https://alpacasibiza.com/en/tours')
    assert.equal(langs['de'], 'https://alpacasibiza.com/de/tours')
    assert.ok('x-default' in langs, 'x-default missing')
  })

  it('vineyard emits 2 language alternates (es + en) plus x-default', () => {
    const meta = tenantMetadata(vineyard, { locale: 'es', route: '/' })
    const langs = meta.alternates?.languages as Record<string, string>
    assert.equal(Object.keys(langs).length, 3)
    assert.ok('es' in langs, 'es missing')
    assert.ok('en' in langs, 'en missing')
    assert.ok('x-default' in langs, 'x-default missing')
  })
})

describe('tenantMetadata — OG images', () => {
  it('tenant.ogImageUrl null → NO openGraph.images key', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/' })
    assert.ok(!('images' in (meta.openGraph ?? {})), 'openGraph.images should not be present when ogImageUrl is null')
  })

  it('tenant.ogImageUrl /foo.webp → openGraph.images array present', () => {
    const meta = tenantMetadata(vineyard, { locale: 'es', route: '/' })
    const og = meta.openGraph as { images?: unknown }
    assert.ok(Array.isArray(og?.images), 'openGraph.images should be an array')
    const images = og.images as Array<{ url: string }>
    assert.equal(images[0].url, '/foo.webp')
  })

  it('tenant.ogImageUrl null → NO twitter.images key', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/' })
    const twitter = meta.twitter as Record<string, unknown> | undefined
    assert.ok(!twitter?.images, 'twitter.images should not be set when ogImageUrl is null')
  })

  it('tenant.ogImageUrl set → twitter.images present', () => {
    const meta = tenantMetadata(vineyard, { locale: 'es', route: '/' })
    const twitter = meta.twitter as { images?: string[] }
    assert.ok(Array.isArray(twitter?.images), 'twitter.images should be present')
    assert.equal(twitter.images![0], '/foo.webp')
  })
})

describe('tenantMetadata — title + description', () => {
  it('default title is the tenant brandName', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/' })
    const title = meta.title as { default: string; template: string }
    assert.equal(title.default, 'Alpacas Ibiza')
  })

  it('titleOverride replaces brandName in title.default', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/tours', titleOverride: 'Our Tours' })
    const title = meta.title as { default: string; template: string }
    assert.equal(title.default, 'Our Tours')
  })

  it('title template includes tenant brandName', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/' })
    const title = meta.title as { template: string }
    assert.ok(title.template.includes('Alpacas Ibiza'), `Template should include brand name: ${title.template}`)
  })

  it('default description is tenant tagline', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/' })
    assert.equal(meta.description, alpaca.tagline)
  })

  it('descriptionOverride replaces tagline', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/', descriptionOverride: 'Custom description' })
    assert.equal(meta.description, 'Custom description')
  })
})

describe('tenantMetadata — robots', () => {
  it('default robots is index:true, follow:true', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/' })
    const robots = meta.robots as { index: boolean; follow: boolean }
    assert.equal(robots.index, true)
    assert.equal(robots.follow, true)
  })

  it('robotsOverride sets noindex/nofollow', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/admin/login', robotsOverride: { index: false, follow: false } })
    const robots = meta.robots as { index: boolean; follow: boolean }
    assert.equal(robots.index, false)
    assert.equal(robots.follow, false)
  })
})

describe('tenantMetadata — twitter card', () => {
  it('twitter.card is always summary_large_image', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/' })
    const twitter = meta.twitter as { card: string }
    assert.equal(twitter.card, 'summary_large_image')
  })
})

describe('tenantMetadata — openGraph', () => {
  it('openGraph.siteName matches tenant brandName', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/' })
    const og = meta.openGraph as { siteName: string }
    assert.equal(og.siteName, 'Alpacas Ibiza')
  })

  it('openGraph.type defaults to website when openGraphType is omitted', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/' })
    const og = meta.openGraph as { type: string }
    assert.equal(og.type, 'website')
  })

  it('openGraph.type is website when openGraphType: "website" is explicit', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/', openGraphType: 'website' })
    const og = meta.openGraph as { type: string }
    assert.equal(og.type, 'website')
  })

  it('two tenants produce different openGraph.url values', () => {
    const metaA = tenantMetadata(alpaca, { locale: 'en', route: '/' })
    const metaV = tenantMetadata(vineyard, { locale: 'es', route: '/' })
    const ogA = metaA.openGraph as { url: string }
    const ogV = metaV.openGraph as { url: string }
    assert.notEqual(ogA.url, ogV.url)
  })
})

describe('tenantMetadata — openGraph article type', () => {
  it('openGraphType: "article" sets openGraph.type to article', () => {
    const meta = tenantMetadata(alpaca, {
      locale: 'en',
      route: '/journal/test-post',
      openGraphType: 'article',
      articleMeta: { publishedTime: '2025-06-01' },
    })
    const og = meta.openGraph as { type: string }
    assert.equal(og.type, 'article')
  })

  it('articleMeta.publishedTime flows to openGraph.publishedTime', () => {
    const meta = tenantMetadata(alpaca, {
      locale: 'en',
      route: '/journal/test-post',
      openGraphType: 'article',
      articleMeta: { publishedTime: '2025-06-01' },
    })
    const og = meta.openGraph as { publishedTime?: string }
    assert.equal(og.publishedTime, '2025-06-01')
  })

  it('articleMeta.modifiedTime flows to openGraph.modifiedTime', () => {
    const meta = tenantMetadata(alpaca, {
      locale: 'en',
      route: '/journal/test-post',
      openGraphType: 'article',
      articleMeta: { publishedTime: '2025-06-01', modifiedTime: '2025-06-15' },
    })
    const og = meta.openGraph as { modifiedTime?: string }
    assert.equal(og.modifiedTime, '2025-06-15')
  })

  it('articleMeta.authors flows to openGraph.authors', () => {
    const meta = tenantMetadata(alpaca, {
      locale: 'en',
      route: '/journal/test-post',
      openGraphType: 'article',
      articleMeta: { authors: ['San'] },
    })
    const og = meta.openGraph as { authors?: string[] }
    assert.deepEqual(og.authors, ['San'])
  })

  it('articleMeta.tags flows to openGraph.tags', () => {
    const meta = tenantMetadata(alpaca, {
      locale: 'en',
      route: '/journal/test-post',
      openGraphType: 'article',
      articleMeta: { tags: ['weaving', 'farm-life'] },
    })
    const og = meta.openGraph as { tags?: string[] }
    assert.deepEqual(og.tags, ['weaving', 'farm-life'])
  })

  it('articleMeta without openGraphType: "article" is ignored (no article fields emitted)', () => {
    const meta = tenantMetadata(alpaca, {
      locale: 'en',
      route: '/journal/test-post',
      // openGraphType omitted intentionally — articleMeta should be ignored
      articleMeta: { publishedTime: '2025-06-01' },
    })
    const og = meta.openGraph as Record<string, unknown>
    assert.ok(!('publishedTime' in og), 'publishedTime should not be present when openGraphType is not "article"')
    assert.equal(og.type, 'website')
  })

  it('no article fields emitted on non-article page (website default)', () => {
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/' })
    const og = meta.openGraph as Record<string, unknown>
    assert.ok(!('publishedTime' in og), 'publishedTime must not appear on website pages')
    assert.ok(!('authors' in og), 'authors must not appear on website pages')
  })
})

describe('tenantMetadata — twitter creator handle', () => {
  it('tenant.social.twitterHandle null → no twitter.creator field', () => {
    // alpaca fixture has twitterHandle: null
    const meta = tenantMetadata(alpaca, { locale: 'en', route: '/' })
    const twitter = meta.twitter as Record<string, unknown> | undefined
    assert.ok(!twitter?.creator, 'twitter.creator should not be set when twitterHandle is null')
    assert.ok(!twitter?.site, 'twitter.site should not be set when twitterHandle is null')
  })

  it('tenant.social.twitterHandle with @ prefix → twitter.creator and twitter.site set', () => {
    const tenantWithHandle: Tenant = Object.freeze({
      ...alpaca,
      social: Object.freeze({ ...alpaca.social, twitterHandle: '@alpacatest' }),
    } as const satisfies Tenant)
    const meta = tenantMetadata(tenantWithHandle, { locale: 'en', route: '/' })
    const twitter = meta.twitter as { creator?: string; site?: string }
    assert.equal(twitter.creator, '@alpacatest')
    assert.equal(twitter.site, '@alpacatest')
  })

  it('twitterHandle without @ prefix → handle ignored (no twitter.creator)', () => {
    const tenantBadHandle: Tenant = Object.freeze({
      ...alpaca,
      social: Object.freeze({ ...alpaca.social, twitterHandle: 'alpacatest' }),
    } as const satisfies Tenant)
    const meta = tenantMetadata(tenantBadHandle, { locale: 'en', route: '/' })
    const twitter = meta.twitter as Record<string, unknown> | undefined
    assert.ok(!twitter?.creator, 'twitter.creator must not be set for handle without @ prefix')
  })
})
