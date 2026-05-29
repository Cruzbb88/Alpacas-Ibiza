/**
 * Donor-portal photo gallery.
 *
 * Renders a grid of additional alpaca photos (separate from the hero shot
 * in the main alpaca card). Always rendered — even when there are zero
 * photos — because the empty-state hint sets expectations for what the
 * donor will see as the owner adds more shots through the season.
 *
 * Server component (no client JS): there's no lightbox / no interactivity
 * in v1. If we later add a lightbox, opt-in with a 'use client' wrapper
 * around the modal only — keep the grid itself server-rendered for SEO of
 * the (signed-in) gallery state and faster TTFB.
 *
 * Failsafe Rule 5: NEVER renders a placeholder/stock image. When the
 * tenant content has no gallery entries, we show a soft-styled hint
 * instead of inventing photo paths.
 */

import Image from 'next/image'

export interface PhotoGalleryProps {
  /**
   * Real, owner-supplied photos. Empty array → empty-state hint.
   * Each entry's `src` is rendered through Next.js <Image fill> with a
   * fixed aspect-ratio grid cell.
   */
  readonly photos: ReadonlyArray<{ src: string; alt: string }>
  /** Used in the empty-state copy to personalise the message. */
  readonly alpacaName: string
}

export function PhotoGallery({ photos, alpacaName }: PhotoGalleryProps) {
  const hasPhotos = photos.length > 0

  return (
    <section
      aria-labelledby="donor-photo-gallery-heading"
      style={{
        background: '#fff',
        border: '1px solid #e4e4e7',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <h2
        id="donor-photo-gallery-heading"
        style={{
          fontSize: 13,
          fontWeight: 600,
          margin: '0 0 12px',
          color: '#3f3f46',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        Photo gallery
      </h2>

      {hasPhotos ? (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 12,
          }}
          // Inline media query via data attribute won't work; we use a CSS
          // class hook so the global stylesheet can lift the grid to 4 cols
          // at >= 720px. The data-attr keeps the responsive intent visible
          // in markup for future Tailwind migration.
          data-donor-portal-gallery="true"
          className="donor-portal-gallery"
        >
          {photos.map((photo, idx) => (
            <li
              key={`${photo.src}-${idx}`}
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                background: '#f4f4f5',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <Image
                src={photo.src}
                alt={photo.alt || `Photo of ${alpacaName}`}
                fill
                // Mobile: 2-col grid in a 720px-max container → cell ≈ 48vw.
                // Desktop: 4-col grid in 720px container → cell ≈ 170px.
                sizes="(min-width: 720px) 170px, 48vw"
                style={{ objectFit: 'cover' }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p
          style={{
            margin: 0,
            padding: '20px 16px',
            background: '#fafafa',
            border: '1px dashed #d4d4d8',
            borderRadius: 8,
            color: '#71717a',
            fontSize: 13,
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          More photos of {alpacaName} coming soon — the owner is taking shots this season.
        </p>
      )}
    </section>
  )
}
