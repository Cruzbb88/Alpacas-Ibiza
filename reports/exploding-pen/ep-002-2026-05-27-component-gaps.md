---
report_number: 002
date: "2026-05-27"
mode: "default"
target_path: "C:/Users/cruzb/Projects/alpaca-farm-redesign/components"
language: "TypeScript/Next.js (App Router)"
scope: "component-level only — infrastructure gaps deferred to ep-001"
gaps_found: 10
gadgets_designed: 10
gadgets_injected: 0
gap_scan_score: 81
gadget_design_score: 84
injection_plan_score: NA
inventory_score: NA
composite_score: 82
previous_composite: 77
score_delta: "+5"
trend: "improving"
---

# Exploding Pen — Component Gap Report ep-002

**Project:** alpaca-farm-redesign
**Date:** 2026-05-27
**Mode:** Default (L1 + L2) — component-scoped
**Prior run:** ep-001 covered app-wide infra gaps (sitemap, escapeHtml, BASE_URL, error.tsx, loading.tsx). Those are NOT redone here.

---

## Methodology

Reviewed all 18 locale routes and 30 `components/` files. Looking for:
- UI primitives repeated inline that should be a component
- Missing chrome users would expect (back-to-top, scroll progress, toast, empty state)
- Skeleton variants for async sections
- Interaction micro-patterns not yet abstracted

---

## Gap Census (10 found)

### C-01 · Inline gradient hero duplicated 8× — no `PageHero` primitive
**Severity:** HIGH — divergent maintenance  
**Files:** `shop/page.tsx`, `shop/woven/page.tsx`, `shop/alcaca/page.tsx`, `shop/commission/page.tsx`, `adopt/page.tsx`, `sustainability/page.tsx`, `contact/page.tsx`, `gifts/page.tsx`

Each of these pages independently renders:
```tsx
<section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
  <div className="max-w-4xl mx-auto text-center">
    <h1 className="text-4xl md:text-5xl font-bold ...">...</h1>
    <p className="text-lg text-foreground/70">...</p>
  </div>
</section>
```
This is a lighter variant of `<Hero>` (no image, no CTA, gradient-only). The full `<Hero>` component is ~100 LOC and is client-side (needs `trackConversion`). Pages that only need a title + subtitle header are importing client overhead unnecessarily OR they're writing this 6-line section by hand every time.

**Proposed component:** `PageHero`
```tsx
// components/page-hero.tsx — ~25 LOC
interface PageHeroProps {
  title: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg'  // py-12 / py-16 / py-20
}
export function PageHero({ title, subtitle, size = 'md' }: PageHeroProps) {
  const py = { sm: 'py-12', md: 'py-16', lg: 'py-20' }[size]
  return (
    <section className={`w-full ${py} px-4 bg-gradient-to-br from-primary/10 to-accent/10`}>
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">{title}</h1>
        {subtitle && <p className="text-lg text-foreground/70 max-w-2xl mx-auto">{subtitle}</p>}
      </div>
    </section>
  )
}
```
**Routes consuming it:** shop, shop/woven, shop/alcaca, shop/commission, adopt, sustainability, contact, gifts (8 routes)  
**LOC estimate:** 25

---

### C-02 · `SectionHeader` inline in every page — no shared primitive
**Severity:** HIGH — divergent maintenance  
**Files:** `page.tsx`, `tours/page.tsx`, `about/page.tsx`, `experiences/*`, `yoga/page.tsx` (~10 occurrences)

Every section with a title + subtitle repeats:
```tsx
<div className="text-center mb-12">
  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{title}</h2>
  <p className="text-foreground/70 max-w-2xl mx-auto">{subtitle}</p>
</div>
```
This pattern appears identically in 10+ sections across 5+ pages.

**Proposed component:** `SectionHeader`
```tsx
// components/section-header.tsx — ~20 LOC
interface SectionHeaderProps {
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  className?: string
}
export function SectionHeader({ title, subtitle, align = 'center', className }: SectionHeaderProps) {
  const alignCls = align === 'center' ? 'text-center' : 'text-left'
  return (
    <div className={`mb-12 ${alignCls} ${className ?? ''}`}>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{title}</h2>
      {subtitle && <p className="text-foreground/70 max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  )
}
```
**Routes consuming it:** homepage, tours, about, corporate, romantic-sunset, family-farm-days, yoga (~7 routes)  
**LOC estimate:** 20

