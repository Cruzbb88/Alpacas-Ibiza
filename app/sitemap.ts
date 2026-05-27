import type { MetadataRoute } from 'next'
import { i18nConfig } from '@/i18n.config'
import { listJournalPostsNewest } from '@/lib/data/journal-posts'

const BASE_URL = 'https://alpacasibiza.com'

const routes = [
    '',           // homepage
    '/tours',
    '/about',
    '/contact',
    '/shop',
    '/shop/woven',
    '/shop/commission',
    '/shop/alcaca',
    '/experiences/corporate-team-building',
    '/experiences/romantic-sunset',
    '/experiences/family-farm-days',
    '/privacy',
    '/terms',
    '/cookies',
    '/press-kit',
    '/sitemap',   // human-readable site map
    '/journal',   // journal index
]

export default function sitemap(): MetadataRoute.Sitemap {
    const entries: MetadataRoute.Sitemap = []

    for (const locale of i18nConfig.locales) {
        for (const route of routes) {
            entries.push({
                url: `${BASE_URL}/${locale}${route}`,
                lastModified: new Date(),
                changeFrequency: route === '' ? 'weekly' : route === '/journal' ? 'weekly' : 'monthly',
                priority: route === '' ? 1.0 : route === '/tours' ? 0.9 : route === '/journal' ? 0.8 : 0.7,
                alternates: {
                    languages: Object.fromEntries(
                        i18nConfig.locales.map((l) => [l, `${BASE_URL}/${l}${route}`])
                    ),
                },
            })
        }
    }

    // Dynamic journal post entries — one per post per locale
    const posts = listJournalPostsNewest()
    for (const post of posts) {
        entries.push({
            url: `${BASE_URL}/en/journal/${post.slug}`,
            lastModified: new Date(post.updatedAt ?? post.publishedAt),
            changeFrequency: 'yearly',
            priority: 0.6,
            alternates: {
                languages: Object.fromEntries(
                    i18nConfig.locales.map((l) => [l, `${BASE_URL}/${l}/journal/${post.slug}`])
                ),
            },
        })
    }

    return entries
}
