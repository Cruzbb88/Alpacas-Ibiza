/**
 * Parses a FareHarbor "Adopt-a-Paca customers" CSV export.
 *
 * Expected columns (case-insensitive; matched by fuzzy header):
 *   - Customer Name (or Name)
 *   - Email
 *   - Product (filter for "Adopt-a-Paca" containing string)
 *   - Tier (Monthly / Yearly — derive from price if missing)
 *   - Start Date
 *   - Next Renewal Date (or Anniversary)
 *   - Total Paid
 *
 * Skips rows missing email (can't migrate).
 * Skips rows whose Next Renewal is more than lookaheadDays out (not yet due).
 * Returns rows in shape ready for Stripe Checkout link generation.
 */

export interface FareHarborMigrationRow {
  customerName: string
  email: string
  tier: 'monthly' | 'yearly'
  startDate: string    // ISO
  nextRenewal: string  // ISO
  totalPaid: number    // EUR
  fareHarborId: string | null // pulled from "Order ID" / "Customer ID" / "Reference"
}

export type SkipReason = 'no-email' | 'no-renewal-date' | 'outside-window' | 'not-adopt' | 'parse-error'

export interface ParseResult {
  rows: FareHarborMigrationRow[]
  skipped: { reason: SkipReason; count: number }[]
}

// ---------------------------------------------------------------------------
// Minimal CSV parser — no new deps. Handles quoted fields with internal commas.
// ---------------------------------------------------------------------------

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside a quoted field
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

// ---------------------------------------------------------------------------
// Fuzzy header matching
// ---------------------------------------------------------------------------

/** Normalise to lowercase alphanumerics only for comparison. */
function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

interface HeaderSynonyms {
  key: string
  synonyms: string[]
}

const HEADER_MAP: HeaderSynonyms[] = [
  { key: 'customerName', synonyms: ['customername', 'name', 'fullname', 'firstname', 'customer'] },
  { key: 'email',        synonyms: ['email', 'emailaddress', 'customeremail'] },
  { key: 'product',      synonyms: ['product', 'activity', 'item', 'productname', 'activityname'] },
  { key: 'tier',         synonyms: ['tier', 'plan', 'subscriptiontype', 'type', 'billingcycle'] },
  { key: 'startDate',    synonyms: ['startdate', 'adoptionstart', 'created', 'createdat', 'firstpayment'] },
  { key: 'nextRenewal',  synonyms: ['nextrenewaldate', 'nextrenewal', 'anniversary', 'nextcharge', 'nextbillingdate', 'renewaldate'] },
  { key: 'totalPaid',    synonyms: ['totalpaid', 'totalamount', 'amountpaid', 'total', 'revenue'] },
  { key: 'fareHarborId', synonyms: ['orderid', 'customerid', 'reference', 'id', 'fareharborcustomerid', 'fhid'] },
]

function buildHeaderIndex(headers: string[]): Map<string, number> {
  const index = new Map<string, number>()
  for (const { key, synonyms } of HEADER_MAP) {
    for (let col = 0; col < headers.length; col++) {
      const norm = normalise(headers[col])
      if (synonyms.includes(norm) && !index.has(key)) {
        index.set(key, col)
        break
      }
    }
  }
  return index
}

// ---------------------------------------------------------------------------
// Date utilities
// ---------------------------------------------------------------------------

