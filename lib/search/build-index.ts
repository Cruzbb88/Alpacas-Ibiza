/**
 * Build-time search index.
 *
 * Returns the full set of searchable items across the site:
 *   - Alpacas (name, id)
 *   - Journal posts (title, excerpt, tags)
 *   - Static pages (about, sustainability, weaving, contact, etc.)
 *
 * Each item: { id, type, locale, title, snippet, url, keywords }
 * `keywords` is a lowercased space-joined string of all searchable fields
 * for the matcher to substring-test against.
 *
 * Called by /api/search route which returns this as JSON. Cached 1h.
 *
 * Note on data shape: ALPACAS uses { id, name, bio, image } — no breed/color/
 * personality/fun_fact fields. The live content lives in
 * lib/tenants/alpacasibiza-content.ts; ALPACAS is used here as the canonical
 * name roster.
 */

import { ALPACAS } from '@/lib/data/alpacas'
import { JOURNAL_POSTS } from '@/lib/data/journal-posts'
import type { Locale } from '@/i18n.config'
import { i18nConfig } from '@/i18n.config'

export interface SearchItem {
  id: string
  type: 'alpaca' | 'tour' | 'experience' | 'journal' | 'shop' | 'page'
  locale: Locale
  title: string
  snippet: string
  url: string
  keywords: string // pre-lowercased for fast substring match
}

export function buildSearchIndex(): SearchItem[] {
  const items: SearchItem[] = []

  for (const locale of i18nConfig.locales) {
    // ── Alpacas ──────────────────────────────────────────────────────────────
    for (const alpaca of ALPACAS) {
      items.push({
        id: `alpaca-${locale}-${alpaca.id}`,
        type: 'alpaca',
        locale,
        title: alpaca.name,
        snippet: alpaca.bio ?? `Meet ${alpaca.name} — one of our herd.`,
        url: `/${locale}/alpacas#${alpaca.id}`,
        keywords: [alpaca.name, alpaca.id, 'alpaca', 'herd'].join(' ').toLowerCase(),
      })
    }

    // ── Journal posts ─────────────────────────────────────────────────────────
    for (const post of JOURNAL_POSTS) {
      items.push({
        id: `journal-${locale}-${post.slug}`,
        type: 'journal',
        locale,
        title: post.title,
        snippet: post.excerpt,
        url: `/${locale}/journal/${post.slug}`,
        keywords: [
          post.title,
          post.excerpt,
          ...post.tags,
          'journal',
          'blog',
          'story',
        ]
          .join(' ')
          .toLowerCase(),
      })
    }

    // ── Static pages ──────────────────────────────────────────────────────────
    const pages = [
      {
        id: 'home',
        title: 'Home',
        snippet: 'Es Currals Alpacas Ibiza — the farm.',
        url: `/${locale}`,
        kw: 'home farm es currals ibiza',
      },
      {
        id: 'about',
        title: 'About',
        snippet: 'The story of the farm.',
        url: `/${locale}/about`,
        kw: 'about story team owners bart san',
      },
      {
        id: 'tours',
        title: 'Tours',
        snippet: 'Visit the herd.',
        url: `/${locale}/tours`,
        kw: 'tours visit booking farm experience guided',
      },
      {
        id: 'adopt',
        title: 'Adopt-a-Paca',
        snippet: 'Adopt an alpaca for a year.',
        url: `/${locale}/adopt`,
        kw: 'adopt sponsor monthly yearly adoption certificate',
      },
      {
        id: 'alpacas',
        title: 'The herd',
        snippet: 'Meet all 14 alpacas.',
        url: `/${locale}/alpacas`,
        kw: 'alpacas herd meet all',
      },
      {
        id: 'weaving',
        title: 'Wishfulfilling Weaving',
        snippet: 'Handwoven scarves from our herd.',
        url: `/${locale}/weaving`,
        kw: 'weaving scarves textile craft loom wishfulfilling',
      },
      {
        id: 'shop',
        title: 'Shop',
        snippet: 'Take a piece of the farm home.',
        url: `/${locale}/shop`,
        kw: 'shop buy products woven scarf',
      },
      {
        id: 'commission',
        title: 'Commission',
        snippet: 'Custom textile piece.',
        url: `/${locale}/commission`,
        kw: 'commission custom textile bespoke',
      },
      {
        id: 'sustainability',
        title: 'Sustainability',
        snippet: 'How we run the farm.',
        url: `/${locale}/sustainability`,
        kw: 'sustainability fibre fertilizer farming eco welfare',
      },
      {
        id: 'contact',
        title: 'Contact',
        snippet: 'Get in touch.',
        url: `/${locale}/contact`,
        kw: 'contact email phone directions',
      },
      {
        id: 'gifts',
        title: 'Gift cards',
        snippet: 'Give an alpaca experience.',
        url: `/${locale}/gifts`,
        kw: 'gift cards voucher present',
      },
      {
        id: 'journal',
        title: 'Journal',
        snippet: 'Stories from the farm.',
        url: `/${locale}/journal`,
        kw: 'journal blog stories news',
      },
      {
        id: 'press',
        title: 'Press',
        snippet: 'Media coverage.',
        url: `/${locale}/press`,
        kw: 'press media news coverage',
      },
      {
        id: 'press-kit',
        title: 'Press kit',
        snippet: 'Assets for journalists.',
        url: `/${locale}/press-kit`,
        kw: 'press kit logos photos journalists',
      },
      {
        id: 'weddings',
        title: 'Weddings',
        snippet: 'Alpacas at your wedding.',
        url: `/${locale}/weddings`,
        kw: 'weddings ceremony event photoshoot',
      },
      {
        id: 'workshops',
        title: 'Workshops',
        snippet: 'Hands-on craft sessions.',
        url: `/${locale}/workshops`,
        kw: 'workshops classes learn craft',
      },
      {
        id: 'yoga',
        title: 'Alpaca yoga',
        snippet: 'Yoga with the herd.',
        url: `/${locale}/yoga`,
        kw: 'yoga alpaca wellness movement hatha',
      },
    ]

    for (const p of pages) {
      items.push({
        id: `page-${locale}-${p.id}`,
        type: 'page',
        locale,
        title: p.title,
        snippet: p.snippet,
        url: p.url,
        keywords: `${p.title} ${p.snippet} ${p.kw}`.toLowerCase(),
      })
    }
  }

  return items
}
