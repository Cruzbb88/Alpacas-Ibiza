'use client'

import Link from 'next/link'
import { useLocaleT, useLocale } from '@/lib/locale-context'
import { MapPin, Calendar, ShoppingBag, HelpCircle, Home, ArrowRight } from 'lucide-react'

export function DidYouMean() {
  const tr = useLocaleT()
  const locale = useLocale()

  const suggestedPages = [
    {
      icon: Home,
      title: tr('notFound.suggestions.home'),
      description: tr('notFound.suggestions.homeDesc'),
      href: `/${locale}`,
    },
    {
      icon: Calendar,
      title: tr('notFound.suggestions.tours'),
      description: tr('notFound.suggestions.toursDesc'),
      href: `/${locale}/tours`,
    },
    {
      icon: ShoppingBag,
      title: tr('notFound.suggestions.shop'),
      description: tr('notFound.suggestions.shopDesc'),
      href: `/${locale}/shop`,
    },
    {
      icon: MapPin,
      title: tr('notFound.suggestions.about'),
      description: tr('notFound.suggestions.aboutDesc'),
      href: `/${locale}/about`,
    },
    {
      icon: HelpCircle,
      title: tr('notFound.suggestions.contact'),
      description: tr('notFound.suggestions.contactDesc'),
      href: `/${locale}/contact`,
    },
  ]

  return (
    <div className="w-full max-w-4xl">
      <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider mb-6 text-center">
        {tr('notFound.suggestionsTitle')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestedPages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="group flex items-start gap-4 p-5 rounded-2xl border border-border bg-background hover:bg-accent/5 hover:border-accent/30 transition-all duration-200"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <page.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                {page.title}
                <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h3>
              <p className="text-sm text-foreground/60 mt-1">{page.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