/** Parse a date string (various formats) and return an ISO YYYY-MM-DD string, or null. */
function parseDate(raw: string): string | null {
  if (!raw) return null
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  // DD/MM/YYYY or MM/DD/YYYY — try both; prefer YYYY unambiguous
  const parts = raw.split(/[\/\-\.]/)
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number)
    // If first part > 12, must be DD/MM/YYYY
    if (a > 12 && c > 31) return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`
    // If third part is 4-digit year → DD/MM/YYYY (EU convention for FareHarbor)
    if (parts[2].length === 4) return `${parts[2]}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`
    // Fallback: try to let Date parse it
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  const d = new Date(raw)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

/** Days until (or since) a date string relative to today. Negative = past. */
function daysUntil(isoDate: string): number {
  const target = new Date(isoDate + 'T00:00:00Z')
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

// ---------------------------------------------------------------------------
// Tier derivation
// ---------------------------------------------------------------------------

function deriveTier(raw: string, totalPaid: number): 'monthly' | 'yearly' {
  const n = normalise(raw)
  if (n.includes('year') || n.includes('annual') || n.includes('yearly')) return 'yearly'
  if (n.includes('month')) return 'monthly'
  // Fallback: infer from price (yearly adopters pay ~€900 vs ~€75/mo)
  if (totalPaid > 200) return 'yearly'
  return 'monthly'
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function parseFareHarborCsv(
  csv: string,
  opts?: { lookaheadDays?: number },
): ParseResult {
  const lookaheadDays = opts?.lookaheadDays ?? 30
  const skipCounts = new Map<SkipReason, number>()

  function skip(reason: SkipReason) {
    skipCounts.set(reason, (skipCounts.get(reason) ?? 0) + 1)
  }

  const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) {
    return { rows: [], skipped: [{ reason: 'parse-error', count: 1 }] }
  }

  const headers = parseCSVLine(lines[0])
  const idx = buildHeaderIndex(headers)

  const rows: FareHarborMigrationRow[] = []

  for (let i = 1; i < lines.length; i++) {
    try {
      const fields = parseCSVLine(lines[i])

      // ── Email ────────────────────────────────────────────────────────────
      const emailCol = idx.get('email')
      const email = emailCol !== undefined ? fields[emailCol]?.toLowerCase().trim() : ''
      if (!email || !email.includes('@')) {
        skip('no-email')
        continue
      }

      // ── Product filter — must contain "adopt" ───────────────────────────
      const productCol = idx.get('product')
      const product = productCol !== undefined ? fields[productCol] ?? '' : ''
      if (productCol !== undefined && product && !normalise(product).includes('adopt')) {
        skip('not-adopt')
        continue
      }

      // ── Next renewal ─────────────────────────────────────────────────────
      const renewalCol = idx.get('nextRenewal')
      const renewalRaw = renewalCol !== undefined ? fields[renewalCol]?.trim() : ''
      const nextRenewal = parseDate(renewalRaw ?? '')
      if (!nextRenewal) {
        skip('no-renewal-date')
        continue
      }

      // ── Lookahead window: only include if renewal is within lookaheadDays ─
      const daysLeft = daysUntil(nextRenewal)
      if (daysLeft > lookaheadDays) {
        skip('outside-window')
        continue
      }

      // ── Customer name ────────────────────────────────────────────────────
      const nameCol = idx.get('customerName')
      const customerName = (nameCol !== undefined ? fields[nameCol]?.trim() : '') || email

      // ── Start date ───────────────────────────────────────────────────────
      const startCol = idx.get('startDate')
      const startRaw = startCol !== undefined ? fields[startCol]?.trim() : ''
      const startDate = parseDate(startRaw ?? '') ?? nextRenewal

      // ── Total paid ───────────────────────────────────────────────────────
      const paidCol = idx.get('totalPaid')
      const paidRaw = paidCol !== undefined ? fields[paidCol]?.replace(/[€$£,\s]/g, '') : '0'
      const totalPaid = parseFloat(paidRaw ?? '0') || 0

      // ── Tier ─────────────────────────────────────────────────────────────
      const tierCol = idx.get('tier')
      const tierRaw = tierCol !== undefined ? fields[tierCol]?.trim() : ''
      const tier = deriveTier(tierRaw ?? '', totalPaid)

      // ── FareHarbor ID ────────────────────────────────────────────────────
      const fhIdCol = idx.get('fareHarborId')
      const fareHarborId = (fhIdCol !== undefined ? fields[fhIdCol]?.trim() : null) || null

      rows.push({ customerName, email, tier, startDate, nextRenewal, totalPaid, fareHarborId })
    } catch {
      skip('parse-error')
    }
  }

  const skipped = Array.from(skipCounts.entries()).map(([reason, count]) => ({ reason, count }))
  return { rows, skipped }
}
