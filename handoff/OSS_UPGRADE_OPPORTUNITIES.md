## Component-category gaps

*Appended 2026-05-31 — gap scan vs SOTA web/NGO/SaaS patterns.*

---

### 1. Adopt funnel (28 components)

**Missing:** Image-based personality quiz. WWF's adopt flow (worldwildlife.org) uses photo-card selection ("pick your animal") instead of text-only questions. QuillForms (github.com/quillforms/quillforms — React, TS, MIT) supports image-per-answer natively. Our quiz is text-only.
**Upgrade:** Swap quiz answer items to image tiles using QuillForms or a custom image-card step.
**Effort:** half-day.

**Missing:** Certificate 3-D card-flip. Lemon Squeezy success screens animate a card flip to reveal the certificate. We render a flat static preview.
**Upgrade:** CSS `rotateY` card-flip on certificate mount — no library, framer-motion already in project.
**Effort:** 1h.

---

### 2. Search (3 components)

**Missing:** Empty-query "Recent + Suggested" pre-filter. Linear's Cmd-K (kbar.vercel.app — MIT, 6k stars) shows recents and quick-action shortcuts before the user types anything. Our modal shows a blank input.
**Upgrade:** Seed kbar `actions` with 3 static quick-actions ("Adopt now", "Book a tour", "Contact us") plus a `useLocalStorage` recent-searches list rendered when query is empty.
**Effort:** half-day.

---

### 3. Booking / tours (12 components)

**Missing:** Shareable comparison deep-link. Our tour-comparison matrix has no URL state. Cal.com OSS uses `?tab=...` query-param state for all comparison views.
**Upgrade:** Encode selected tour IDs into `?compare=yoga,weddings` URL params via `useSearchParams`.
**Effort:** 1h.

**Missing:** Recent-bookings ticker dedup. Same tour can appear twice within 30s. Standard pattern (Proof, Fomo widgets) is a 30s cooldown per-item in component state.
**Upgrade:** Track last-shown tour slug in a `useRef` set; skip repeat within 30s window.
**Effort:** 1h.

---

### 4. Donor portal (3 components — LEANEST category)

**Missing (critical):** Receipt PDF download. Charity:water (charitywater.org) auto-generates a downloadable yearly tax receipt. We have no download path at all.
**Upgrade:** `react-pdf` (MIT) renders a minimal receipt from Mollie/Stripe payment metadata at `/adopt/portal/receipt/[id]`.
**Effort:** 1 day.

