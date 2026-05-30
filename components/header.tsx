'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { BookingButton } from '@/components/booking/button'
import { HeaderSearch } from '@/components/header-search'
import { useParams, usePathname } from 'next/navigation'
import type { Locale } from '@/i18n.config'
import { useLocaleT } from '@/lib/locale-context'

interface NavItem {
  /** Translation key. */
  key: string
  /** English fallback (used when key is missing from a translation file). */
  fallback: string
  /** Path segment after `/${locale}`, e.g. 'tours'. Empty string = home. */
  slug: string
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { key: 'nav.tours', fallback: 'Tours', slug: 'tours' },
  { key: 'nav.alpacas', fallback: 'Alpacas', slug: 'alpacas' },
  { key: 'nav.adopt', fallback: 'Adopt', slug: 'adopt' },
  { key: 'nav.shop', fallback: 'Shop', slug: 'shop' },
  { key: 'nav.about', fallback: 'About', slug: 'about' },
  { key: 'nav.journal', fallback: 'Journal', slug: 'journal' },
  { key: 'nav.contact', fallback: 'Contact', slug: 'contact' },
]

const SHRINK_THRESHOLD_PX = 80

export interface HeaderProps {
  /** Optional logo image URL. If null/undefined, brand name renders as styled text. */
  logoUrl?: string | null
  /** Brand display name. */
  brandName?: string
}

export function Header({ logoUrl = null, brandName = 'Alpacas Ibiza' }: HeaderProps = {}) {
  const params = useParams()
  const pathname = usePathname() || '/'
  const locale = (params.locale as Locale) || 'en'
  const tr = useLocaleT()

  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

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

  // Restore focus to hamburger after drawer closes
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !open) {
      hamburgerRef.current?.focus()
    }
    wasOpen.current = open
  }, [open])

  const closeDrawer = useCallback(() => setOpen(false), [])

  const headerLabel = (key: string, fallback: string) => {
    const value = tr(key, fallback)
    // tr() returns the key itself when no entry + no defaultValue — but we always
    // pass a defaultValue, so this is just a safety net.
    return value && value !== key ? value : fallback
  }

  const bookLabel = headerLabel('nav.bookTour', 'Book a tour')
  const menuLabel = headerLabel('nav.menu', 'Open menu')
  const closeLabel = headerLabel('nav.close', 'Close menu')
  const languageLabel = headerLabel('nav.language', 'Language')

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
          aria-label="Primary"
          className="hidden md:flex items-center gap-1 lg:gap-2"
        >
          {NAV_ITEMS.map((item) => {
            const href = `/${locale}/${item.slug}`
            const isActive = activeSlug === item.slug
            const label = headerLabel(item.key, item.fallback)
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
          })}
        </nav>

        {/* Desktop right cluster */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3 flex-shrink-0">
          <HeaderSearch locale={locale} />
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
            aria-expanded={open}
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
              const label = headerLabel(item.key, item.fallback)
              return (
                <li key={item.slug}>
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
