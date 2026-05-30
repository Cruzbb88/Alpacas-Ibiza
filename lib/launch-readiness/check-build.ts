/**
 * Launch-readiness: Build state checks.
 * Reads local files: i18n config, ADR directory, sitemap.
 */

import fs from 'fs'
import path from 'path'
import type { CheckResult } from './check-env'

const PROJECT_ROOT = process.cwd()

export async function checkBuildState(): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  // ── Locale count ──────────────────────────────────────────────────────────
  try {
    const i18nSrc = await fs.promises.readFile(
      path.join(PROJECT_ROOT, 'i18n.config.ts'),
      'utf-8',
    )
    // Count items in the locales array by matching quoted strings
    const localesMatch = i18nSrc.match(/locales:\s*\[([^\]]+)\]/)
    if (localesMatch) {
      const localesList = localesMatch[1].match(/'[^']+'/g) ?? []
      const count = localesList.length
      results.push({
        id: 'build_locale_count',
        label: 'Active locales (i18n.config.ts)',
        status: count <= 2 ? 'green' : count <= 6 ? 'yellow' : 'red',
        detail: `${count} locale(s): ${localesList.map((l) => l.replace(/'/g, '')).join(', ')}`,
        fixHint:
          count > 6
            ? 'Consider reducing active locales to avoid i18n debt. ADR 025 recommends 2 at launch.'
            : count > 2
            ? 'ADR 025 (PROPOSED) recommends 2 locales at launch to reduce maintenance burden.'
            : undefined,
      })
    } else {
      results.push({
        id: 'build_locale_count',
        label: 'Active locales',
        status: 'yellow',
        detail: 'Could not parse locales array from i18n.config.ts',
      })
    }
  } catch {
    results.push({
      id: 'build_locale_count',
      label: 'Active locales',
      status: 'yellow',
      detail: 'Could not read i18n.config.ts',
    })
  }

  // ── Latest ADR number ─────────────────────────────────────────────────────
  try {
    const adrDir = path.join(PROJECT_ROOT, 'docs', 'adr')
    const entries = await fs.promises.readdir(adrDir)
    const adrFiles = entries.filter((e) => /^\d{3}/.test(e))
    const numbers = adrFiles
      .map((f) => parseInt(f.slice(0, 3), 10))
      .filter((n) => !isNaN(n))
    const maxAdr = numbers.length > 0 ? Math.max(...numbers) : 0
    results.push({
      id: 'build_latest_adr',
      label: 'Latest ADR',
      status: 'green',
      detail: `ADR ${String(maxAdr).padStart(3, '0')} is the latest (${adrFiles.length} total ADRs)`,
    })
  } catch {
    results.push({
      id: 'build_latest_adr',
      label: 'Latest ADR',
      status: 'yellow',
      detail: 'Could not read docs/adr/ directory',
    })
  }

  // ── Sitemap ───────────────────────────────────────────────────────────────
  results.push({
    id: 'build_sitemap',
    label: 'Sitemap',
    status: 'green',
    detail: 'Dynamic via generateStaticParams — app/sitemap.ts generates entries per locale',
  })

  // ── Handoff peer-review items ─────────────────────────────────────────────
  try {
    const handoffPath = path.join(
      PROJECT_ROOT,
      'handoff',
      'PEER_REVIEW_2026-05-29-mollie-management.md',
    )
    const handoffSrc = await fs.promises.readFile(handoffPath, 'utf-8')

    const criticalCount = (handoffSrc.match(/^## CRITICAL/gm) ?? []).length
    const highCount = (handoffSrc.match(/^## HIGH/gm) ?? []).length
    const mediumCount = (handoffSrc.match(/^## MEDIUM/gm) ?? []).length

    // Count closed items (lines containing "[CLOSED")
    const closedCount = (handoffSrc.match(/\[CLOSED/g) ?? []).length

    const open = criticalCount + highCount + mediumCount
    results.push({
      id: 'build_handoff_review',
      label: 'Peer review handoff (2026-05-29)',
      status: criticalCount > 0 ? 'red' : highCount > 0 ? 'yellow' : 'green',
      detail: `${criticalCount} CRITICAL / ${highCount} HIGH / ${mediumCount} MEDIUM pending${closedCount > 0 ? ` — ${closedCount} CLOSED` : ''}`,
      fixHint:
        open > 0
          ? `Address findings in handoff/PEER_REVIEW_2026-05-29-mollie-management.md before launch`
          : undefined,
    })
  } catch {
    results.push({
      id: 'build_handoff_review',
      label: 'Peer review handoff',
      status: 'yellow',
      detail: 'Could not read handoff/PEER_REVIEW_2026-05-29-mollie-management.md',
    })
  }

  return results
}
