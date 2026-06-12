/**
 * auto-policy.ts — programmatically-derived first-draft privacy + cookie policies.
 *
 * DRAFT — NOT LEGALLY REVIEWED.
 * Generated 2026-06-05 from declared sub-processor list.
 * Replace with legally reviewed text before setting LEGAL_CONTENT_LIVE=true.
 *
 * Consumed by:
 *   app/[locale]/privacy/page.tsx  — when LEGAL_CONTENT_LIVE is not 'true'
 *   app/[locale]/cookies/page.tsx  — when LEGAL_CONTENT_LIVE is not 'true'
 */

// ── Sub-processor types ───────────────────────────────────────────────────────

export interface SubProcessor {
  name: string
  purpose: string
  location: string
  transferMechanism: string
  dataCollected: string[]
  privacyUrl: string
}

// ── Declared sub-processor list (source of truth) ────────────────────────────

export const SUB_PROCESSORS: SubProcessor[] = [
  {
    name: 'Stripe',
    purpose: 'Payment processing (adopt-a-paca, skein sponsorship)',
    location: 'US',
    transferMechanism: 'EU-US Data Privacy Framework (DPF)',
    dataCollected: ['Email', 'Name', 'Address', 'Payment method metadata', 'IP address'],
    privacyUrl: 'https://stripe.com/privacy',
  },
  {
    name: 'Mollie',
    purpose: 'Payment processing (SEPA Direct Debit donors)',
    location: 'NL',
    transferMechanism: 'EU adequacy (EEA-based)',
    dataCollected: ['Email', 'Name', 'IBAN last 4', 'Payment method metadata'],
    privacyUrl: 'https://www.mollie.com/en/privacy',
  },
  {
    name: 'Resend',
    purpose: 'Transactional email delivery (welcome, renewal, birthday, newsletter)',
    location: 'US',
    transferMechanism: 'EU-US Data Privacy Framework (DPF)',
    dataCollected: ['Email address', 'Email content', 'Delivery metadata'],
    privacyUrl: 'https://resend.com/legal/privacy-policy',
  },
  {
    name: 'Vercel',
    purpose: 'Hosting and Edge runtime',
    location: 'US',
    transferMechanism: 'EU-US Data Privacy Framework (DPF)',
    dataCollected: ['IP address', 'Request logs', 'Error logs'],
    privacyUrl: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'FareHarbor',
    purpose: 'Tour and experience booking management',
    location: 'US',
    transferMechanism: 'EU-US Data Privacy Framework (DPF)',
    dataCollected: ['Name', 'Email', 'Phone', 'Booking details'],
    privacyUrl: 'https://fareharbor.com/privacy/',
  },
  {
    name: 'Cloudflare Turnstile',
    purpose: 'Bot protection on contact and newsletter forms',
    location: 'US',
    transferMechanism: 'EU-US Data Privacy Framework (DPF)',
    dataCollected: ['IP address', 'User-agent', 'Challenge interaction signals'],
    privacyUrl: 'https://www.cloudflare.com/privacypolicy/',
  },
  {
    name: 'Google Analytics 4 + Google Tag Manager',
    purpose: 'Website analytics (only when consent is given)',
    location: 'US',
    transferMechanism: 'EU-US Data Privacy Framework (DPF)',
    dataCollected: ['Anonymised IP', 'Browser/device metadata', 'Pages visited', 'Events'],
    privacyUrl: 'https://policies.google.com/privacy',
  },
  {
    name: 'Google Places API',
    purpose: 'Google Reviews badge display',
    location: 'US',
    transferMechanism: 'EU-US Data Privacy Framework (DPF)',
    dataCollected: ['IP address (API request)'],
    privacyUrl: 'https://policies.google.com/privacy',
  },
  {
    name: 'One.com',
    purpose: 'Email DNS and domain registrar',
    location: 'DK',
    transferMechanism: 'EU adequacy (EEA-based)',
    dataCollected: ['Domain registration details', 'DNS records'],
    privacyUrl: 'https://www.one.com/en/info/privacy-policy',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSubProcessorTable(): string {
  const header = `| Vendor | Purpose | Location | Transfer mechanism | Data collected | Privacy URL |`
  const divider = `|--------|---------|----------|--------------------|----------------|-------------|`
  const rows = SUB_PROCESSORS.map(sp =>
    `| ${sp.name} | ${sp.purpose} | ${sp.location} | ${sp.transferMechanism} | ${sp.dataCollected.join(', ')} | [Privacy policy](${sp.privacyUrl}) |`
  )
  return [header, divider, ...rows].join('\n')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build the formatted address string from the tenant address fields used by
 * both the privacy and cookies pages. Avoids duplicating the four-field join
 * in every caller.
 */
export function buildTenantAddress(address: {
  streetAddress?: string
  addressLocality?: string
  postalCode?: string
  addressCountry?: string
}): string {
  return [
    address.streetAddress,
    address.addressLocality,
    address.postalCode,
    address.addressCountry,
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * The draft-notice classNames and message used on both the privacy and cookies
 * draft pages — single source so an edit lands in both places at once.
 */
export const DRAFT_NOTICE_TEXT =
  'DRAFT — NOT LEGALLY REVIEWED. This policy was auto-generated from the declared sub-processor list on 2026-06-05. It has not been reviewed by a lawyer. The site owner should hand this to legal counsel before setting LEGAL_CONTENT_LIVE=true.'

// ── Policy options ────────────────────────────────────────────────────────────

export interface PolicyOpts {
  tenantName: string
  contactEmail: string
  address: string
  locale: string
}

// ── Privacy policy builder ────────────────────────────────────────────────────

export function buildPrivacyPolicy(opts: PolicyOpts): string {
  const { tenantName, contactEmail, address } = opts

  return `# Privacy Policy

> **DRAFT — auto-generated 2026-06-05 from declared sub-processor list.**
> **Replace with legally reviewed text before launch.**
> **Last reviewed: NEVER.**

---

## 1. About this document

This is a first-draft privacy notice for **${tenantName}**. It was auto-generated from the list of declared technology vendors and integrations used by this website. It has not been reviewed by a lawyer. The owner should treat this as a starting point to hand to their legal counsel, not as a final policy.

---

## 2. Who we are

**${tenantName}**
${address}

Data controller contact: [${contactEmail}](mailto:${contactEmail})

We operate the website at [alpacasibiza.com](https://alpacasibiza.com) and related services.

---

## 3. What data we collect

### Contact and enquiry forms
When you use our contact, commission, or newsletter forms we collect: name, email address, and the message content you provide.

### Tour and experience bookings (FareHarbor)
Bookings made through our integrated booking system collect: name, email address, phone number, and booking details. These are processed by FareHarbor (see sub-processors below).

### Adopt-a-Paca and skein sponsorship (Stripe / Mollie)
When you adopt an alpaca or sponsor a skein we collect: name, email address, billing address, and payment method metadata. Full card numbers are never stored by us — they are handled exclusively by our payment processor (Stripe or Mollie, depending on your payment method).

### Analytics (only with your consent)
If you accept analytics cookies, Google Analytics 4 collects anonymised data about pages visited and interactions. No personally identifiable data is sent to Google Analytics. This is only activated after you have given explicit consent via our cookie consent banner.

### Technical data
Our hosting provider (Vercel) automatically logs IP addresses and request metadata for security and operational purposes. These logs are retained for a short period and are not used for profiling. We apply privacy-safe headers (Referrer-Policy, Permissions-Policy) to limit the scope of technical data collection.

---

## 4. Lawful basis (GDPR Article 6)

| Processing activity | Lawful basis |
|---------------------|-------------|
| Processing adopt-a-paca and sponsorship payments | Art. 6(1)(b) — performance of a contract |
| Sending transactional emails (welcome, renewal, birthday) | Art. 6(1)(b) — performance of a contract |
| Anti-fraud and security (rate limiting, bot protection) | Art. 6(1)(f) — legitimate interests |
| Server-side error and request logging | Art. 6(1)(f) — legitimate interests |
| Analytics and marketing cookies | Art. 6(1)(a) — consent (CookieConsent v3) |
| Newsletter subscription | Art. 6(1)(a) — consent (double opt-in) |

---

## 5. Sub-processors

We share your data with the following third-party processors to operate this website:

${buildSubProcessorTable()}

We do not sell your data to third parties.

---

## 6. Data retention

| Data type | Retention period |
|-----------|-----------------|
| Adoption and payment records | 7 years (Spanish tax law requirement) |
| Transactional email logs | 90 days |
| Newsletter subscription | Until unsubscribed + 30 days |
| Server request logs | 30 days (Vercel default) |
| Analytics data | 14 months (GA4 default) |
| GDPR request records | 3 years |
| Booking records (FareHarbor) | Per FareHarbor data retention policy |

---

## 7. Your rights (GDPR Articles 15–22)

Under the GDPR you have the right to:

- **Access** (Art. 15) — request a copy of the personal data we hold about you
- **Rectification** (Art. 16) — ask us to correct inaccurate data
- **Erasure** (Art. 17) — ask us to delete your data ("right to be forgotten")
- **Portability** (Art. 20) — receive your data in a machine-readable format
- **Object** (Art. 21) — object to processing based on legitimate interests
- **Restriction** (Art. 18) — ask us to restrict processing while a dispute is resolved

To exercise any of these rights, submit a request via [/api/gdpr-request](/api/gdpr-request) or email [${contactEmail}](mailto:${contactEmail}?subject=GDPR%20data%20request). We will respond within 30 days.

You also have the right to lodge a complaint with the Spanish data protection authority (AEPD) at [aepd.es](https://www.aepd.es).

---

## 8. Cookies

We use cookies and similar technologies. For a full breakdown of cookies set on this site, see our [Cookie Policy](/cookies).

---

## 9. Contact for privacy matters

For any privacy-related questions contact:

**${tenantName}**
Email: [${contactEmail}](mailto:${contactEmail}?subject=Privacy%20enquiry)
Address: ${address}

---

*Version 0.1.0-draft — Last updated: 2026-06-05*
`
}

// ── Cookie policy builder ─────────────────────────────────────────────────────

export function buildCookiePolicy(opts: PolicyOpts): string {
  const { tenantName, contactEmail } = opts

  return `# Cookie Policy

> **DRAFT — auto-generated 2026-06-05 from declared sub-processor list.**
> **Replace with legally reviewed text before launch.**
> **Last reviewed: NEVER.**

---

## 1. About this document

This is a first-draft cookie policy for **${tenantName}**. It was auto-generated from the list of cookies set by the technology vendors and integrations used on this website. It has not been reviewed by a lawyer. The owner should treat this as a starting point to hand to their legal counsel, not as a final policy.

---

## 2. What are cookies?

Cookies are small text files placed on your device when you visit a website. They allow the site to remember information about your visit — such as your preferred language or whether you have consented to analytics — and to understand how visitors interact with the site.

This site also uses related technologies (localStorage entries) for similar purposes.

---

## 3. Categories of cookies on this site

### Strictly necessary

These cookies are essential for the site to function. They cannot be declined via the consent banner.

| Cookie / storage key | Set by | Purpose | Duration |
|---------------------|--------|---------|----------|
| \`cc_cookie\` | This site (CookieConsent v3) | Stores your cookie consent preferences | 6 months |
| \`__Host-next-auth.csrf-token\` | Next.js / NextAuth | CSRF protection for authenticated sessions | Session |
| \`__Secure-next-auth.session-token\` | Next.js / NextAuth | Admin session token | 8 hours |
| \`NEXT_LOCALE\` | Next.js / next-intl | Your preferred language selection | 1 year |

### Functionality

These cookies remember your choices to improve your experience. They are set only when you interact with relevant features.

| Cookie / storage key | Set by | Purpose | Duration |
|---------------------|--------|---------|----------|
| \`locale\` (localStorage) | This site | Saved locale preference | Persistent |

### Analytics (only with consent)

These cookies are set **only after you have accepted analytics cookies** via the consent banner. They are never set without explicit consent.

| Cookie | Set by | Purpose | Duration |
|--------|--------|---------|----------|
| \`_ga\` | Google Analytics 4 | Distinguishes unique users | 2 years |
| \`_gid\` | Google Analytics 4 | Distinguishes users within a 24-hour window | 24 hours |
| \`_ga_Y946QDVVQV\` | Google Analytics 4 | Session persistence for measurement ID | 2 years |

Google Analytics 4 is configured with IP anonymisation. We do not use GA4 for remarketing or advertising purposes.

### Marketing

No marketing or advertising cookies are currently used on this site. This section is a placeholder for any future change.

---

## 4. Third-party cookies

When you interact with specific features, the following third parties may set their own cookies:

- **FareHarbor** — when you use the integrated booking widget, FareHarbor may set session cookies to manage the booking flow. See [FareHarbor's privacy policy](https://fareharbor.com/privacy/).
- **Google Tag Manager** (container GTM-KR3CGLS6) — used to load analytics tags. GTM itself does not set cookies; the tags it loads (GA4) are listed above.
- **Cloudflare Turnstile** — when you submit a contact or newsletter form, Turnstile may set a short-lived cookie to verify you are human. No tracking occurs. See [Cloudflare's privacy policy](https://www.cloudflare.com/privacypolicy/).

---

## 5. How to manage your cookie preferences

**On this site:** Use the "Manage preferences" button (available in the site footer or via the cookie banner) to review and change your consent choices at any time. Withdrawing consent is effective immediately — analytics cookies will be cleared.

**In your browser:** You can also delete or block cookies through your browser settings:
- [Google Chrome](https://support.google.com/chrome/answer/95647)
- [Mozilla Firefox](https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox)
- [Safari](https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac)
- [Microsoft Edge](https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09)

Note: blocking strictly necessary cookies may prevent parts of the site (such as the admin area or booking flow) from working correctly.

---

## 6. Changes to this policy

We will update this policy when we add or remove cookies or tracking technologies. Material changes will be reflected in the "Last updated" date below.

---

## 7. Contact

Questions about our use of cookies: [${contactEmail}](mailto:${contactEmail}?subject=Cookie%20policy%20enquiry)

Full privacy information is available in our [Privacy Policy](/privacy).

---

*Version 0.1.0-draft — Last updated: 2026-06-05*
`
}
