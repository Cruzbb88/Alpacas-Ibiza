import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BRAND_THEME_COLOR_HEX } from '@/lib/brand'
import { ReviewTranslateButton } from '@/components/review-translate-button'

export interface TestimonialCardProps {
  author: string
  date?: string | null
  rating?: 1 | 2 | 3 | 4 | 5 | null
  body: string
  source?: 'google' | 'tripadvisor' | 'facebook' | null
  avatarUrl?: string | null
  /** BCP47 language code the review was written in (e.g. 'de'). Used as Google Translate source hint. */
  lang?: string | null
}

const SAGE = BRAND_THEME_COLOR_HEX

function StarRow({ rating }: { rating: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className="flex gap-0.5 mb-3" aria-label={`${rating} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill={n <= rating ? SAGE : 'none'}
          stroke={SAGE}
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function SourceBadge({ source }: { source: NonNullable<TestimonialCardProps['source']> }) {
  const map: Record<typeof source, { label: string; color: string; icon: React.ReactNode }> = {
    facebook: {
      label: 'Facebook',
      color: 'text-[#1877F2]',
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    google: {
      label: 'Google',
      color: 'text-foreground/50',
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      ),
    },
    tripadvisor: {
      label: 'Tripadvisor',
      color: 'text-[#34E0A1]',
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm-3-9a3 3 0 100 6 3 3 0 000-6zm6 0a3 3 0 100 6 3 3 0 000-6z" />
        </svg>
      ),
    },
  }
  const { label, color, icon } = map[source]
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
      {icon}
      {label}
    </span>
  )
}

function Avatar({ url, author }: { url: string | null | undefined; author: string }) {
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={40}
        height={40}
        className="rounded-full object-cover bg-muted flex-shrink-0"
        loading="lazy"
        decoding="async"
        unoptimized
      />
    )
  }
  // Placeholder initials avatar
  const initials = author
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
      style={{ backgroundColor: SAGE }}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

/**
 * TestimonialCard — reusable review card.
 *
 * If body === "__UNMAPPED__" the card renders a skeleton
 * (review content not yet owner-confirmed — see OWNER_INPUT_NEEDED.md).
 * Source: REALITY_CHECK.md line 120 (6 hardcoded Facebook reviews).
 */
export function TestimonialCard({
  author,
  date,
  rating,
  body,
  source,
  avatarUrl,
  lang,
}: TestimonialCardProps) {
  const isUnmapped = body === '__UNMAPPED__'

  return (
    <Card className="p-6 border-border/50 flex flex-col justify-between h-full">
      <div>
        {rating && <StarRow rating={rating} />}

        {isUnmapped ? (
          <div aria-label="Review content pending" className="space-y-2 mb-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </div>
        ) : (
          <ReviewTranslateButton
            text={body}
            sourceLang={lang ?? undefined}
            className="mb-3"
          >
            <blockquote className="text-foreground/70 italic leading-relaxed text-sm mb-2">
              &ldquo;{body}&rdquo;
            </blockquote>
          </ReviewTranslateButton>
        )}
      </div>

      <div className="pt-3 border-t border-border/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar url={avatarUrl} author={author} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{author}</p>
            {date && <p className="text-xs text-foreground/50">{date}</p>}
          </div>
        </div>
        {source && <SourceBadge source={source} />}
      </div>
    </Card>
  )
}
