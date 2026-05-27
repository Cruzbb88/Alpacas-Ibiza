'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useParams } from 'next/navigation'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { BookTourLink } from '@/components/booking/book-tour-link'

const SESSION_KEY = 'sticky-top-bar-dismissed'

function readSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function writeSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // Safari private-mode throws — silently swallow
  }
}

interface StickyTopBarProps {
  bookHref?: string
}

export function StickyTopBar({ bookHref }: StickyTopBarProps) {
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid SSR flash
  const [scrolled, setScrolled] = useState(false)
  const params = useParams()
  const locale = (params?.locale as Locale) || 'en'
  const tr = t(locale)

  // Hydrate from sessionStorage after mount
  useEffect(() => {
    if (!readSession()) {
      setDismissed(false)
    }
  }, [])

  // Scroll listener — debounced via requestAnimationFrame
  useEffect(() => {
    if (dismissed) return
    let raf: number
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > window.innerHeight * 0.9)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [dismissed])

  const handleDismiss = () => {
    writeSession()
    setDismissed(true)
  }

  if (dismissed) return null

  const message = scrolled
    ? tr('stickyBar.messageScrolled')
    : tr('stickyBar.messageDefault')

  return (
    <div
      data-no-print
      className={[
        'hidden md:flex items-center justify-center gap-4',
        'sticky top-0 inset-x-0 z-50',
        'h-9 px-4',
        'bg-primary text-primary-foreground',
        'text-xs font-medium',
        'transition-all duration-300',
      ].join(' ')}
      role="banner"
      aria-label="Site announcement"
    >
      {/* Message — centered */}
      <span className="flex-1 text-center leading-none truncate">
        {message}
      </span>

      {/* CTA — only when bookHref is set */}
      {bookHref ? (
        <BookTourLink
          href={bookHref}
          className="shrink-0 underline underline-offset-2 hover:no-underline font-semibold whitespace-nowrap"
          target="_blank"
          rel="noopener noreferrer"
        >
          {tr('stickyBar.cta')} →
        </BookTourLink>
      ) : null}

      {/* Dismiss */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={tr('stickyBar.dismiss')}
        className="shrink-0 ml-2 p-1 rounded hover:bg-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50 transition-colors"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  )
}
