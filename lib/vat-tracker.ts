/**
 * EU VAT OSS threshold tracker — in-memory, per-fiscal-year.
 *
 * The €10,000 OSS threshold applies to B2C cross-border digital/subscription
 * sales from Spanish merchants to other EU member states. Once cumulative
 * cross-border revenue in a calendar year exceeds €10,000 the merchant must
 * either register for VAT-OSS (and charge destination-country VAT) or stop
 * selling cross-border until registered.
 *
 * Data shape: year → country ISO2 → { count, totalEurMinor }
 *   - All amounts stored in EUR cents (minor units; Mollie sends string EUR
 *     major like "75.00" → multiply × 100 → 7500).
 *   - "Domestic" = Spain (ES); all other EU member states are cross-border.
 *   - Non-EU sales do NOT count toward the OSS threshold and are stored under
 *     their ISO2 code but excluded from crossBorderEurMinor.
 *
 * Persistence / retention:
 *   - Map keyed by calendar year (numeric). Years older than 7 calendar years
 *     are pruned on each write (EU minimum accounting retention).
 *   - Process-scoped (same ADR 001 tradeoff as webhook-idempotency.ts).
 *     A cold start loses the current year's count. At current Alpacas Ibiza
 *     scale (dozens of subscribers) the loss is acceptable; the dashboard
 *     shows zero and rebuilds as sales come through post-deploy. Upgrade
 *     trigger: when annual cross-border revenue approaches €8,000 (80% of
 *     threshold), move to Vercel KV so retention survives restarts.
 *
 * Idempotency: every recordSale() call requires an attemptId (the Mollie
 *   payment ID or a stable composite string). Duplicate calls with the same
 *   attemptId are ignored — mirrors recordFailure() in payment-failure-tracker.ts.
 */

/** EU member-state ISO2 codes (27 members including Spain). */
const EU_MEMBER_STATES = new Set<string>([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
])

const DOMESTIC_COUNTRY = 'ES'

/** €10,000 in cents. */
const OSS_THRESHOLD_MINOR = 10_000_00

/** EU minimum accounting retention: 7 calendar years. */
const RETENTION_YEARS = 7

// ── Per-country sale aggregate ───────────────────────────────────────────────

export interface CountryAggregate {
  count: number
  totalEurMinor: number
}

// ── In-memory store ──────────────────────────────────────────────────────────

/** year → (country ISO2 → aggregate) */
type YearMap = Map<string, CountryAggregate>

const globalForVat = globalThis as unknown as {
  __vatTrackerStore?: Map<number, YearMap>
  __vatTrackerAttempts?: Map<string, true>
}

const _store: Map<number, YearMap> =
  globalForVat.__vatTrackerStore ?? new Map()
const _attempts: Map<string, true> =
  globalForVat.__vatTrackerAttempts ?? new Map()

