'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackConversion } from '@/lib/analytics'

interface FloatingWhatsAppProps {
  e164: string | null
  brandName: string
  initialMessage?: string
}

/** Routes that must never show the floating button (legal / compliance pages). */
const SUPPRESSED_SEGMENTS = ['/privacy', '/terms', '/cookies', '/admin']

function stripPlus(e164: string): string {
  return e164.replace(/^\+/, '')
}

export function FloatingWhatsApp({
  e164,
  brandName,
  initialMessage = `Hi! I have a question about ${brandName}.`,
}: FloatingWhatsAppProps) {
  const pathname = usePathname()
  const [isPulsing, setIsPulsing] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsPulsing(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  // Fail-quiet: no number → no button
  if (!e164) return null

  // Suppressed on legal and admin pages
  if (SUPPRESSED_SEGMENTS.some(seg => pathname?.includes(seg))) return null

  const href = `https://wa.me/${stripPlus(e164)}?text=${encodeURIComponent(initialMessage)}`

  return (
    <div data-no-print className="group fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6">
      {/* Tooltip — md+ only, appears to the left of the button */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2
          hidden md:block
          whitespace-nowrap rounded-md px-2 py-1
          bg-foreground text-background text-xs font-medium
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
        "
      >
        Chat with us
      </span>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open WhatsApp chat with ${brandName}`}
        onClick={() => trackConversion.whatsappClick()}
        className={`
          flex h-14 w-14 items-center justify-center rounded-full shadow-lg
          transition-transform duration-200 hover:scale-110 active:scale-95
          ${isPulsing ? 'animate-pulse' : ''}
        `}
        style={{
          /* WhatsApp brand mandate: #25D366 is the only approved green.
           * This is the sole intentional brand-hex override in the codebase —
           * WhatsApp's brand guidelines require exact colour match, not a
           * Tailwind semantic token. hover shifts to #22c15e (10% darker). */
          backgroundColor: '#25D366',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#22c15e' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#25D366' }}
      >
        {/* WhatsApp official logo mark — inline SVG, no external dependency */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width="28"
          height="28"
          fill="white"
          aria-hidden="true"
        >
          <path d="M16.003 2C8.28 2 2 8.28 2 16.003c0 2.478.648 4.806 1.783 6.82L2 30l7.395-1.742A13.94 13.94 0 0 0 16.003 30C23.72 30 30 23.72 30 16.003 30 8.28 23.72 2 16.003 2zm0 25.5a11.43 11.43 0 0 1-5.835-1.604l-.418-.248-4.394 1.035 1.072-4.284-.272-.44A11.47 11.47 0 0 1 4.5 16.003C4.5 9.656 9.656 4.5 16.003 4.5S27.5 9.656 27.5 16.003 22.344 27.5 16.003 27.5zm6.302-8.613c-.344-.173-2.038-1.006-2.354-1.12-.316-.116-.546-.173-.777.173-.23.346-.893 1.12-1.095 1.35-.2.23-.403.26-.747.086-.344-.173-1.454-.537-2.77-1.71-1.023-.913-1.714-2.04-1.914-2.385-.2-.346-.021-.532.15-.704.155-.155.345-.403.518-.605.172-.2.23-.346.346-.576.115-.23.057-.432-.029-.605-.086-.173-.777-1.874-1.066-2.566-.28-.672-.565-.58-.777-.59l-.663-.012a1.27 1.27 0 0 0-.92.432c-.316.346-1.21 1.18-1.21 2.878s1.238 3.338 1.41 3.567c.173.23 2.436 3.72 5.903 5.215.824.356 1.467.569 1.968.728.827.263 1.58.226 2.174.137.663-.099 2.038-.832 2.326-1.637.287-.806.287-1.497.2-1.64-.086-.145-.315-.23-.663-.404z" />
        </svg>
      </a>
    </div>
  )
}
