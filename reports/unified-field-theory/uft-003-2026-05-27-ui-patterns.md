---
report: uft-003
date: 2026-05-27
scope: UI patterns (pages + components)
mode: read-only proposal
status: FINAL
---

# UFT-003 — UI Pattern Duplication & Primitive Extraction Proposals

## Summary

Scanned 19 route files and 30+ component files. Found **6 distinct repeating UI patterns** with ≥3 occurrences each. None are extracted into primitives today. `<PageBreadcrumbs>` is the only layout-adjacent primitive that exists, and it emits JSON-LD (not a visual primitive). The `components/ui/` folder is pure shadcn passthrough — no layout primitives live there.

---

## Pattern Inventory

### P1 — GradientHero section (inline, not using `<Hero>`)

**Occurrences: 9 files**

```
<section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
  <div className="max-w-4xl mx-auto text-center">
    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">...</h1>
    <p className="text-lg text-foreground/70">...</p>
  </div>
</section>
```

Files: `adopt`, `contact`, `sustainability`, `shop`, `shop/woven`, `shop/alcaca`, `shop/commission`, homepage (final CTA section), yoga (partial). The homepage final-CTA and adopt CTA reuse the same gradient on secondary sections.

The main `<Hero>` component exists and handles video/image/gradient fallback. But 8 sub-pages replicate a stripped version inline instead of using it. They skip the CTA buttons, hence the copy. This is duplication of the fallback gradient path.

**Root cause:** Pages that have no CTA buttons can't use `<Hero>` cleanly — it always renders the button group div when `cta` is provided, but the layout still implies a 600px min-height which is too tall for internal page headers. So authors copy-pasted a flat version instead.

---

### P2 — Section wrapper (`w-full py-16 md:py-24 px-4 bg-*`)

**Occurrences: 28 instances across 15 files**

```
<section className="w-full py-16 md:py-24 px-4 bg-background">
<section className="w-full py-16 md:py-24 px-4 bg-secondary/20">
<section className="w-full py-16 md:py-24 px-4 bg-primary/5">
```

Variants: `bg-background`, `bg-secondary/20`, `bg-secondary/10`, `bg-primary/5`. Padding is always `py-16 md:py-24 px-4`. The only variation is the background token.

---

### P3 — Container div (`max-w-{4|6}xl mx-auto`)

**Occurrences: 56 across 19 files**

```
<div className="max-w-6xl mx-auto">   // wide layout (grids)
<div className="max-w-4xl mx-auto">   // narrow layout (prose, hero)
<div className="max-w-2xl mx-auto">   // tight (forms, CTAs)
```

These almost always appear as the first child of a Section. They are never extracted. `max-w-6xl` pairs with `bg-background` content grids; `max-w-4xl` pairs with gradient hero sections.

---

### P4 — Section heading block (`text-center mb-12`)

**Occurrences: 11 in pages + 6 in components = 17 total**

```
<div className="text-center mb-12">
  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">...</h2>
  <p className="text-foreground/70 max-w-2xl mx-auto">...</p>
</div>
```

Every grid section that introduces a feature set, review set, or tour type uses this exact block. Six extracted components (`Features`, `FAQ`, `ChoicePaths`, `Timeline`, `ExperienceCards`, `testimonial-grid`) each re-implement it internally rather than sharing it.

---

### P5 — Card container (`bg-card rounded-lg border border-border p-{5|6|8}`)

**Occurrences: 11 across 7 files (in pages, not using `<Card>` from shadcn)**

```
<div className="bg-card rounded-lg border border-border p-6">
<div className="bg-card rounded-lg border border-border p-8">
```

shadcn's `<Card>` exists and is used in `tours`, `features`, `choice-paths`, `experience-cards`. But `sustainability`, `adopt`, `shop/alcaca`, `shop/commission`, `shop/page` all write the `bg-card rounded-lg border border-border` div by hand. Mixed usage: some pages use `<Card>`, same pages use raw divs for adjacent cards.

---

### P6 — OwnerConfirmBanner (`bg-amber-50 border-t border-amber-200`, dev-only)

**Occurrences: 5 across 5 files**

Two shapes:
- **Section banner** (adopt, sustainability): `<section className="w-full py-10 px-4 bg-amber-50 border-t border-amber-200">` with `h3.text-amber-800` + `p.text-amber-700` + `ul.font-mono`
- **Inline banner** (terms, privacy, cookies): `<div className="w-full py-4 px-4 bg-amber-50 border-b border-amber-200">` — same amber palette, smaller

Both are guarded by `process.env.NODE_ENV !== 'production'`. The structure is the same but inlined 5 times with slightly different heading text. A shared component with a `variant="section|inline"` prop would unify both forms.

---

## Extraction Proposals (ranked by leverage)

### #1 — `<PageSection>` — Section wrapper + Container combined
**Leverage: HIGH** | Occurrences: 28 | Migration cost: S (search-replace)

```tsx
// Proposed signature
<PageSection bg="default|muted|accent|gradient" width="wide|narrow|tight">
  {children}
</PageSection>

// bg variants:
// "default"   → bg-background
// "muted"     → bg-secondary/20
// "accent"    → bg-primary/5
// "gradient"  → bg-gradient-to-br from-primary/10 to-accent/10
//
// width variants:
// "wide"   → max-w-6xl mx-auto
// "narrow" → max-w-4xl mx-auto
// "tight"  → max-w-2xl mx-auto
```

Replaces the 28 `<section>…<div className="max-w-*xl mx-auto">` pairs. No child API change — just wraps the pattern. Saves ~56 lines of className per page (2 lines × 28 instances). **Total LOC saving: ~110 lines.**

Migration: single pass grep-replace. Low risk — pure passthrough wrapper.

