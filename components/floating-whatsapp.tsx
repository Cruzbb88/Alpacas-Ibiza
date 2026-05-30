'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { trackConversion } from '@/lib/analytics'
import { useLocaleT } from '@/lib/locale-context'
import type { Locale } from '@/i18n.config'

/**
 * Floating WhatsApp quick-chat widget.
 *
 * Two display modes:
 *   1. Collapsed FAB (default) — fixed bottom-right, brand-green, pulse ring on mount.
 *   2. Expanded panel — slide-up card with pre-typed quick-reply pills that
 *      deep-link into wa.me with a templated message.
 *
 * Hidden on /admin* and /api* routes. Hidden on legal pages too (kept from the
 * pre-rebuild behaviour). Mounts after a configurable delay so it doesn't
 * impact LCP. Closed by default; session-dismissal flag is recorded in
 * sessionStorage but only suppresses any future auto-open (we don't auto-open
 * today, so this is forward-compatible plumbing).
 *
 * Backward-compat: original API was `{ e164, brandName, initialMessage? }`.
 * That call site (app/[locale]/layout.tsx) still works unchanged. The new
 * `phoneE164` / `locale` / `showBadge` / `delayMs` props from the rebuild
 * spec are accepted as additional optional props.
 */

// ── Props ──────────────────────────────────────────────────────────────────