**Missing:** YTD impact summary + friend-referral count. Patreon shows "X patrons referred by you." The referral coupon infrastructure (`createReferralCoupon`) already exists in `lib/payment-handlers-referral.ts` but is never called (confirmed dead — cb-003 L2#2). Wiring the mint and adding a "Friends adopting because of you: N" line to the portal costs almost nothing on top of fixing the referral loop.
**Upgrade:** Fix referral loop (already handed off in cb-003); surface `referral_count` in the portal `share-cta` component.
**Effort:** half-day (piggybacks on referral fix).

---

### 5. Owner content blocks (21 components)

**Missing:** Per-review owner reply. Folly Farm (follyfarm.co.uk) shows owner responses inline under each review. Our `google-reviews-wall` is read-only.
**Upgrade:** Add optional `ownerReply?: string` to review data and render it indented below the review text.
**Effort:** half-day.

**Missing:** Interactive 3-step feature demo. Stripe's homepage uses a tabbed step-by-step animator. Our `features` block is static cards. `framer-motion` `AnimatePresence` is already in the project.
**Upgrade:** Wrap feature items in a stepped tab group using `AnimatePresence` slide transitions.
**Effort:** half-day.

---

### 6. Forms (8 components)

**Missing:** Multi-step commission wizard. The commission form is a single long page. QuillForms (github.com/quillforms/quillforms — MIT) or Formbricks (formbricks.com) deliver a Typeform-style conversational step-per-question flow.
**Upgrade:** Replace `commission-form` with QuillForms multi-step: budget → style → date → contact.
**Effort:** 1 day.

**Missing:** Newsletter "sneak peek" on signup. Mailchimp and ConvertKit show the latest issue inline after submission. Our flow just sends a confirmation email.
**Upgrade:** Render the most recent `lib/data/journal.ts` entry as a preview card below the form on successful submit.
**Effort:** 1h.

---

### 7. PWA / offline (2 components)

**Missing:** Offline "saved adoption" view. SOTA in 2026 is IndexedDB + Cache API to persist the donor's adoption state so the portal renders without a network (MDN PWA caching guide, LogRocket Next.js 16 PWA guide).
**Upgrade:** On adopt checkout success, write adoption state to IndexedDB via a 20-line service-worker cache entry; render from IndexedDB when offline.
**Effort:** half-day.

---

### 8. Floating WhatsApp / outbound chat

**Missing:** Owner-side inbox. Current `floating-whatsapp.tsx` opens WhatsApp natively with no history or routing. Chatwoot (github.com/chatwoot/chatwoot — MIT, 22k stars) is a self-hosted omni-channel inbox with a WhatsApp Business channel and a web widget script drop-in.
**Upgrade:** Replace the native WhatsApp link with Chatwoot widget script + connect WhatsApp Business channel. Owner gets a browser inbox; free cloud tier for 1 agent.
**Effort:** 1 day.

---

### 9. Analytics / tracking (3 components)

**Missing:** Owner-visible CWV dashboard. `web-vitals` captures CWV client-side but only posts to Vercel logs — the owner cannot see them. PostHog (github.com/PostHog/posthog — MIT, free tier 1M events/month) has a prebuilt Web Analytics dashboard including CWV. OpenPanel (openpanel.dev — MIT, 2.3KB SDK) is lighter if only page-level metrics are needed.
**Upgrade:** Route `web-vitals` events to PostHog free cloud; surface in `/admin/analytics` via PostHog API query.
**Effort:** half-day.

---

### 10. Legal compliance (3 components)

**Missing:** Per-cookie granular toggle. Current consent is accept-all or nothing. Klaro (github.com/kiprotect/klaro — BSD-3) provides per-service toggles (Analytics / Marketing / FareHarbor / Google Places) in a self-contained 43KB bundle with React integration.
**Upgrade:** Replace the current banner with a Klaro config declaring GA4, GTM, FareHarbor, and Google Places as separate toggleable services.
**Effort:** half-day.

---

## Top 5 highest-leverage missing features

1. **Donor portal receipt PDF download** — directly reduces support email volume, required for B2B gifting and EU consumer rights; `react-pdf` + Mollie/Stripe metadata. (1 day)
2. **Referral loop completion + portal friend-count** — `createReferralCoupon` infrastructure is already built but dead (cb-003 L2#2). Fixing the coupon mint unlocks the entire LTV retention loop at near-zero marginal cost. (half-day)
3. **Multi-step commission form wizard** — the longest single form on the site; conversational stepping consistently cuts abandonment 30–50% on comparable forms. QuillForms OSS, MIT. (1 day)
4. **Chatwoot WhatsApp inbox** — converts a dead-end native WhatsApp tap into an owner-managed support inbox with full history; directly increases booking conversion from undecided visitors. Free cloud tier, 1-day integration. (1 day)
5. **Klaro per-cookie consent** — required for strict GDPR compliance across the 6 active locales; current accept-all banner will not satisfy a DPA audit. BSD-3, React, drop-in. (half-day)

---

## Tolgee integration (next step — owner UI for editing translations)

Now that next-intl is the i18n stack, Tolgee is the owner-facing editor.
- Self-hosted (Docker) or cloud free tier
- Plugs into next-intl via `@tolgee/i18next` or as a separate sync step
- Auto-translates new keys via DeepL / OpenAI
- Screenshot context (Tolgee captures the live UI showing where each key renders)

To wire: `pnpm add @tolgee/web @tolgee/react` + a Tolgee project ID (free cloud).
Owner gets an in-browser editor at https://app.tolgee.io. Changes sync to translations/*.json via CI hook.

Estimated build effort: half-day. Deferred until owner asks for in-browser editing.