---

### C-03 · `SkeletonCard` — no domain-specific skeleton variants for async sections
**Severity:** MEDIUM — UX flash on FareHarbor load  
**Files:** `fareharbor-calendar.tsx` (no skeleton), `google-reviews-badge.tsx` (no skeleton), `availability-urgency.tsx` (no skeleton)

`components/ui/skeleton.tsx` exists but is the raw Radix primitive (a single animated div). No domain-shaped skeleton exists for:
- The FareHarbor calendar iframe loading state (large block)
- The availability urgency strip ("X spots left")
- The Google reviews badge

When these async components resolve, the layout shifts. A `CalendarSkeleton` and `UrgencySkeleton` would pin the layout.

**Proposed component:** `CalendarSkeleton` (+ inline `UrgencySkeleton`)
```tsx
// components/calendar-skeleton.tsx — ~20 LOC
import { Skeleton } from '@/components/ui/skeleton'
export function CalendarSkeleton() {
  return (
    <div className="w-full space-y-3 p-4">
      <div className="flex gap-2 justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
      </div>
    </div>
  )
}
```
**Routes consuming it:** tours (booking section), yoga, corporate, family-farm-days, gifts (5 routes)  
**LOC estimate:** 22

---

### C-04 · No `BackToTop` button on long pages
**Severity:** MEDIUM — UX on mobile  
**Files:** Missing from all routes. `tours/page.tsx`, `about/page.tsx`, `yoga/page.tsx` each exceed 800px of content.

`StickyBookingBar` already uses the scroll-listener pattern. A `BackToTop` button reuses the same hook.

**Proposed component:** `BackToTop`
```tsx
// components/back-to-top.tsx — ~22 LOC
'use client'
import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
export function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const fn = () => setVisible(window.scrollY > 500)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  if (!visible) return null
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-20 right-4 z-40 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all md:bottom-6"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}
```
Note: `bottom-20` on mobile avoids overlap with `StickyBookingBar`.  
**Routes consuming it:** should be added to `app/[locale]/layout.tsx` (all routes get it automatically)  
**LOC estimate:** 22

---

### C-05 · `OwnerConfirmBanner` is copy-pasted inline — not a shared component
**Severity:** MEDIUM — maintainability  
**Files:** `sustainability/page.tsx:103-120`, `adopt/page.tsx:212-231`

Both files contain an identical amber-background dev-only banner pattern:
```tsx
{process.env.NODE_ENV !== 'production' && (
  <section className="w-full py-10 px-4 bg-amber-50 border-t border-amber-200">
    <div className="max-w-4xl mx-auto">
      <h3 className="text-base font-bold text-amber-800 mb-2">{header}</h3>
      <p className="text-sm text-amber-700">{body}</p>
      <ul className="...">...</ul>
    </div>
  </section>
)}
```
This will spread to every new page that has UNMAPPED data. Extracting it now prevents a 3rd copy on yoga, woven, etc.

**Proposed component:** `OwnerConfirmBanner`
```tsx
// components/owner-confirm-banner.tsx — ~28 LOC
interface OwnerConfirmBannerProps {
  header: string
  body?: string
  items: string[]
}
export function OwnerConfirmBanner({ header, body, items }: OwnerConfirmBannerProps) {
  if (process.env.NODE_ENV === 'production') return null
  return (
    <section className="w-full py-10 px-4 bg-amber-50 border-t border-amber-200">
      <div className="max-w-4xl mx-auto">
        <h3 className="text-base font-bold text-amber-800 mb-2">{header}</h3>
        {body && <p className="text-sm text-amber-700 mb-4">{body}</p>}
        <ul className="space-y-1 text-sm font-mono text-amber-800 list-disc list-inside">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>
    </section>
  )
}
```
**Routes consuming it:** sustainability, adopt (currently); yoga, woven, alpacas (likely next)  
**LOC estimate:** 28

---

### C-06 · `ImagePlaceholder` — inline placeholder divs are inconsistent
**Severity:** MEDIUM — visual consistency + future image migration  
**Files:** `corporate-team-building/page.tsx:141-151` (two inline placeholder divs with text), `woven/page.tsx:80-82` (emoji-only placeholder), `about/page.tsx:103-110` (plain name-text), `alpaca-card.tsx:10-12` (name-text fallback)

