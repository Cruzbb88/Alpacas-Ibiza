'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

interface FAQItem {
  question: string
  /**
   * Answer body. May include basic HTML (e.g. <a>, <strong>, <em>, <br>).
   * Items are author-controlled content (translation files / static data),
   * NOT user input — safe to render via dangerouslySetInnerHTML.
   */
  answer: string
}

interface FAQProps {
  items: FAQItem[]
  /** Optional section heading. When omitted, the accordion renders without the section wrapper. */
  title?: string
  /** Optional sub-heading shown under the title. Backward-compat with the previous API. */
  subtitle?: string
  /**
   * When true, emit schema.org FAQPage JSON-LD inline.
   * Default false to avoid duplicate schemas if the page-level metadata already emits one.
   */
  emitSchema?: boolean
  /**
   * When true, each AccordionItem gets id="faq-{slug(question)}" so deep links
   * like `/tours#faq-cancellation` open + scroll to the matching item.
   */
  enableAnchors?: boolean
  /** Single (default) = one open at a time. Multiple = allow multi-open. */
  type?: 'single' | 'multiple'
  /** Optional className passthrough on the outer wrapper. */
  className?: string
}

/**
 * Lowercase, replace non-alphanumeric runs with single dashes, trim leading/trailing dashes.
 * Strips diacritics so "¿Cómo cancelar?" → "como-cancelar".
 */
function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Strip HTML tags for schema.org plain-text Answer.text field. Author-controlled input. */
function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

/** Build slugs with `-2`, `-3` … suffixes for duplicate questions. */
function buildUniqueSlugs(items: FAQItem[]): string[] {
  const seen = new Map<string, number>()
  return items.map((item) => {
    const base = slugify(item.question) || 'item'
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}-${count + 1}`
  })
}

export function FAQ({
  items,
  title,
  subtitle,
  emitSchema = false,
  enableAnchors = false,
  type = 'single',
  className,
}: FAQProps) {
  const slugs = useMemo(() => buildUniqueSlugs(items ?? []), [items])
  const itemIds = useMemo(() => slugs.map((s) => `faq-${s}`), [slugs])

  // Radix Accordion value: string for 'single', string[] for 'multiple'.
  const [singleValue, setSingleValue] = useState<string>('')
  const [multipleValue, setMultipleValue] = useState<string[]>([])
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Open + scroll to item matching window.location.hash on mount and on hashchange.
  useEffect(() => {
    if (!enableAnchors || typeof window === 'undefined') return

    const applyHash = () => {
      const raw = window.location.hash.replace(/^#/, '')
      if (!raw) return
      const matchIndex = itemIds.findIndex((id) => id === raw)
      if (matchIndex === -1) return

      const value = `item-${matchIndex}`
      if (type === 'single') {
        setSingleValue(value)
      } else {
        setMultipleValue((prev) =>
          prev.includes(value) ? prev : [...prev, value],
        )
      }

      // Defer scroll until after Radix expands the panel.
      window.requestAnimationFrame(() => {
        const el = document.getElementById(raw)
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }

    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [enableAnchors, itemIds, type])

  // Edge case: empty/undefined items.
  if (!items || items.length === 0) return null

  const schemaJson = emitSchema
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: stripHtml(item.answer),
          },
        })),
      })
    : null

  const accordion =
    type === 'single' ? (
      <Accordion
        type="single"
        collapsible
        value={singleValue}
        onValueChange={setSingleValue}
        className="w-full"
      >
        {items.map((item, i) => (
          <AccordionItem
            key={`${itemIds[i]}-${i}`}
            value={`item-${i}`}
            id={enableAnchors ? itemIds[i] : undefined}
            className="border-b border-border/60 scroll-mt-24"
          >
            <AccordionTrigger className="px-4 py-5 text-left text-base md:text-lg font-semibold text-foreground hover:bg-secondary/30 hover:no-underline rounded-sm">
              <span className="pr-4">{item.question}</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-5 text-foreground/80 leading-relaxed prose prose-sm max-w-none">
              {/*
                Author-controlled HTML: answers come from translation files and
                static config, never from user input. Safe to render as HTML so
                authors can include <a>, <strong>, <br>, etc.
              */}
              <div dangerouslySetInnerHTML={{ __html: item.answer }} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    ) : (
      <Accordion
        type="multiple"
        value={multipleValue}
        onValueChange={setMultipleValue}
        className="w-full"
      >
        {items.map((item, i) => (
          <AccordionItem
            key={`${itemIds[i]}-${i}`}
            value={`item-${i}`}
            id={enableAnchors ? itemIds[i] : undefined}
            className="border-b border-border/60 scroll-mt-24"
          >
            <AccordionTrigger className="px-4 py-5 text-left text-base md:text-lg font-semibold text-foreground hover:bg-secondary/30 hover:no-underline rounded-sm">
              <span className="pr-4">{item.question}</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-5 text-foreground/80 leading-relaxed prose prose-sm max-w-none">
              {/* Author-controlled HTML — see note above. */}
              <div dangerouslySetInnerHTML={{ __html: item.answer }} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    )

  // No title => render bare accordion (caller provides their own wrapper/heading).
  if (!title) {
    return (
      <div ref={rootRef} className={cn('w-full', className)}>
        {schemaJson && (
          <script
            type="application/ld+json"
            // JSON.stringify output is safe; not user-controlled.
            dangerouslySetInnerHTML={{ __html: schemaJson }}
          />
        )}
        {accordion}
      </div>
    )
  }

  return (
    <section
      ref={rootRef}
      className={cn('max-w-3xl mx-auto py-12 md:py-16 px-4', className)}
    >
      {schemaJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schemaJson }}
        />
      )}
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          {title}
        </h2>
        {subtitle && (
          <p className="text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {accordion}
    </section>
  )
}
