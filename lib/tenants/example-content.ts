/**
 * Vineyard Acres — Phase 1 demo content module.
 *
 * Purpose: prove the ContentProvider abstraction works for a non-alpaca tenant.
 * This tenant serves grape varieties instead of animals — the framework never
 * mentions "alpaca" in the content layer.
 *
 * UNMAPPED fields are null per Rule 5. Do NOT invent descriptions or images.
 * This is a demo tenant; no owner has supplied real content.
 *
 * Animals  →  grape varieties (3 entries — Tempranillo, Garnacha, Verdejo)
 * Products →  3 wine stubs (bottles available via the vineyard shop)
 * Experiences, Team, Reviews → [] (UNMAPPED for demo tenant)
 */

import type { TenantContentModule } from '@/lib/integrations/content-static-typescript'
import type {
  AnimalEntity,
  ProductEntity,
} from '@/lib/integrations/content-types'

// ── "Animals" = grape varieties ───────────────────────────────────────────────
// The framework's AnimalEntity is species-agnostic: a vineyard lists its grape
// varieties here, a horse farm lists horses, etc. The UI reads `kind: 'animal'`
// and never hard-codes "alpaca" in the component layer.

const animals: ReadonlyArray<AnimalEntity> = [
  {
    kind: 'animal',
    id: 'tempranillo',
    name: 'Tempranillo',
    bio: null,   // UNMAPPED — demo tenant has no owner to supply descriptions
    image: null, // UNMAPPED
  },
  {
    kind: 'animal',
    id: 'garnacha',
    name: 'Garnacha',
    bio: null,
    image: null,
  },
  {
    kind: 'animal',
    id: 'verdejo',
    name: 'Verdejo',
    bio: null,
    image: null,
  },
] as const

// ── Products = wine bottles ───────────────────────────────────────────────────
// 3 product stubs — prices null (UNMAPPED for demo tenant).

const products: ReadonlyArray<ProductEntity> = [
  {
    kind: 'product',
    id: 'tempranillo-reserva-2021',
    name: 'Tempranillo Reserva 2021',
    bio: null,
    image: null,
    priceEur: null, // UNMAPPED
  },
  {
    kind: 'product',
    id: 'garnacha-old-vine-2022',
    name: 'Garnacha Old Vine 2022',
    bio: null,
    image: null,
    priceEur: null, // UNMAPPED
  },
  {
    kind: 'product',
    id: 'verdejo-blanco-2023',
    name: 'Verdejo Blanco 2023',
    bio: null,
    image: null,
    priceEur: null, // UNMAPPED
  },
] as const

// ── Experiences, Team, Reviews ────────────────────────────────────────────────
// All empty for the demo tenant.

export const exampleContent: TenantContentModule = {
  animals,
  experiences: [],
  products,
  team: [],
  reviews: [],
}
