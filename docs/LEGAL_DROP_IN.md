# Legal Drop-In Guide

How to activate each legal page once lawyer-approved text is ready.
Each page is a single JSON paste — no code changes required.

---

## How the system works

Each legal page (`/privacy`, `/terms`, `/cookies`) reads its body from the matching
key in `translations/<locale>.json`. While the value starts with `[UNMAPPED`, the
page shows a safe "content pending" message to users. When you remove the `[UNMAPPED`
prefix and paste real text, the page renders the real text immediately on next deploy.

In dev (`NODE_ENV !== 'production'`) an amber banner also appears showing exactly which
key is missing. In production only the user-facing placeholder sentence is shown — no
internal scaffolding leaks.

---

## Step-by-step for each policy

### Privacy Policy

1. Get lawyer-approved privacy policy text (plain text or markdown — see "Format" below).
2. Open `translations/en.json`.
3. Find the key `legal.privacy.body` — it currently reads:
   ```
   [UNMAPPED: Pending owner-provided legal text — paste lawyer-approved privacy policy here]
   ```
4. Replace the entire value (including the brackets) with your text. Example:
   ```json
   "legal": {
     "privacy": {
       "body": "Privacy Policy\n\nLast updated: DD Month YYYY\n\n1. Data Controller\n...",
       "placeholderUserCopy": "Our Privacy Policy is currently being finalized..."
     }
   }
   ```
5. Save. The amber dev banner disappears and the real text renders.
6. Repeat for other locales (`de.json`, `nl.json`, `es.json`, `fr.json`, `it.json`).
   For locales without translated legal text, leave the `[UNMAPPED` sentinel — the page
   will still show the safe placeholder sentence instead of the raw sentinel.

### Terms of Service

Same steps, key: `legal.terms.body`

### Cookie Policy

Same steps, key: `legal.cookies.body`

---

## Format: plain text vs markdown

The pages currently render the body with `white-space: pre-wrap`. This means:

- Line breaks in the JSON string (`\n`) become line breaks on screen.
- Double line breaks (`\n\n`) become paragraph spacing.
- No HTML tags are processed.

This is intentional: it keeps the paste simple and avoids XSS risk from raw HTML.

If the owner wants richer formatting (headings, bold, links), two options exist:

**Option A (simpler):** Use plain text with natural line breaks. Works today with no code changes.

**Option B (richer):** Switch to MDX rendering inside the page component.
Requires: installing `next-mdx-remote` or similar, updating the page component to
render MDX instead of plain text. Cruz decides — flag this to Tony if MDX is needed
before launch.

CAN'T DO WITHOUT HELP:
- Whether to use MDX (richer formatting) or plain text (simpler paste) — Cruz + Tony decide
- The actual lawyer-approved text for privacy / terms / cookies
- CIF number (add to `lib/tenants/alpacasibiza.ts`, field `cif`)
- Legal business name if different from "Es Currals Alpacas Ibiza" (field `legalName`)
- Full registered Spanish address (currently "San Carlos, Santa Eularia des Riu, 07819")

---

## CIF + Legal name (footer)

The footer reads `legalName` and `cif` from `lib/tenants/alpacasibiza.ts`.

- `legalName` is currently `'Es Currals Alpacas Ibiza'` — update if wrong.
- `cif` is currently `null` — when owner supplies the CIF, set it:
  ```ts
  cif: 'B12345678',  // example — use real value
  ```
  The footer CIF line auto-appears once this is non-null. No other changes needed.

---

## Single JSON snippet — privacy example

This is what Cruz pastes into `translations/en.json` to activate the privacy page.
Replace the `body` value with actual text. The `placeholderUserCopy` line stays as-is
(it only shows while body is still UNMAPPED).

```json
"legal": {
  "privacy": {
    "body": "PASTE LAWYER TEXT HERE — remove this entire placeholder sentence",
    "placeholderUserCopy": "Our Privacy Policy is currently being finalized. Please check back soon or contact us at info@alpacasibiza.com with any questions."
  },
  "terms": {
    "body": "[UNMAPPED: Pending owner-provided legal text — paste lawyer-approved terms of service here]",
    "placeholderUserCopy": "Our Terms of Service are currently being finalized. Please check back soon or contact us at info@alpacasibiza.com with any questions."
  },
  "cookies": {
    "body": "[UNMAPPED: Pending owner-provided legal text — paste lawyer-approved cookie policy here]",
    "placeholderUserCopy": "Our Cookie Policy is currently being finalized. Please check back soon or contact us at info@alpacasibiza.com with any questions."
  }
}
```

To activate all three at once, replace all three `body` values in one edit session.
