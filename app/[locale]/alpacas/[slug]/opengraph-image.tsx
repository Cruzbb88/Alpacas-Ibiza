import { ImageResponse } from 'next/og'
import { getDefaultTenant } from '@/lib/tenants/server'
import { getProviders } from '@/lib/integrations'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Params {
  params: Promise<{ locale: string; slug: string }>
}

// NOTE: deliberately NO generateImageMetadata — it forces a [__metadata_id__]
// route segment which Next rejects under the edge runtime
// ("Edge runtime is not supported with generateStaticParams"). Each [slug]
// already maps to exactly one OG image via params, so the single default
// export is all that's needed.

export default async function Image({ params }: Params) {
  const { slug } = await params
  const tenant = getDefaultTenant()
  const providers = getProviders(tenant)
  const animals = providers.content.listAnimals()
  const animal = animals.find((a) => a.id === slug)

  // Guard: if no image, fall back to a branded gradient (never broken)
  const hasPortrait = animal?.image != null
  const name = animal?.name ?? 'One of the herd'
  const tagline = `Meet ${name} at Alpacas Ibiza`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#D9A876',
        }}
      >
        {/* Portrait background */}
        {hasPortrait && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={animal!.image!}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Dark gradient overlay — bottom-up for text legibility */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.05) 100%)',
            display: 'flex',
          }}
        />

        {/* Top-left brand badge */}
        <div
          style={{
            position: 'absolute',
            top: 48,
            left: 60,
            display: 'flex',
            fontSize: 20,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.90)',
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          Alpacas Ibiza · Es Currals
        </div>

        {/* Bottom text block */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0 60px 56px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 88,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1,
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 30,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {tagline}
          </div>
        </div>
      </div>
    ),
    size,
  )
}
