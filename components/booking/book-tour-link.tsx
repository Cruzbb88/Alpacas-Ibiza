'use client'

import { trackConversion } from '@/lib/analytics'

interface BookTourLinkProps {
  href: string
  className?: string
  children: React.ReactNode
  target?: string
  rel?: string
  onClick?: () => void
}

/** Thin client wrapper so server components (page.tsx) can fire bookTourClick. */
export function BookTourLink({ href, className, children, target, rel, onClick }: BookTourLinkProps) {
  return (
    <a
      href={href}
      onClick={() => { trackConversion.bookTourClick(); onClick?.() }}
      className={className}
      target={target}
      rel={rel}
    >
      {children}
    </a>
  )
}
