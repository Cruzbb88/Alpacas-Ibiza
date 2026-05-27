/**
 * Per-tenant Next.js metadata generation.
 *
 * Usage in app/[locale]/page.tsx generateMetadata (Wave B):
 *   const tenant = await getTenant()
 *   return tenantMetadata(tenant, { locale: 'en', route: '/' })
 *
 * All values are derived from the Tenant config — no hardcoded site URLs,
 * business names, or image paths.
 *
 * OG images: ONLY emitted when tenant.ogImageUrl is non-null (per V8 fix —
 * never emit broken image URLs).
 *
 * Robots: default `index, follow` for public pages. Pass robotsOverride to
 * noindex admin routes (e.g. `{ index: false, follow: false }`).
 */

import type { Metadata } from 'next'
import type { Tenant } from './_types'

// ── Option types ──────────────────────────────────────────────────────────────

/** Article-specific Open Graph fields (only emitted when openGraphType === 'article'). */
export interface ArticleMeta {
  /** ISO 8601 publish date (e.g. '2025-06-01'). */
  publishedTime?: string
  /** ISO 8601 last-modified date. */
  modifiedTime?: string
  /** Display names of article authors. */
  authors?: ReadonlyArray<string>
  /** Tag/topic labels for the article. */
  tags?: ReadonlyArray<string>
}

export interface TenantMetadataOpts {
  /** BCP-47 locale for this route (e.g. 'en', 'de'). */
  locale: string
  /**
   * Path of this route, relative to the site root (e.g. '/', '/tours').
   * Must start with '/'.
   */
  route: string
  /** Override the page title (still wrapped in the tenant title template). */
  titleOverride?: string
  /** Override the page description. */
  descriptionOverride?: string
  /**
   * Override robots directives. Default: `{ index: true, follow: true }`.
   * Use `{ index: false, follow: false }` for admin/auth pages.
   */
  robotsOverride?: { index: boolean; follow: boolean }
  /**
   * Open Graph type for this page. Defaults to 'website'.
   * Use 'article' for journal/blog posts.
   */
  openGraphType?: 'website' | 'article'
  /**
   * Article-specific metadata. Only emitted when openGraphType === 'article'.
   * Passing this without openGraphType: 'article' is a dev-time mistake and
   * will be ignored with a console.warn.
   */
  articleMeta?: ArticleMeta
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build the canonical URL for a given locale + route.
 * e.g. siteUrl='https://alpacasibiza.com', locale='en', route='/tours'
 *   → 'https://alpacasibiza.com/en/tours'
 */
function canonicalUrl(siteUrl: string, locale: string, route: string): string {
  const base = siteUrl.replace(/\/$/, '')
  const path = route === '/' ? '' : route.replace(/\/$/, '')
  return `${base}/${locale}${path}`
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Build Next.js Metadata for a tenant + route.
 *
 * Sets: title template, description, alternates.canonical, alternates.languages,
 * openGraph, twitter, robots. All values derived from tenant config.
 */
export function tenantMetadata(
  tenant: Tenant,
  opts: TenantMetadataOpts,
): Metadata {
  const {
    locale,
    route,
    titleOverride,
    descriptionOverride,
    robotsOverride,
    openGraphType,
    articleMeta,
  } = opts

  // Failsafe: articleMeta without openGraphType: 'article' is a dev mistake.
  if (articleMeta !== undefined && openGraphType !== 'article') {
    console.warn(
      '[tenantMetadata] articleMeta was passed but openGraphType is not "article" — articleMeta ignored. Set openGraphType: "article" to emit article fields.',
    )
  }

  const pageTitle = titleOverride ?? tenant.brandName
  const pageDescription = descriptionOverride ?? tenant.tagline
  const canonical = canonicalUrl(tenant.siteUrl, locale, route)

  // Alternate language URLs — one per supported locale, plus x-default
  const languages: Record<string, string> = Object.fromEntries(
    tenant.locales.map((l) => [l, canonicalUrl(tenant.siteUrl, l, route)]),
  )
  // x-default points to the default locale URL per Google's hreflang spec
  languages['x-default'] = canonicalUrl(tenant.siteUrl, tenant.defaultLocale, route)

  // OG images — only emit if ogImageUrl is non-null
  const ogImages =
    tenant.ogImageUrl !== null
      ? [{ url: tenant.ogImageUrl }]
      : undefined

  const { index, follow } = robotsOverride ?? { index: true, follow: true }

  // Twitter/X creator handle — only emit when non-null and has @ prefix.
  const rawHandle = tenant.social.twitterHandle
  let twitterCreator: string | undefined
  if (rawHandle != null) {
    if (!rawHandle.startsWith('@')) {
      console.warn(
        `[tenantMetadata] twitterHandle "${rawHandle}" does not start with "@" — handle ignored. Add "@" prefix to tenant config.`,
      )
    } else {
      twitterCreator = rawHandle
    }
  }

  // Build Open Graph block — article type emits additional fields.
  const isArticle = openGraphType === 'article'
  const articleFields =
    isArticle && articleMeta !== undefined
      ? {
          ...(articleMeta.publishedTime !== undefined
            ? { publishedTime: articleMeta.publishedTime }
            : {}),
          ...(articleMeta.modifiedTime !== undefined
            ? { modifiedTime: articleMeta.modifiedTime }
            : {}),
          ...(articleMeta.authors !== undefined && articleMeta.authors.length > 0
            ? { authors: articleMeta.authors as string[] }
            : {}),
          ...(articleMeta.tags !== undefined && articleMeta.tags.length > 0
            ? { tags: articleMeta.tags as string[] }
            : {}),
        }
      : {}

  const metadata: Metadata = {
    title: {
      default: pageTitle,
      template: `%s | ${tenant.brandName}`,
    },
    description: pageDescription,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: isArticle ? 'article' : 'website',
      url: `${tenant.siteUrl}${route === '/' ? '' : route}`,
      siteName: tenant.brandName,
      title: pageTitle,
      description: pageDescription,
      locale,
      ...(ogImages !== undefined ? { images: ogImages } : {}),
      ...articleFields,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      ...(ogImages !== undefined ? { images: ogImages.map((i) => i.url) } : {}),
      ...(twitterCreator !== undefined
        ? { creator: twitterCreator, site: twitterCreator }
        : {}),
    },
    robots: {
      index,
      follow,
    },
  }

  return metadata
}
