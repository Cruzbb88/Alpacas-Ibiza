/**
 * LatestStories — server component (no 'use client').
 *
 * Renders the 3 newest posts from lib/data/journal-posts.ts as a card grid.
 * Fail-quiet contract: returns null when no posts exist — the home page
 * renders without the section, no empty space (catalog 017 failsafe).
 *
 * Used on the home page between ExperienceCards and TestimonialsWall.
 */

import Link from 'next/link'
import { listJournalPostsNewest } from '@/lib/data/journal-posts'
import { t } from '@/lib/translations'
import type { Locale } from '@/i18n.config'

interface Props {
  readonly locale: Locale
  readonly max?: number // default 3
}

export function LatestStories({ locale, max = 3 }: Props) {
  const posts = listJournalPostsNewest().slice(0, max)

  // Fail-quiet — section disappears when no posts; no empty space rendered
  if (posts.length === 0) return null

  const translate = t(locale)

  const sectionTitle =
    translate('journal.latestTitle') || 'Latest from the journal'
  const sectionSubtitle =
    translate('journal.latestSubtitle') ||
    'Field notes from the herd, the studio, and the finca.'
  const readAllLabel = translate('journal.readAll') || 'Read all stories'
  const minReadLabel = translate('journal.minRead') || 'min read'

  return (
    <section className="w-full py-16 md:py-24 px-4 bg-secondary/20">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {sectionTitle}
          </h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            {sectionSubtitle}
          </p>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {posts.map((post) => {
            const dateLabel = new Date(post.publishedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })

            return (
              <article
                key={post.slug}
                className="bg-card border border-border rounded-lg overflow-hidden flex flex-col h-full hover:border-primary transition-colors"
              >
                {/* Cover image or placeholder */}
                {post.cover ? (
                  <div
                    className="aspect-video bg-cover bg-center"
                    style={{ backgroundImage: `url(${post.cover})` }}
                    role="img"
                    aria-label={post.coverAlt}
                  />
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground text-xs">
                    Photo coming soon
                  </div>
                )}

                {/* Card body */}
                <div className="p-6 flex flex-col flex-1">
                  {/* Date + reading time */}
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    {dateLabel}
                    {post.readingMinutes != null &&
                      ` · ${post.readingMinutes} ${minReadLabel}`}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold mb-2 leading-tight text-foreground">
                    <Link
                      href={`/${locale}/journal/${post.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h3>

                  {/* Excerpt */}
                  <p className="text-muted-foreground text-sm mb-4 flex-1 line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* Tag pills */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Author badge */}
                  <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
                    <div
                      className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0"
                      aria-hidden="true"
                    >
                      {post.author.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-none truncate">
                        {post.author.name}
                      </p>
                      {post.author.role && (
                        <p className="text-xs text-muted-foreground leading-none mt-0.5 truncate">
                          {post.author.role}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        {/* Read all link */}
        <div className="text-center">
          <Link
            href={`/${locale}/journal`}
            className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
          >
            {readAllLabel} →
          </Link>
        </div>
      </div>
    </section>
  )
}
