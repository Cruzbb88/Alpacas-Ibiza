'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import type { SearchItem } from '@/lib/search/build-index'

interface SiteSearchProps {
  locale: string
}

export function SiteSearch({ locale }: SiteSearchProps) {
  const tr = useTranslations()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<SearchItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Open on Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Fetch on first open
  useEffect(() => {
    if (open && !items && !loading) {
      setLoading(true)
      fetch('/api/search')
        .then((r) => r.json())
        .then((data: { items: SearchItem[] }) => setItems(data.items))
        .catch(() => setItems([]))
        .finally(() => setLoading(false))
    }
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [open, items, loading])

  const matches = useMemo(() => {
    if (!items || !query.trim()) return []
    const q = query.toLowerCase().trim()
    return items
      .filter((i) => i.locale === locale)
      .filter((i) => i.keywords.includes(q))
      .slice(0, 8)
  }, [items, query, locale])

  // Reset selection when matches change
  useEffect(() => {
    setSelectedIndex(0)
  }, [matches])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = matches[selectedIndex]
      if (selected) {
        setOpen(false)
        setQuery('')
        router.push(selected.url)
      }
    }
  }

  const triggerLabel = tr('search.trigger')
  const placeholderLabel = tr('search.placeholder')
  const loadingLabel = tr('search.loading')
  const emptyLabel = tr('search.empty',{ query })
  const indexedCount = items ? items.filter((i) => i.locale === locale).length : 0

  return (
    <>
      {/* Search icon button — matches existing header style */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={triggerLabel}
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground"
      >
        <Search className="h-4 w-4" />
      </Button>

      {open && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={triggerLabel}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholderLabel}
              className="w-full px-4 py-3 bg-transparent text-foreground border-b border-border focus:outline-none placeholder:text-muted-foreground"
              aria-label={placeholderLabel}
            />

            <div className="max-h-[50vh] overflow-y-auto">
              {loading && (
                <div className="px-4 py-3 text-sm text-muted-foreground">{loadingLabel}</div>
              )}
              {!loading && query.trim() && matches.length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                  {emptyLabel}
                </div>
              )}
              {matches.map((m, i) => (
                <Link
                  key={m.id}
                  href={m.url}
                  onClick={() => {
                    setOpen(false)
                    setQuery('')
                  }}
                  className={[
                    'flex items-start gap-3 px-4 py-3 hover:bg-primary/5 transition-colors',
                    i === selectedIndex ? 'bg-primary/10' : '',
                  ].join(' ')}
                >
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground mt-0.5 w-16 shrink-0">
                    {m.type}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-foreground truncate">{m.title}</span>
                    <span className="block text-xs text-muted-foreground truncate">{m.snippet}</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex justify-between">
              <span>↑↓ navigate · ↵ open · esc close</span>
              {items && <span>{indexedCount} indexed</span>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
