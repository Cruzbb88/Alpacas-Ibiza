# i18n Key Coverage Audit — 2026-05-31

## Critical finding: missing keys show RAW KEY TEXT to users

`next-intl.config.ts` `getMessageFallback` is configured to return the dot-joined key as visible text:

```ts
const fullKey = namespace ? `${namespace}.${key}` : key
return fullKey   // e.g. "portal.title" renders literally on screen
```

There is **no automatic fallback to `en.json`**. A key that is absent from `de.json` renders as `"portal.title"` to German users — not the English equivalent. Every missing key in the table below is user-visible broken text.

Keys that exist but contain the `__UNTRANSLATED__: ...` sentinel also display broken text (the raw sentinel string shows in the UI), because `getMessageFallback` is only called for absent keys — present-but-sentinel keys are served verbatim.

---

## Coverage matrix

Total leaf keys in `en.json`: **1069**

| Locale | Keys present | % present | Effective broken (absent + sentinel) | % broken |
|--------|-------------|-----------|---------------------------------------|----------|
| en     | 1069/1069   | 100%      | 0                                     | 0%       |
| nl     | 652/1069    | 61%       | 417                                   | 39%      |
| de     | 558/1069    | 52%       | 632                                   | 59%      |
| it     | 558/1069    | 52%       | 632                                   | 59%      |
| es     | 558/1069    | 52%       | 632                                   | 59%      |
| fr     | 558/1069    | 52%       | 632                                   | 59%      |

**nl is the best-translated locale** (61% key coverage, 0 sentinels). de/it/es/fr are at parity with each other at 52% coverage plus 121 sentinel-polluted keys each.

---

## Per-namespace breakdown

Columns: EN total keys | de | it | es | nl | fr (present count, then % in parentheses)

