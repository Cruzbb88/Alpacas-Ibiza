# Security Review SR-001
**Date:** 2026-05-26
**Branch:** main (5 commits ahead of origin, uncommitted working-tree changes)
**Reviewer:** Claude Code (automated)
**Scope:** Uncommitted working-tree changes reviewed via `git diff HEAD` + new untracked lib files

---

## Verdict

**APPROVED with 1 Medium advisory**

All failsafes in CLAUDE.md hold. No critical or high-severity issues found. One medium finding (email header injection vector) and two low findings documented below.

---

## Findings Table

| Severity | File:Line | Issue | Recommended Fix |
|---|---|---|---|
| **Medium** | `app/api/contact/route.ts:49` | Email `subject` header uses raw `subject` (not `safeSubject`). An attacker who controls `subject` can inject CRLF characters into the SMTP subject line, potentially splitting headers. | Use `safeSubject` or strip `\r\n` before interpolating into `subject:`. |
| **Medium** | `app/api/commission/route.ts:49` | Email `subject` uses raw `name` in the subject string (`New request from ${name}`). Same SMTP header-injection risk. | Escape `name` → use `safeName` or strip newlines before interpolating. |
| **Low** | `app/api/contact/route.ts:48`, `app/api/commission/route.ts:48` | `replyTo: email` passes raw (unvalidated) email value to Resend. A malformed email like `"foo\r\nBcc: attacker@evil.com"` could inject extra headers depending on Resend's SDK sanitation. | Add a simple RFC-5322 format check (e.g. `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`) before using `email` as `replyTo`. |
| **Low** | `lib/rate-limit.ts:1` | In-memory store is process-scoped; bypassed trivially with multiple Vercel serverless instances (each has its own process). Effective limit is `5 × instance_count` in practice. | Acceptable for current traffic per ADR-001 pattern; document the multi-instance gap or migrate to Vercel KV when traffic justifies. |

---

## Failsafe Check

Each failsafe from `CLAUDE.md` checked against the diff:

| Failsafe | Location | Status after changes |
|---|---|---|
| Turnstile widget no-op if site key unset | `components/turnstile-widget.tsx:82` | UNCHANGED — not touched |
| Turnstile server fail-open if secret unset | `lib/turnstile.ts:27-34` | UNCHANGED — not touched |
| Turnstile prod fail-closed on network error | `lib/turnstile.ts:51-54` | UNCHANGED — not touched |
| Availability 503 if keys unset | `app/api/availability/route.ts:11-19` | HOLDS — only `revalidate` constant changed (line 115), not the guard block |
| Google Reviews `{configured:false}` if keys unset | `app/api/google-reviews/route.ts` | UNCHANGED — not touched |
| Webhook 503 if secret unset (fail-CLOSED) | `app/api/fareharbor-webhook/route.ts:66-72` | UNCHANGED — not touched |
| `validateEnv()` startup check | `instrumentation.ts` → `lib/validate-env.ts` | UNCHANGED — not touched |
| `safeEqual()` for shared-secret compare | `lib/secrets.ts` | UNCHANGED — not touched |
| `escapeHtml()` on user input before email HTML | `lib/html.ts` | STRENGTHENED — now wired into both contact + commission routes |
| `fetchWithTimeout()` on every external HTTP call | `lib/fetch.ts` | UNCHANGED — not touched |
| `Promise.allSettled()` for per-item fan-out | `app/api/availability/route.ts:61` | UNCHANGED — cache revalidate change is on line 115, not line 61 |
| Mailer THROWS on error (no silent fail) | `lib/mailer.ts:40-42` | UNCHANGED — mailer not modified |
| Admin login fail-closed if creds unset | `app/api/auth/[...nextauth]/route.ts:13-19` | STRENGTHENED — hardcoded defaults removed; `authorize()` returns `null` + logs |
| Admin JWT 8h auto-logout | `app/api/auth/[...nextauth]/route.ts:34` | ADDED — new `session.maxAge = 8h` enforces this |

All 14 failsafes hold. Two are strengthened by this session's changes.

---

## OWASP Coverage

| Category | Assessment |
|---|---|
| **A03 Injection / XSS** | `escapeHtml()` correctly covers `&`, `<`, `>`, `"`, `'`, `/`. Applied to all body fields in both routes. Email subject header injection is the remaining gap (Medium above). Tests in `lib/html.test.ts` cover 14 cases including the double-escape regression. |
| **A07 Identification & Authentication** | Auth hardened: fail-closed removes default-credential backdoor. 8h JWT maxAge limits session exposure window. No MFA (single-factor credentials), but this is consistent with ADR-007 scope and acknowledged. |
| **A01 Broken Access Control** | Admin routes protected by NextAuth session. `replyTo` passed as raw email is a low-severity concern (see finding). No privilege escalation vectors found in diff. |
| **A04 Insecure Design / Sensitive Data** | `DEFAULT_TO` fallback hardcodes `info@alpacasibiza.com` (acceptable public address). No secrets in templates or responses. No PII logged. |
| **A05 Security Misconfiguration** | Rate limiting added. In-memory store is multi-instance-bypassable (Low finding). `x-forwarded-for` split correctly extracts first IP to prevent spoofing via appended IPs. |

---

## Notes

- `lib/use-availability.ts`: Client-side module. No server secrets, no auth, no user data written — only reads from `/api/availability`. No security findings.
- `emailLayout()`: Template accepts pre-trusted `innerHtml` and appends hardcoded footer. No user input flows directly into `emailLayout`'s own interpolations. Contract is correct (callers must escape before passing in).
- `lib/rate-limit.ts`: `resetMs` is returned to the client via `Retry-After`. This is intentional and correct; it reveals no sensitive information.
- CANT_BE_DONE.md Limit 4 ("Admin credential exposure check on deployed environment") remains relevant: the code fix (no defaults) lands here; Vercel env-var verification still requires owner action.
