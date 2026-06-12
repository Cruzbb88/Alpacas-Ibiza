'use client'

import { useEffect } from 'react'
import 'vanilla-cookieconsent/dist/cookieconsent.css'
import * as CookieConsent from 'vanilla-cookieconsent'
import type { Locale } from '@/i18n.config'
import { useTranslations } from 'next-intl'

interface CookieConsentBannerProps {
  locale: Locale
}

type GtagFn = (cmd: string, action: string, params: Record<string, string>) => void

function updateConsentMode(categories: string[]) {
  // Persist the coarse analytics flag that the pre-hydration Consent Mode
  // default (app/layout.tsx) and the custom trackEvent gate (lib/consent-gate.ts
  // STORAGE_KEY) both read. vanilla-cookieconsent stores its own state in
  // `cc_cookie`; this bridge key ('ai_cookie_consent_v1' = 'accepted' |
  // 'rejected') is the contract those two readers expect, and it must be written
  // on every consent event — even if gtag has not loaded yet (the readers do not
  // depend on gtag, so the write must happen before the gtag guard below).
  try {
    window.localStorage.setItem(
      'ai_cookie_consent_v1',
      categories.includes('analytics') ? 'accepted' : 'rejected',
    )
    // Notify same-tab subscribers (e.g. VercelInstrumentation) that consent
    // state has changed. 'storage' events only fire in OTHER tabs; this custom
    // event covers the same-tab path.
    window.dispatchEvent(new Event('cookieConsentUpdated'))
  } catch {
    /* localStorage unavailable (private mode) — Consent Mode update below still applies */
  }

  const w = window as unknown as { gtag?: GtagFn }
  if (typeof w.gtag !== 'function') return
  w.gtag('consent', 'update', {
    ad_storage:            categories.includes('marketing')    ? 'granted' : 'denied',
    ad_user_data:          categories.includes('marketing')    ? 'granted' : 'denied',
    ad_personalization:    categories.includes('marketing')    ? 'granted' : 'denied',
    analytics_storage:     categories.includes('analytics')    ? 'granted' : 'denied',
    functionality_storage: categories.includes('functionality')? 'granted' : 'denied',
  })
}

