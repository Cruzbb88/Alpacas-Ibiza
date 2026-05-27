/**
 * Speculation Rules API — pre-renders likely next pages on hover/touch.
 *
 * Browsers supported: Chrome 121+, Edge 121+, Opera (~7% global as of 2026).
 * No-op in unsupported browsers (Firefox, Safari) — they ignore the script.
 *
 * Conservative defaults (`eagerness: 'moderate'`):
 *   - Prefetches on hover/touch with 200ms intent threshold
 *   - Prerenders the top-likelihood destination per page
 *   - Skips routes with mutation-side-effects (we don't have any in alpaca)
 */
export function SpeculationRules() {
  const rules = {
    prerender: [
      {
        // Prerender on hover for internal nav anchors (excludes external + admin + api)
        where: {
          and: [
            { href_matches: '/*' },
            { not: { href_matches: '/admin/*' } },
            { not: { href_matches: '/api/*' } },
            { not: { href_matches: '/*\\.xml' } },
            { not: { href_matches: '/*\\.txt' } },
          ],
        },
        eagerness: 'moderate',
      },
    ],
    prefetch: [
      {
        where: {
          and: [
            { href_matches: '/*' },
            { not: { href_matches: '/admin/*' } },
            { not: { href_matches: '/api/*' } },
          ],
        },
        eagerness: 'conservative',
      },
    ],
  }
  return (
    <script
      type="speculationrules"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(rules) }}
    />
  )
}
