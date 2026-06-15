/**
 * VirtualFarmTour — fullscreen CSS scroll-snap carousel of virtual tour stops.
 *
 * Server component — no 'use client' required (SSR-safe scroll-snap).
 *
 * Fail-quiet in production: returns null when filtered set is empty
 * (no live stops with an imageSrc set). Dev mode shows an amber hint
 * box — mirrors the PhotoGallery pattern.
 *
 * HOW TO ACTIVATE:
 *   1. Drop photos at public/images/virtual-tour/<id>.webp
 *   2. In lib/data/media.ts, update the matching VirtualTourStop:
 *        imageSrc: '/images/virtual-tour/<id>.webp',
 *        status: 'live',
 *   No other file needs touching.
 */

import Image from 'next/image'
import { liveVirtualTourStops } from '@/lib/data/media'

export function VirtualFarmTour() {
  const stops = liveVirtualTourStops()

  // Fail-quiet in prod; amber hint in dev — mirrors PhotoGallery
  if (stops.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="border border-dashed border-amber-300 bg-amber-50 text-amber-900 text-xs px-3 py-2 rounded my-4 max-w-2xl mx-auto">
          [VirtualFarmTour] No live tour stops.
          Owner: set <code className="font-mono">imageSrc</code> and{' '}
          <code className="font-mono">status: &apos;live&apos;</code> on stops in{' '}
          <code className="font-mono">lib/data/media.ts</code>.
        </div>
      )
    }
    return null
  }

  return (
    <section
      aria-label="Virtual farm tour"
      className="w-full py-16 md:py-24 px-4 bg-muted/40"
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
          Virtual Farm Tour
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          Explore Es Currals before you arrive — scroll through the key spots on the farm.
        </p>

        {/* Horizontal scroll-snap carousel — SSR-safe, no JS required */}
        <ul
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-thin"
          style={{ scrollPaddingLeft: '1rem' }}
          role="list"
        >
          {stops.map((stop) => (
            <li
              key={stop.id}
              className="snap-start flex-none w-[85vw] sm:w-[400px] md:w-[480px] rounded-2xl overflow-hidden border border-border bg-card shadow-sm"
            >
              <figure className="flex flex-col h-full">
                {/* Image area — imageSrc is non-null (filtered by liveVirtualTourStops) */}
                <div className="relative aspect-video w-full bg-secondary/20">
                  <Image
                    src={stop.imageSrc!}
                    alt={stop.label}
                    fill
                    sizes="(max-width: 640px) 85vw, (max-width: 768px) 400px, 480px"
                    className="object-cover"
                  />
                </div>

                {/* Caption */}
                <figcaption className="p-5 flex flex-col gap-1.5 flex-1">
                  <h3 className="font-semibold text-foreground text-lg leading-snug">
                    {stop.label}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {stop.description}
                  </p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