---

### #2 — `<SectionHeading>` — title + subtitle block
**Leverage: HIGH** | Occurrences: 17 (11 pages + 6 components) | Migration cost: S

```tsx
// Proposed signature
<SectionHeading
  title="..."
  subtitle="..."      // optional
  align="center"      // default; "left" for prose sections
  size="lg|md"        // lg = text-3xl md:text-4xl (sections), md = text-2xl (sub-sections)
/>
```

Eliminates the copy-paste `<div className="text-center mb-12"><h2 …><p …>` block that every component reimplements. Six existing components (`Features`, `ChoicePaths`, `FAQ`, `Timeline`, `ExperienceCards`, `testimonial-grid`) would delegate to this. Saves ~6 lines × 17 instances = **~100 lines.**

Migration: S — purely additive extraction. Each component drops its internal heading div.

---

### #3 — `<GradientPageHero>` — narrow hero for inner pages (no video, no min-height)
**Leverage: HIGH** | Occurrences: 8 (shop, adopt, contact, sustainability, yoga CTA) | Migration cost: M

```tsx
// Proposed signature  
<GradientPageHero title="..." subtitle="..." />

// Renders:
// <section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
//   <div className="max-w-4xl mx-auto text-center">
//     <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">{title}</h1>
//     <p className="text-lg text-foreground/70">{subtitle}</p>
//   </div>
// </section>
```

Distinct from `<Hero>` (which has video/image/overlay/min-height/CTAs). Inner pages need a lightweight, stateless, server-renderable gradient banner. No `'use client'` required. **Total LOC saving: ~7 lines × 8 instances = ~56 lines.**

Migration: M — touches 8 files, but the replacement is mechanical. No behavior change.

---

### #4 — `<OwnerConfirmBanner>` — dev-only amber alert
**Leverage: MEDIUM** | Occurrences: 5 | Migration cost: S

```tsx
// Proposed signature
<OwnerConfirmBanner
  heading="..."
  body="..."
  items={['[UNMAPPED] ...', ...]}   // optional list
  variant="section|banner"          // section = py-10, banner = py-4
/>
// Guard: renders null in production automatically (no consumer boilerplate)
```

Centralizes the `NODE_ENV !== 'production'` guard. Currently 5 pages each gate independently and duplicate the amber color classes. If the owner-confirm color scheme ever changes (amber → yellow, or a different indicator), one edit fixes all. **Total LOC saving: ~10 lines × 5 instances = ~50 lines.**

Migration: S — identical coloring, just a new wrapper. Dev-only so zero prod risk.

---

### #5 — Enforce `<Card>` from shadcn in place of hand-rolled `bg-card rounded-lg border border-border`
**Leverage: MEDIUM** | Occurrences: 11 raw + 8 already using `<Card>` = 19 total card slots | Migration cost: M

Not a new primitive — shadcn `<Card>` already exists. But 7 files bypass it with hand-rolled `bg-card rounded-lg border border-border p-N` divs. The mixed usage (some `<Card>`, some raw div) in the same page is the real inconsistency (e.g., `adopt/page.tsx` uses both).

Action: replace the 11 raw card divs with `<Card className="p-N">`. Saves no lines but eliminates the inconsistency, which means Card hover/focus ring changes (if any) only need one edit. **LOC saving: 0, consistency win: high.**

Migration: M — 7 files, each needs an import added if not already present.

---

## LOC Savings Summary

| Primitive | Occurrences | Lines saved |
|---|---|---|
| `<PageSection>` | 28 | ~110 |
| `<SectionHeading>` | 17 | ~100 |
| `<GradientPageHero>` | 8 | ~56 |
| `<OwnerConfirmBanner>` | 5 | ~50 |
| `<Card>` enforcement | 11 raw divs | 0 (consistency) |
| **Total** | — | **~316 lines** |

Net: implementing all 5 removes ~316 lines of duplicate className strings and creates 4 new source files (~40 lines each = 160 lines added). **Net reduction: ~156 lines.** More importantly, future page additions write `<PageSection bg="gradient" width="narrow">` instead of copying a 4-line className string.

---

## CAN'T DO WITHOUT HELP — Cruz decide:

**Bias question:** shadcn-style (lots of variant props, fully flexible) vs alpaca-specific (opinionated, fewer props)?

Recommendation leans **alpaca-specific** because:
1. This is a single-tenant site (not a component library). No external consumer.
2. The patterns are already highly consistent — there are only 4 `bg-*` variants and 3 width variants. A flexible API buys nothing here.
3. Shadcn-style means variant types, CVA, forwardRef, etc. — the overhead exceeds the benefit for 8 pages.

Suggested stance: opinionated props (`bg="gradient|muted|default"`, `width="wide|narrow|tight"`) that map directly to the classes we already use. No CVA, no `asChild`. If a one-off case needs something different, it keeps the raw className — that's fine.

The only exception worth shadcn-style treatment: `<GradientPageHero>` should accept an optional `cta` prop so that adopt and contact pages can keep their CTA buttons inside the hero block (currently adopt has a separate CTA section that also uses the gradient, creating 2 gradient sections back-to-back on the same page).

---

## What Already Works (Don't Extract)

- `<Hero>` — correct scope (full-bleed, video, image, CTA). Already extracted.
- `<PageBreadcrumbs>` — already extracted. JSON-LD only, not a visual primitive. Keep separate.
- `<FAQ>`, `<Timeline>`, `<Features>`, `<ChoicePaths>`, `<ExperienceCards>` — correctly extracted. They internally duplicate `SectionHeading`, which is the next extraction (proposal #2).
- `components/ui/Card` — exists and correct. Enforcement issue, not extraction issue.
