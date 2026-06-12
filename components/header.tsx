'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { BookingButton } from '@/components/booking/button'
import { SiteSearch } from '@/components/search/site-search'
import { useParams, usePathname } from 'next/navigation'
import type { Locale } from '@/i18n.config'
import { useTranslations } from 'next-intl'

interface SubNavItem {
  /** Translation key for the sub-page label. */
  key: string
  /** English fallback. */
  fallback: string
  /** Full slug after the locale prefix, e.g. 'experiences/corporate-team-building'. */
  slug: string
}

interface NavItem {
  /** Translation key. */
  key: string
  /** English fallback (used when key is missing from a translation file). */
  fallback: string
  /** Path segment after `/${locale}`, e.g. 'tours'. Empty string = home. */
  slug: string
  /**
   * Optional "See all <category>" i18n key for the mobile drawer.
   * When present, a sub-link to the category root is injected below the
   * category header in the drawer (Baymard 2025 — only 24% of sites do this).
   */
  seeAllKey?: string
  /** English fallback for the seeAll link. */
  seeAllFallback?: string
  /**
   * Optional sub-pages for the desktop mega-menu.
   * When present, the top-level link becomes a mega-menu trigger on desktop.
   * Mobile drawer renders sub-items beneath the category link.
   * Only populated for categories that have real, verified sub-page routes.
   */
  subItems?: ReadonlyArray<SubNavItem>
}

/**
 * Env-gate flags for adopt-tier nav items.
 * Read server-side in layout.tsx and passed as props — never read
 * process.env directly in this client component.
 * Baymard IA-depth rule: all support tiers live as SIBLINGS under one Adopt
 * parent (Baymard 2025, pattern #5 — 82% non-compliance industry norm).
 */
export interface AdoptNavFlags {
  /** Show /skein sub-item (SKEIN_CALLOUT_LIVE=true) */
  skeinLive: boolean
  /** Show /membership sub-item (MEMBERSHIP_LIVE=true) */
  membershipLive: boolean
  /** Show /herd-family sub-item (HERD_FAMILY_LIVE=true) */
  herdFamilyLive: boolean
}

/**
 * Build the adopt nav item. Passes only the flags that are live as subItems.
 * When no flags are live the adopt item renders as a flat link (no mega-menu).
 * Baymard IA depth rule: always present /adopt + /redeem-voucher;
 * env-gated siblings added when their feature is live.
 */
function buildAdoptNavItem(flags: AdoptNavFlags): NavItem {
  const subItems: SubNavItem[] = [
    // /redeem-voucher is always present — no env-gate required
    { key: 'nav.redeemVoucher', fallback: 'Redeem a Voucher', slug: 'redeem-voucher' },
  ]
  if (flags.skeinLive) {
    subItems.unshift({ key: 'nav.skein', fallback: 'Skein Sponsorship', slug: 'skein' })
  }
  if (flags.membershipLive) {
    subItems.unshift({ key: 'nav.membership', fallback: 'Annual Farm Pass', slug: 'membership' })
  }
  if (flags.herdFamilyLive) {
    subItems.unshift({ key: 'nav.herdFamily', fallback: 'Herd Family', slug: 'herd-family' })
  }
  return {
    key: 'nav.adopt',
    fallback: 'Adopt',
    slug: 'adopt',
    seeAllKey: 'nav.seeAllAdopt',
    seeAllFallback: 'See all adoption options',
    // Only attach subItems (enabling mega-menu) when at least one env-gated
    // sibling is live. With zero env flags set, /adopt renders as a flat link
    // (fail-quiet — no orphan mega-menu with a single "Redeem" entry).
    subItems: subItems.length > 1 ? subItems : undefined,
  }
}

const SHRINK_THRESHOLD_PX = 80

export interface HeaderProps {
  /** Optional logo image URL. If null/undefined, brand name renders as styled text. */
  logoUrl?: string | null
  /** Brand display name. */
  brandName?: string
  /**
   * Env-gate flags for adopt-tier nav grouping.
   * Passed from the server layout so this client component never reads process.env.
   * Defaults to all-off (flat /adopt link) when not provided.
   */
  adoptFlags?: AdoptNavFlags
}