// In dev / test: pin to globalThis so hot-reload preserves state.
if (process.env.NODE_ENV !== 'production') {
  globalForVat.__vatTrackerStore = _store
  globalForVat.__vatTrackerAttempts = _attempts
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pruneOldYears(currentYear: number): void {
  const cutoff = currentYear - RETENTION_YEARS
  for (const year of _store.keys()) {
    if (year < cutoff) _store.delete(year)
  }
}

function getOrCreateYearMap(year: number): YearMap {
  let ym = _store.get(year)
  if (!ym) {
    ym = new Map()
    _store.set(year, ym)
  }
  return ym
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a completed sale for VAT-OSS tracking. Idempotent: repeated calls
 * with the same attemptId are silently ignored.
 *
 * @param yearEpoch   UNIX epoch ms of the payment date. When undefined
 *                    (rare — e.g. webhook missing a timestamp) the current
 *                    year is used so the sale is never silently dropped.
 * @param countryISO2 Two-letter ISO 3166-1 alpha-2 country code of the buyer.
 *                    Non-EU countries are recorded but excluded from the
 *                    cross-border OSS total.
 * @param amountEurMinor  Sale amount in EUR cents (e.g. €75.00 → 7500).
 * @param attemptId   Stable dedup key (Mollie payment ID, Stripe event ID, …).
 */
export function recordSale(
  yearEpoch: number | undefined,
  countryISO2: string,
  amountEurMinor: number,
  attemptId: string,
): void {
  const year = yearEpoch !== undefined
    ? new Date(yearEpoch).getUTCFullYear()
    : new Date().getUTCFullYear()

  // Idempotency: if we've already processed this attempt, no-op.
  const dedupKey = `${year}:${countryISO2}:${attemptId}`
  if (_attempts.has(dedupKey)) return

  pruneOldYears(year)

  const ym = getOrCreateYearMap(year)
  const prev = ym.get(countryISO2)
  ym.set(countryISO2, {
    count: (prev?.count ?? 0) + 1,
    totalEurMinor: (prev?.totalEurMinor ?? 0) + amountEurMinor,
  })
  _attempts.set(dedupKey, true)
}

// ── Snapshot ─────────────────────────────────────────────────────────────────

export interface CountryRow extends CountryAggregate {
  countryISO2: string
  isEu: boolean
  isDomestic: boolean
}

export interface YearSnapshot {
  year: number
  countries: CountryRow[]
  domesticEurMinor: number
  crossBorderEurMinor: number
  /** €10,000 minus crossBorderEurMinor; negative when threshold exceeded. */
  ossThresholdRemainingEurMinor: number
}

/**
 * Return the aggregate snapshot for a given calendar year. Returns an empty
 * snapshot (all zeros, empty countries array) when no data has been recorded
 * for that year — callers must handle this gracefully.
 */
export function getYearSnapshot(year: number): YearSnapshot {
  const ym = _store.get(year)
  if (!ym) {
    return {
      year,
      countries: [],
      domesticEurMinor: 0,
      crossBorderEurMinor: 0,
      ossThresholdRemainingEurMinor: OSS_THRESHOLD_MINOR,
    }
  }

  const countries: CountryRow[] = []
  let domesticEurMinor = 0
  let crossBorderEurMinor = 0

  for (const [iso2, agg] of ym) {
    const isDomestic = iso2 === DOMESTIC_COUNTRY
    const isEu = EU_MEMBER_STATES.has(iso2)
    countries.push({ countryISO2: iso2, ...agg, isEu, isDomestic })

    if (isDomestic) {
      domesticEurMinor += agg.totalEurMinor
    } else if (isEu) {
      crossBorderEurMinor += agg.totalEurMinor
    }
    // Non-EU: counted in the row but excluded from both domestic and cross-border totals.
  }

  // Sort: domestic first, then by descending cross-border revenue, then non-EU.
  countries.sort((a, b) => {
    if (a.isDomestic !== b.isDomestic) return a.isDomestic ? -1 : 1
    if (a.isEu !== b.isEu) return a.isEu ? -1 : 1
    return b.totalEurMinor - a.totalEurMinor
  })

  return {
    year,
    countries,
    domesticEurMinor,
    crossBorderEurMinor,
    ossThresholdRemainingEurMinor: OSS_THRESHOLD_MINOR - crossBorderEurMinor,
  }
}

/**
 * Clear all recorded data for a specific year. Admin reset only.
 * The dedup attempt keys for that year are also cleared so sales can be
 * re-recorded if needed (e.g. after a data-correction import).
 */
export function resetYear(year: number): void {
  _store.delete(year)
  // Remove all dedup keys that start with "year:"
  const prefix = `${year}:`
  for (const k of _attempts.keys()) {
    if (k.startsWith(prefix)) _attempts.delete(k)
  }
}

/** @internal — for tests only. Wipes the entire store. */
export function __resetVatTracker(): void {
  _store.clear()
  _attempts.clear()
}
