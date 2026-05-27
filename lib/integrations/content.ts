/**
 * ContentProvider interface — the framework's abstraction for per-tenant content.
 *
 * Each tenant supplies its own animals, experiences, products, team, and reviews
 * through a ContentProvider. The UI iterates the returned arrays and renders
 * "Coming soon" (or hides the section) when the array is empty.
 *
 * **Failsafe contract (fail-open / empty-list):**
 * Every list* method MUST return a ReadonlyArray — never null, never undefined,
 * never throw. If the tenant has no entries for a category, return [].
 * The UI is responsible for deciding what to show when a list is empty.
 *
 * **Provider kinds:**
 * - `'static-typescript'` — data shipped as TypeScript modules (Phase 1 default)
 * - `'json-file'`          — data loaded from a JSON file at build time (future)
 * - `'cms-stub'`           — data fetched from a headless CMS (future)
 *
 * Importing this file is safe in any environment (Server, Client, Edge, tests).
 */

import type {
  AnimalEntity,
  ExperienceEntity,
  ProductEntity,
  TeamMemberEntity,
  ReviewEntity,
} from './content-types'

export type ContentProviderKind = 'static-typescript' | 'json-file' | 'cms-stub'

export interface ContentProvider {
  readonly kind: ContentProviderKind

  /**
   * Returns the tenant's animal roster.
   * Empty array = tenant has no animal page (UI hides the section or shows "Coming soon").
   */
  listAnimals(): ReadonlyArray<AnimalEntity>

  /**
   * Returns the tenant's bookable experiences.
   * Empty array = no experiences configured yet.
   */
  listExperiences(): ReadonlyArray<ExperienceEntity>

  /**
   * Returns the tenant's shop products.
   * Empty array = no shop (e.g. booking-only tenant routes to FareHarbor).
   */
  listProducts(): ReadonlyArray<ProductEntity>

  /**
   * Returns the tenant's team member profiles.
   * Empty array = UNMAPPED (owner photos not yet supplied).
   */
  listTeam(): ReadonlyArray<TeamMemberEntity>

  /**
   * Returns the tenant's customer reviews.
   * Empty array = Google Reviews API key not configured, or no reviews yet.
   */
  listReviews(): ReadonlyArray<ReviewEntity>
}

// Re-export entity types so callers can import everything from one path.
export type {
  AnimalEntity,
  ExperienceEntity,
  ProductEntity,
  TeamMemberEntity,
  ReviewEntity,
} from './content-types'
