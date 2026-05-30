/**
 * Launch-readiness: Owner content gate checks.
 * Reads filesystem and translation files. All I/O via fs.promises.
 */

import fs from 'fs'
import path from 'path'
import type { CheckResult } from './check-env'

const PROJECT_ROOT = path.join(process.cwd())

function publicImagesDir(...parts: string[]): string {
  return path.join(PROJECT_ROOT, 'public', 'images', ...parts)
}

async function countFiles(dir: string): Promise<number> {
  try {
    const entries = await fs.promises.readdir(dir)
    return entries.filter((e) => !e.startsWith('.')).length
  } catch {
    return 0
  }
}

function isPlaceholder(value: unknown): boolean {
  if (!value || typeof value !== 'string') return true
  const v = value.trim()
  if (v === '') return true
  if (v.startsWith('[PLACEHOLDER]')) return true
  if (v.includes('__UNTRANSLATED__')) return true
  if (v.startsWith('[UNMAPPED')) return true
  if (v === '__OWNER_INPUT_REQUIRED__') return true
  return false
}

// Read a nested key from an object using dot-notation path
function getNestedKey(obj: Record<string, unknown>, keyPath: string): unknown {
  return keyPath.split('.').reduce<unknown>((acc, k) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[k]
    }
    return undefined
  }, obj)
}

export async function checkOwnerContent(): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  // ── Legal content gate ────────────────────────────────────────────────────
  const legalLive = process.env.LEGAL_CONTENT_LIVE === 'true'
  results.push({
    id: 'legal_content_live',
    label: 'LEGAL_CONTENT_LIVE flag',
    status: legalLive ? 'green' : 'red',
    detail: legalLive
      ? 'Set to "true" — legal pages are live'
      : 'Not set or false — legal pages show placeholder',
    fixHint: !legalLive
      ? 'Set LEGAL_CONTENT_LIVE=true in Vercel env AFTER replacing all legal text in translations/en.json'
      : undefined,
  })

  // ── Legal translation bodies ──────────────────────────────────────────────
  let enJson: Record<string, unknown> = {}
  try {
    const raw = await fs.promises.readFile(
      path.join(PROJECT_ROOT, 'translations', 'en.json'),
      'utf-8',
    )
    enJson = JSON.parse(raw) as Record<string, unknown>
  } catch {
    results.push({
      id: 'legal_translations_file',
      label: 'translations/en.json',
      status: 'red',
      detail: 'Could not read translations/en.json',
    })
  }

  const legalKeys = [
    { id: 'legal_privacy_body', key: 'legal.privacy.body', label: 'Privacy policy body' },
    { id: 'legal_terms_body', key: 'legal.terms.body', label: 'Terms of service body' },
    { id: 'legal_cookies_body', key: 'legal.cookies.body', label: 'Cookie policy body' },
  ]

  for (const { id, key, label } of legalKeys) {
    const value = getNestedKey(enJson, key)
    const placeholder = isPlaceholder(value)
    results.push({
      id,
      label,
      status: placeholder ? 'red' : 'green',
      detail: placeholder
        ? `${key} is empty or a placeholder — legal page will not render real content`
        : `${key} has content`,
      fixHint: placeholder
        ? `Open translations/en.json, replace ${key} with lawyer-approved text. See docs/LEGAL_DROP_IN.md.`
        : undefined,
    })
  }

  // ── Hero photos ───────────────────────────────────────────────────────────
  const heroCount = await countFiles(publicImagesDir('heroes'))
  results.push({
    id: 'photos_heroes',
    label: 'Hero photos (public/images/heroes/)',
    status: heroCount === 0 ? 'red' : 'green',
    detail:
      heroCount === 0
        ? 'No hero images found — pages show gradient placeholders'
        : `${heroCount} file(s) found`,
    fixHint:
      heroCount === 0
        ? 'Drop farm.webp, yoga.webp, workshop.webp, weddings.webp into public/images/heroes/'
        : undefined,
  })

  // ── Per-alpaca photos ─────────────────────────────────────────────────────
  const alpacaPhotoCount = await countFiles(publicImagesDir('alpacas'))
  results.push({
    id: 'photos_alpacas',
    label: 'Per-alpaca photos (public/images/alpacas/)',
    status: alpacaPhotoCount === 0 ? 'red' : alpacaPhotoCount < 14 ? 'yellow' : 'green',
    detail:
      alpacaPhotoCount === 0
        ? 'No alpaca portrait photos found'
        : `${alpacaPhotoCount}/14 alpaca photos found`,
    fixHint:
      alpacaPhotoCount < 14
        ? 'Drop one <slug>.webp per alpaca into public/images/alpacas/. See lib/data/alpacas.ts for slugs.'
        : undefined,
  })

  // ── Press logos ───────────────────────────────────────────────────────────
  const pressCount = await countFiles(publicImagesDir('press'))
  results.push({
    id: 'photos_press',
    label: 'Press logos (public/images/press/)',
    status: pressCount === 0 ? 'yellow' : 'green',
    detail:
      pressCount === 0
        ? 'No press logos — PressLogos component renders null'
        : `${pressCount} press logo(s) found`,
    fixHint:
      pressCount === 0
        ? 'Drop <outlet>.svg files into public/images/press/ for each press mention'
        : undefined,
  })

  // ── Legal CIF ─────────────────────────────────────────────────────────────
  // Read from alpacasibiza.ts tenant config
  let cifStatus: 'green' | 'red' = 'red'
  let cifDetail = 'Could not read tenant config'
  try {
    const tenantSrc = await fs.promises.readFile(
      path.join(PROJECT_ROOT, 'lib', 'tenants', 'alpacasibiza.ts'),
      'utf-8',
    )
    // Match `cif: null` or `cif: 'BXXXXXXXX'`
    const cifMatch = tenantSrc.match(/cif:\s*([^,\n]+)/)
    if (cifMatch) {
      const raw = cifMatch[1].trim()
      const isNull = raw === 'null'
      const isEmpty = raw === "''" || raw === '""'
      cifStatus = isNull || isEmpty ? 'red' : 'green'
      cifDetail = isNull || isEmpty
        ? 'cif is null/empty in lib/tenants/alpacasibiza.ts — footer legal row hidden'
        : `cif is set in tenant config`
    }
  } catch {
    cifDetail = 'Could not read lib/tenants/alpacasibiza.ts'
  }

  results.push({
    id: 'legal_cif',
    label: 'Legal CIF (Spanish tax ID)',
    status: cifStatus,
    detail: cifDetail,
    fixHint:
      cifStatus === 'red'
        ? 'Open lib/tenants/alpacasibiza.ts, set cif: "BXXXXXXXX" with real Spanish CIF. Required by LSSI-CE.'
        : undefined,
  })

  return results
}
