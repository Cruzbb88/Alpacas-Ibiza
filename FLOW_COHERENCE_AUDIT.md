# Flow Coherence Audit — 2026-06-09

## Flows audited: 14

---

## Per-flow findings + fixes

### Flow 1: Visitor → Tour Booking
- Entry: /tours
- Exit: /tour-confirmation
- Gap found: After ICS download, no forward link to directions / getting-to-the-farm. Only "Back to Alpacas Ibiza" (home) was present.
- Fix: Added a "Getting to the farm" card with copy and `Link` to /visit (directions + parking + accessibility).
- Files: `app/[locale]/tour-confirmation/page.tsx`

### Flow 2: Visitor → Gift Voucher Purchase
- Entry: /gifts
- Exit: FareHarbor handles the buyer thank-you email (code in email)
- Gap found: None beyond FareHarbor's scope. /gifts already has a "Redeem it here" → /redeem-voucher footer for in-person gift-givers.
- Status: **Clean**

### Flow 3: Gift Recipient → Voucher Redemption
- Entry: /redeem-voucher (via email link)
- Exit: inline success state on same page
- Gap found: Success state had no forward affordance — user left with "check your email" copy but no CTA to proceed.
- Fix: Added "Book your visit →" (→ /tours) and "Questions? Contact us" (→ /contact) CTAs inside the success block. Added `useParams` import to resolve locale client-side.
- Files: `app/[locale]/redeem-voucher/page.tsx`

### Flow 4: Visitor → Newsletter Signup
- Entry: footer form
- Exit: /newsletter-confirmed
- Gap found: None. Page already shows "Browse the journal" primary CTA.
- Status: **Clean**

### Flow 5: Newsletter Subscriber → Unsubscribe / Preferences
- Entry: email link → /preferences
- Exit: /newsletter/unsubscribed (via UnsubscribeAllButton)
- Gap found (preferences): Page had no "Done" / exit link. After opting out of individual categories, the user had no obvious way forward.
- Gap found (unsubscribed): Already has "sign up again" + home + journal. **Clean**.
- Fix: Added "Done — back to the farm" `Link` to /{locale} below the UnsubscribeAllButton section.
- Files: `app/[locale]/preferences/page.tsx`

### Flow 6: Adopter → Donor Portal
- Entry: email link → /my-adoption?token=...
- Exit: portal self-contained (update/cancel/share/gallery)
- Gap found: None. Portal has ShareCTA, ReferralCodeBadge, action buttons, and footer contact link.
- Note: Always token-gated by design — confirmed intentional.
- Status: **Clean**

### Flow 7: Donor → Share / Refer a Friend
- Entry: /my-adoption → /share-adoption
- Exit: /adopt (via "Adopt your own" CTA)
- Gap found: None. `?ref=` validated against `REFERRAL_CODE_RE`. "Adopt your own" CTA present.
- Status: **Clean**

### Flow 8: Visitor → Membership / Annual Pass
- Entry: /membership (env-gated MEMBERSHIP_LIVE=true)
- Exit: /membership/thank-you
- Gap found: None. thank-you page has "Plan your visit" → /visit and "Meet the herd" → /alpacas. Homepage callout links to /membership when MEMBERSHIP_LIVE. Membership page is a stub until owner sets env vars — acceptable.
- Status: **Clean**

### Flow 9: Visitor → Skein Sponsorship
- Entry: /skein
- Exit: /skein/thank-you
- Gap found: thank-you had "Back to skein" and "Back to the farm" but no forward funnel. User who just sponsored a skein is a warm lead for full adoption.
- Fix: Added "Adopt an alpaca →" (→ /adopt) as a secondary outlined CTA between the skein back-link and home link.
- Files: `app/[locale]/skein/thank-you/page.tsx`

### Flow 10: Sold-out Tour → Waitlist
- Entry: /tours → WaitlistForm
- Exit: inline success state in WaitlistForm
- Gap found: Success state showed only the successMessage text — a dead-end with no forward affordance.
- Fix: Added "While you wait:" copy block with three inline links: "Browse the journal", "Join the newsletter" (→ /#newsletter), "Adopt an alpaca" (→ /adopt). Locale prop already threaded through WaitlistForm.
- Files: `components/booking/waitlist-form.tsx`

### Flow 11: Recover Lost Certificate
- Entry: /recover-certificate
- Exit: inline success state in RecoverCertificateForm
- Gap found: Success state was a plain `<p>` with no forward link — dead end after form submission.
- Fix: Wrapped success state in a `<div>`, kept the success message, added "Back to the farm →" anchor (derives locale from `window.location.pathname`).
- Files: `components/adopt/recover-certificate-form.tsx`

### Flow 12: Contact Form Submission
- Entry: /contact
- Exit: inline success card in ContactForm
- Gap found: Success card had "Send another message" button but no forward affordance out of the contact page.
- Fix: Added "Explore tours →" (→ /[locale]/tours) as a primary CTA alongside the "Send another message" button. Uses existing `localePrefix` variable already in scope.
- Files: `components/contact-form.tsx`

### Flow 13: Visit Page
- Entry: /visit
- Exit: bottom CTAs section
- Gap found: None. Page already has a footer CTA section with "Book a tour" → /tours, "See the herd" → /alpacas, "Contact" → /contact.
- Status: **Clean**

### Flow 14: Admin Login → Admin Tasks
- Entry: /admin/login → /admin
- Gap found: No sign-out link anywhere in the admin. The session header said "8-hour session" but had no exit affordance.
- Fix: Created `components/admin/sign-out-button.tsx` (client component, calls `next-auth/react` `signOut`, redirects to /admin/login). Mounted in the admin index header alongside the session label.
- Files: `app/admin/page.tsx`, `components/admin/sign-out-button.tsx` (new)

---

## Summary

| Metric | Count |
|---|---|
| Flows audited | 14 |
| Flows clean (no gap) | 6 (2, 4, 6, 7, 8, 13) |
| Flows with gaps closed | 8 (1, 3, 5, 9, 10, 11, 12, 14) |
| Total CTA / forward-link additions | 11 |
| New i18n keys | 0 (all modified pages use hardcoded English strings, not i18n keys; no dead keys added) |
| Files touched | 8 |
| New files | 1 (`components/admin/sign-out-button.tsx`) |

## Verification

- `npx tsc --noEmit`: 0 errors
- `pnpm test`: 827/827 pass, 0 fail

## Owner content required

- Flow 1 (tour-confirmation): "Getting to the farm" directions card uses generic copy. Owner should supply actual journey times / parking landmark copy to replace the current placeholder.
- Flow 3 (redeem-voucher): "Book your visit" CTA links to /tours; owner should confirm FareHarbor gift-voucher redemption workflow (whether tours page is the correct landing after redeem).
- Flow 5 (preferences): "Done — back to the farm" is an acceptable generic fallback; owner may want a dedicated "preferences saved" confirmation page if usage warrants it.
