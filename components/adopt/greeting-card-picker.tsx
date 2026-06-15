'use client'

/**
 * GreetingCardPicker — single-select card design grid for adopt-gift-adoption flow.
 *
 * Patterned on Spring Farm's 15-design card picker: thumbnail grid → user picks →
 * selection threads into checkout metadata via hidden form input or callback.
 *
 * Renders null when no live cards with thumbnails are available — prevents a
 * broken-looking picker before the owner adds card designs to lib/data/greeting-cards.ts.
 *
 * Failsafe: renders null if liveGreetingCards() returns [] (no layout shift).
 *
 * TODO (owner/dev): once card designs are added and this picker is live, wire
 * `giftCardDesign` through payment-vendor.ts → Stripe/Mollie checkout metadata
 * → webhook handler so the selected design reaches fulfilment. See
 * lib/data/greeting-cards.ts for the TODO comment there.
 */

import Image from 'next/image'
import { useState } from 'react'
import { liveGreetingCards } from '@/lib/data/greeting-cards'

interface GreetingCardPickerProps {
  /** Hidden form input name — value will be the selected card id. */
  name?: string
  /** Called when the user selects or deselects a card. */
  onSelect?: (cardId: string | null) => void
}

export function GreetingCardPicker({ name = 'card_design', onSelect }: GreetingCardPickerProps) {
  const cards = liveGreetingCards()

  // Render null until the owner has added live card designs — no empty-grid flash.
  if (cards.length === 0) return null

  return <GreetingCardPickerInner cards={cards} name={name} onSelect={onSelect} />
}

// Inner component so hook rules aren't violated when the outer early-returns null.
function GreetingCardPickerInner({
  cards,
  name,
  onSelect,
}: {
  cards: ReturnType<typeof liveGreetingCards>
  name: string
  onSelect?: (cardId: string | null) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)

  function handleSelect(id: string) {
    const next = selected === id ? null : id
    setSelected(next)
    onSelect?.(next)
  }

  return (
    <fieldset className="space-y-3">
      <legend className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Choose a greeting card design
        <span className="ml-1 text-foreground/40 normal-case font-normal tracking-normal">
          (optional)
        </span>
      </legend>

      {/* Hidden input threads selected card ID into form submission */}
      <input type="hidden" name={name} value={selected ?? ''} />

      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => {
          const isSelected = selected === card.id
          return (
            <button
              key={card.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={card.label}
              onClick={() => handleSelect(card.id)}
              className={[
                'relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                isSelected
                  ? 'border-primary ring-2 ring-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 bg-background',
              ].join(' ')}
            >
              {card.thumbnailSrc ? (
                <div className="relative w-full aspect-[3/4] rounded overflow-hidden bg-muted">
                  <Image
                    src={card.thumbnailSrc}
                    alt={card.label}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 30vw, 120px"
                  />
                </div>
              ) : (
                <div className="w-full aspect-[3/4] rounded bg-muted flex items-center justify-center text-2xl">
                  🖼️
                </div>
              )}
              <span className="text-xs text-center text-muted-foreground leading-tight line-clamp-2">
                {card.label}
              </span>
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold"
                >
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selected && (
        <button
          type="button"
          onClick={() => {
            setSelected(null)
            onSelect?.(null)
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
        >
          Remove card selection
        </button>
      )}
    </fieldset>
  )
}