| Namespace | EN keys | de | it | es | nl | fr |
|-----------|---------|----|----|----|----|-----|
| adopt | 118 | 19 (16%) | 19 (16%) | 19 (16%) | 20 (17%) | 19 (16%) |
| tours | 110 | 98 (89%) | 98 (89%) | 98 (89%) | 98 (89%) | 98 (89%) |
| visit | 57 | 11 (19%) | 11 (19%) | 11 (19%) | **57 (100%)** | 11 (19%) |
| terms | 42 | 42 (100%) | 42 (100%) | 42 (100%) | 42 (100%) | 42 (100%) |
| sitemap | 37 | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| weddings | 37 | 1 (3%) | 1 (3%) | 1 (3%) | 36 (97%) | 1 (3%) |
| workshops | 37 | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| corporate | 31 | 31 (100%) | 31 (100%) | 31 (100%) | 30 (97%) | 31 (100%) |
| contact | 30 | 17 (57%) | 17 (57%) | 17 (57%) | 17 (57%) | 17 (57%) |
| yoga | 29 | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| cookies | 28 | 28 (100%) | 28 (100%) | 28 (100%) | 28 (100%) | 28 (100%) |
| weaving | 28 | 6 (21%) | 6 (21%) | 6 (21%) | **28 (100%)** | 6 (21%) |
| pressKit | 26 | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| portal | 25 | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| alpacas | 24 | 1 (4%) | 1 (4%) | 1 (4%) | 1 (4%) | 1 (4%) |
| family | 23 | 23 (100%) | 23 (100%) | 23 (100%) | 23 (100%) | 23 (100%) |
| faq | 22 | 22 (100%) | 22 (100%) | 22 (100%) | 22 (100%) | 22 (100%) |
| sustainability | 20 | 20 (100%) | 20 (100%) | 20 (100%) | 20 (100%) | 20 (100%) |
| shop | 19 | 16 (84%) | 16 (84%) | 16 (84%) | 16 (84%) | 16 (84%) |
| alcacaPage | 18 | 18 (100%) | 18 (100%) | 18 (100%) | 18 (100%) | 18 (100%) |
| about | 17 | 16 (94%) | 16 (94%) | 16 (94%) | **17 (100%)** | 16 (94%) |
| whatsapp | 17 | 1 (6%) | 1 (6%) | 1 (6%) | 1 (6%) | 1 (6%) |
| privacy | 16 | 16 (100%) | 16 (100%) | 16 (100%) | 16 (100%) | 16 (100%) |
| guestStories | 15 | 15 (100%) | 15 (100%) | 15 (100%) | 15 (100%) | 15 (100%) |
| romantic | 15 | 14 (93%) | 14 (93%) | 14 (93%) | 14 (93%) | 14 (93%) |
| gifts | 15 | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| features | 14 | 14 (100%) | 14 (100%) | 14 (100%) | 14 (100%) | 14 (100%) |
| impressum | 14 | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| notFound | 14 | 14 (100%) | 14 (100%) | 14 (100%) | 14 (100%) | 14 (100%) |
| footer | 13 | 12 (92%) | 12 (92%) | 12 (92%) | 12 (92%) | 12 (92%) |
| nav | 12 | 8 (67%) | 8 (67%) | 8 (67%) | 9 (75%) | 8 (67%) |
| paths | 12 | 12 (100%) | 12 (100%) | 12 (100%) | 12 (100%) | 12 (100%) |
| commissionPage | 12 | 10 (83%) | 10 (83%) | 10 (83%) | 10 (83%) | 10 (83%) |
| wovenPage | 11 | 9 (82%) | 9 (82%) | 9 (82%) | 9 (82%) | 9 (82%) |
| homepage | 11 | 11 (100%) | 11 (100%) | 11 (100%) | 0 (0%) | 11 (100%) |
| media | 11 | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| cancelFeedback | 11 | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| journal | 10 | 3 (30%) | 3 (30%) | 3 (30%) | 3 (30%) | 3 (30%) |
| experiences | 8 | 8 (100%) | 8 (100%) | 8 (100%) | 8 (100%) | 8 (100%) |
| press | 8 | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| search | 7 | 7 (100%) | 7 (100%) | 7 (100%) | 7 (100%) | 7 (100%) |
| legal | 7 | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| error | 7 | 7 (100%) | 7 (100%) | 7 (100%) | 7 (100%) | 7 (100%) |
| share | 6 | 6 (100%) | 6 (100%) | 6 (100%) | 6 (100%) | 6 (100%) |
| newsletter | 5 | 5 (100%) | 5 (100%) | 5 (100%) | 5 (100%) | 5 (100%) |
| recoverCertificate | 5 | 5 (100%) | 5 (100%) | 5 (100%) | 5 (100%) | 5 (100%) |
| hero | 4 | 4 (100%) | 4 (100%) | 4 (100%) | 4 (100%) | 4 (100%) |
| cta | 4 | 4 (100%) | 4 (100%) | 4 (100%) | 4 (100%) | 4 (100%) |
| awards | 3 | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| floatingWhatsapp | 2 | 2 (100%) | 2 (100%) | 2 (100%) | 2 (100%) | 2 (100%) |
| backHome | 1 | 1 (100%) | 1 (100%) | 1 (100%) | 1 (100%) | 1 (100%) |
| alpacaOfDay | 1 | 1 (100%) | 1 (100%) | 1 (100%) | 1 (100%) | 1 (100%) |

### Note on `search` and `recoverCertificate`

These show 100% in the table above because all 5 `recoverCertificate.*` and all 7 `search.*` keys exist in every locale file — but **all of them are `__UNTRANSLATED__` sentinels in de/it/es/fr** (nl has real translations for both). The key is present so the coverage counter counts it, but the value shown to users is the sentinel string `__UNTRANSLATED__: ...`. Same applies to many keys in `sustainability`, `alcacaPage`, `terms`, `visit`, `adopt`, `weaving`, `corporate`, and `weddings` in de/it/es/fr.

---

## Sentinel analysis (keys present but value = `__UNTRANSLATED__: ...`)

de/it/es/fr each contain **121 sentinel-valued keys**. nl contains **0** (nl has proper translations or simply omits keys entirely rather than using sentinels).

Top sentinel-polluted namespaces in de/it/es/fr:

| Namespace | Sentinel keys |
|-----------|--------------|
| terms | 39 |
| sustainability | 20 |
| alcacaPage | 15 |
| visit | 11 |
| adopt | 8 |
| search | 7 |
| weaving | 6 |
| recoverCertificate | 5 |
| tours | 3 |
| nav | 2 |
| corporate | 2 |
| floatingWhatsapp | 2 |
| weddings | 1 |