interface FloatingWhatsAppProps {
  /** E.164 phone, including leading +. Aliased as `phoneE164` (new spec name). */
  e164?: string | null
  /** New spec name for the phone — alias of `e164`. */
  phoneE164?: string | null
  /** Brand name shown in the panel header. Defaults to "Alpacas Ibiza". */
  brandName?: string
  /** Active locale for i18n. Defaults to 'en'. */
  locale?: Locale
  /** Whether to show the red unread badge. Default true. */
  showBadge?: boolean
  /** Mount delay in ms — defaults to 800. */
  delayMs?: number
  /**
   * Legacy prop kept for backward compatibility with the previous component
   * signature. Currently unused inside the new flow (each quick-reply has
   * its own prefill), but accepted so existing call sites don't break.
   */
  initialMessage?: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const SUPPRESSED_PREFIXES = ['/admin', '/api', '/privacy', '/terms', '/cookies']
const SESSION_KEY = 'whatsapp_widget_collapsed_v1'
const PULSE_DURATION_MS = 3000
const MOBILE_BREAKPOINT_PX = 768

// ── Helpers ────────────────────────────────────────────────────────────────

function stripPlus(e164: string): string {
  return e164.replace(/^\+/, '')
}

/** Format +32475586544 → +32 475 58 65 44 (display only). */
function formatPhoneDisplay(e164: string): string {
  const digits = stripPlus(e164)
  // +32 475 58 65 44 — country code, then groups of 3, 2, 2, 2 for BE mobile.
  // For other formats this is a best-effort: country + groups of 3.
  if (digits.startsWith('32') && digits.length === 11) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`
  }
  // Generic fallback: split into 3-digit groups after the country code.
  const cc = digits.slice(0, 2)
  const rest = digits.slice(2).replace(/(.{3})/g, '$1 ').trim()
  return `+${cc} ${rest}`
}

function buildWaUrl(e164: string, text?: string): string {
  const base = `https://wa.me/${stripPlus(e164)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

// ── Quick-reply config ─────────────────────────────────────────────────────

interface QuickReply {
  id: string
  /** Translation key under `whatsapp.quickReplies` for the button label. */
  labelKey: string
  /** Default English button label. */
  labelDefault: string
  /** Translation key for the prefilled WhatsApp text. */
  textKey: string
  /** Default English prefilled WhatsApp text. */
  textDefault: string
}

function getQuickReplies(brandName: string): QuickReply[] {
  return [
    {
      id: 'bookTour',
      labelKey: 'whatsapp.quickReplies.bookTour',
      labelDefault: 'Book a tour',
      textKey: 'whatsapp.prefill.bookTour',
      textDefault: `Hi! I'd like to book a tour at ${brandName}. Could you tell me the availability for...`,
    },
    {
      id: 'commission',
      labelKey: 'whatsapp.quickReplies.commission',
      labelDefault: 'Custom commission',
      textKey: 'whatsapp.prefill.commission',
      textDefault: `Hi! I'm interested in a custom handwoven piece. Could we discuss the details?`,
    },
    {
      id: 'adopt',
      labelKey: 'whatsapp.quickReplies.adopt',
      labelDefault: 'Adopt an alpaca',
      textKey: 'whatsapp.prefill.adopt',
      textDefault: `Hi! I'd like to learn more about adopting an alpaca.`,
    },
    {
      id: 'directions',
      labelKey: 'whatsapp.quickReplies.directions',
      labelDefault: 'Visit & directions',
      textKey: 'whatsapp.prefill.directions',
      textDefault: `Hi! Could you tell me how to find the farm and your opening hours?`,
    },
    {
      id: 'other',
      labelKey: 'whatsapp.quickReplies.other',
      labelDefault: 'Something else',
      textKey: 'whatsapp.prefill.other',
      textDefault: '',
    },
  ]
}

// ── Inline SVG icons ───────────────────────────────────────────────────────

function WhatsAppLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M16.003 2C8.28 2 2 8.28 2 16.003c0 2.478.648 4.806 1.783 6.82L2 30l7.395-1.742A13.94 13.94 0 0 0 16.003 30C23.72 30 30 23.72 30 16.003 30 8.28 23.72 2 16.003 2zm0 25.5a11.43 11.43 0 0 1-5.835-1.604l-.418-.248-4.394 1.035 1.072-4.284-.272-.44A11.47 11.47 0 0 1 4.5 16.003C4.5 9.656 9.656 4.5 16.003 4.5S27.5 9.656 27.5 16.003 22.344 27.5 16.003 27.5zm6.302-8.613c-.344-.173-2.038-1.006-2.354-1.12-.316-.116-.546-.173-.777.173-.23.346-.893 1.12-1.095 1.35-.2.23-.403.26-.747.086-.344-.173-1.454-.537-2.77-1.71-1.023-.913-1.714-2.04-1.914-2.385-.2-.346-.021-.532.15-.704.155-.155.345-.403.518-.605.172-.2.23-.346.346-.576.115-.23.057-.432-.029-.605-.086-.173-.777-1.874-1.066-2.566-.28-.672-.565-.58-.777-.59l-.663-.012a1.27 1.27 0 0 0-.92.432c-.316.346-1.21 1.18-1.21 2.878s1.238 3.338 1.41 3.567c.173.23 2.436 3.72 5.903 5.215.824.356 1.467.569 1.968.728.827.263 1.58.226 2.174.137.663-.099 2.038-.832 2.326-1.637.287-.806.287-1.497.2-1.64-.086-.145-.315-.23-.663-.404z" />
    </svg>
  )
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export function FloatingWhatsApp({
  e164,
  phoneE164,
  brandName = 'Alpacas Ibiza',
  locale = 'en',
  showBadge = true,
  delayMs = 800,
  // initialMessage kept for back-compat — currently unused by the new flow.
  initialMessage: _initialMessage,
}: FloatingWhatsAppProps) {
  const pathname = usePathname()
  const phone = phoneE164 ?? e164 ?? null

  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [isPulsing, setIsPulsing] = useState(true)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const fabRef = useRef<HTMLButtonElement | null>(null)

  const t = useLocaleT()

  // Mount delay so we don't impact LCP.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onReady = () => {
      const timer = window.setTimeout(() => setMounted(true), delayMs)
      return () => window.clearTimeout(timer)
    }
    // Already loaded? schedule immediately. Otherwise wait for load.
    if (document.readyState === 'complete') {
      const timer = window.setTimeout(() => setMounted(true), delayMs)
      return () => window.clearTimeout(timer)
    }
    window.addEventListener('load', onReady, { once: true })
    return () => window.removeEventListener('load', onReady)
  }, [delayMs])

  // Stop the pulse ring after PULSE_DURATION_MS once mounted.
  useEffect(() => {
    if (!mounted) return
    const timer = window.setTimeout(() => setIsPulsing(false), PULSE_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [mounted])

  // Body scroll-lock on mobile only when the panel is open.
  useEffect(() => {
    if (!open || typeof window === 'undefined') return
    if (window.innerWidth >= MOBILE_BREAKPOINT_PX) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Escape key closes the panel.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Click-outside to close.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if (fabRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const handleClose = useCallback(() => {
    setOpen(false)
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      // Private mode / quota errors — ignore.
    }
  }, [])

  const handleQuickReplyClick = useCallback(() => {
    trackConversion.whatsappClick()
    // Let the anchor's native target="_blank" handle navigation; we just close.
    setOpen(false)
  }, [])

  // ── Route gates ─────────────────────────────────────────────────────────
  if (!phone) return null
  if (SUPPRESSED_PREFIXES.some(seg => pathname?.startsWith(seg) || pathname?.includes(seg))) {
    return null
  }
  if (!mounted) return null

  const quickReplies = getQuickReplies(brandName)
  const fabLabel = t('whatsapp.fab.label', 'Open WhatsApp chat')
  const greeting = t(
    'whatsapp.panel.greeting',
    'Hi! How can we help? Pick a topic to start the chat:',
  )
  const onlineLabel = t('whatsapp.panel.online', 'Typically replies within 1 hour')
  const footerLabel = t(
    'whatsapp.panel.footer',
    `Or message us directly at ${formatPhoneDisplay(phone)}`,
  )
  const closeLabel = t('whatsapp.panel.close', 'Close WhatsApp chat starter')

  return (
    <div
      data-no-print
      className="fixed z-40 bottom-24 right-4 md:bottom-8 md:right-8 animate-in fade-in duration-300"
    >
      {/* ── Expanded panel ────────────────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          id="whatsapp-panel"
          role="dialog"
          aria-modal="false"
          aria-label="WhatsApp chat starter"
          className={`
            absolute bottom-20 right-0
            w-[calc(100vw-2rem)] max-w-sm md:w-96
            origin-bottom-right
            bg-background text-foreground
            rounded-2xl shadow-2xl border border-border
            overflow-hidden
            transition-all duration-200 ease-out
            scale-100 opacity-100
          `}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 text-white"
            style={{ backgroundColor: '#25D366' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                <WhatsAppLogo size={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{brandName}</div>
                <div className="flex items-center gap-1.5 text-xs text-white/90">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-300 ring-2 ring-green-300/40 animate-pulse" />
                  <span className="truncate">{onlineLabel}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label={closeLabel}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:bg-white/15 active:bg-white/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Body — chat-bubble + quick-replies */}
          <div
            className="px-4 py-4 space-y-3 max-h-[60vh] overflow-y-auto"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }}
          >
            {/* Received message bubble */}
            <div className="relative max-w-[85%] bg-card text-card-foreground rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm text-sm leading-snug border border-border/50">
              {greeting}
            </div>

            {/* Quick-reply pills */}
            <ul className="flex flex-col gap-2 pt-1" role="list">
              {quickReplies.map(qr => {
                const label = t(qr.labelKey, qr.labelDefault)
                const prefill = t(qr.textKey, qr.textDefault)
                const href = buildWaUrl(phone, prefill || undefined)
                return (
                  <li key={qr.id}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-analytics-event="whatsapp_quickreply_click"
                      data-quickreply-id={qr.id}
                      onClick={handleQuickReplyClick}
                      aria-label={`${label} — ${t('whatsapp.fab.label', 'Open WhatsApp chat')}`}
                      className="
                        group flex items-center justify-between gap-2
                        w-full px-4 py-2.5
                        rounded-full
                        bg-card hover:bg-accent hover:text-accent-foreground
                        text-sm font-medium text-foreground
                        border border-border
                        shadow-sm hover:shadow
                        transition-all duration-150
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                      "
                    >
                      <span className="truncate text-left">{label}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                      >
                        <path d="M5 12h14" />
                        <path d="M13 5l7 7-7 7" />
                      </svg>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border bg-card/50 text-[11px] text-foreground/60 text-center">
            {footerLabel}
          </div>
        </div>
      )}

      {/* ── FAB ──────────────────────────────────────────────────────── */}
      <button
        ref={fabRef}
        type="button"
        aria-label={fabLabel}
        aria-expanded={open}
        aria-controls="whatsapp-panel"
        onClick={() => {
          if (open) {
            handleClose()
          } else {
            setOpen(true)
            setIsPulsing(false)
            trackConversion.whatsappClick()
          }
        }}
        className={`
          relative flex items-center justify-center
          w-14 h-14 md:w-16 md:h-16
          rounded-full shadow-2xl
          text-white
          transition-transform duration-200 ease-out
          hover:scale-105 active:scale-95
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40
          ${isPulsing && !open
            ? "before:content-[''] before:absolute before:inset-0 before:rounded-full before:bg-[#25D366]/40 before:animate-ping"
            : ''}
        `}
        style={{ backgroundColor: '#25D366' }}
      >
        <span className="relative z-10">
          {open ? <CloseIcon size={26} /> : <WhatsAppLogo size={30} className="text-white" />}
        </span>

        {/* Unread badge — decorative */}
        {showBadge && !open && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full ring-2 ring-background animate-pulse"
          />
        )}
      </button>
    </div>
  )
}
