/**
 * Per-donor referral codes — HMAC-derived, deterministic, format-validated.
 *
 * Why this module exists
 * ──────────────────────
 * Patreon / Substack / Memberful all hand each subscriber a stable, shareable
 * referral URL (`?ref=xyz`) so the referrer + referred both get credit. We had
 * no such surface — donors couldn't see who they'd brought in and the admin
 * couldn't measure referral flow.
 *
 * Design rules — DO NOT WEAKEN
 *   1. Deterministic: same customerId → same code, forever. Otherwise a donor's
 *      shared link silently rotates and old social posts go dead.
 *   2. One-way: we never need to reverse the code back to a customerId — the
 *      code is just a label written into the *referred* subscription's
 *      metadata. Admin reads metadata.referredBy directly. No reverse map =
 *      no DB column to keep in sync.
 *   3. Format-validated, not signature-verified. verifyReferralCode only
 *      checks /^[A-Z0-9]{6}$/ so we don't pass garbage into Stripe/Mollie
 *      metadata. A determined attacker could mint a fake 6-char code; the
 *      worst-case impact is a junk row in the admin referrals table. No
 *      money / discount is awarded by this code — credit logic is a follow-up.
 *   4. Same signing key as newsletter-token + mollie-manage-token —
 *      NEWSLETTER_SIGNING_KEY with NEXTAUTH_SECRET fallback (Tier 1
 *      guarantee — see CLAUDE.md env tiers). Rotation independence is
 *      preserved: rotating NEWSLETTER_SIGNING_KEY shifts every donor's code
 *      to a new value, which is the intended kill-switch behaviour.
 *   5. Pure functions — no side effects, no I/O. Fully unit-testable.
 *
 * Format choice — 6-char base32 (RFC 4648 alphabet minus padding) — gives
 *   32^6 = ~1.07 billion possible codes, plenty for our donor scale and
 *   short enough to read aloud / type without copy-paste. Base32 avoids the
 *   1/I/0/O confusion that base64 has.
 */

import { createHmac } from 'crypto'
import type { MollieClient } from '@mollie/api-client'

/** RFC 4648 base32 alphabet — uppercase, no padding, no confusables. */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * Format guard regex — 6-char RFC 4648 base32 suffix, uppercase.
 * Exported for use in UI validation so consumers don't re-derive the pattern.
 * The prefix-free format (`/^[A-Z0-9]{6}$/`) matches what generateReferralCode
 * emits; the old `ALPACA-[A-Z0-9]{6}` UI guard was wrong and stripped every
 * valid code before it reached checkout.
 */
export const REFERRAL_CODE_RE = /^[A-Z0-9]{6}$/
/** @internal alias kept for the metadata write path inside this module. */
const REFERRAL_CODE_FORMAT = REFERRAL_CODE_RE

/** Length in chars of every emitted referral code. Single source of truth. */
export const REFERRAL_CODE_LENGTH = 6

/**
 * Same fallback chain as newsletter-token / mollie-manage-token — Tier 1
 * NEXTAUTH_SECRET is always present in prod, so this throw is reachable only
 * in misconfigured dev environments (validateEnv warns at boot).
 */
function getSigningKey(): string {
  const key = process.env.NEWSLETTER_SIGNING_KEY || process.env.NEXTAUTH_SECRET
  if (!key) {
    throw new Error('[referral-codes] No signing key available (NEWSLETTER_SIGNING_KEY or NEXTAUTH_SECRET required)')
  }
  return key
}

/**
 * Encode a Buffer as RFC 4648 base32 (uppercase, no padding).
 *
 * We only need the first REFERRAL_CODE_LENGTH chars so we stop encoding as
 * soon as we have enough. The 32-byte SHA-256 digest yields ~51 base32 chars
 * — vastly more than we consume — so the alphabet bias from truncation is
 * not a security concern (this is a label, not a secret).
 */
function bufferToBase32(buf: Buffer, charCount: number): string {
  let bits = 0
  let value = 0
  let out = ''
  for (let i = 0; i < buf.length && out.length < charCount; i++) {
    value = (value << 8) | buf[i]
    bits += 8
    while (bits >= 5 && out.length < charCount) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f]
      bits -= 5
    }
  }
  return out
}

