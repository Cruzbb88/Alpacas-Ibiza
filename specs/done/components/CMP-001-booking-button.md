---
id: "CMP-001"
title: "BookingButton — universal FareHarbor CTA"
status: done (backfilled)
captured: 2026-05-27
---

## Purpose
Universal booking CTA that resolves a FareHarbor URL from a product slug, fires analytics, and renders a shadcn `Button` wrapping an `<a>`.

## Props
```ts
interface BookingButtonProps extends Omit<ButtonProps, 'asChild'> {
  product?: FareHarborProduct   // defaults 'general'
  label?: string                // defaults 'Book now'
  analyticsLabel?: string
  anchorProps?: React.AnchorHTMLAttributes<HTMLAnchorElement>
}
```

## Consumers
- `components/tour-comparison.tsx`
- `app/[locale]/weddings/page.tsx`
- Any page that places a booking CTA (DROP_IN_GUIDE.md lists drop-in points)

## Failsafe behavior
Unknown slug OR unset `FAREHARBOR_ITEM_*` env var → `getProductBookingUrl()` returns main FareHarbor calendar URL. CTA is never inert. Analytics errors swallowed (try/catch). CLAUDE.md failsafe row: "BookingButton / getProductBookingUrl fail-open".

## Acceptance criteria
- [ ] Product slug `'general'` always resolves to a non-empty URL
- [ ] Every known product slug resolves without throwing
- [ ] Analytics failure does not block navigation
- [ ] Renders accessible `<a>` inside shadcn `Button`

## Owner-input dependencies
- `FAREHARBOR_ITEM_<SLUG>` env vars — owner supplies from FareHarbor admin panel

**Backfill note.** Spec written 2026-05-27 after component shipped. Component is in production. Spec captures behavior as-built.