export function Header({ logoUrl = null, brandName = 'Alpacas Ibiza', adoptFlags }: HeaderProps = {}) {
  const params = useParams()
  const pathname = usePathname() || '/'
  const locale = (params.locale as Locale) || 'en'
  const tr = useTranslations()

  // Build the adopt nav item from server-passed env flags.
  // Placed here (inside render) so flags can be reactive if ever passed as state,
  // but memoisation is not needed — this is a fast array construction.
  const resolvedFlags: AdoptNavFlags = adoptFlags ?? { skeinLive: false, membershipLive: false, herdFamilyLive: false }
  const NAV_ITEMS: ReadonlyArray<NavItem> = [
    { key: 'nav.tours', fallback: 'Tours', slug: 'tours', seeAllKey: 'nav.seeAllTours', seeAllFallback: 'See all tours' },
    {
      key: 'nav.experiences',
      fallback: 'Experiences',
      slug: 'experiences',
      seeAllKey: 'nav.seeAllExperiences',
      seeAllFallback: 'See all experiences',
      subItems: [
        { key: 'nav.experiencesCorporate', fallback: 'Corporate Team Building', slug: 'experiences/corporate-team-building' },
        { key: 'nav.experiencesFamilyFarm', fallback: 'Family Farm Days', slug: 'experiences/family-farm-days' },
        { key: 'nav.experiencesRomanticSunset', fallback: 'Romantic Sunset', slug: 'experiences/romantic-sunset' },
      ],
    },
    { key: 'nav.visit', fallback: 'Visit', slug: 'visit' },
    {
      key: 'nav.alpacas',
      fallback: 'Alpacas',
      slug: 'alpacas',
      subItems: [
        { key: 'nav.herdDiary', fallback: 'Herd Diary', slug: 'herd-diary' },
      ],
    },
    buildAdoptNavItem(resolvedFlags),
    { key: 'nav.weaving', fallback: 'Weaving', slug: 'weaving' },
    {
      key: 'nav.shop',
      fallback: 'Shop',
      slug: 'shop',
      seeAllKey: 'nav.seeAllShop',
      seeAllFallback: 'See all shop products',
      subItems: [
        { key: 'nav.shopAlcaca', fallback: 'Alcaca', slug: 'shop/alcaca' },
        { key: 'nav.shopWoven', fallback: 'Woven Collection', slug: 'shop/woven' },
        { key: 'nav.shopCommission', fallback: 'Custom Commission', slug: 'shop/commission' },
      ],
    },
    { key: 'nav.gifts', fallback: 'Gifts', slug: 'gifts' },
    { key: 'nav.about', fallback: 'About', slug: 'about' },
    { key: 'nav.journal', fallback: 'Journal', slug: 'journal' },
    { key: 'nav.contact', fallback: 'Contact', slug: 'contact' },
  ]

  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  /** Slug of the currently open mega-menu panel, or null if none. */
  const [megaOpen, setMegaOpen] = useState<string | null>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const megaMenuRef = useRef<HTMLDivElement>(null)
  /** Slugs of mobile-expanded categories (accordion). */
  const [mobileExpanded, setMobileExpanded] = useState<Set<string>>(new Set())

  // Strip leading /${locale} from pathname to compute active slug
  const localePrefix = `/${locale}`
  const subPath = pathname.startsWith(localePrefix) ? pathname.slice(localePrefix.length) : pathname
  const activeSlug = subPath.replace(/^\/+/, '').split('/')[0] || ''

  // Shrink-on-scroll via rAF-throttled passive scroll listener
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > SHRINK_THRESHOLD_PX)
        ticking = false
      })
    }
    // Sync initial state (handles refresh mid-scroll)
    setScrolled(window.scrollY > SHRINK_THRESHOLD_PX)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Body scroll lock + Escape close + focus management when drawer is open
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus to the first interactive element inside the drawer
    const focusTimer = window.setTimeout(() => firstLinkRef.current?.focus(), 50)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      if (e.key !== 'Tab') return
      // Focus trap — cycle Tab within drawer
      const root = drawerRef.current
      if (!root) return
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(focusTimer)
    }
  }, [open])

  // Close drawer on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Close mega-menu on route change
  useEffect(() => {
    setMegaOpen(null)
  }, [pathname])

  // Escape closes mega-menu on desktop
  useEffect(() => {
    if (!megaOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMegaOpen(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [megaOpen])

  // Click-outside closes mega-menu
  useEffect(() => {
    if (!megaOpen) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (megaMenuRef.current && !megaMenuRef.current.contains(target)) {
        setMegaOpen(null)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [megaOpen])

  // Restore focus to hamburger after drawer closes
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !open) {
      hamburgerRef.current?.focus()
    }
    wasOpen.current = open
  }, [open])

  const closeDrawer = useCallback(() => setOpen(false), [])

  const headerLabel = (key: Parameters<typeof tr>[0], fallback: string) => {
    const value = tr(key)
    // tr() returns the key itself when no entry — use fallback in that case.
    return value && value !== key ? value : fallback
  }

  const bookLabel = headerLabel('nav.bookTour', 'Book a tour')
  const menuLabel = headerLabel('nav.menu', 'Open menu')
  const closeLabel = headerLabel('nav.close', 'Close menu')
  const languageLabel = headerLabel('nav.language', 'Language')

  const toggleMobileExpand = (slug: string) => {
    setMobileExpanded(prev => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
      }
      return next
    })
  }

  return (
    <header
      role="banner"
      className={[
        'sticky top-0 z-40 bg-background/95 backdrop-blur-md',
        'supports-[backdrop-filter]:bg-background/80',
        'transition-[padding,box-shadow,border-color] duration-200 ease-out',
        scrolled ? 'border-b border-border shadow-sm' : 'border-b border-transparent',
      ].join(' ')}
    >
      <div
        className={[
          'mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6',
          'transition-[padding] duration-200 ease-out',
          scrolled ? 'py-2' : 'py-4',
        ].join(' ')}
      >
        {/* Brand / Logo */}
        <Link
          href={`/${locale}`}
          aria-label={brandName}
          className="flex items-center gap-2 flex-shrink-0"
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={brandName}
              width={140}
              height={40}
              priority
              className={[
                'h-auto w-auto transition-[max-height] duration-200 ease-out',
                scrolled ? 'max-h-8' : 'max-h-10',
              ].join(' ')}
            />
          ) : (
            <span
              className={[
                'font-display font-bold text-primary leading-none tracking-tight',
                'transition-[font-size] duration-200 ease-out',
                scrolled ? 'text-lg md:text-xl' : 'text-xl md:text-2xl',
              ].join(' ')}
            >
              {brandName}
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav
          ref={megaMenuRef}
          aria-label="Primary"
          className="hidden md:flex items-center gap-1 lg:gap-2"
        >
          {NAV_ITEMS.map((item) => {
            const href = `/${locale}/${item.slug}`
            const isActive = activeSlug === item.slug
            const label = headerLabel(item.key as Parameters<typeof tr>[0], item.fallback)
            const hasMega = item.subItems && item.subItems.length > 0
            const isMegaOpen = megaOpen === item.slug

            if (!hasMega) {
              return (
                <Link
                  key={item.slug}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'relative px-2 py-1 text-sm font-medium transition-colors',
                    'border-b-2',
                    isActive
                      ? 'text-accent border-accent'
                      : 'text-foreground/80 border-transparent hover:text-accent',
                  ].join(' ')}
                >
                  {label}
                </Link>
              )
            }

            // Mega-menu trigger
            return (
              // Mouse handlers on the wrapper — covers both trigger and panel so
              // the 4px gap between top-full mt-1 doesn't close the menu mid-hover.
              <div
                key={item.slug}
                className="relative"
                onMouseEnter={() => setMegaOpen(item.slug)}
                onMouseLeave={() => setMegaOpen(null)}
              >
                {/* Fix 1: trigger is a navigating <Link> (Enter → category root).
                    Fix 2: aria-current is now on a link element (ARIA-correct).
                    Hover / focus still opens the panel via onMouseEnter / onFocus. */}
                <Link
                  href={href}
                  aria-haspopup="true"
                  aria-expanded={isMegaOpen ? 'true' : 'false'}
                  aria-controls={`mega-${item.slug}`}
                  aria-current={isActive ? 'page' : undefined}
                  onFocus={() => setMegaOpen(item.slug)}
                  onBlur={(e) => {
                    // Close only when focus leaves the nav item entirely (trigger + panel).
                    const panel = document.getElementById(`mega-${item.slug}`)
                    if (!panel?.contains(e.relatedTarget as Node | null)) {
                      setMegaOpen(null)
                    }
                  }}
                  onClick={() => setMegaOpen(isMegaOpen ? null : item.slug)}
                  className={[
                    'relative flex items-center gap-0.5 px-2 py-1 text-sm font-medium transition-colors',
                    'border-b-2',
                    isActive || isMegaOpen
                      ? 'text-accent border-accent'
                      : 'text-foreground/80 border-transparent hover:text-accent',
                  ].join(' ')}
                >
                  {label}
                  <ChevronDown
                    className={[
                      'h-3.5 w-3.5 transition-transform duration-150',
                      isMegaOpen ? 'rotate-180' : '',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                </Link>

                {/* Mega-menu panel — Fix 3 (Option A): always in DOM.
                    `inert` + `aria-hidden` remove it from tab order and AT when closed.
                    Visual hide via opacity/pointer-events; CSS transition for open/close. */}
                <div
                  id={`mega-${item.slug}`}
                  role="menu"
                  inert={!isMegaOpen ? true : undefined}
                  aria-hidden={!isMegaOpen}
                  className={[
                    'absolute left-0 top-full mt-1 z-50',
                    'min-w-[14rem] rounded-md border border-border bg-card shadow-lg',
                    'transition-all duration-150 ease-out origin-top',
                    isMegaOpen
                      ? 'opacity-100 scale-y-100 pointer-events-auto'
                      : 'opacity-0 scale-y-95 pointer-events-none',
                  ].join(' ')}
                >
                  {/* Sub-page links */}
                  <ul className="py-1.5 px-1.5 flex flex-col gap-0.5" role="none">
                    {item.subItems!.map((sub) => {
                      const subHref = `/${locale}/${sub.slug}`
                      const subLabel = headerLabel(sub.key as Parameters<typeof tr>[0], sub.fallback)
                      const isSubActive = pathname.startsWith(subHref)
                      return (
                        <li key={sub.slug} role="none">
                          <Link
                            href={subHref}
                            role="menuitem"
                            aria-current={isSubActive ? 'page' : undefined}
                            onClick={() => setMegaOpen(null)}
                            className={[
                              'block rounded px-3 py-2 text-sm transition-colors',
                              isSubActive
                                ? 'bg-accent/10 text-accent font-medium'
                                : 'text-foreground/70 hover:bg-muted hover:text-accent',
                            ].join(' ')}
                          >
                            {subLabel}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>

                  {/* "See all" divider link */}
                  {item.seeAllKey && (
                    <div className="border-t border-border px-1.5 pb-1.5 pt-1">
                      <Link
                        href={href}
                        role="menuitem"
                        onClick={() => setMegaOpen(null)}
                        className="block rounded px-3 py-2 text-xs font-medium text-primary/70 hover:text-primary transition-colors"
                      >
                        {headerLabel(item.seeAllKey as Parameters<typeof tr>[0], item.seeAllFallback ?? `See all ${item.fallback.toLowerCase()}`)} →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Desktop right cluster */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3 flex-shrink-0">
          <SiteSearch locale={locale} />
          <LanguageSwitcher />
          <BookingButton
            product="general"
            label={bookLabel}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          />
        </div>

        {/* Mobile right cluster */}
        <div className="flex md:hidden items-center gap-2">
          <BookingButton
            product="general"
            label={headerLabel('nav.book', 'Book')}
            size="sm"
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          />
          <Button
            ref={hamburgerRef}
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label={menuLabel}
            aria-expanded={open ? 'true' : 'false'}
            aria-controls="mobile-nav"
            className="text-foreground"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Mobile drawer + backdrop */}
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={closeDrawer}
        className={[
          'md:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ease-out',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Drawer */}
      <div
        id="mobile-nav"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className={[
          'md:hidden fixed top-0 right-0 z-50 h-[100dvh] w-[85vw] max-w-sm',
          'bg-background border-l border-border shadow-2xl',
          'flex flex-col',
          'transition-transform duration-[250ms] ease-out will-change-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <span className="font-display font-bold text-lg text-primary">{brandName}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeDrawer}
            aria-label={closeLabel}
            className="text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Drawer nav links */}
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item, idx) => {
              const href = `/${locale}/${item.slug}`
              const isActive = activeSlug === item.slug
              const label = headerLabel(item.key as Parameters<typeof tr>[0], item.fallback)
              const seeAllLabel = item.seeAllKey
                ? headerLabel(item.seeAllKey as Parameters<typeof tr>[0], item.seeAllFallback ?? `See all ${item.fallback.toLowerCase()}`)
                : null
              const hasMega = item.subItems && item.subItems.length > 0
              const isExpanded = mobileExpanded.has(item.slug)

              return (
                <li key={item.slug}>
                  {hasMega ? (
                    /* Category with sub-pages: show expand toggle + category link */
                    <>
                      <div className="flex items-center">
                        <Link
                          ref={idx === 0 ? firstLinkRef : undefined}
                          href={href}
                          onClick={closeDrawer}
                          aria-current={isActive ? 'page' : undefined}
                          className={[
                            'flex-1 rounded-md px-3 py-3 text-base font-medium transition-colors',
                            isActive
                              ? 'bg-accent/10 text-accent'
                              : 'text-foreground/80 hover:bg-muted hover:text-accent',
                          ].join(' ')}
                        >
                          {label}
                        </Link>
                        <button
                          type="button"
                          aria-expanded={isExpanded ? 'true' : 'false'}
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${label} sub-pages`}
                          onClick={() => toggleMobileExpand(item.slug)}
                          className="flex-shrink-0 rounded-md p-3 text-foreground/60 hover:text-accent transition-colors"
                        >
                          <ChevronDown
                            className={[
                              'h-4 w-4 transition-transform duration-150',
                              isExpanded ? 'rotate-180' : '',
                            ].join(' ')}
                            aria-hidden="true"
                          />
                        </button>
                      </div>

                      {/* Sub-page list (accordion) */}
                      {isExpanded && (
                        <ul className="ml-3 mt-0.5 flex flex-col gap-0.5">
                          {item.subItems!.map((sub) => {
                            const subHref = `/${locale}/${sub.slug}`
                            const subLabel = headerLabel(sub.key as Parameters<typeof tr>[0], sub.fallback)
                            const isSubActive = pathname.startsWith(subHref)
                            return (
                              <li key={sub.slug}>
                                <Link
                                  href={subHref}
                                  onClick={closeDrawer}
                                  aria-current={isSubActive ? 'page' : undefined}
                                  className={[
                                    'block rounded-md px-3 py-2 text-sm font-normal transition-colors',
                                    isSubActive
                                      ? 'bg-accent/10 text-accent'
                                      : 'text-foreground/70 hover:bg-muted hover:text-accent',
                                  ].join(' ')}
                                >
                                  {subLabel}
                                </Link>
                              </li>
                            )
                          })}
                          {/* "See all" link at bottom of sub-list */}
                          {seeAllLabel && (
                            <li>
                              <Link
                                href={href}
                                onClick={closeDrawer}
                                className="block rounded-md px-3 py-1.5 text-sm font-normal text-primary/80 hover:text-primary transition-colors"
                              >
                                {seeAllLabel} →
                              </Link>
                            </li>
                          )}
                        </ul>
                      )}
                    </>
                  ) : (
                    /* Flat item (no sub-pages) */
                    <>
                      <Link
                        ref={idx === 0 ? firstLinkRef : undefined}
                        href={href}
                        onClick={closeDrawer}
                        aria-current={isActive ? 'page' : undefined}
                        className={[
                          'block rounded-md px-3 py-3 text-base font-medium transition-colors',
                          isActive
                            ? 'bg-accent/10 text-accent'
                            : 'text-foreground/80 hover:bg-muted hover:text-accent',
                        ].join(' ')}
                      >
                        {label}
                      </Link>
                      {/* "See all <category>" — injected for categories with sub-pages.
                          Baymard 2025: only 24% of sites do this; bare category names
                          are not perceived as tappable on mobile. */}
                      {seeAllLabel && (
                        <Link
                          href={href}
                          onClick={closeDrawer}
                          className="block rounded-md px-5 py-1.5 text-sm font-normal text-primary/80 hover:text-primary transition-colors"
                        >
                          {seeAllLabel} →
                        </Link>
                      )}
                    </>
                  )}
                </li>
              )
            })}
          </ul>

          {/* Language switcher */}
          <div className="mt-6 border-t border-border pt-4 px-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60 mb-2">
              {languageLabel}
            </p>
            <LanguageSwitcher />
          </div>
        </nav>

        {/* Drawer footer CTA */}
        <div className="border-t border-border p-4">
          <BookingButton
            product="general"
            label={bookLabel}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            anchorProps={{ onClick: closeDrawer }}
          />
        </div>
      </div>
    </header>
  )
}
