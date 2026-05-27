---
report_number: "002"
date: "2026-05-26"
mode: "default"
target_path: "C:/Users/cruzb/Projects/alpaca-farm-redesign"
language: "TypeScript"
replication_potential: "high"
generator_type: "component"
detection_score: 95
design_score: 92
validation_score: "N/A"
documentation_score: "N/A"
composite_score: 94
previous_composite: null
score_delta: "-"
trend: "first_run"
---

# Gigafactory Report #002 — Alpaca Card Factory Design

**W3.3 | Design-only | Build blocked on owner-supplied bios + photos**

---

## Executive Summary

The alpaca card pattern (`AlpacaCard` + `lib/data/alpacas.ts` + `ALPACAS.map()`) already exists in the project and is correctly wired. The factory problem is **not** code generation — it is **data supply**. The page renders 14 cards via a single `ALPACAS.map()` loop today. This report designs the enriched data schema, the complete component contract, the generator pattern (data file → 14 instances with no manual JSX), the i18n hook for localized bios, and the UNMAPPED sentinel strategy per PRACTICES Rule 5 and CANT_BE_DONE.md limits. No code is written here — this is the design the owner's input will slot into.

---

## Step 0: Config Landscape

| Category | Files | Pattern | Extensible? |
|----------|-------|---------|-------------|
| No application YAML configs | — | — | — |
| Translation JSON | `translations/{locale}.json` × 6 | Flat JSON, key-dot-path access via `lib/translations.ts` | Yes — add keys |
| TypeScript data module | `lib/data/alpacas.ts` | Exported `const ALPACAS: Alpaca[]`, consumed by `app/[locale]/alpacas/page.tsx` | Yes — extend interface + array |
| React component | `components/alpaca-card.tsx` | Single-record card, null-guards for `image` and `bio` | Yes — extend props |

**Verdict:** The project has no YAML config layer for data. All record data is TypeScript arrays. EXTEND the existing `lib/data/alpacas.ts` pattern — do NOT introduce a new YAML data file or loader.

---

## L1: Generator Detection

### Request Analysis

- **Original request:** Generate alpaca-card factory for 14 profiles + future bios
- **Restated as pattern:** Data-driven card grid — one TypeScript record per entity → one rendered card, N entities rendered via map
- **Domain:** UI / data layer

### Pattern Recognition

- **Pattern type:** UI component (data-driven card grid)
- **Confidence:** High — `AlpacaCard` + `ALPACAS.map()` already exists; the factory is the enriched data schema + render contract

### Parameterizable Dimensions

Per alpaca record:
1. `id` — URL slug, unique key
2. `name` — display name
3. `age` — optional, integer years (owner-supplied)
4. `breed` — optional, e.g. "Huacaya" or "Suri" (owner-supplied)
5. `color` — optional, fleece color descriptor (owner-supplied)
6. `personality` — optional, one-line trait summary (owner-supplied)
7. `fun_fact` — optional, whimsical detail (owner-supplied)
8. `bio` — nullable localized text (owner-supplied per locale, or single EN bio)
9. `image` — nullable URL path (owner-supplied photo in `public/images/alpacas/`)

### YAML Config Opportunities

None — the project's data pattern is TypeScript modules, not YAML. Introducing YAML here would break the existing pattern without benefit. All 9 dimensions are instance-specific.

### Replication Verdict: HIGH

14 instances today; any future alpaca birth/arrival = drop one more record into the array. 5+ future instances likely. Zero JSX changes required when new records are added.

**L1 Score: 95/100**
(-5: the factory already exists structurally; detection score reflects that L2 is design, not net-new build)

---

## L2: Factory/Generator Design

### Config Schema

**Approach: EXTEND the existing TypeScript interface in `lib/data/alpacas.ts`**

