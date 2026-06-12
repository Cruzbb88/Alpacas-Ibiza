/**
 * Greeting card designs for the adopt-gift-adoption card picker.
 *
 * Patterned on Spring Farm's 15-card grid: thumbnail grid → user picks →
 * selection threads into checkout metadata.
 *
 * OWNER_INPUT_NEEDED:
 *   1. Add SVG/PNG thumbnails to public/images/cards/ (e.g. card-01.svg)
 *   2. Populate the `greetingCards` array below with status: 'live'
 *   3. Set thumbnailSrc to the public path (e.g. '/images/cards/card-01.svg')
 *
 * The picker component renders null until at least one card is 'live' AND has
 * a thumbnailSrc — no broken UI before designs are ready.
 *
 * TODO (owner): once designs are ready, wire `giftCardDesign` through Stripe/Mollie
 * checkout metadata in payment-vendor.ts / payment-stripe-direct.ts /
 * payment-mollie.ts so the selected card design reaches the fulfilment webhook.
 */

export interface GreetingCardDesign {
  /** e.g. 'card-01' .. 'card-15' */
  id: string
  /** Display name shown in the picker, e.g. "Watercolor Alpaca" */
  label: string
  /** Path under /public, e.g. '/images/cards/card-01.svg'. null until owner adds the asset. */
  thumbnailSrc: string | null
  /** Themes for future filtering, e.g. ['birthday'], ['christmas'], ['general'] */
  themes: string[]
  status: 'live' | 'draft'
}

/**
 * Populate this array with your card designs.
 * Only cards with status: 'live' AND a non-null thumbnailSrc are shown in the picker.
 * Drafts are invisible to visitors until promoted to 'live'.
 */
export const greetingCards: GreetingCardDesign[] = [
  // Example entries — change status to 'live' and add thumbnailSrc to activate:
  // {
  //   id: 'card-01',
  //   label: 'Watercolor Alpaca',
  //   thumbnailSrc: '/images/cards/card-01.svg',
  //   themes: ['general'],
  //   status: 'live',
  // },
  // {
  //   id: 'card-02',
  //   label: 'Christmas Sleigh',
  //   thumbnailSrc: '/images/cards/card-02.svg',
  //   themes: ['christmas'],
  //   status: 'live',
  // },
]

/**
 * Returns only cards that are live AND have a thumbnail asset.
 * Called by GreetingCardPicker — renders null when this returns [].
 */
export function liveGreetingCards(): GreetingCardDesign[] {
  return greetingCards.filter((c) => c.status === 'live' && c.thumbnailSrc !== null)
}