The 39 sentinel keys in `terms` are the Dutch consumer-law article texts (art1–art18) that exist in full in nl.json (real Dutch translations) but remain `__UNTRANSLATED__:` placeholders in de/it/es/fr.

---

## Worst offenders: namespaces entirely absent from ALL non-EN locales

These namespaces have zero keys in every non-EN locale. Every page that uses them shows raw key strings like `portal.title`, `cancelFeedback.submit`, etc.

| Namespace | EN keys | Who sees broken text |
|-----------|---------|---------------------|
| portal | 25 | All non-EN donor portal users |
| cancelFeedback | 11 | All non-EN users canceling a subscription |
| legal | 7 | All non-EN users on adopt/gift flows |
| sitemap | 37 | All non-EN users on /sitemap |
| workshops | 37 | All non-EN users on /workshops |
| yoga | 29 | All non-EN users on /yoga |
| pressKit | 26 | All non-EN users on /press-kit |
| gifts | 15 | All non-EN users on /gifts |
| impressum | 14 | All non-EN users on /legal/impressum |
| media | 11 | All non-EN users on /media |
| press | 8 | All non-EN users on /press |
| awards | 3 | All non-EN users on any page with awards badge |

**`adopt` is 16% coverage** — the largest namespace (118 keys) and the most revenue-critical page. 99 of its 118 keys are either absent or sentinel across all non-EN locales. The adopt flow is substantially broken for de/it/es/fr users.

---

## Special case: namespace presence asymmetries

Some namespaces are in some locale files but not others:

- `homepage`: present in de/it/es/fr but **entirely absent from nl.json** (0/11). nl users on the homepage see raw `homepage.experiences.corporate.title` etc.
- `visit`: nl.json has all 57 keys (100%); de/it/es/fr have only 11/57 (19%) — mostly just headings, the detailed sub-sections are absent.
- `weddings`: nl.json has 36/37 keys (97%); de/it/es/fr have only 1/37 (3%).
- `weaving`: nl.json has 28/28 keys (100%); de/it/es/fr have only 6/28 (21%).

This confirms nl.json was translated more thoroughly than the other four locales.

---

## Prioritized remediation list

### Priority 1 — Revenue-critical, user-visible broken text

These affect checkout and subscription flows directly.

1. **`adopt`** (118 keys) — 84% broken in all non-EN locales. Adopt page, thank-you page, checkout abandoned state, certificate preview, trust signals, pricing tiers. Stopgap: copy EN values verbatim into de/it/es/fr so users see English instead of raw keys.
2. **`legal`** (7 keys) — EU withdrawal waiver that the user must accept before payment. Blocking: if the checkbox label renders as `legal.withdrawalWaiver`, the user may be confused about what they are consenting to.
3. **`portal`** (25 keys) — Donor portal (/my-adoption). CI already guards `portal.*` via `portal-keys-coverage.test.ts` but that test only catches keys absent from the locale file; all 25 portal keys are completely absent from all locales. The existing test would currently fail for every locale.

### Priority 2 — High-traffic pages, visible on every visit

4. **`nav`** (12 keys, 67% coverage) — 4 keys missing from de/it/es/fr including `nav.home`, `nav.alpacas`, `nav.gifts`, `nav.recoverCertificate`. Every page shows the nav.
5. **`whatsapp`** (17 keys, 6% coverage) — Only `whatsapp.panel.footer` is present; all quick-reply prefill strings, aria labels, and panel copy are absent. The floating WhatsApp button appears on every page.
6. **`alpacas`** (24 keys, 4% coverage) — Only `alpacas.filter.showing` is present. All filter labels, personality options, color options, breed options, funFacts strings, and adoptCta are raw keys for non-EN users.
7. **`search`** (7 keys, sentinels in de/it/es/fr) — Search modal is accessible from every page. All 7 keys are sentinel-valued in de/it/es/fr; nl has real translations.
8. **`cancelFeedback`** (11 keys, 0% everywhere) — Fully absent. Cancellation feedback form.

### Priority 3 — Experience pages (high-intent visitors)