Each page invents its own "no image yet" state differently. When the owner supplies images, whoever adds them has to hunt through 4 different patterns.

**Proposed component:** `ImagePlaceholder`
```tsx
// components/image-placeholder.tsx — ~20 LOC
import { cn } from '@/lib/utils'
interface ImagePlaceholderProps {
  label?: string
  aspectRatio?: 'square' | '4/3' | '16/9'
  className?: string
}
export function ImagePlaceholder({ label, aspectRatio = 'square', className }: ImagePlaceholderProps) {
  const aspect = { square: 'aspect-square', '4/3': 'aspect-[4/3]', '16/9': 'aspect-video' }[aspectRatio]
  return (
    <div className={cn(`${aspect} bg-secondary/20 rounded-lg flex items-center justify-center border border-border`, className)}>
      <span className="text-sm text-foreground/30 text-center px-4 select-none">{label ?? 'Image coming soon'}</span>
    </div>
  )
}
```
**Routes consuming it:** corporate, woven, about, alpacas (4 routes + wherever owner adds images)  
**LOC estimate:** 20

---

### C-07 · Newsletter form has no spinner — submit state is silent
**Severity:** LOW-MEDIUM — UX  
**File:** `components/newsletter-form.tsx:85-89`

During `status === 'sending'`, the button text stays the same — only opacity drops to 50%. The user gets no visual signal that the request is in-flight. A simple inline spinner (already available from the `loading.tsx` ep-001 pattern) would close this.

**Proposed gadget:** Inline spinner inside the submit button — add to `newsletter-form.tsx`, `contact-form.tsx`, `commission-form.tsx`
```tsx
// Inject into newsletter-form.tsx button content:
{status === 'sending' ? (
  <span className="flex items-center gap-2">
    <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
    {translate('newsletter.subscribe')}
  </span>
) : translate('newsletter.subscribe')}
```
This is 6 lines per form (3 forms × 6 = 18 lines total), not a new component — an inline injection.  
**Routes consuming it:** home (newsletter), contact, shop/commission (3 routes)  
**LOC estimate:** 6 per form (18 total across 3 files)

---

### C-08 · No `EmptyState` component — shop pages with null prices have no fallback UI
**Severity:** LOW-MEDIUM — future-proofing  
**Files:** `shop/woven/page.tsx`, `shop/alcaca/page.tsx`

When all prices are `null`, the current pattern shows "Contact for pricing" in an italic span. If/when the owner provides zero products in a category (e.g., a seasonal woven line is sold out), there's no empty-state component to render. ProductGrid with zero items renders nothing — not even a message.

**Proposed component:** `EmptyState`
```tsx
// components/empty-state.tsx — ~22 LOC
interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: { label: string; href: string }
}
export function EmptyState({ icon = '🦙', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <span className="text-5xl mb-4" aria-hidden>{icon}</span>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      {description && <p className="text-foreground/60 max-w-sm mb-6">{description}</p>}
      {action && (
        <a href={action.href}
          className="inline-flex px-5 py-2 bg-accent text-accent-foreground rounded-lg font-medium">
          {action.label}
        </a>
      )}
    </div>
  )
}
```
**Routes consuming it:** shop/woven, shop/alcaca, shop (index if empty), future `/alpacas` if 0 bios  
**LOC estimate:** 22

---

### C-09 · `Header` has no active-link indicator — current page is visually unmarked
**Severity:** LOW — navigation clarity  
**File:** `components/header.tsx:37-44`

Nav links use a static `text-foreground/70 hover:text-foreground` class. There is no `aria-current="page"` attribute and no visual active state. On long pages where the header remains sticky, the user has no header-level breadcrumb to know where they are. (PageBreadcrumbs exists but is below the fold.)

**Proposed gadget:** Active-link detection in `Header` — inject `usePathname` and add `aria-current` + active style
```tsx
// Add to header.tsx (already 'use client'):
import { usePathname } from 'next/navigation'
// Inside component:
const pathname = usePathname()
// On each nav Link:
className={`text-sm font-medium transition-colors ${
  pathname.startsWith(item.href)
    ? 'text-foreground font-semibold border-b-2 border-accent'
    : 'text-foreground/70 hover:text-foreground'
}`}
aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
```
~8 lines added to an existing 93-line file. No new file needed.  
**Routes consuming it:** all routes (header is global)  
**LOC estimate:** 8 lines added to `header.tsx`

