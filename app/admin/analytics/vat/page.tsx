import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getYearSnapshot, type CountryRow, type YearSnapshot } from '@/lib/vat-tracker'
import { Kpi } from '@/components/admin/Kpi'
import { adminTh as th, adminTd as td } from '@/lib/admin-styles'

export const metadata = {
  title: 'VAT OSS tracking — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

// Always recompute — admin-only, not cached.
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ── Constants ─────────────────────────────────────────────────────────────────

const OSS_THRESHOLD_EUR = 10_000

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtEur(minorUnits: number): string {
  const major = minorUnits / 100
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major)
}

function daysIntoYear(year: number): number {
  const now = new Date()
  const start = new Date(year, 0, 1)
  const diff = now.getTime() - start.getTime()
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1)
}

// ── Status banner ─────────────────────────────────────────────────────────────

type BannerStatus = 'green' | 'amber' | 'red'

function getBannerStatus(crossBorderEurMinor: number): BannerStatus {
  const thresholdMinor = OSS_THRESHOLD_EUR * 100
  const pct = crossBorderEurMinor / thresholdMinor
  if (pct >= 1) return 'red'
  // Amber threshold lowered from 75% to 60% per resonance-finder 2026-05-29:
  // AEAT OSS registration takes 4-6 weeks; 60% gives the owner a full billing
  // cycle of warning before the legal deadline becomes urgent.
  if (pct >= 0.60) return 'amber'
  return 'green'
}

const BANNER_CONFIG: Record<BannerStatus, { bg: string; border: string; color: string; label: string }> = {
  green: { bg: '#f0fdf4', border: '#16a34a', color: '#15803d', label: 'Comfortable headroom — no action needed' },
  amber: { bg: '#fffbeb', border: '#d97706', color: '#92400e', label: 'Monitor — approaching OSS threshold (60–100%)' },
  red:   { bg: '#fef2f2', border: '#dc2626', color: '#991b1b', label: 'OSS registration required — threshold exceeded' },
}

// ── Year selector helpers ─────────────────────────────────────────────────────

