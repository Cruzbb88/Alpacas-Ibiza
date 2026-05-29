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

/** RFC 4648 base32 alphabet — uppercase, no padding, no confusables. */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** Format guard regex — exported only via verifyReferralCode for the metadata write path. */
const REFERRAL_CODE_FORMAT = /^[A-Z0-9]{6}$/

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
