/**
 * Tenant config validator — checks structural integrity at registration time.
 *
 * Design contract:
 *   - NEVER throws. Returns { ok, errors } so callers decide how to handle.
 *   - All checks are additive: every failed rule appends to errors[].
 *   - fareHarbor: empty shortname + empty flowId is valid (manual-inquiry tenant).
 *     Non-empty shortname MUST have a non-empty flowId (and vice versa).
 *   - phoneE164 / whatsappE164 are optional (null is fine).
 *
 * Matches the pattern of lib/validate-env.ts (warn, never throw, never block boot).
 */

import type { Tenant } from './_types'
import { isValidEmail } from '../validate-email.ts'

// ── Regex constants ────────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const HEX_RE = /^#[0-9a-f]{3,8}$/i
const E164_RE = /^\+[1-9]\d{6,14}$/
const ISO2_RE = /^[A-Z]{2}$/

// ── Validator ──────────────────────────────────────────────────────────────────

export type ValidateResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: string[] }

export function validateTenant(t: Tenant): ValidateResult {
  const errors: string[] = []

  // slug — non-empty kebab-case
  if (!t.slug || !SLUG_RE.test(t.slug)) {
    errors.push(`slug "${t.slug}" is not valid kebab-case (must match /^[a-z0-9]+(-[a-z0-9]+)*$/)`)
  }

  // siteUrl — must start with https://
  if (!t.siteUrl.startsWith('https://')) {
    errors.push(`siteUrl "${t.siteUrl}" must start with https://`)
  }

  // hosts — non-empty, each entry has no protocol prefix
  if (!t.hosts || t.hosts.length === 0) {
    errors.push('hosts must be a non-empty array')
  } else {
    for (const host of t.hosts) {
      if (host.includes('://')) {
        errors.push(`host "${host}" must be a bare hostname (no protocol prefix)`)
      }
    }
  }

  // contactEmail — must be a valid email
  if (!isValidEmail(t.contactEmail)) {
    errors.push(`contactEmail "${t.contactEmail}" is not a valid email address`)
  }

  // brandColors — each must be a valid hex string
  const colors: Array<[string, string]> = [
    ['brandColors.primary', t.brandColors.primary],
    ['brandColors.secondary', t.brandColors.secondary],
    ['brandColors.themeColor', t.brandColors.themeColor],
  ]
  for (const [field, value] of colors) {
    if (!HEX_RE.test(value)) {
      errors.push(`${field} "${value}" is not a valid hex color (expected #rgb, #rrggbb, or #rrggbbaa)`)
    }
  }

  // geo — latitude in [-90, 90], longitude in [-180, 180]
  if (t.geo.latitude < -90 || t.geo.latitude > 90) {
    errors.push(`geo.latitude ${t.geo.latitude} is out of range [-90, 90]`)
  }
  if (t.geo.longitude < -180 || t.geo.longitude > 180) {
    errors.push(`geo.longitude ${t.geo.longitude} is out of range [-180, 180]`)
  }

  // address.addressCountry — 2-letter ISO 3166-1 alpha-2
  if (!ISO2_RE.test(t.address.addressCountry)) {
    errors.push(`address.addressCountry "${t.address.addressCountry}" must be a 2-letter ISO 3166-1 alpha-2 code`)
  }

  // locales — non-empty, must contain defaultLocale
  if (!t.locales || t.locales.length === 0) {
    errors.push('locales must be a non-empty array')
  } else if (!t.locales.includes(t.defaultLocale)) {
    errors.push(`defaultLocale "${t.defaultLocale}" is not present in locales [${t.locales.join(', ')}]`)
  }

  // fareHarbor — either both empty (manual-inquiry) or both non-empty
  const hasShortname = t.fareHarbor.shortname !== ''
  const hasFlowId = t.fareHarbor.flowId !== ''
  if (hasShortname && !hasFlowId) {
    errors.push('fareHarbor.shortname is set but fareHarbor.flowId is empty (both must be set or both empty)')
  }
  if (hasFlowId && !hasShortname) {
    errors.push('fareHarbor.flowId is set but fareHarbor.shortname is empty (both must be set or both empty)')
  }

  // phoneE164 — optional; if present must match E.164
  if (t.phoneE164 !== null && !E164_RE.test(t.phoneE164)) {
    errors.push(`phoneE164 "${t.phoneE164}" does not match E.164 format (+[1-9]\\d{6,14})`)
  }

  // whatsappE164 — optional; if present must match E.164
  if (t.whatsappE164 !== null && !E164_RE.test(t.whatsappE164)) {
    errors.push(`whatsappE164 "${t.whatsappE164}" does not match E.164 format (+[1-9]\\d{6,14})`)
  }

  if (errors.length === 0) {
    return { ok: true, errors: [] }
  }
  return { ok: false, errors }
}
