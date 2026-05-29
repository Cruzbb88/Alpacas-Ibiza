/**
 * Quarter-starter draft builder — pure deterministic function.
 *
 * Powers the "Auto-suggest starter draft" button on /admin/quarterly-update.
 * The button calls /api/admin/quarterly-update/suggest, which calls this
 * helper with the tenant's animals list + the resolved quarter. The owner
 * then edits the returned HTML in the textarea before saving.
 *
 * Design constraints:
 *   - 100% pure, no I/O. No AI / OpenAI / external services. The owner is the
 *     editor; "suggest" is a deterministic starter sketch that mentions the
 *     real herd by name so the owner doesn't stare at a blank textarea.
 *   - Output HTML is INJECTED into the email template verbatim (see
 *     buildAdoptQuarterlyUpdateEmail farmNewsHtml param). It MUST be safe:
 *     no <script>, no event handlers, no javascript: URLs. We achieve this by
 *     escaping every dynamic string via escapeHtml() before composing the
 *     HTML, and by emitting only fixed tags (<p>) — never tags derived from
 *     user content.
 *   - Animal names are runtime data — they could theoretically contain
 *     HTML-ish characters. The escapeHtml() pass converts <, >, &, ", ', /
 *     to entities so a hypothetical name like "Pebble<script>" cannot escape
 *     the surrounding <p> context.
 *
 * Quarter → season mapping (Northern Hemisphere; the farm is in Ibiza):
 *   Q1 → winter
 *   Q2 → spring
 *   Q3 → summer
 *   Q4 → autumn
 *
 * "Most recent" heuristic: the AnimalEntity shape has no `addedAt` field
 * (see lib/integrations/content-types.ts), so we treat the last entry in
 * the array as the newest addition. Callers can override by passing
 * `mostRecentAnimal` explicitly.
 */

import type { AnimalEntity } from './integrations/content-types.ts'
import { escapeHtml } from './html.ts'

export type Season = 'winter' | 'spring' | 'summer' | 'autumn'

export interface BuildQuarterStarterDraftInput {
  /** Quarter label, e.g. "Q1 2026". Format `Q[1-4] \d{4}`. */
  readonly quarter: string
  /** The tenant's animal roster — used to mention each alpaca by name. */
  readonly animals: ReadonlyArray<AnimalEntity>
  /**
   * Explicit newest-added animal. When omitted, the last entry of `animals`
   * is used (or null if `animals` is empty).
   */
  readonly mostRecentAnimal?: AnimalEntity | null
  /**
   * Explicit season override. When omitted, derived from the quarter label.
   * Allows tenants in the Southern Hemisphere to flip the mapping without
   * forking the function (call site supplies the flipped season).
   */
  readonly season?: Season | null
}

/**
 * Derive the Northern-Hemisphere season for a quarter label.
 * Returns null for malformed labels so the caller can fall back to no-season copy.
 */
export function quarterToSeason(quarter: string): Season | null {
  const match = /^Q([1-4])\s+\d{4}$/.exec(quarter)
  if (!match) return null
  switch (match[1]) {
    case '1':
      return 'winter'
    case '2':
      return 'spring'
    case '3':
      return 'summer'
    case '4':
      return 'autumn'
    default:
      return null
  }
}

/**
 * Pick the "most recent" animal from the roster.
 * Heuristic: last entry in the array (AnimalEntity has no addedAt field).
 * Returns null when the roster is empty.
 */
export function pickMostRecentAnimal(
  animals: ReadonlyArray<AnimalEntity>,
): AnimalEntity | null {
  if (animals.length === 0) return null
  const last = animals[animals.length - 1]
  return last ?? null
}

/**
 * Season-specific paragraph copy. Each entry is plain English with one or
 * two placeholder beats the owner is expected to overwrite. Kept short so
 * the owner spends 5 minutes editing instead of 30 writing from scratch.
 */
const SEASON_INTRO: Record<Season, string> = {
  winter:
    'It has been a quiet winter on the farm — shorter days, fluffier fleeces, and a herd that has been making the most of every patch of sunshine.',
  spring:
    'Spring has arrived on the farm — the pasture is green again, the herd is shedding their winter fleece, and shearing season is right around the corner.',
  summer:
    'Summer on the farm has been warm and busy — the herd spends mornings grazing in the shade and afternoons cooling off near the water troughs.',
  autumn:
    'Autumn has settled in on the farm — the light is golden, the air is cooler, and the herd is starting to grow back the winter fleece they will need in the months ahead.',
}

const SEASON_NO_DATE_INTRO =
  'A new quarter on the farm — here is a quick update from the herd.'

/**
 * Build a starter draft HTML string for a quarterly adopter update.
 *
 * Output is 2–3 short <p> paragraphs:
 *   ¶1 — Seasonal intro (deterministic based on quarter).
 *   ¶2 — Lists every alpaca by name so the owner can edit per-animal news in.
 *   ¶3 — Spotlight on the newest-added alpaca (if any).
 *
 * Every dynamic value is escaped via escapeHtml(). The only HTML tags emitted
 * are fixed string literals (<p>, </p>) — never derived from user input.
 *
 * @returns HTML string safe to inject into the email template
 */
export function buildQuarterStarterDraft(
  input: BuildQuarterStarterDraftInput,
): string {
  const { quarter, animals } = input
  const season = input.season ?? quarterToSeason(quarter)
  const mostRecent =
    input.mostRecentAnimal !== undefined
      ? input.mostRecentAnimal
      : pickMostRecentAnimal(animals)

  const paragraphs: string[] = []

  // ── ¶1 — seasonal intro ────────────────────────────────────────────────
  const intro = season ? SEASON_INTRO[season] : SEASON_NO_DATE_INTRO
  paragraphs.push(`<p>${escapeHtml(intro)}</p>`)

  // ── ¶2 — name-check the herd ───────────────────────────────────────────
  // Filter to non-empty names. Escape each name. Join with commas + "and"
  // before the last so the sentence reads naturally.
  const names = animals
    .map((a) => (typeof a.name === 'string' ? a.name.trim() : ''))
    .filter((n) => n.length > 0)
    .map((n) => escapeHtml(n))

  if (names.length > 0) {
    const joined =
      names.length === 1
        ? names[0]
        : names.length === 2
          ? `${names[0]} and ${names[1]}`
          : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
    paragraphs.push(
      `<p>The whole herd — ${joined} — sends their hellos. ` +
        `(Edit this paragraph to share each alpaca&rsquo;s news from the quarter.)</p>`,
    )
  }

  // ── ¶3 — spotlight on newest-added alpaca ─────────────────────────────
  if (mostRecent && typeof mostRecent.name === 'string' && mostRecent.name.trim().length > 0) {
    const name = escapeHtml(mostRecent.name.trim())
    paragraphs.push(
      `<p>A special hello from ${name}, the newest member of the herd. ` +
        `(Replace this with a short note about how ${name} has been settling in.)</p>`,
    )
  }

  return paragraphs.join('\n')
}
