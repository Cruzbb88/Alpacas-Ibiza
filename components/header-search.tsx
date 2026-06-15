'use client'

import { useState, useEffect, useRef, useCallback, useId } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { searchAll, type SearchEntry } from '@/lib/data/search-index'
import { JOURNAL_POSTS } from '@/lib/data/journal-posts'
import { useTranslations } from 'next-intl'
import type { Locale } from '@/i18n.config'

interface HeaderSearchProps {
  locale: Locale
}

const TYPE_LABEL: Record<SearchEntry['type'], string> = {
  page: 'Page',
  journal: 'Journal',
  alpaca: 'Alpaca',
}

export function HeaderSearch({ locale }: HeaderSearchProps) {
  const tr = useTranslations()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ReadonlyArray<SearchEntry>>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const labelId = useId()

  // Debounced search
  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => {
      setResults(query.trim() ? searchAll(query) : [])
    }, 120)
    return () => clearTimeout(id)
  }, [query, open])

  // Global `/` shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Autofocus on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10)
    } else {
      setQuery('')
      setResults([])
    }
  }, [open])

  // Outside-click to close
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  const close = useCallback(() => setOpen(false), [])

  // Fallback: 3 most-recent journal posts when query is empty
  const recentPosts: SearchEntry[] = [...JOURNAL_POSTS]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3)
    .map((p) => ({
      path: `/journal/${p.slug}`,
      title: p.title,
      snippet: p.excerpt,
      type: 'journal' as const,
      tags: [...p.tags],
    }))

  const showResults = query.trim().length > 0
  const displayItems = showResults ? results : recentPosts
  const isEmpty = showResults && results.length === 0

  return (
    <>
      {/* Search icon button */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={tr('search.openShortcut')}
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground"
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Backdrop + popover */}
      {open && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-16 px-4"
          onClick={handleBackdropClick}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            className="w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Input row */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
              <label id={labelId} className="sr-only">
                {tr('search.placeholder')}
              </label>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr('search.placeholder')}
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
                aria-label={tr('search.placeholder')}
              />
              <Button variant="ghost" size="icon" onClick={close} aria-label="Close search" className="h-7 w-7">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto py-2">
              {isEmpty ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">{tr('search.noResults')}</p>
                  <Link
                    href={`/${locale}/journal`}
                    onClick={close}
                    className="text-sm text-accent underline underline-offset-2 hover:text-accent/80"
                  >
                    {tr('search.browseJournal')}
                  </Link>
                </div>
              ) : (
                <>
                  {!showResults && (
                    <p className="px-4 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Recent
                    </p>
                  )}
                  <ul role="listbox" aria-label="Search results">
                    {displayItems.map((entry) => (
                      <li key={entry.path}>
                        <Link
                          href={`/${locale}${entry.path}`}
                          onClick={close}
                          className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted transition-colors"
                        >
                          <span className="mt-0.5 flex-shrink-0 rounded-full bg-accent/10 text-accent text-[10px] font-semibold px-1.5 py-0.5 uppercase tracking-wide">
                            {TYPE_LABEL[entry.type]}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-foreground truncate">
                              {entry.title}
                            </span>
                            <span className="block text-xs text-muted-foreground truncate">
                              {entry.snippet}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-border">
              <p className="text-xs text-muted-foreground">{tr('search.openShortcut')}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
