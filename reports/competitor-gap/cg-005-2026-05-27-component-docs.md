# CG-005 — Component Documentation Gap Analysis
**Date:** 2026-05-27  
**Author:** Claude Code (Sonnet 4.6)  
**Scope:** 5 competitor component doc pages vs alpaca `docs/components/`

---

## Reference Section Orders

### 1. Shadcn UI (`/docs/components/button`)
Installation → Usage → Cursor → Examples (13 variants) → RTL → API Reference

Code: toggleable "View Code" + copy button per example  
Props table: Prop | Type | Default  
Accessibility: minimal — mentions `role="button"` only; no keyboard nav table  
Versioning: none per component; global changelog link only  
Search: yes, header search bar

### 2. Radix Primitives (`/primitives/docs/components/accordion`)
Features → Installation → Anatomy → API Reference (per sub-component) → Examples → Accessibility (Keyboard Interactions table)

Code: inline copyable blocks (JSX + CSS side by side)  
Props table: Prop/Data attribute/CSS Variable | Type/Values | Default  
Accessibility: moderate — references WAI-ARIA pattern; dedicated keyboard interactions table with 10 key bindings; no inline ARIA role assignments  
Versioning: none per component  
Search: not visible

### 3. React Aria (`/Button`)
Overview → Vanilla CSS example → Tailwind example → Events → Pending state → Link buttons → Examples → API → Related Types

Code: embedded blocks with named files (.tsx, .css); dual impl (Vanilla + Tailwind)  
Props table: Name | Type | Default | Description (4 columns; 100+ props including all ARIA attributes)  
Accessibility: deepest of all 5 — inline ARIA attribute list (aria-controls, aria-current, aria-disabled, aria-expanded, aria-haspopup, aria-label, aria-pressed), contextual accessibility warnings mid-page  
Versioning: none per component  
Search: not visible in fetched content

### 4. Headless UI (`/react/menu`)
Installation → Basic example → Styling (data attributes, render props) → Examples (11) → Keyboard interaction → Component API (per sub-component) → Styled examples

Code: embedded copyable blocks; complete runnable components  
Props table: Prop | Default | Description (note: no Type column)  
Accessibility: functional keyboard interactions table (9 bindings); ARIA roles not documented inline  
Versioning: global "v2.1" only; no per-component history  
Search: table-of-contents sidebar only; no search input

### 5. Mantine (`/core/button/`)
Usage → [12 usage variant sections] → Styles API → Custom variants → Customize variant colors → autoContrast → Button.Group → Button.GroupSection → Polymorphic component → Get element ref

Code: toggleable "Expand code" blocks with import statements; interactive demo with live variant/size/color selectors  
Props table: interactive hover-based Styles API inspector (no static table); no traditional Prop | Type | Default table  
Accessibility: minimal — no ARIA roles, no keyboard nav table; some `:disabled` / `[data-disabled]` CSS guidance  
Versioning: global v9.2.1 in nav; GitHub Releases link; no per-component changelog  
Search: yes, Ctrl+K shortcut

---

## Alpaca's Current Section Order

Sampled from `booking-section.md`, `contact-form.md`, `turnstile-widget.md`:

```
# `ComponentName`
Source: (file + LOC)
## What it does
## Props (table: Prop | Type | Required | Default | Notes)
## States (table: State | Trigger | UI behavior)
## Accessibility
## i18n
## Dependencies
## Used by
## Known gaps
```

Notable: no description exists as a separate heading — "What it does" serves this role. No Usage/Examples section. No keyboard interaction table. No anatomy. No source link beyond a single line at top.

---

## Gap Analysis: 5 Additions Ranked by Reader Utility

### 1. Keyboard Interactions table (highest utility)
**Missing from alpaca entirely.** Radix and Headless UI both have this as a dedicated section. For interactive components (sticky-booking-bar, language-switcher, cookie-consent), the current Accessibility section mentions ARIA attributes but never lists what keys do what. A 2-column table (`Key | Action`) covers it in 5–10 rows.

**Add after `## Accessibility`:**
```markdown
## Keyboard Interactions
| Key | Action |
|-----|--------|
| Tab | Moves focus to the next interactive element |
| Enter / Space | Activates the primary action |
| Escape | Dismisses / closes (where applicable) |
```

### 2. Usage snippet (second highest utility)
**Missing from alpaca entirely.** Every reference provides at least one inline code block showing the minimum import + JSX to render the component. Alpaca's docs are prose-only. Adding a single fenced TypeScript block under a `## Usage` heading would let a developer copy-paste without opening the source file.

**Add after `## What it does`:**
```markdown
## Usage
```tsx
import { BookingSection } from '@/components/booking-section'
// No props required — locale from useParams()
<BookingSection />
```
```

### 3. Anatomy section (third highest utility)
**Only Radix documents this.** An anatomy block names every DOM sub-element and maps it to the component tree — essential for components like `ContactForm` or `FareHarborCalendar` that compose several sub-components. For alpaca's simpler components a one-level list suffices:

**Add after `## Usage`:**
```markdown
## Anatomy
- `<section>` — outer container
  - `.skeleton-grid` — loading placeholder (8 cards)
  - `<AvailabilityCard>` — per-slot date card
  - `<a>` — primary CTA anchor
  - `<CancellationBadge>` — scarcity indicator
```

### 4. Changelog / last-changed reference
None of the 5 references do this per-component. Alpaca should add a one-liner at the bottom of each file:
```markdown
## Last changed
<!-- git log --follow -1 --format="%h %ad %s" -- components/booking-section.tsx -->
```
Keeps doc staleness auditable without a separate changelog system.

### 5. Source link (already partially present — formalise it)
Alpaca puts the source path in line 3 as plain text. React Aria names files explicitly and Shadcn links to a sandbox. Alpaca's single-line source reference is already better than Mantine and Headless UI (which have none). Formalise it as a `## Source` heading for grep-ability.

---

## One thing alpaca does that none of the references do

**`## States` table with `Trigger → UI behavior` mapping.**  
All 5 references document props but none model component state machines explicitly. Alpaca's States table (e.g., `loading | useAvailability not yet resolved | 8-card skeleton grid`) is a concrete test specification — it tells a developer exactly what the UI must show under each condition. This is the most testable section in any of the 14 component files and should be treated as a mandatory section, not optional.
