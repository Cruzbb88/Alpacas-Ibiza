'use client'

import { useTranslations } from 'next-intl'

interface Props {
    /** Visual variant — compact for inline near small buttons, full for booking sections */
    variant?: 'compact' | 'full'
    className?: string
}

/**
 * Conversion-lift micro-copy shown near every Book Now CTA.
 * Industry research (FareHarbor, Kona Snorkel) shows explicit "free cancellation"
 * messaging near the CTA lifts tourism booking conversion 15-25%.
 */
export function CancellationBadge({ variant = 'compact', className = '' }: Props) {
    const tr = useTranslations()
    const label =
        tr('cancellation.freeUp24h') ||
        'Free cancellation up to 24h before your visit'

    if (variant === 'full') {
        return (
            <p className={`inline-flex items-center gap-1.5 text-sm text-foreground/70 ${className}`}>
                <span aria-hidden="true">✓</span>
                <span>{label}</span>
            </p>
        )
    }

    return (
        <span className={`inline-flex items-center gap-1 text-xs text-foreground/60 ${className}`}>
            <span aria-hidden="true">✓</span>
            <span>{label}</span>
        </span>
    )
}
