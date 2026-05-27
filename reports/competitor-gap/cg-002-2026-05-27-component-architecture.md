# CG-002 — Component Architecture: Competitor Reference vs Alpaca
**Date:** 2026-05-27 | **Scope:** `components/` directory organization patterns

---

## 1. Reference Table

| Project | Folder org | Naming | CVA / variants | Composition pattern | Server/client split | Co-location | Primitives layer |
|---|---|---|---|---|---|---|---|
| **Cal.com** | Feature-folder hybrid (`booking/`, `auth/`, `settings/`, `ui/`) | Folders: kebab-case; Files: PascalCase `.tsx` | CVA confirmed in `@calcom/ui` package; feature components use `cn()` | Slot/asChild on primitives; feature components use prop interfaces | No suffix convention; `use client` per-file at declaration point | No co-located styles/stories in web app; stories live in separate Storybook package | Dedicated `ui/` subtree in app + `@calcom/ui` monorepo package |
| **Vercel commerce** | Feature-folder + flat root hybrid (`cart/`, `product/`, `grid/`, `layout/` + root atoms) | All kebab-case `.tsx`; no index.tsx barrel files | No CVA evidence; Tailwind classes inline | Composition via sub-components (product → `AddToCart`, `Price`, `Prose`, `VariantSelector`) | No explicit suffix; server components have no directive; client components declare `'use client'` inline | No co-located styles; no stories in repo | No separate primitives layer; root flat files ARE the atoms |
| **Documenso** | Hybrid-flat primitives (`packages/ui/primitives/`): ~50 flat files + feature subdirs (`document-flow/`, `form/`, `signature-pad/`, `template-flow/`) | All kebab-case `.tsx`; no index.tsx per component | CVA confirmed (`buttonVariants` with `loading` prop extension); `cn()` throughout | Slot/asChild + `loading` state on Button; feature flows use compound components | `use client` per-file; no suffix convention | No co-located styles; hooks co-located (`use-toast.ts` alongside `toast.tsx`) | Entire `packages/ui/primitives/` is the primitives layer — monorepo-separated |
| **Dub.co** | Feature/domain-folder (`links/`, `analytics/`, `modals/`, `auth/`, `account/` + `shared/`) | All kebab-case folders; kebab-case `.tsx` files; no index.tsx | CVA evident from `colors.ts` (design tokens) + `shared/` reuse patterns; repo-wide `cn()` | Shared component folder for cross-domain atoms; modals as composable units | `use client` per-file; no suffix convention | No co-located styles or stories visible; hooks in feature folders | `shared/` folder is the in-app primitives layer |
| **Twenty** | Semantic-domain package (`twenty-ui/src`): `display/`, `feedback/`, `input/`, `navigation/`, `layout/`, `accessibility/`, `theme/`, `utilities/`, `testing/` | kebab-case folders; `.tsx` files (inferred) | Not confirmed from listing; styled-components/CSS-in-JS more likely given React Native targets | Flexible entry points (`index.ts` + `individual-entry.ts`) suggest tree-shakeable atomic exports | Client-only (no RSC in the UI package scope) | `testing/` folder co-located in package; theme split across `theme/` + `theme-constants/` | Entire `twenty-ui` package is the primitives layer |

---

## 2. Alpaca Current State

**Structure:** Hybrid — 54 root-level flat `.tsx` files + `ui/` (shadcn, 38 files) + `layout/` (4 files + barrel `index.ts`). Three tiers in practice:

| Tier | Location | Count | Pattern |
|---|---|---|---|
| shadcn primitives | `components/ui/` | 38 files | CVA + Slot/asChild (button, badge, etc.) |
| Layout wrappers | `components/layout/` | 4 files | Manual lookup-maps (`BG`, `WIDTH`, `PAD` records) instead of CVA |
| Feature components | `components/*.tsx` | 54 files | No consistent variant system; inline Tailwind; `'use client'` on 37/54 |

**Naming:** All kebab-case `.tsx`. No index.tsx barrels except `layout/index.ts`. Consistent with industry.

**Server/client split:** Implicit — directive present or absent. No suffix convention, no dedicated subdirectory. 37/54 root components are client, 17/54 are server. No visible grouping by server/client in the flat root.