export function CookieConsentBanner({ locale }: CookieConsentBannerProps) {
  const tr = useTranslations()

  useEffect(() => {
    void CookieConsent.run({
      guiOptions: {
        consentModal: {
          layout: 'box',
          position: 'bottom right',
          equalWeightButtons: true,
          flipButtons: false,
        },
        preferencesModal: {
          layout: 'box',
          equalWeightButtons: true,
        },
      },

      onFirstConsent: ({ cookie }) => {
        updateConsentMode(cookie.categories)
      },

      onConsent: ({ cookie }) => {
        updateConsentMode(cookie.categories)
      },

      onChange: ({ cookie }) => {
        updateConsentMode(cookie.categories)
      },

      categories: {
        necessary:    { enabled: true,  readOnly: true  },
        functionality:{ enabled: false, readOnly: false },
        analytics: {
          enabled: false,
          readOnly: false,
          autoClear: {
            cookies: [
              { name: /^_ga/ },
              { name: '_gid'  },
            ],
          },
        },
        marketing: { enabled: false, readOnly: false },
      },

      language: {
        default: locale,
        translations: {
          en: {
            consentModal: {
              title:              tr('cookieConsent.title'),
              description:        tr('cookieConsent.description'),
              acceptAllBtn:       tr('cookieConsent.acceptAll'),
              acceptNecessaryBtn: tr('cookieConsent.rejectAll'),
              showPreferencesBtn: tr('cookieConsent.preferences'),
              footer: `<a href="/en/privacy">${tr('cookieConsent.privacyLink')}</a> · <a href="/en/cookies">${tr('cookieConsent.policyLink')}</a>`,
            },
            preferencesModal: {
              title:              tr('cookieConsent.prefTitle'),
              acceptAllBtn:       tr('cookieConsent.acceptAll'),
              acceptNecessaryBtn: tr('cookieConsent.rejectAll'),
              savePreferencesBtn: tr('cookieConsent.save'),
              closeIconLabel:     tr('cookieConsent.close'),
              sections: [
                {
                  title:          tr('cookieConsent.cats.necessary'),
                  description:    tr('cookieConsent.cats.necessaryDesc'),
                  linkedCategory: 'necessary',
                },
                {
                  title:          tr('cookieConsent.cats.functionality'),
                  description:    tr('cookieConsent.cats.functionalityDesc'),
                  linkedCategory: 'functionality',
                },
                {
                  title:          tr('cookieConsent.cats.analytics'),
                  description:    tr('cookieConsent.cats.analyticsDesc'),
                  linkedCategory: 'analytics',
                  cookieTable: {
                    headers: {
                      name:   tr('cookieConsent.table.name'),
                      domain: tr('cookieConsent.table.domain'),
                      desc:   tr('cookieConsent.table.desc'),
                    },
                    body: [
                      { name: '_ga',  domain: 'google.com', desc: tr('cookieConsent.cookies.ga') },
                      { name: '_gid', domain: 'google.com', desc: tr('cookieConsent.cookies.gid') },
                    ],
                  },
                },
                {
                  title:          tr('cookieConsent.cats.marketing'),
                  description:    tr('cookieConsent.cats.marketingDesc'),
                  linkedCategory: 'marketing',
                },
              ],
            },
          },
          nl: {
            consentModal: {
              title:              tr('cookieConsent.title'),
              description:        tr('cookieConsent.description'),
              acceptAllBtn:       tr('cookieConsent.acceptAll'),
              acceptNecessaryBtn: tr('cookieConsent.rejectAll'),
              showPreferencesBtn: tr('cookieConsent.preferences'),
              footer: `<a href="/nl/privacy">${tr('cookieConsent.privacyLink')}</a> · <a href="/nl/cookies">${tr('cookieConsent.policyLink')}</a>`,
            },
            preferencesModal: {
              title:              tr('cookieConsent.prefTitle'),
              acceptAllBtn:       tr('cookieConsent.acceptAll'),
              acceptNecessaryBtn: tr('cookieConsent.rejectAll'),
              savePreferencesBtn: tr('cookieConsent.save'),
              closeIconLabel:     tr('cookieConsent.close'),
              sections: [
                {
                  title:          tr('cookieConsent.cats.necessary'),
                  description:    tr('cookieConsent.cats.necessaryDesc'),
                  linkedCategory: 'necessary',
                },
                {
                  title:          tr('cookieConsent.cats.functionality'),
                  description:    tr('cookieConsent.cats.functionalityDesc'),
                  linkedCategory: 'functionality',
                },
                {
                  title:          tr('cookieConsent.cats.analytics'),
                  description:    tr('cookieConsent.cats.analyticsDesc'),
                  linkedCategory: 'analytics',
                  cookieTable: {
                    headers: {
                      name:   tr('cookieConsent.table.name'),
                      domain: tr('cookieConsent.table.domain'),
                      desc:   tr('cookieConsent.table.desc'),
                    },
                    body: [
                      { name: '_ga',  domain: 'google.com', desc: tr('cookieConsent.cookies.ga') },
                      { name: '_gid', domain: 'google.com', desc: tr('cookieConsent.cookies.gid') },
                    ],
                  },
                },
                {
                  title:          tr('cookieConsent.cats.marketing'),
                  description:    tr('cookieConsent.cats.marketingDesc'),
                  linkedCategory: 'marketing',
                },
              ],
            },
          },
          es: {
            consentModal: {
              title:              tr('cookieConsent.title'),
              description:        tr('cookieConsent.description'),
              acceptAllBtn:       tr('cookieConsent.acceptAll'),
              acceptNecessaryBtn: tr('cookieConsent.rejectAll'),
              showPreferencesBtn: tr('cookieConsent.preferences'),
              footer: `<a href="/es/privacy">${tr('cookieConsent.privacyLink')}</a> · <a href="/es/cookies">${tr('cookieConsent.policyLink')}</a>`,
            },
            preferencesModal: {
              title:              tr('cookieConsent.prefTitle'),
              acceptAllBtn:       tr('cookieConsent.acceptAll'),
              acceptNecessaryBtn: tr('cookieConsent.rejectAll'),
              savePreferencesBtn: tr('cookieConsent.save'),
              closeIconLabel:     tr('cookieConsent.close'),
              sections: [
                {
                  title:          tr('cookieConsent.cats.necessary'),
                  description:    tr('cookieConsent.cats.necessaryDesc'),
                  linkedCategory: 'necessary',
                },
                {
                  title:          tr('cookieConsent.cats.functionality'),
                  description:    tr('cookieConsent.cats.functionalityDesc'),
                  linkedCategory: 'functionality',
                },
                {
                  title:          tr('cookieConsent.cats.analytics'),
                  description:    tr('cookieConsent.cats.analyticsDesc'),
                  linkedCategory: 'analytics',
                  cookieTable: {
                    headers: {
                      name:   tr('cookieConsent.table.name'),
                      domain: tr('cookieConsent.table.domain'),
                      desc:   tr('cookieConsent.table.desc'),
                    },
                    body: [
                      { name: '_ga',  domain: 'google.com', desc: tr('cookieConsent.cookies.ga') },
                      { name: '_gid', domain: 'google.com', desc: tr('cookieConsent.cookies.gid') },
                    ],
                  },
                },
                {
                  title:          tr('cookieConsent.cats.marketing'),
                  description:    tr('cookieConsent.cats.marketingDesc'),
                  linkedCategory: 'marketing',
                },
              ],
            },
          },
          de: {
            consentModal: {
              title:              tr('cookieConsent.title'),
              description:        tr('cookieConsent.description'),
              acceptAllBtn:       tr('cookieConsent.acceptAll'),
              acceptNecessaryBtn: tr('cookieConsent.rejectAll'),
              showPreferencesBtn: tr('cookieConsent.preferences'),
              footer: `<a href="/de/privacy">${tr('cookieConsent.privacyLink')}</a> · <a href="/de/cookies">${tr('cookieConsent.policyLink')}</a>`,
            },
            preferencesModal: {
              title:              tr('cookieConsent.prefTitle'),
              acceptAllBtn:       tr('cookieConsent.acceptAll'),
              acceptNecessaryBtn: tr('cookieConsent.rejectAll'),
              savePreferencesBtn: tr('cookieConsent.save'),
              closeIconLabel:     tr('cookieConsent.close'),
              sections: [
                {
                  title:          tr('cookieConsent.cats.necessary'),
                  description:    tr('cookieConsent.cats.necessaryDesc'),
                  linkedCategory: 'necessary',
                },
                {
                  title:          tr('cookieConsent.cats.functionality'),
                  description:    tr('cookieConsent.cats.functionalityDesc'),
                  linkedCategory: 'functionality',
                },
                {
                  title:          tr('cookieConsent.cats.analytics'),
                  description:    tr('cookieConsent.cats.analyticsDesc'),
                  linkedCategory: 'analytics',
                  cookieTable: {
                    headers: {
                      name:   tr('cookieConsent.table.name'),
                      domain: tr('cookieConsent.table.domain'),
                      desc:   tr('cookieConsent.table.desc'),
                    },
                    body: [
                      { name: '_ga',  domain: 'google.com', desc: tr('cookieConsent.cookies.ga') },
                      { name: '_gid', domain: 'google.com', desc: tr('cookieConsent.cookies.gid') },
                    ],
                  },
                },
                {
                  title:          tr('cookieConsent.cats.marketing'),
                  description:    tr('cookieConsent.cats.marketingDesc'),
                  linkedCategory: 'marketing',
                },
              ],
            },
          },
          fr: {
            consentModal: {
              title:              tr('cookieConsent.title'),
              description:        tr('cookieConsent.description'),
              acceptAllBtn:       tr('cookieConsent.acceptAll'),
              acceptNecessaryBtn: tr('cookieConsent.rejectAll'),
              showPreferencesBtn: tr('cookieConsent.preferences'),
              footer: `<a href="/fr/privacy">${tr('cookieConsent.privacyLink')}</a> · <a href="/fr/cookies">${tr('cookieConsent.policyLink')}</a>`,
            },
            preferencesModal: {
              title:              tr('cookieConsent.prefTitle'),
              acceptAllBtn:       tr('cookieConsent.acceptAll'),
              acceptNecessaryBtn: tr('cookieConsent.rejectAll'),
              savePreferencesBtn: tr('cookieConsent.save'),
              closeIconLabel:     tr('cookieConsent.close'),
              sections: [
                {
                  title:          tr('cookieConsent.cats.necessary'),
                  description:    tr('cookieConsent.cats.necessaryDesc'),
                  linkedCategory: 'necessary',
                },
                {
                  title:          tr('cookieConsent.cats.functionality'),
                  description:    tr('cookieConsent.cats.functionalityDesc'),
                  linkedCategory: 'functionality',
                },
                {
                  title:          tr('cookieConsent.cats.analytics'),
                  description:    tr('cookieConsent.cats.analyticsDesc'),
                  linkedCategory: 'analytics',
                  cookieTable: {
                    headers: {
                      name:   tr('cookieConsent.table.name'),
                      domain: tr('cookieConsent.table.domain'),
                      desc:   tr('cookieConsent.table.desc'),
                    },
                    body: [
                      { name: '_ga',  domain: 'google.com', desc: tr('cookieConsent.cookies.ga') },
                      { name: '_gid', domain: 'google.com', desc: tr('cookieConsent.cookies.gid') },
                    ],
                  },
                },
                {
                  title:          tr('cookieConsent.cats.marketing'),
                  description:    tr('cookieConsent.cats.marketingDesc'),
                  linkedCategory: 'marketing',
                },
              ],
            },
          },
          it: {
            consentModal: {
              title:              tr('cookieConsent.title'),
              description:        tr('cookieConsent.description'),
              acceptAllBtn:       tr('cookieConsent.acceptAll'),
              acceptNecessaryBtn: tr('cookieConsent.rejectAll'),
              showPreferencesBtn: tr('cookieConsent.preferences'),
              footer: `<a href="/it/privacy">${tr('cookieConsent.privacyLink')}</a> · <a href="/it/cookies">${tr('cookieConsent.policyLink')}</a>`,
            },
            preferencesModal: {
              title:              tr('cookieConsent.prefTitle'),
              acceptAllBtn:       tr('cookieConsent.acceptAll'),
              acceptNecessaryBtn: tr('cookieConsent.rejectAll'),
              savePreferencesBtn: tr('cookieConsent.save'),
              closeIconLabel:     tr('cookieConsent.close'),
              sections: [
                {
                  title:          tr('cookieConsent.cats.necessary'),
                  description:    tr('cookieConsent.cats.necessaryDesc'),
                  linkedCategory: 'necessary',
                },
                {
                  title:          tr('cookieConsent.cats.functionality'),
                  description:    tr('cookieConsent.cats.functionalityDesc'),
                  linkedCategory: 'functionality',
                },
                {
                  title:          tr('cookieConsent.cats.analytics'),
                  description:    tr('cookieConsent.cats.analyticsDesc'),
                  linkedCategory: 'analytics',
                  cookieTable: {
                    headers: {
                      name:   tr('cookieConsent.table.name'),
                      domain: tr('cookieConsent.table.domain'),
                      desc:   tr('cookieConsent.table.desc'),
                    },
                    body: [
                      { name: '_ga',  domain: 'google.com', desc: tr('cookieConsent.cookies.ga') },
                      { name: '_gid', domain: 'google.com', desc: tr('cookieConsent.cookies.gid') },
                    ],
                  },
                },
                {
                  title:          tr('cookieConsent.cats.marketing'),
                  description:    tr('cookieConsent.cats.marketingDesc'),
                  linkedCategory: 'marketing',
                },
              ],
            },
          },
        },
      },
    })
  }, [locale]) // tr is a stable next-intl reference, locale drives re-init

  return null
}
