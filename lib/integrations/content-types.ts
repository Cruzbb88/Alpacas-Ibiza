/**
 * Content entity interfaces — the framework's tenant-agnostic content model.
 *
 * Every tenant supplies its own content (animals, experiences, products, team,
 * reviews) through a ContentProvider. These interfaces are the shared contract
 * that both the provider adapters and the UI components depend on.
 *
 * Failsafe Rule 5 (never invent data): ALL bio, image, price, duration, and
 * capacity fields are nullable. null = UNMAPPED sentinel — the tenant has not
 * yet supplied the value. UI must render gracefully when any field is null.
 *
 * Importing this file is safe in any environment (Server, Client, Edge, tests).
 * No runtime dependencies — types only.
 */

// ── Shared base ───────────────────────────────────────────────────────────────

export interface ContentEntityBase {
  /** URL-safe slug. Primary key within the tenant's entity list. */
  readonly id: string
  /** Display name. Never null — at minimum the owner provides a name. */
  readonly name: string
  /**
   * Free-text description / biography.
   * null = UNMAPPED until owner provides. Do NOT invent values.
   */
  readonly bio: string | null
  /**
   * Public image URL.
   * null = UNMAPPED until owner provides. Do NOT invent paths.
   */
  readonly image: string | null
}

// ── Entity types ──────────────────────────────────────────────────────────────

/**
 * An animal on the farm roster (alpaca, horse, llama, etc.).
 * The `kind` discriminant lets the UI narrow without instanceof.
 *
 * Extended fields (age, breed, color, personality, fun_fact) are all optional
 * and null = UNMAPPED until owner supplies. See OWNER_INPUT_NEEDED.md.
 *
 * bio is a localized map (AlpacaBio) or a plain string (legacy) or null.
 * AlpacaCard resolves: bio[locale] → bio.en → translate('alpacas.bioComingSoon').
 */
export interface AlpacaBio {
  en: string | null
  de?: string | null
  it?: string | null
  es?: string | null
  nl?: string | null
  fr?: string | null
}

export interface AnimalEntity extends ContentEntityBase {
  readonly kind: 'animal'
  /** Age in years. null = UNMAPPED (owner input needed). */
  readonly age?: number | null
  /** Breed descriptor, e.g. "Huacaya" or "Suri". null = UNMAPPED. */
  readonly breed?: string | null
  /** Fleece color descriptor. null = UNMAPPED. */
  readonly color?: string | null
  /** One-line personality trait. null = UNMAPPED. */
  readonly personality?: string | null
  /** Whimsical fun fact. null = UNMAPPED. */
  readonly fun_fact?: string | null
  /**
   * Localized bio map. When supplied, AlpacaCard resolves per locale.
   * Overrides the plain-string bio from ContentEntityBase when present.
   * null = UNMAPPED (shows bioComingSoon translation key).
   */
  readonly localizedBio?: AlpacaBio | null
}

/**
 * A bookable experience / tour.
 * All numeric fields are nullable — UNMAPPED until owner supplies.
 */
export interface ExperienceEntity extends ContentEntityBase {
  readonly kind: 'experience'
  /** Duration in minutes. null = UNMAPPED. */
  readonly durationMin: number | null
  /** Price in EUR. null = UNMAPPED (never show a 0 price). */
  readonly priceEur: number | null
  /** Maximum group size. null = UNMAPPED. */
  readonly capacity: number | null
}

/**
 * A physical or digital product in the shop.
 */
export interface ProductEntity extends ContentEntityBase {
  readonly kind: 'product'
  /** Price in EUR. null = UNMAPPED. */
  readonly priceEur: number | null
}

/**
 * A team member / staff profile.
 */
export interface TeamMemberEntity extends ContentEntityBase {
  readonly kind: 'team'
  /** Job title / role description. null = UNMAPPED. */
  readonly role: string | null
}

/**
 * A customer review.
 *
 * Note: ReviewEntity does NOT extend ContentEntityBase because reviews have
 * no `bio` or `image`. The `authorName` and `text` fields replace `name`/`bio`.
 */
export interface ReviewEntity {
  readonly id: string
  readonly authorName: string
  /** Review body text. */
  readonly text: string
  /** Star rating 1–5. */
  readonly stars: number
  /**
   * ISO 8601 date string (YYYY-MM-DD or full datetime).
   * null = UNMAPPED (e.g. Google Reviews API not configured).
   */
  readonly date: string | null
}