```typescript
// lib/data/alpacas.ts — enriched interface (design target, not yet built)

export interface AlpacaBio {
  en: string | null
  de?: string | null
  it?: string | null
  es?: string | null
  nl?: string | null
  fr?: string | null
}

export interface Alpaca {
  id: string              // slug — required, unique
  name: string            // display name — required
  age?: number | null     // years — optional (owner-supplied)
  breed?: string | null   // "Huacaya" | "Suri" | other — optional
  color?: string | null   // fleece color descriptor — optional
  personality?: string | null  // one-line trait — optional
  fun_fact?: string | null     // whimsical detail — optional
  bio: AlpacaBio | null   // null = UNMAPPED; object = owner-supplied localized bios
  image: string | null    // null = UNMAPPED; string = path e.g. "/images/alpacas/barbarella.webp"
}
```

**Sample record (owner-filled):**

```typescript
{
  id: 'barbarella',
  name: 'Barbarella',
  age: 6,
  breed: 'Huacaya',
  color: 'white',
  personality: 'Bossy and brave — always first to investigate strangers',
  fun_fact: 'She once ate a tourist\'s sunhat whole.',
  bio: {
    en: 'Barbarella is the undisputed queen of Es Currals. Born in 2018, she rules the herd with velvet-soft authority and a suspicious eye for hats.',
    nl: 'Barbarella is de onbetwiste koningin van Es Currals. Geboren in 2018, leidt ze de kudde met zachte maar vastberaden autoriteit.',
  },
  image: '/images/alpacas/barbarella.webp',
}
```

**Sample record (UNMAPPED — current state):**

```typescript
{ id: 'barbarella', name: 'Barbarella', bio: null, image: null }
```

---

### Template Structure

The generator is the existing `ALPACAS.map()` loop in `page.tsx`. No new generator script is needed — the factory is the data module + the component contract.

**File: `lib/data/alpacas.ts`**
- Approach: TypeScript module (extend in-place)
- Constant: export shape, file path, null-guard comment header
- Variable: per-record field values (one record per alpaca, 14 total)

**File: `components/alpaca-card.tsx`**
- Approach: template (extend props interface + render logic)
- Constant: card container, grid sizing hints, UNMAPPED sentinel patterns
- Variable: rendered fields per record (name, age, breed, bio, image, personality, fun_fact)

**File: `app/[locale]/alpacas/page.tsx`**
- Approach: no change needed
- The `ALPACAS.map()` loop is already correct — it consumes whatever records exist in the data module

---

### Output Directory Structure

```
lib/data/
  alpacas.ts              ← EXTEND (add fields to interface + records)

components/
  alpaca-card.tsx         ← EXTEND (add rendered fields, keep null guards)

app/[locale]/alpacas/
  page.tsx                ← NO CHANGE (map loop already correct)

public/images/alpacas/   ← NEW DIRECTORY (owner drops photos here)
  barbarella.webp
  avalon.webp
  ... (14 files, same crop ratio)

translations/
  en.json                 ← ADD keys: alpacas.age, alpacas.breed, alpacas.personality, alpacas.funFact, alpacas.bioComingSoon (already exists)
  nl.json                 ← SAME keys
  de.json, es.json, it.json, fr.json ← SAME keys
```

---

### Generation Approach: Template (data-driven, no codegen script)

**Justification:** The "generator" is the TypeScript data array itself. Adding a new alpaca = adding one object literal to `ALPACAS`. The page re-renders all 14 (or 15, or 20) instances automatically via `ALPACAS.map()`. No codegen script, no template engine, no YAML-to-TSX step. This matches the project's existing pattern and is the lowest-complexity correct solution.

---

### Example Output

Given the enriched interface above, here is what the factory produces for 14 records with all fields filled:

