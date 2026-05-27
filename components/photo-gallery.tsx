'use client'

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
 *
 * Lightbox: clicking any thumbnail opens a fullscreen Dialog (Radix, focus-
 * trapped). Prev/next buttons + ArrowLeft/ArrowRight keyboard nav. Escape
 * closes (Radix default). Caption + credit displayed below the image.
 */

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { liveMedia, hasLiveMedia, type MediaCategory } from '@/lib/data/media'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

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
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)

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

  const isOpen = currentIndex !== null
  const activeItem = isOpen ? items[currentIndex] : null

  const goPrev = () =>
    setCurrentIndex((i) => (i! > 0 ? i! - 1 : items.length - 1))
  const goNext = () =>
    setCurrentIndex((i) => (i! < items.length - 1 ? i! + 1 : 0))

  return (
    <>
      <section className={`py-8 ${className}`} aria-label={title ?? 'Photo gallery'}>
        {title && (
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-8">
            {title}
          </h2>
        )}
        <div className={`grid grid-cols-1 ${colsClass} gap-4`}>
          {items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Open photo${item.caption ? `: ${item.caption}` : ''}`}
              onClick={() => setCurrentIndex(idx)}
              className="group block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            >
              <figure className="relative aspect-square overflow-hidden rounded-lg bg-secondary/20">
                <Image
                  src={item.photoUrl!}
                  alt={item.caption ?? `Alpacas Ibiza — ${item.category}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform group-hover:scale-105"
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
            </button>
          ))}
        </div>
      </section>

      {/* Lightbox — Radix Dialog provides focus trap + Escape handling */}
      <LightboxDialog
        isOpen={isOpen}
        item={activeItem}
        onClose={() => setCurrentIndex(null)}
        onPrev={goPrev}
        onNext={goNext}
        hasPrevNext={items.length > 1}
      />
    </>
  )
}

// Split into its own component so hooks run unconditionally (Rules of Hooks)
interface LightboxDialogProps {
  isOpen: boolean
  item: ReturnType<typeof liveMedia>[number] | null
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  hasPrevNext: boolean
}

function LightboxDialog({
  isOpen,
  item,
  onClose,
  onPrev,
  onNext,
  hasPrevNext,
}: LightboxDialogProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev() }
      if (e.key === 'ArrowRight') { e.preventDefault(); onNext() }
    },
    [isOpen, onPrev, onNext],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="
          fixed inset-0 z-50 flex flex-col items-center justify-center
          w-screen max-w-none h-screen rounded-none border-none bg-black/95 p-0
          data-[state=open]:animate-in data-[state=closed]:animate-out
          data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
        "
      >
        {/* Radix requires DialogTitle for a11y — visually hidden */}
        <DialogTitle className="sr-only">
          {item?.caption ?? 'Photo lightbox'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {item?.credit ? `Photo credit: ${item.credit}` : 'Full-size photo view'}
        </DialogDescription>

        {/* Image area */}
        {item && (
          <div className="relative w-full h-full flex flex-col items-center justify-center px-16 py-12">
            <div className="relative w-full h-full">
              <Image
                src={item.photoUrl!}
                alt={item.caption ?? `Alpacas Ibiza — ${item.category}`}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>

            {/* Caption + credit */}
            {(item.caption || item.credit) && (
              <div className="absolute bottom-4 left-16 right-16 text-center text-white text-sm">
                {item.caption && <span>{item.caption}</span>}
                {item.credit && (
                  <span className="opacity-70 text-xs ml-2">© {item.credit}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Prev button */}
        {hasPrevNext && (
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => { e.stopPropagation(); onPrev() }}
            className="
              absolute left-2 top-1/2 -translate-y-1/2
              rounded-full bg-white/10 hover:bg-white/25 text-white
              p-2 transition-colors focus:outline-none focus-visible:ring-2
              focus-visible:ring-white
            "
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Next button */}
        {hasPrevNext && (
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => { e.stopPropagation(); onNext() }}
            className="
              absolute right-2 top-1/2 -translate-y-1/2
              rounded-full bg-white/10 hover:bg-white/25 text-white
              p-2 transition-colors focus:outline-none focus-visible:ring-2
              focus-visible:ring-white
            "
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </DialogContent>
    </Dialog>
  )
}
