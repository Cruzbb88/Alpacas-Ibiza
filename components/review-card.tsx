'use client'

import { Card } from '@/components/ui/card'
import { ReviewTranslateButton } from '@/components/review-translate-button'

export interface Review {
    name: string
    date: string
    text: string
    translationKey: string
    language: string
}

function FacebookBadge({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            {label}
        </span>
    )
}

interface ReviewCardProps {
    review: Review
    /**
     * @deprecated No longer used. Kept for call-site backward compatibility.
     * Translation is now handled in-place via ReviewTranslateButton wrapping pattern.
     */
    translatedText?: string
    /** @deprecated No longer used. Kept for call-site backward compatibility. */
    translateButtonLabel?: string
    /** @deprecated No longer used. Kept for call-site backward compatibility. */
    showOriginalLabel?: string
    /** @deprecated No longer used. Kept for call-site backward compatibility. */
    siteLocale?: string
    facebookBadgeLabel?: string
}

export function ReviewCard({
    review,
    facebookBadgeLabel = 'Facebook Review',
}: ReviewCardProps) {
    return (
        <Card className="p-6 border-border/50 flex flex-col justify-between h-full">
            {/* No star rating: Facebook recommendations are binary (recommend / don't),
                not star-scored. Source carries rating:null — rendering 5 stars would
                fabricate a score the data never had. The Facebook badge signals provenance. */}
            <div>
                {/* Review text with inline translate toggle */}
                <ReviewTranslateButton
                    text={review.text}
                    sourceLang={review.language}
                    className="mb-4"
                >
                    <p className="text-muted-foreground italic leading-relaxed text-sm mb-2">
                        &ldquo;{review.text}&rdquo;
                    </p>
                </ReviewTranslateButton>
            </div>

            {/* Author info */}
            <div className="pt-3 border-t border-border/30">
                <p className="text-sm font-semibold text-foreground">{review.name}</p>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">{review.date}</p>
                    <FacebookBadge label={facebookBadgeLabel} />
                </div>
            </div>
        </Card>
    )
}
