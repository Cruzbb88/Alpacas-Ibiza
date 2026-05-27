/**
 * Static TypeScript content adapter — Phase 1 default.
 *
 * Takes a pre-imported content module (the tenant's `*-content.ts` file) and
 * wraps it in a ContentProvider. Each tenant ships a `lib/tenants/<slug>-content.ts`
 * that exports the 5 typed arrays directly.
 *
 * Failsafe: every getter defensively falls back to [] so a partially-authored
 * content module (missing one of the 5 arrays) cannot crash the site.
 *
 * Usage:
 *   import { alpacasibizaContent } from '@/lib/tenants/alpacasibiza-content'
 *   const provider = staticTypescriptContentProvider(alpacasibizaContent)
 *   provider.listAnimals() // → ReadonlyArray<AnimalEntity>
 */

import type { ContentProvider } from './content'
import type {
  AnimalEntity,
  ExperienceEntity,
  ProductEntity,
  TeamMemberEntity,
  ReviewEntity,
} from './content-types'

/**
 * The shape a tenant's `*-content.ts` module must export.
 * All 5 arrays are required at the type level, but the adapter defends against
 * runtime absence (e.g. during incremental authoring).
 */
export interface TenantContentModule {
  readonly animals: ReadonlyArray<AnimalEntity>
  readonly experiences: ReadonlyArray<ExperienceEntity>
  readonly products: ReadonlyArray<ProductEntity>
  readonly team: ReadonlyArray<TeamMemberEntity>
  readonly reviews: ReadonlyArray<ReviewEntity>
}

/**
 * Factory: wraps a TenantContentModule in a ContentProvider.
 *
 * @param module - the tenant's pre-imported content data
 * @returns ContentProvider with kind 'static-typescript'
 */
export function staticTypescriptContentProvider(
  module: TenantContentModule,
): ContentProvider {
  return {
    kind: 'static-typescript',

    listAnimals(): ReadonlyArray<AnimalEntity> {
      return module.animals ?? []
    },

    listExperiences(): ReadonlyArray<ExperienceEntity> {
      return module.experiences ?? []
    },

    listProducts(): ReadonlyArray<ProductEntity> {
      return module.products ?? []
    },

    listTeam(): ReadonlyArray<TeamMemberEntity> {
      return module.team ?? []
    },

    listReviews(): ReadonlyArray<ReviewEntity> {
      return module.reviews ?? []
    },
  }
}
