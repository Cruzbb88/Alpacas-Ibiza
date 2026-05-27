/**
 * JournalCard — renders a single journal post teaser.
 *
 * Fail-quiet: all optional fields (heroImage, author, readingMinutes) are
 * omitted safely when absent. The card always renders if a post is passed.
 *
 * Usage:
 *   <JournalCard post={post} locale="en" />
 */

import Link from 'next/link'
import Image from 'next/image'
import type { JournalPost } from '@/lib/data/journal'

interface JournalCardProps {
  post: JournalPost
  locale: string
}

export function JournalCard({ post, locale }: JournalCardProps) {
  const categoryLabel = post.category.replace(/-/g, ' ')
  const dateLabel = new Date(post.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <article className="bg-card border border-border rounded-lg overflow-hidden flex flex-col h-full hover:border-primary transition-colors">
      {/* Hero image or placeholder */}
      {post.heroImage ? (
        <div className="relative aspect-video">
          <Image
            src={post.heroImage}
            alt={post.heroAlt ?? post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground text-xs">
          Photo coming soon
        </div>
      )}

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        {/* Meta row */}
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          {categoryLabel} · {dateLabel}
          {post.readingMinutes != null && ` · ${post.readingMinutes} min read`}
        </div>

        <h3 className="text-xl font-bold mb-2 leading-tight text-foreground">
          {post.title}
        </h3>

        <p className="text-muted-foreground text-sm mb-4 flex-1 line-clamp-3">
          {post.excerpt}
        </p>

        <Link
          href={`/${locale}/journal/${post.slug}`}
          className="text-primary font-medium hover:underline mt-auto inline-block text-sm"
          aria-label={`Read more about ${post.title}`}
        >
          Read more →
        </Link>
      </div>
    </article>
  )
}