**Page renders:** 14 `<AlpacaCard>` components inside a CSS grid (already wired: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`). Zero JSX changes. The map loop handles N records generically.

**Card renders per alpaca (owner-filled):**
- Photo (aspect-square, object-cover) OR name-initial placeholder
- Name (h3, green)
- Breed + Age badge (e.g. "Huacaya · 6 yrs") — conditional, hidden if null
- Personality line — conditional, hidden if null
- Localized bio paragraph — locale resolved from `bio[locale]` → `bio.en` fallback → `translate('alpacas.bioComingSoon')` final fallback
- Fun fact (italicized, earthy tone) — conditional, hidden if null

**Card renders per alpaca (UNMAPPED state — current):**
- Name-initial placeholder div (beige background, grey text, current behavior preserved)
- Name (h3)
- "Bio coming soon" (translation key `alpacas.bioComingSoon`, already in all 6 locale JSONs)

---

### i18n Hook

**Design decision: per-record locale map (not separate YAML per locale)**

```typescript
bio: {
  en: "...",   // required if any bio is supplied
  nl: "...",   // optional — owner supplies if they want NL version
  de: null,    // explicit null = fall back to EN
}
```

**Resolution order in `AlpacaCard`:**

```
bio[locale] → bio.en → translate('alpacas.bioComingSoon')
```

**Why not separate files per locale?** The project's i18n pattern is flat JSON (`translations/{locale}.json`) for UI strings — not per-locale data files. Alpaca bios are editorial content tied to individual animals, not UI copy. Embedding them in the TypeScript data record keeps them co-located with the rest of the alpaca data, requires no new loader, and lets the owner supply EN-only initially and add NL/DE later without structural changes.

**Alternative considered and rejected:** A separate `translations/alpacas/{locale}.json` per locale — adds a new loader pattern, increases file count by 6, and fragments data that logically belongs together.

---

### UNMAPPED Sentinel Handling

Per CANT_BE_DONE.md (image asset existence limit) and PRACTICES Rule 5:

| Field | Missing value | Card renders |
|-------|--------------|--------------|
| `image: null` | No photo supplied | Beige div (`bg-[#F5F5DC]/60`) with alpaca name as centred text — no broken `<img>`, no placeholder URL |
| `bio: null` | No bio supplied | `translate('alpacas.bioComingSoon')` — currently "Bio coming soon" in EN, localized in all 6 JSONs |
| `bio.en: null`, `bio[locale]: null` | Locale bio missing | Falls back to `bio.en`; if that too is null, falls back to translation key |
| `age: null` / `breed: null` | Optional fields unset | Entire badge row omitted (no "null yrs" rendered) |
| `personality: null` | Optional field unset | Line omitted entirely |
| `fun_fact: null` | Optional field unset | Fun fact section omitted entirely |

**Hard rule:** No field ever renders the string "null", "undefined", or an invented placeholder value. The component must be authored with explicit null-checks for every optional field. The current component already does this correctly for `image` and `bio` — the enriched version must extend the same pattern to `age`, `breed`, `personality`, and `fun_fact`.

---

### YAML Config Integration

None needed. All data is instance-specific per record. No shared YAML configs identified. Extension is TypeScript-native.

**L2 Score: 92/100**
(-8: the "example output" shows the shape but cannot show filled card renders without owner data — by design, this is the correct constraint, not a gap)

---

## Composite Score

| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1 Detection | 95 | 0.4615 | 43.8 |
| L2 Design | 92 | 0.5385 | 49.5 |
| **Composite** | | | **93.3 → 93** |

---

## Owner Input Required Before Build

The following is the complete data collection template the owner fills in. One block per alpaca. All fields except `name` and `id` are optional at initial supply — the factory handles nulls gracefully.

```
Alpaca: Barbarella
Age (years): 
Breed (Huacaya / Suri / other): 
Fleece color: 
Personality (one line): 
Fun fact: 
Bio (EN, 1–3 sentences, warm and human): 
Bio (NL, optional — leave blank to use EN): 
Photo filename (head-and-shoulders, same crop ratio as other 13 — drop in public/images/alpacas/): 
```

Repeat × 14. Owner should also confirm whether the current 14 names are still accurate (births/deaths since live site last updated).

---

## Follow-up Spec

A spec (`specs/todo/009-alpaca-card-factory-build.md`) should be created when owner input arrives. It will reference this design report and list the exact edits to make: extend the `Alpaca` interface, fill the 14 records, extend `AlpacaCard` props and render logic, add translation keys, and drop photos into `public/images/alpacas/`. Until that input exists, no code changes.
