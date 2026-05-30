import { SITE_BASE_URL } from '@/lib/config'

interface ReviewItem {
    author: string
    rating: number
    text: string
    relativeTime: string
}

type ReviewsResponse =
    | { configured: false }
    | {
          configured: true
          rating: number
          reviewCount: number
          topReviews: ReviewItem[]
          error?: string
      }

interface GoogleReviewsWallProps {
    heading?: string
    className?: string
}

/**
 * Server component — fetches Google reviews at render time and shows a 3-up
 * review grid with aggregate rating. Falls back to null (fail-quiet) when
 * env vars are unset OR the API call fails. Revalidates every 6 hours via
 * Next.js ISR so quota usage is ~4 calls/day.
 *
 * Env vars:
 *   GOOGLE_PLACES_API_KEY — server-side key with Places API enabled
 *   GOOGLE_PLACES_PLACE_ID — the Google Business Profile place ID
 */
export async function GoogleReviewsWall({
    heading = 'What guests say',
    className,
}: GoogleReviewsWallProps) {
    let data: ReviewsResponse
    try {
        const res = await fetch(`${SITE_BASE_URL}/api/google-reviews`, {
            next: { revalidate: 21600 }, // 6h ISR — ~4 calls/day, well within Places quota
        })
        if (!res.ok) return null
        data = (await res.json()) as ReviewsResponse
    } catch {
        return null
    }

    if (!data.configured || data.error || !data.topReviews || data.topReviews.length === 0) {
        return null
    }

    const reviews = data.topReviews.slice(0, 3)
    const filledStars = Math.round(data.rating)

    return (
        <section className={className} aria-labelledby="google-reviews-heading">
            <header className="text-center mb-6">
                <h2
                    id="google-reviews-heading"
                    className="text-2xl font-bold text-foreground mb-2"
                >
                    {heading}
                </h2>
                <p className="text-sm text-foreground/70">
                    <span aria-hidden="true" className="text-yellow-500 font-bold">
                        {'★'.repeat(filledStars)}{'☆'.repeat(5 - filledStars)}
                    </span>
                    <span className="ml-2 font-semibold text-foreground">
                        {data.rating.toFixed(1)} / 5
                    </span>
                    <span className="text-foreground/60">
                        {' '}· Based on {data.reviewCount} Google reviews
                    </span>
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reviews.map((review, i) => {
                    const initials = review.author.slice(0, 2).toUpperCase()
                    const starsFilled = Math.min(5, Math.max(0, Math.round(review.rating)))
                    return (
                        <article
                            key={i}
                            className="bg-card border border-border rounded-2xl p-5"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div
                                    className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0"
                                    aria-hidden="true"
                                >
                                    {initials}
                                </div>
                                <div>
                                    <p className="font-semibold text-sm text-foreground">
                                        {review.author}
                                    </p>
                                    <p className="text-xs text-foreground/60">
                                        {review.relativeTime}
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">
                                &ldquo;{review.text}&rdquo;
                            </p>
                            <p
                                className="text-xs text-yellow-500 mt-3"
                                aria-label={`${review.rating} of 5 stars`}
                            >
                                <span aria-hidden="true">
                                    {'★'.repeat(starsFilled)}{'☆'.repeat(5 - starsFilled)}
                                </span>
                            </p>
                        </article>
                    )
                })}
            </div>
        </section>
    )
}
