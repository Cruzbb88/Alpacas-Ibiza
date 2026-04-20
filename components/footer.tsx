'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'

export function Footer() {
  const params = useParams()
  const locale = (params.locale as Locale) || 'en'
  const tr = t(locale)

  return (
    <footer className="w-full border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="font-bold text-foreground mb-4">Alpacas Ibiza</h3>
            <p className="text-sm text-foreground/70">
              {tr('footer.tagline')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-foreground mb-4">{tr('footer.explore')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={`/${locale}/tours`} className="text-foreground/70 hover:text-foreground">
                  {tr('nav.tours')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/shop`} className="text-foreground/70 hover:text-foreground">
                  {tr('nav.shop')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/about`} className="text-foreground/70 hover:text-foreground">
                  {tr('footer.aboutUs')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className="text-foreground/70 hover:text-foreground">
                  {tr('footer.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Partners */}
          <div>
            <h3 className="font-bold text-foreground mb-4">{tr('footer.shopTitle')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={`/${locale}/shop/woven`} className="text-foreground/70 hover:text-foreground">
                  {tr('footer.wovenCollection')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/shop/commission`} className="text-foreground/70 hover:text-foreground">
                  {tr('footer.customCommission')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/shop/alcaca`} className="text-foreground/70 hover:text-foreground">
                  {tr('footer.alpacaManure')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-foreground mb-4">{tr('footer.contact')}</h3>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li>San Carlos, Ibiza</li>
              <li>
                <a href="tel:+32475586544" className="hover:text-foreground">
                  +32 475 58 65 44
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/32475586544"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground inline-flex items-center gap-1"
                  aria-label="Chat on WhatsApp"
                >
                  <span aria-hidden="true">💬</span> WhatsApp
                </a>
              </li>
              <li>
                <a href="mailto:info@alpacasibiza.com" className="hover:text-foreground">
                  info@alpacasibiza.com
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/wishfulfillingweaving/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  Instagram
                </a>
                {' · '}
                <a
                  href="https://www.facebook.com/people/Es-Currals-Alpacas-Ibiza/100066379310193/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  Facebook
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-foreground/60">
          <p>&copy; {new Date().getFullYear()} Alpacas Ibiza. {tr('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  )
}