9. **`yoga`** (29 keys, 0% everywhere) — Yoga page fully untranslated.
10. **`workshops`** (37 keys, 0% everywhere) — Workshop page fully untranslated.
11. **`gifts`** (15 keys, 0% everywhere) — Gift voucher page fully untranslated.
12. **`visit`** (57 keys, 19% in de/it/es/fr) — Plan Your Visit page mostly broken. nl is complete.
13. **`weaving`** (28 keys, 21% in de/it/es/fr) — Weaving studio page. nl is complete.
14. **`weddings`** (37 keys, 3% in de/it/es/fr) — Weddings page. nl is complete.
15. **`contact`** (30 keys, 57%) — Contact page directions section (`gettingHere.*`) entirely missing from all locales.

### Priority 4 — Legal / informational pages

16. **`impressum`** (14 keys, 0% everywhere) — Legal notice page untranslated.
17. **`terms`** (42 keys) — 39 out of 42 are `__UNTRANSLATED__` sentinels in de/it/es/fr (the Dutch statutory article texts art1–art18). The 3 non-sentinel keys are custom section headers.
18. **`sustainability`** (20 keys) — All 20 are `__UNTRANSLATED__` sentinels in de/it/es/fr. nl has full translations.
19. **`alcacaPage`** (18 keys) — 15 of 18 are `__UNTRANSLATED__` sentinels in de/it/es/fr (the product description, story body, benefit copy). nl has full translations.

### Priority 5 — Press / media (lower traffic)

20. **`pressKit`** (26 keys, 0% everywhere)
21. **`press`** (8 keys, 0% everywhere)
22. **`media`** (11 keys, 0% everywhere)
23. **`sitemap`** (37 keys, 0% everywhere)
24. **`awards`** (3 keys, 0% everywhere)
25. **`homepage`** (11 keys, 0% in nl only) — nl-specific gap.

---

## Stopgap options (no invented translations)

Two safe options per the constraints:

**Option A — Copy EN values verbatim into each locale file.**
Users see English text instead of raw `"adopt.ctaLabel"` key strings. Applicable to all missing/absent keys. This is the fastest fix and leaves no visible key strings in production.

**Option B — Configure next-intl to fall back to the default locale messages.**
Instead of the current `getMessageFallback` that returns the raw key, change it to:

```ts
// next-intl.config.ts
import enMessages from './translations/en.json'

getMessageFallback({ namespace, key }) {
  // Look up the EN value; fall back to dotted key only if EN also lacks it
  let cur: unknown = enMessages
  const parts = namespace ? [...namespace.split('.'), key] : [key]
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') { cur = undefined; break }
    cur = (cur as Record<string, unknown>)[part]
  }
  const fallbackValue = typeof cur === 'string' ? cur : `${namespace ? namespace + '.' : ''}${key}`
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[next-intl] missing key: ${namespace ? namespace + '.' : ''}${key} — served EN fallback`)
  }
  return fallbackValue
}
```

This is zero-risk content-wise (shows correct English), zero translation work, and works automatically for all future keys too. Recommended as the immediate fix for `adopt`, `portal`, `cancelFeedback`, and `legal` before any translated copy ships.

**The `__UNTRANSLATED__` sentinel problem** requires a separate fix: those values are not missing keys — they are present strings. `getMessageFallback` never fires for them. Either replace sentinel values with the EN text (Option A applied retroactively), or filter them out at render time. The simplest approach is a search-replace pass replacing `"__UNTRANSLATED__: ..."` with just the EN value across all four locale files.

---

## What nl.json has that others lack

nl.json is the reference for "what a fully-translated locale looks like":
- `visit` — 57/57 keys (100%)
- `weaving` — 28/28 keys (100%)
- `weddings` — 36/37 keys (97%)
- `sustainability` — 20/20 keys with real translations (not sentinels)
- `alcacaPage` — 18/18 keys with real translations
- `terms` — 42/42 with full Dutch statutory articles
- `recoverCertificate` — 5/5 with real translations
- `search` — 7/7 with real translations
- `floatingWhatsapp` — 2/2 with real translations
- `about` — 17/17 with long-form story text

One nl.json gap: `homepage` is entirely absent from nl.json (de/it/es/fr have it). Add the 11 `homepage.*` keys to nl.json to close this.