---

### C-10 · `StickyBookingBar` shows on ALL pages — should be hidden on admin/legal pages
**Severity:** LOW — polish  
**File:** `app/[locale]/layout.tsx` (where `StickyBookingBar` is mounted)

`StickyBookingBar` renders on `/privacy`, `/terms`, `/cookies` — legal pages with no tour intent. It also renders on `/adopt` where the CTA should be "Adopt" not "Book tour". Currently there's no suppression mechanism.

**Proposed gadget:** Route-aware hide list in `StickyBookingBar`
```tsx
// Add to sticky-booking-bar.tsx (already 'use client'):
import { usePathname } from 'next/navigation'
const pathname = usePathname()
const SUPPRESS_ON = ['/privacy', '/terms', '/cookies', '/admin']
if (SUPPRESS_ON.some(p => pathname.includes(p))) return null
```
5 lines added to existing 46-line file.  
**Routes consuming it:** all routes (suppression is the feature)  
**LOC estimate:** 5 lines added to `sticky-booking-bar.tsx`

---

## Ranked Top 10 by Leverage

| Rank | Gap | Component | Consumer Routes | Estimated LOC | Why This Rank |
|------|-----|-----------|-----------------|---------------|---------------|
| #1 | C-01 | `PageHero` | 8 routes | 25 | Highest duplication count — 8 inline copies, any design change requires 8 edits |
| #2 | C-02 | `SectionHeader` | 7 routes, 10+ occurrences | 20 | Second-most duplicated pattern; affects every page with sections |
| #3 | C-04 | `BackToTop` | all routes via layout | 22 | Zero LOC to wire (add to layout.tsx once); high mobile UX value |
| #4 | C-05 | `OwnerConfirmBanner` | 2 now, 5+ eventual | 28 | Will spread to every UNMAPPED page; extract before 3rd copy lands |
| #5 | C-03 | `CalendarSkeleton` | 5 routes | 22 | Eliminates CLS on the booking section — the highest-value UI area |
| #6 | C-07 | Inline spinner | 3 forms | 18 total | Form submit feedback gap; found in contact, newsletter, commission |
| #7 | C-09 | Active nav link | all routes | 8 | Accessibility + UX; `aria-current` is a WCAG 2.1 AA requirement |
| #8 | C-06 | `ImagePlaceholder` | 4 routes now | 20 | Unifies 4 different placeholder patterns before images arrive |
| #9 | C-08 | `EmptyState` | 2-4 routes | 22 | Low risk, high polish; also needed for ProductGrid zero-item case |
| #10 | C-10 | Route-suppress StickyBar | 3 legal pages | 5 | Tiny fix; StickyBar on `/privacy` is just wrong |

---

## Differentiation from ep-001

ep-001 found **app-wide infrastructure gaps**: sitemap entry, BASE_URL consolidation, missing error/loading boundaries, XSS in contact route, `<img>` vs `<Image>`. Those are one-file changes or new route-level files.

This run found **component-level extraction opportunities**: patterns that exist but are duplicated inline, missing UI primitives, and micro-interaction gaps (spinner, active nav, back-to-top) that each touch one component file only.

---

## CAN'T DO WITHOUT HELP

1. **Motion preference** — C-04 (`BackToTop`) and any reveal-on-scroll wrapper would benefit from knowing whether the owner prefers subtle (opacity fade only) or energetic (spring bounce) transitions. Right now all interactions use CSS transitions. If animated reveal-on-scroll is wanted, that requires an `IntersectionObserver` wrapper component (~40 LOC) and an owner decision on whether to reach for Framer Motion (adds ~40KB) or stay pure CSS.

2. **Brand voice for empty-state copy** — C-08 (`EmptyState`) needs the owner to confirm the tone for "nothing here yet" messages. The current placeholder uses "Contact for pricing" which is functional but not brand-voiced. Options: "Our flock is resting — check back soon", "Coming soon — [contact link]", or simply listing inquiry. Can't finalize without owner direction.

3. **`/adopt` StickyBar copy** — C-10 suppresses the bar on adopt because "Book Tour" is wrong there. But the right solution might be a custom adopt-specific CTA bar ("Adopt an Alpaca — from €75/month"). That requires the owner to confirm the adopt CTA copy and whether it should appear at all.
