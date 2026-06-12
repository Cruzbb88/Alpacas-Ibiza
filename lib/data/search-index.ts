/**
 * Client-side search index — no backend, no external deps.
 * Pure JS scoring: exact title > startsWith > includes > snippet > tags.
 */

import { JOURNAL_POSTS } from './journal-posts.ts'
import { ALPACAS } from './alpacas.ts'

export interface SearchEntry {
  readonly path: string
  readonly title: string
  readonly snippet: string
  readonly type: 'page' | 'journal' | 'alpaca'
  readonly tags?: ReadonlyArray<string>
}

export const SEARCH_PAGES: ReadonlyArray<SearchEntry> = [
  { path: '/tours', title: 'Tours', snippet: "Book a guided visit to Ibiza's first alpaca farm.", type: 'page', tags: ['tour', 'book', 'visit'] },
  { path: '/yoga', title: 'Alpaca Yoga', snippet: 'Hatha yoga sessions at Es Currals. €30, max 6 guests.', type: 'page', tags: ['yoga', 'hatha', 'wellness'] },
  { path: '/alpacas', title: 'Meet the Herd', snippet: 'Our 14 named alpacas at Es Currals.', type: 'page', tags: ['herd', 'alpaca', 'meet'] },
  { path: '/about', title: 'About Es Currals', snippet: 'The first alpaca farm on Ibiza.', type: 'page', tags: ['about', 'story', 'founders'] },
  { path: '/weddings', title: 'Weddings & Photoshoots', snippet: 'Alpacas at your celebration.', type: 'page', tags: ['wedding', 'photoshoot', 'bridal'] },
  { path: '/workshops', title: 'Weaving Workshops', snippet: '2-day weaving + spinning with San. Off-season.', type: 'page', tags: ['workshop', 'weaving', 'craft'] },
  { path: '/sustainability', title: 'Sustainability', snippet: 'Animal welfare, slow craft, local stewardship.', type: 'page', tags: ['sustain', 'eco', 'welfare'] },
  { path: '/press', title: 'Press', snippet: "Where we've been featured.", type: 'page', tags: ['press', 'media', 'news'] },
  { path: '/journal', title: 'Journal', snippet: 'Stories from the herd and the studio.', type: 'page', tags: ['blog', 'story', 'journal'] },
  { path: '/adopt', title: 'Adopt an Alpaca', snippet: 'Sponsor a herd member; €75/mo or €900/yr.', type: 'page', tags: ['adopt', 'sponsor', 'support'] },
  { path: '/contact', title: 'Contact', snippet: 'Get in touch with the team at Es Currals.', type: 'page', tags: ['contact', 'email', 'call'] },
  { path: '/shop/woven', title: 'Woven Collection', snippet: 'Hand-woven scarves from alpaca wool.', type: 'page', tags: ['shop', 'scarf', 'wool', 'wishfulfilling'] },
  { path: '/shop/commission', title: 'Commission a Piece', snippet: 'Custom weaving by San.', type: 'page', tags: ['shop', 'commission', 'custom'] },
  { path: '/shop/alcaca', title: 'Alcaca (Manure)', snippet: 'Premium garden fertilizer from our herd.', type: 'page', tags: ['shop', 'alcaca', 'manure', 'garden'] },
]

export function buildSearchIndex(): ReadonlyArray<SearchEntry> {
  const journalEntries: SearchEntry[] = JOURNAL_POSTS.filter((p) => p.status === 'live').map((p) => ({
    path: `/journal/${p.slug}`,
    title: p.title,
    snippet: p.excerpt,
    type: 'journal' as const,
    tags: [...p.tags],
  }))
  const alpacaEntries: SearchEntry[] = ALPACAS.map((a) => ({
    path: `/alpacas#${a.id}`,
    title: a.name,
    snippet: 'Meet our herd member.',
    type: 'alpaca' as const,
    tags: ['herd', 'alpaca'],
  }))
  return [...SEARCH_PAGES, ...journalEntries, ...alpacaEntries]
}

export function scoreEntry(entry: SearchEntry, query: string): number {
  const q = query.toLowerCase().trim()
  if (!q) return 0
  const title = entry.title.toLowerCase()
  const snippet = entry.snippet.toLowerCase()
  const tags = entry.tags?.join(' ').toLowerCase() ?? ''

  let score = 0
  if (title === q) score += 100
  else if (title.startsWith(q)) score += 50
  else if (title.includes(q)) score += 25
  if (snippet.includes(q)) score += 10
  if (tags.split(' ').some((t) => t === q)) score += 15
  else if (tags.includes(q)) score += 5
  return score
}

export function searchAll(query: string, limit = 8): ReadonlyArray<SearchEntry> {
  return buildSearchIndex()
    .map((e) => ({ entry: e, score: scoreEntry(e, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry)
}
