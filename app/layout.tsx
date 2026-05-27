import React from 'react'
import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import { Geist, Playfair_Display } from 'next/font/google'

import './globals.css'
import packageJson from '../package.json'
import { SpeculationRules } from '@/components/speculation-rules'

const _geistSans = Geist({ subsets: ['latin'] })
const _playfairDisplay = Playfair_Display({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'Es Currals Alpacas Ibiza | First Alpaca Farm & Wishfulfilling Weaving Studio',
  description: 'Es Currals Alpacas Ibiza is the very first alpaca farm in Ibiza and is located in the rural north of the island, on an authentic finca in a beautiful natural setting. Here is also the beating heart of Wishfulfilling Weaving, the artisanal weaving studio where, using mainly alpaca wool exclusive scarves are woven by hand on a traditional wooden loom.',
  generator: 'v0.app',
  openGraph: {
    title: 'Es Currals Alpacas Ibiza | First Alpaca Farm & Weaving Studio',
    description: 'The very first alpaca farm in Ibiza. Home to Wishfulfilling Weaving - hand-woven scarves on traditional wooden looms using alpaca wool.',
    type: 'website',
  },
  alternates: {
    languages: {
      en: 'https://alpacasibiza.com/en',
      de: 'https://alpacasibiza.com/de',
      it: 'https://alpacasibiza.com/it',
      es: 'https://alpacasibiza.com/es',
      nl: 'https://alpacasibiza.com/nl',
      fr: 'https://alpacasibiza.com/fr',
    },
    types: {
      'application/rss+xml': 'https://alpacasibiza.com/journal/rss.xml',
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6da855',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {/* GDPR Consent Mode v2 default — must load BEFORE any GA/GTM script */}
        <Script id="consent-default" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          // Read stored consent (set by CookieConsent component)
          var stored = null;
          try { stored = localStorage.getItem('ai_cookie_consent_v1'); } catch (e) {}
          var mode = stored === 'accepted' ? 'granted' : 'denied';
          gtag('consent', 'default', {
            ad_storage: mode,
            analytics_storage: mode,
            ad_user_data: mode,
            ad_personalization: mode,
            functionality_storage: 'granted',
            security_storage: 'granted',
            wait_for_update: 500,
          });`}
        </Script>
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-Y946QDVVQV"
          strategy="beforeInteractive"
        />
        <Script id="ga4-init" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-Y946QDVVQV');`}
        </Script>
        {/* Google Tag Manager — FareHarbor container (booking conversion tracking) */}
        <Script id="gtm-fareharbor" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-KR3CGLS6');`}
        </Script>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KR3CGLS6"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <SpeculationRules />
        <div className="fixed top-1 left-1 z-[9999] text-[10px] text-foreground/40 select-none pointer-events-none">
          v{packageJson.version}
        </div>
        {children}
        <Script
          src="https://fareharbor.com/embeds/api/v1/?autolightframe=yes&shortname=alpacasibiza"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}

