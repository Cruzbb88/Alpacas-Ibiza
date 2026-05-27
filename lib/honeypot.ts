/**
 * Honeypot bot detection helper.
 *
 * Returns true when the hidden field has been filled — a signal that
 * the submission came from a bot that blindly populates every form field.
 * Real users never see or interact with the honeypot field.
 */
export function detectHoneypot(body: Record<string, unknown>, fieldName: string): boolean {
  const value = body[fieldName]
  // Any truthy value triggers (string, number, boolean true, etc.)
  return value !== undefined && value !== null && value !== '' && value !== false && value !== 0
}
