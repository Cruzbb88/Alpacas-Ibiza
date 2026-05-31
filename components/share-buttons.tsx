'use client'

/**
 * ShareButtons — horizontal share strip for journal articles.
 * Buttons: copy-link · WhatsApp · X/Twitter · Facebook
 * All external links open in new tab with noopener noreferrer.
 * No new deps — uses lucide-react (already in package.json).
 */

import { useState } from 'react'
import { Link2, MessageCircle, Twitter, Facebook } from 'lucide-react'

/** Regex for a valid donor referral code. */
const REFERRAL_CODE_RE = /^ALPACA-[A-Z0-9]{6}$/

/**
 * Append `?ref=<code>` (or `&ref=<code>`) to a URL, skipping if the URL
 * already contains a `ref=` query parameter (exact parameter name match,
 * not substring — avoids false hits on `prefer=`, `referenced=`, etc.).
 */
function appendRef(url: string, code: string): string {
  let hasRef = false
  try {
    hasRef = new URL(url, 'https://placeholder.invalid').searchParams.has('ref')
  } catch {
    hasRef = /[?&]ref=/.test(url)
  }
  if (hasRef) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}ref=${encodeURIComponent(code)}`
}

export interface ShareButtonsProps {
  readonly url: string      // absolute URL
  readonly title: string    // article title
  readonly excerpt?: string // article excerpt (unused in current share targets but kept for future use)
  /** Donor referral code. Must match /^ALPACA-[A-Z0-9]{6}$/. When valid, appended as ?ref= to every share target. */
  readonly referralCode?: string
  readonly labels?: {
    share?: string
    copyLink?: string
    copied?: string
    whatsapp?: string
    twitter?: string
    facebook?: string
  }
}

export function ShareButtons({ url, title, referralCode, labels = {} }: ShareButtonsProps) {
  const shareUrl =
    referralCode && REFERRAL_CODE_RE.test(referralCode)
      ? appendRef(url, referralCode)
      : url
  const [copied, setCopied] = useState(false)

  const {
    share = 'Share',
    copyLink = 'Copy link',
    copied: copiedLabel = 'Copied!',
    whatsapp = 'Share on WhatsApp',
    twitter = 'Share on X',
    facebook = 'Share on Facebook',
  } = labels

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        // Fallback: textarea execCommand for older browsers / http://
        const ta = document.createElement('textarea')
        ta.value = shareUrl
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Copy failed silently — no toast, no throw
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${title}\n\n${shareUrl}`)}`
  const xHref = `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`
  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`

  const btnBase =
    'inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div data-no-print className="flex items-center gap-2 flex-wrap">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium select-none">
        {share}:
      </span>

      {/* Copy link */}
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? copiedLabel : copyLink}
        className={btnBase}
        title={copied ? copiedLabel : copyLink}
      >
        <Link2 className="h-4 w-4" aria-hidden="true" />
        {copied && (
          <span className="ml-1.5 text-xs text-primary font-medium">{copiedLabel}</span>
        )}
      </button>

      {/* WhatsApp */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={whatsapp}
        className={btnBase}
        title={whatsapp}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
      </a>

      {/* X / Twitter */}
      <a
        href={xHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={twitter}
        className={btnBase}
        title={twitter}
      >
        <Twitter className="h-4 w-4" aria-hidden="true" />
      </a>

      {/* Facebook */}
      <a
        href={fbHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={facebook}
        className={btnBase}
        title={facebook}
      >
        <Facebook className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  )
}