/** Return 5 calendar years (current through current-4) to cover AEAT's 4-year audit window. */
function getAvailableYears(): number[] {
  const current = new Date().getUTCFullYear()
  return [current, current - 1, current - 2, current - 3, current - 4]
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function AdminVatPage({ searchParams }: PageProps) {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  const hasMollie = Boolean(process.env.MOLLIE_API_KEY)
  // Use UTC year to match recordSale's getUTCFullYear() bucketing. Without
  // this, a Spanish midnight payment (00:30 CET = 23:30 UTC prev day) would
  // be filed in the prior UTC year but the page would default to the new
  // local year, hiding the sale until the owner manually changes the selector.
  const currentYear = new Date().getUTCFullYear()

  // Year from query param (year selector), default to current year.
  const rawYear = searchParams?.year
  const selectedYear =
    typeof rawYear === 'string' && /^\d{4}$/.test(rawYear)
      ? Number.parseInt(rawYear, 10)
      : currentYear

  const snapshot: YearSnapshot = getYearSnapshot(selectedYear)
  const availableYears = getAvailableYears()
  const hasSales = snapshot.countries.length > 0

  const crossBorderPct =
    snapshot.crossBorderEurMinor > 0
      ? (snapshot.crossBorderEurMinor / (OSS_THRESHOLD_EUR * 100)) * 100
      : 0

  const bannerStatus = getBannerStatus(snapshot.crossBorderEurMinor)
  const banner = BANNER_CONFIG[bannerStatus]

  const days = daysIntoYear(selectedYear)
  const remaining = snapshot.ossThresholdRemainingEurMinor

  // Share calculations for the country table.
  const crossBorderTotal = snapshot.crossBorderEurMinor

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>VAT OSS tracking (EU cross-border)</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Monitors cumulative cross-border B2C revenue against the €{OSS_THRESHOLD_EUR.toLocaleString('en-GB')} EU OSS
        threshold for calendar year {selectedYear}. Spain (ES) sales are domestic; all other EU member states count
        toward the threshold.
      </p>

      {/* COLD-START WARNING — this is the highest-priority finding from crystal-ball 2026-05-29.
          The VAT store is in-memory + process-scoped; a Vercel cold-start mid-year zeroes
          the YTD totals. Owner could miss €10k OSS registration based on a stale empty view. */}
      <div style={{ background: '#fffbeb', borderLeft: '4px solid #d97706', padding: 16, marginBottom: 24, color: '#7c3007', fontSize: 14 }}>
        <strong>⚠️ Cold-start caveat.</strong> This dashboard tracks payments in-memory per Vercel instance.
        After a server restart (deploy, cron warm-up, idle-recycle), the YTD totals shown here may UNDERSTATE actual revenue.
        Before making OSS-registration decisions, cross-check this view against the Mollie dashboard.
        Upgrade trigger: when YTD cross-border &gt; €5,000, persist this tracker to Vercel KV per ADR 011.
      </div>

      {/* No Mollie key banner */}
      {!hasMollie && (
        <div style={{ background: '#fff3f3', borderLeft: '4px solid #a44', padding: 16, marginBottom: 24, color: '#a44' }}>
          <strong>MOLLIE_API_KEY is not set.</strong> VAT recording will activate once Mollie is configured and
          payments flow through the webhook. This dashboard shows recorded data — set the env var and process a payment
          to see live figures.
        </div>
      )}

      {/* No sales yet banner */}
      {hasMollie && !hasSales && (
        <div style={{ background: '#f0f9ff', borderLeft: '4px solid #0284c7', padding: 16, marginBottom: 24, color: '#075985' }}>
          <strong>No sales recorded for {selectedYear} yet.</strong> Sales are recorded when the Mollie webhook
          calls <code>recordVatFromPayment()</code>. Wire <code>lib/vat-recorder.ts</code> into the webhook routes
          to populate this dashboard.
        </div>
      )}

      {/* Year selector */}
      <form method="get" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label htmlFor="year-select" style={{ fontWeight: 600, color: '#374151' }}>Year:</label>
        <select
          id="year-select"
          name="year"
          defaultValue={selectedYear.toString()}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
        >
          {availableYears.map((y) => (
            <option key={y} value={y.toString()}>{y}</option>
          ))}
        </select>
        <button
          type="submit"
          style={{ padding: '6px 16px', borderRadius: 6, background: '#374151', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}
        >
          View
        </button>
      </form>

      {/* Status banner */}
      {hasSales && (
        <div style={{
          background: banner.bg,
          borderLeft: `4px solid ${banner.border}`,
          padding: 16,
          marginBottom: 24,
          color: banner.color,
          borderRadius: '0 6px 6px 0',
        }}>
          <strong>{banner.label}</strong>
          {bannerStatus !== 'red' && (
            <span style={{ marginLeft: 12 }}>
              ({crossBorderPct.toFixed(1)}% of threshold used)
            </span>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <Kpi
          label={`Domestic revenue (ES) — ${selectedYear}`}
          value={fmtEur(snapshot.domesticEurMinor)}
        />
        <Kpi
          label={`Cross-border EU revenue — ${selectedYear}`}
          value={fmtEur(snapshot.crossBorderEurMinor)}
        />
        <Kpi
          label="OSS threshold remaining"
          value={remaining >= 0 ? fmtEur(remaining) : `−${fmtEur(Math.abs(remaining))}`}
          negative={remaining < 0}
        />
        <Kpi
          label={`Days into ${selectedYear}`}
          value={days.toString()}
        />
      </div>

      {/* Progress bar toward threshold */}
      {hasSales && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#6b7280' }}>
            <span>Cross-border progress toward €{OSS_THRESHOLD_EUR.toLocaleString('en-GB')} OSS threshold</span>
            <span>{crossBorderPct.toFixed(1)}%</span>
          </div>
          <div style={{ background: '#e5e7eb', borderRadius: 6, height: 10, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(crossBorderPct, 100)}%`,
              height: '100%',
              background: bannerStatus === 'green' ? '#16a34a' : bannerStatus === 'amber' ? '#d97706' : '#dc2626',
              borderRadius: 6,
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      )}

      {/* Country breakdown table */}
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Country breakdown — {selectedYear}</h2>
      <div style={{ overflowX: 'auto', marginBottom: 32 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={th}>Country</th>
              <th style={th}>Type</th>
              <th style={th}>Sales</th>
              <th style={th}>Total (EUR)</th>
              <th style={th}>Share of cross-border</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.countries.map((row: CountryRow) => {
              const share =
                row.isDomestic || !row.isEu || crossBorderTotal === 0
                  ? null
                  : (row.totalEurMinor / crossBorderTotal) * 100
              const typeLabel = row.isDomestic ? 'Domestic (ES)' : row.isEu ? 'EU cross-border' : 'Non-EU'
              const typeColor = row.isDomestic ? '#374151' : row.isEu ? '#1d4ed8' : '#6b7280'
              return (
                <tr key={row.countryISO2}>
                  <td style={td}><strong>{row.countryISO2}</strong></td>
                  <td style={{ ...td, color: typeColor }}>{typeLabel}</td>
                  <td style={td}>{row.count}</td>
                  <td style={td}>{fmtEur(row.totalEurMinor)}</td>
                  <td style={td}>{share !== null ? `${share.toFixed(1)}%` : '—'}</td>
                </tr>
              )
            })}
            {snapshot.countries.length === 0 && (
              <tr>
                <td style={td} colSpan={5}><em>No sales recorded for {selectedYear}.</em></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* OSS information footer */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, fontSize: 13, color: '#6b7280' }}>
        <strong style={{ color: '#374151' }}>About the OSS threshold:</strong> Spanish merchants making B2C digital
        service / subscription sales to customers in other EU member states must register for the EU VAT One Stop Shop
        (OSS) scheme once cumulative cross-border revenue in a calendar year exceeds €10,000. Registration allows
        declaring and paying VAT in all destination countries through a single Spanish AEAT filing. Below the threshold,
        Spanish VAT (21%) applies to all EU sales.{' '}
        <a
          href="https://www.agenciatributaria.es/AEAT.internet/Inicio/La_Agencia_Tributaria/Campanas/Comercio_electronico_y_ventanilla_unica/Ventanilla_unica.shtml"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#1d4ed8' }}
        >
          AEAT OSS guidance ↗
        </a>
      </div>
    </div>
  )
}

// ── Shared styles (match subscriptions/page.tsx exactly) ─────────────────────

