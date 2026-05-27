/**
 * Alpacas Ibiza — Phase 1 content module.
 *
 * This file supplies the five content arrays for the alpacasibiza tenant.
 * It is consumed by staticTypescriptContentProvider() in lib/integrations/index.ts.
 *
 * UNMAPPED fields are null throughout per Rule 5 — do NOT invent bios, images,
 * prices, or durations. See OWNER_INPUT_NEEDED.md for the data collection request.
 *
 * Animals:    14 entries sourced from lib/data/alpacas.ts (canonical roster).
 * Experiences: 4 stubs — all numeric fields null (UNMAPPED).
 * Products:   [] — shop is FareHarbor-routed; no standalone product inventory.
 * Team:       [] — owner photos UNMAPPED; see OWNER_INPUT_NEEDED.md.
 * Reviews:    [] — Google Reviews gated on GOOGLE_PLACES_API_KEY (Tier 2 env var).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO ACTIVATE AN ALPACA (bio + photo) — single-file edit:
 *
 *   Step 1: Drop the photo file at:
 *             public/images/alpacas/<id>.webp   (or .jpg)
 *
 *   Step 2: Edit the entry in the `animals` array below — set `bio` and `image`,
 *           then change no other file:
 *
 *     Before:
 *       { kind: 'animal', id: 'barbarella', name: 'Barbarella', bio: null, image: null },
 *
 *     After:
 *       { kind: 'animal', id: 'barbarella', name: 'Barbarella',
 *         bio: "Barbarella is the matriarch of the herd...",
 *         image: '/images/alpacas/barbarella.webp' },
 *
 *   Optional extended fields (add only when owner supplies):
 *     age: 7, breed: 'Huacaya', color: 'White', personality: 'Bold', fun_fact: '...'
 *
 *   For multi-language bios, use `localizedBio` instead of `bio`:
 *     localizedBio: { en: '...', nl: '...', de: '...' }, bio: null
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { TenantContentModule } from '@/lib/integrations/content-static-typescript'
import type {
  AnimalEntity,
  ExperienceEntity,
} from '@/lib/integrations/content-types'

// ── Animals ───────────────────────────────────────────────────────────────────
// Mapped directly from lib/data/alpacas.ts (same 14 entries, same null sentinels).
// Do NOT add bio or image until owner supplies the values.

const animals: ReadonlyArray<AnimalEntity> = [
  { kind: 'animal', id: 'barbarella', name: 'Barbarella', bio: null, image: null },
  { kind: 'animal', id: 'avalon',     name: 'Avalon',     bio: null, image: null },
  { kind: 'animal', id: 'bardot',     name: 'Bardot',     bio: null, image: null },
  { kind: 'animal', id: 'chet',       name: 'Chet',       bio: null, image: null },
  { kind: 'animal', id: 'dusty',      name: 'Dusty',      bio: null, image: null },
  { kind: 'animal', id: 'fela',       name: 'Fela',       bio: null, image: null },
  { kind: 'animal', id: 'fonda',      name: 'Fonda',      bio: null, image: null },
  { kind: 'animal', id: 'lewis',      name: 'Lewis',      bio: null, image: null },
  { kind: 'animal', id: 'marron',     name: 'Marron',     bio: null, image: null },
  { kind: 'animal', id: 'mojo',       name: 'Mojo',       bio: null, image: null },
  { kind: 'animal', id: 'moloko',     name: 'Moloko',     bio: null, image: null },
  { kind: 'animal', id: 'nelson',     name: 'Nelson',     bio: null, image: null },
  { kind: 'animal', id: 'suki',       name: 'Suki',       bio: null, image: null },
  { kind: 'animal', id: 'toots',      name: 'Toots',      bio: null, image: null },
] as const

// ── Experiences ───────────────────────────────────────────────────────────────
// 4 stubs matching the FareHarbor tour names. All numeric fields null = UNMAPPED.
// durationMin, priceEur, capacity: fill in when owner supplies FareHarbor item data.

const experiences: ReadonlyArray<ExperienceEntity> = [
  {
    kind: 'experience',
    id: 'meet-the-herd',
    name: 'Meet the Herd',
    bio: null,
    image: null,
    durationMin: null, // OWNER_INPUT_NEEDED
    priceEur: null,    // OWNER_INPUT_NEEDED
    capacity: null,    // OWNER_INPUT_NEEDED
  },
  {
    kind: 'experience',
    id: 'weaving-workshop',
    name: 'Weaving Workshop',
    bio: null,
    image: null,
    durationMin: null, // OWNER_INPUT_NEEDED
    priceEur: null,    // OWNER_INPUT_NEEDED
    capacity: null,    // OWNER_INPUT_NEEDED
  },
  {
    kind: 'experience',
    id: 'farm-experience',
    name: 'Farm Experience',
    bio: null,
    image: null,
    durationMin: null, // OWNER_INPUT_NEEDED
    priceEur: null,    // OWNER_INPUT_NEEDED
    capacity: null,    // OWNER_INPUT_NEEDED
  },
  {
    kind: 'experience',
    id: 'photo-session',
    name: 'Photo Session',
    bio: null,
    image: null,
    durationMin: null, // OWNER_INPUT_NEEDED
    priceEur: null,    // OWNER_INPUT_NEEDED
    capacity: null,    // OWNER_INPUT_NEEDED
  },
] as const

// ── Products ──────────────────────────────────────────────────────────────────
// Empty: Alpacas Ibiza routes shop purchases through FareHarbor.
// Populate when a standalone product catalogue is needed (ADR 004).

// ── Team ──────────────────────────────────────────────────────────────────────
// Empty: owner photos are UNMAPPED (see OWNER_INPUT_NEEDED.md "Team profiles").

// ── Reviews ───────────────────────────────────────────────────────────────────
// Empty: Google Reviews API is gated on GOOGLE_PLACES_API_KEY (Tier 2 env var).
// The live badge reads from the /api/google-reviews route when the key is set.

export const alpacasibizaContent: TenantContentModule = {
  animals,
  experiences,
  products: [],
  team: [],
  reviews: [],
}
