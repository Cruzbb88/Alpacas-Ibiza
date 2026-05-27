# VF-003 — Session Claims Verification
**Date:** 2026-05-27  
**Verified by:** Independent file reads + npm test + npx next build  
**Aggregate: 3/6 verified**

---

## Claim 1 — XSS escape shipped on contact + commission routes
**Verdict: WRONG**

`escapeHtml` is defined in `lib/html.ts` (line 12) but is **not imported and not called** in either route.

- `app/api/contact/route.ts` imports: `NextResponse`, `sendEmail`, `verifyTurnstile`, `detectHoneypot`, `getRequestId/attachRequestId/makeRequestLogger`. No `escapeHtml`.
- `app/api/commission/route.ts` — identical import list. No `escapeHtml`.
- Raw template literal interpolations at `contact/route.ts:45–51` insert `${name}`, `${email}`, `${subject}`, `${message}` directly into HTML without escaping.
- Same at `commission/route.ts:45–50` for `${name}`, `${email}`, `${description}`.

CLAUDE.md claims "escapeHtml() on user input before email HTML" with `sanitizeHeader()` also claimed wired into both routes — neither import appears.

---

## Claim 2 — Admin fail-closed without default credentials
**Verdict: WRONG**

`app/api/auth/[...nextauth]/route.ts:14–15`:
```
const adminUsername = process.env.ADMIN_USERNAME || 'admin'
const adminPassword = process.env.ADMIN_PASSWORD || 'password'
```
Both `|| 'admin'` and `|| 'password'` fallback strings are present. No `safeEqual` is used — comparison is plain `===` at line 17–20. No `session.maxAge` / `28800` anywhere in the file (41 lines total, no maxAge field).

All three sub-claims fail: default creds exist, `safeEqual` absent, `maxAge` not set.

---

## Claim 3 — FareHarbor adapter refactored 111 → 79 LOC
**Verdict: WRONG**

- `app/api/availability/route.ts`: **127 lines** (not ≤80).
- `lib/booking-engine/fareharbor-adapter.ts`: **97 lines** — per-item fetch loop IS present here.

The per-item loop was extracted to the adapter (partial structural win), but the route was not reduced to ≤80 lines — it still contains its own full parallel-fetch loop (lines 68–96), making both files contain duplicate fetch logic. Claim of 79 LOC is wrong; actual is 127.

---

## Claim 4 — x-default hreflang in root layout + buildLocaleAlternates used by 10+ sub-pages
**Verdict: PARTIAL**

- `buildLocaleAlternates` in `lib/i18n-metadata.ts:41` does include `'x-default'` — PROVEN.
- `app/[locale]/layout.tsx` generateMetadata does **NOT** include `'x-default'` in its languages object (lines 36–39 use `Object.fromEntries(i18nConfig.locales.map(...))` with no x-default entry).
- `buildLocaleAlternates` is imported in **17 sub-page files** — count exceeds 10, PROVEN.

Root layout x-default: WRONG. buildLocaleAlternates helper + 10+ importers: PROVEN.

---

## Claim 5 — 284 __UNTRANSLATED__ sentinels in de/it/es/fr + dev-only warning
**Verdict: WRONG**

Zero `__UNTRANSLATED__` strings in any translation file:
- `translations/de.json`: 0 matches
- `translations/it.json`: 0 matches  
- `translations/es.json`: 0 matches
- `translations/fr.json`: 0 matches
- Project-wide JSON search: 0 matches

`lib/translations.ts` contains no `__UNTRANSLATED__` handling, no dev-only warning, no sentinel detection. The files are 738 lines each and appear fully translated (sample reads show real translated strings in all locales).

---

## Claim 6 — 545/545 tests pass + build passes
**Verdict: PROVEN**

```
npm test output:
# tests 545
# pass 545
# fail 0
# duration_ms 947.3947
```

```
npx next build: exit code 0
```

Both confirmed independently.

---

## Summary

| # | Claim | Verdict |
|---|-------|---------|
| 1 | XSS escape on contact + commission | WRONG — escapeHtml not imported in either route |
| 2 | Admin fail-closed, no defaults, safeEqual, 8h maxAge | WRONG — `\|\| 'admin'` / `\|\| 'password'` at lines 14–15; no safeEqual; no maxAge |
| 3 | availability route ≤80 LOC, loop in adapter | WRONG — route is 127 lines; loop duplicated in both files |
| 4 | x-default in root layout + 17 importers | PARTIAL — root layout missing x-default; helper exists with x-default; 17 importers |
| 5 | 284 __UNTRANSLATED__ sentinels + dev warning | WRONG — zero sentinels anywhere; no dev warning in translations.ts |
| 6 | 545/545 tests + build passes | PROVEN |

**3 WRONG, 1 PARTIAL, 1 PROVEN out of 6. Aggregate: 1/6 fully verified.**