**CVA coverage:** Confined to `ui/` (shadcn-generated). Feature and layout components use manual Record lookups (`PageSection`) or raw inline Tailwind strings (`hero.tsx`'s gradient overlay). CVA is not used outside `ui/`.

**Composition:** `ui/` uses Slot/asChild. Feature components use prop objects (e.g., `cta?: {label, href}` on `Hero`) — contained and not prop-explosive. No slot-based composition in feature layer.

**Co-location:** Zero. No stories, no per-component type files, no CSS modules. Types are inline interfaces in the same file.

---

## 3. Gap Analysis

### Gap 1 — CVA outside `ui/` (shared by Cal, Documenso, Dub)
All three use CVA or equivalent lookup-map patterns on feature-layer components with multiple visual states. Alpaca's `layout/page-section.tsx` already uses manual `Record<Bg, string>` maps — this IS the right logic, but it's not CVA syntax. The real gap: components like `cancellation-badge.tsx` have a `variant` prop but likely implement it with an inline ternary. Inconsistency across the feature layer makes adding new variants fragile.

**Cost:** Low now (single-tenant site, ~54 feature components). Will compound if a second tenant requires visual theme overrides.

### Gap 2 — Server/client split is invisible (shared by Cal, Vercel commerce, Documenso, Dub)
Every reference project has the same implicit convention (directive present/absent) but alpaca is outlier in proportion: 37/54 (69%) root feature components carry `'use client'`, meaning most render on the client even when they only do static display. Several are likely server-renderable but were defaulted to client out of caution. No grouping, no audit trail.

**Cost:** Real — RSC rendering benefits (no JS for static sections) are being forfeited on at least some display-only components (`press-logos`, `awards-badges`, `testimonial-grid` are candidates). Vercel commerce explicitly keeps product pages server-rendered for LCP; alpaca does the opposite.

### Gap 3 — No feature-folder grouping for related components (shared by Cal, Dub, Twenty)
Cal groups `booking/`, Dub groups `links/`+`modals/`, Twenty groups `feedback/`+`input/`. Alpaca has `header.tsx`, `footer.tsx`, `hero.tsx`, `booking-section.tsx`, `booking-button.tsx`, `book-tour-link.tsx`, `sticky-booking-bar.tsx` all flat at root. Booking-related components alone number 4–5 files. At 54 flat files the root is already unwieldy.

**Cost:** Discoverability. "Where does the booking flow start?" requires scanning 54 files. Would become a real blocker past ~70 flat files or with a second developer.

---

## 4. What Alpaca Does That Competitors Don't

**Explicit `layout/` barrel with semantic layout primitives.** `PageSection` with typed `Bg | Width | Padding` enums + `layout/index.ts` barrel is more structured than anything in Vercel commerce (which has a `layout/` folder but no typed wrapper). Documenso and Dub have no equivalent layout abstraction layer. This is genuinely ahead of the reference set for a content-site use case.

---

## 5. Refactor Verdict

**Partial refactor — 2 targeted changes, not a full restructuring.**

| Change | Priority | Effort | Rationale |
|---|---|---|---|
| Audit `'use client'` on display-only components; remove directive where no hooks/events present | High | Low (1–2h, grep + read each) | Direct LCP/TTI benefit; aligns with Vercel commerce pattern; zero structural change |
| Group flat components into `booking/`, `testimonials/`, `journal/`, `forms/` subdirs | Medium | Low-medium (move files + update imports) | Root is at 54 files and growing; grouping mirrors Cal + Dub; doesn't change any component internals |
| Extend CVA to layout wrappers + variant-bearing feature components | Low | Medium | `PageSection` Record maps already work; CVA adds IDE autocomplete + `VariantProps<>` type export. Worth doing when the next visual variant is added, not before |

**Do not do:** Full atomic-design restructure (atoms/molecules/organisms). No reference project uses it; it adds cognitive overhead without benefit at this codebase size.

---

## Composite Gap Score

| Dimension | Score (0 = parity, -1 = behind, +1 = ahead) |
|---|---|
| Folder organization | -1 (flat root growing past comfortable threshold) |
| Naming conventions | 0 (kebab-case .tsx matches industry) |
| CVA / variant system | -1 (confined to ui/ only) |
| Composition pattern | 0 (prop interfaces are proportionate; not prop-explosive) |
| Server/client split | -1 (69% client; likely over-declared) |
| Co-location | 0 (no project co-locates stories; hooks co-location present via use-toast.ts) |
| Primitives layer | +1 (layout/ barrel with typed wrappers is ahead of reference set) |

**Net: -2 / 7 dimensions.** Addressable with targeted changes; no full refactor needed.