/**
 * Derive the stable per-customer referral code.
 *
 * Why deterministic: same input always returns the same output, so the
 * donor's shared link (`?ref=ABCDEF`) stays valid forever. If we used
 * a random/stateful code we'd need a DB column to remember it and a
 * collision strategy on regeneration — both forbidden by the task constraints
 * (no DB changes this round) and unnecessary given HMAC's collision space.
 *
 * Whitespace-trimming the input prevents accidental " cus_123 " vs "cus_123"
 * yielding different codes when a caller pastes from logs.
 *
 * Empty customerId throws — silently returning a code for an empty string
 * would let one "guest" code appear in admin as if it referred everyone.
 */
export function generateReferralCode(customerId: string): string {
  const trimmed = (customerId ?? '').trim()
  if (!trimmed) {
    throw new Error('[referral-codes] generateReferralCode requires a non-empty customerId')
  }
  const digest = createHmac('sha256', getSigningKey()).update(trimmed).digest()
  return bufferToBase32(digest, REFERRAL_CODE_LENGTH)
}

/**
 * Format-validate a referral code before writing it into payment metadata.
 *
 * Returns the code (uppercased) on pass, null on fail. We deliberately do not
 * verify the HMAC — there's no reverse map, and writing a junk code to
 * metadata is harmless (admin sees an orphan row). The check exists purely
 * to keep arbitrary attacker-controlled strings out of Stripe/Mollie metadata
 * fields (some of which have length / charset constraints).
 *
 * Accepts lowercase input by upper-casing first — donors typing the code into
 * an address bar shouldn't be punished for case. The regex itself only matches
 * uppercase to stay strict on the persisted shape.
 */
export function verifyReferralCode(code: string | null | undefined): string | null {
  if (!code || typeof code !== 'string') return null
  const upper = code.toUpperCase()
  if (!REFERRAL_CODE_FORMAT.test(upper)) return null
  return upper
}

// ── Referrer lookup — additive export ────────────────────────────────────────

/**
 * Resolve a referral code slug to the referrer's `{ email, name }` by scanning
 * Mollie customers.
 *
 * Strategy: iterate Mollie customers (capped at 200 — same bound as
 * referral-count-reader.ts), regenerate the deterministic code for each
 * customer's ID via `generateReferralCode`, and return the first match.
 *
 * Why this approach:
 *   Rule 2 in the module header says "one-way — we never need to reverse the
 *   code back to a customerId". The code is an HMAC derivation of the customer
 *   ID; there is no stored reverse map. To look up who generated a given code
 *   we must iterate customers and re-derive, exactly as the admin referrals
 *   page does. At small scale (≤200 donors) this is acceptably fast; at larger
 *   scale we'd add a DB column (out of scope for this build).
 *
 * Fail-quiet: returns `null` on any error, missing SDK, or no match found.
 * The caller (`sendReferrerRewardQuiet`) converts `null` into `reason: 'referrer-not-found'`.
 *
 * @param code     The 6-char referral code stored in `metadata.referredBy`.
 * @param mollie   A live MollieClient instance (caller-provided).
 */
export async function lookupReferrer(
  code: string,
  mollie: MollieClient,
): Promise<{ email: string; name: string | null } | null> {
  // Guard: must be a valid format before burning API quota
  if (!verifyReferralCode(code)) return null

  let signingKey: string
  try {
    signingKey = getSigningKey()
  } catch {
    return null
  }

  const CUSTOMER_CAP = 200
  let scanned = 0

  try {
    for await (const customer of mollie.customers.iterate()) {
      if (scanned >= CUSTOMER_CAP) break
      scanned++
      // Re-derive the deterministic code for this customer to check for a match.
      // We avoid calling generateReferralCode() (which would call getSigningKey()
      // again in a loop) by inlining the derivation here with the key we already
      // resolved once above.
      const digest = createHmac('sha256', signingKey).update(customer.id.trim()).digest()
      const derived = bufferToBase32(digest, REFERRAL_CODE_LENGTH)
      if (derived === code.toUpperCase()) {
        return {
          email: customer.email ?? '',
          name: customer.name ?? null,
        }
      }
    }
  } catch {
    return null
  }

  return null
}
