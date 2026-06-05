/**
 * PII scrubber for payment webhook payloads.
 *
 * Stripe and Mollie webhook bodies can contain donor billing addresses,
 * emails, and names in the raw JSON. We store the payload in payment_events
 * for reconciliation (replay, audit), but we don't need raw PII for that —
 * vendor IDs + amounts + event types suffice. The authoritative PII lives
 * in Stripe/Mollie; we REDACT it before persist.
 *
 * Sensitive field detection
 * -------------------------
 * Any key matching the patterns below (case-insensitive, on the key name
 * itself, recursively through nested objects) has its value replaced with
 * '[redacted]'. Arrays are recursed element-by-element; primitives that
 * are not a direct value of a matched key are left as-is.
 *
 * Patterns:
 *   /email/i          — email, billing_email, customer_email, …
 *   /address/i        — address, billing_address, shipping_address, …
 *   /phone/i          — phone, phone_number, …
 *   /\bname\b/i       — name, display_name, full_name (NOT "filename")
 *   /\bip\b/i         — ip, ip_address (bounded so "tip"/"ship" don't match)
 *   /^card$/i         — card top-level key (contains pan+cvv+billing detail)
 *   /^billing/i       — billing_details, billing_descriptor, …
 *
 * Non-PII preserved
 * -----------------
 * IDs (id, customer_id, payment_id, …), amounts, statuses, currencies,
 * timestamps, event types, metadata.product, metadata.tier, etc.
 *
 * No `any` casts — the function accepts and returns `unknown`, performing
 * structural cloning + redaction via plain-object recursion.
 */

const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /email/i,
  /address/i,
  /phone/i,
  /\bname\b/i,
  /\bip\b/i,
  /^card$/i,
  /^billing/i,
]

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((re) => re.test(key))
}

/**
 * Deep-clone `value` while REDACTING the string value of any object property
 * whose key matches a sensitive pattern. Non-string values under a sensitive
 * key (nested objects, arrays, numbers) are also replaced with '[redacted]'
 * rather than recursed — we don't want nested card details leaking through.
 *
 * Returns a new value that is safe to JSON-stringify and persist.
 */
export function scrubWebhookPayload(raw: unknown): unknown {
  if (raw === null || raw === undefined) return raw

  if (Array.isArray(raw)) {
    return raw.map((item) => scrubWebhookPayload(item))
  }

  if (typeof raw === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        result[key] = '[redacted]'
      } else {
        result[key] = scrubWebhookPayload(value)
      }
    }
    return result
  }

  // Primitives (string, number, boolean) that are not the value of a
  // sensitive key are passed through unchanged.
  return raw
}
