/**
 * Synthetic static page for Pagefind indexing.
 *
 * Pagefind indexes built HTML output. This force-static page renders all
 * searchable content as plain HTML blocks tagged with Pagefind data attributes.
 * It is excluded from sitemaps and noindexed from search engines.
 *
 * At build time, `postbuild` runs:
 *   pagefind --site .next/server/app --output-path public/_pagefind
 * which reads the HTML emitted by this page and produces the binary index.
 */

import { buildSearchIndex } from '@/lib/search/build-index'

export const dynamic = 'force-static'
export const metadata = { robots: { index: false, follow: false } }

export default function SearchIndex() {
  const items = buildSearchIndex()
  return (
    <html lang="en">
      <body>
        {items.map((item) => (
          <article
            key={item.id}
            data-pagefind-meta={`url:${item.url}, type:${item.type}, locale:${item.locale}`}
            data-pagefind-filter={`type:${item.type}, locale:${item.locale}`}
            data-pagefind-body
          >
            <h1>{item.title}</h1>
            <p>{item.snippet}</p>
            <p>{item.keywords}</p>
          </article>
        ))}
      </body>
    </html>
  )
}
