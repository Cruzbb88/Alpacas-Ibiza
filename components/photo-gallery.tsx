/**
 * PhotoGallery — renders live photos from lib/data/media.ts.
 *
 * Fail-quiet in production: returns null when the filtered set is empty.
 * Dev mode: amber dashed hint box so the owner knows what to do.
 *
 * Usage:
 *   <PhotoGallery />                        — all live photos, 3 columns
 *   <PhotoGallery category="alpacas" />     — filtered by category
 *   <PhotoGallery limit={6} columns={2} />  — first 6, 2 columns
 */

import Image from 'next/image'
import { liveMedia, hasLiveMedia, type MediaCategory } from '@/lib/data/media'

interface PhotoGalleryProps {
  title?: string
  category?: MediaCategory
  limit?: number
  columns?: 2 | 3 | 4
  className?: string
}

export function PhotoGallery({
  title,
  category,
  limit,
  columns = 3,
  className = '',
}: PhotoGalleryProps) {
  // Dev-mode hint when the whole gallery is empty
  if (!hasLiveMedia()) {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="border border-dashed border-amber-300 bg-amber-50 text-amber-900 text-xs px-3 py-2 rounded my-4">
          [PhotoGallery] No live media.
          Owner: drop files at <code className="font-mono">public/images/gallery/</code> and add
          entries to <code className="font-mono">lib/data/media.ts</code> with{' '}
          <code className="font-mono">status: &apos;live&apos;</code>.
        </div>
      )
    }
    return null
  }

  const all = liveMedia(category)
  const items = limit != null ? all.slice(0, limit) : all

  // Category may be live globally but empty for this specific filter
  if (items.length === 0) return null

  const colsClass =
    columns === 4
      ? 'md:grid-cols-3 lg:grid-cols-4'
      : columns === 2
        ? 'md:grid-cols-2'
        : 'md:grid-cols-2 lg:grid-cols-3'

  return (
    <section className={`py-8 ${className}`} aria-label={title ?? 'Photo gallery'}>
      {title && (
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-8">
          {title}
        </h2>
      )}
      <div className={`grid grid-cols-1 ${colsClass} gap-4`}>
        {items.map((item) => (
          <figure
            key={item.id}
            className="relative aspect-square overflow-hidden rounded-lg bg-secondary/20"
          >
            <Image
              src={item.photoUrl!}
              alt={item.caption ?? `Alpacas Ibiza — ${item.category}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform hover:scale-105"
            />
            {(item.caption || item.credit) && (
              <figcaption className="absolute bottom-0 left-0 right-0 bg-foreground/70 text-background text-sm p-2 backdrop-blur-sm">
                {item.caption}
                {item.credit && (
                  <span className="opacity-70 text-xs ml-2">© {item.credit}</span>
                )}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  )
}
