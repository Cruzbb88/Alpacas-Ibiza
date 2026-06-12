'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { MEMBERSHIP_LIVE, HERD_FAMILY_LIVE } from '@/lib/config'

export interface FooterProps {
  legalName: string
  /**
   * Spanish tax ID. null → omit the CIF line gracefully (no "CIF:" with empty value).
   * Required by Spanish law on commercial websites; surfaced once the owner supplies it.
   */
  cif: string | null
  address: {
    streetAddress: string
    addressLocality: string
    addressRegion: string
    postalCode: string
    addressCountry: string
  }
  phoneE164: string
  whatsappE164: string
  contactEmail: string
  social: {
    instagramUrl?: string | null
    facebookUrl?: string | null
    googleReviewUrl?: string | null
  }
  brandName: string
  /**
   * Build #4 — Spanish regulatory trust fields (WWF UK charity-number pattern).
   * All optional — footer omits each section gracefully when unset.
   */
  touristRegistration?: string | null
  foodHandlingCert?: string | null
  trustBadges?: ReadonlyArray<{
    label: string
    certifier: string
    logoSrc?: string
  }>
}

/**
 * Format an E.164 phone number for display.
 * Belgian mobile (+32 4XX XX XX XX) is the only format currently in use; any
 * other shape falls back to the raw E.164 string so we never invent grouping.
 */
function formatPhoneE164(e164: string): string {
  const m = e164.match(/^\+32(4\d{2})(\d{2})(\d{2})(\d{2})$/)
  if (m) return `+32 ${m[1]} ${m[2]} ${m[3]} ${m[4]}`
  return e164
}

/**
 * Convert ISO country code → display label.
 * Footer compliance line is Spanish-law-driven, so ES is the only mapping
 * we need today. Unknown codes pass through unchanged.
 */
function countryLabel(code: string): string {
  if (code === 'ES') return 'España'
  return code
}

export function Footer({
  legalName,
  cif,
  address,
  phoneE164,
  whatsappE164,
  contactEmail,
  social,
  brandName,
  touristRegistration,
  foodHandlingCert,
  trustBadges,
}: FooterProps) {
  const tr = useTranslations()
  const locale = useLocale()

  const phoneDisplay = formatPhoneE164(phoneE164)
  const phoneHref = `tel:${phoneE164}`
  const whatsappHref = whatsappE164
    ? `https://wa.me/${whatsappE164.replace(/\D/g, '')}`
    : null
  const mailHref = `mailto:${contactEmail}`
  const year = new Date().getFullYear()

  // Legal compliance line: omit the CIF segment cleanly when unmapped.
  const legalAddressLine =
    `${address.streetAddress}, ${address.postalCode} ${address.addressLocality}, ` +
    `${address.addressRegion}, ${countryLabel(address.addressCountry)}`
  const legalSegments: string[] = [
    `© ${year} ${legalName}`,
    legalAddressLine,
  ]
  if (cif) legalSegments.push(`CIF: ${cif}`)

  return (
    <footer
      role="contentinfo"
      className="w-full border-t border-border bg-background"
    >
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1 — Brand */}
          <div>
            <h3 className="font-bold text-foreground mb-4">{brandName}</h3>
            <p className="text-sm text-foreground/70 mb-4">
              {tr('footer.tagline')}
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {social.instagramUrl ? (
                <li>
                  <a
                    href={social.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${brandName} on Instagram`}
                    className="text-foreground/70 hover:text-foreground"
                  >
                    Instagram
                  </a>
                </li>
              ) : null}
              {social.facebookUrl ? (
                <li>
                  <a
                    href={social.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${brandName} on Facebook`}
                    className="text-foreground/70 hover:text-foreground"
                  >
                    Facebook
                  </a>
                </li>
              ) : null}
              {social.googleReviewUrl ? (
                <li>
                  <a
                    href={social.googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Leave a Google review for ${brandName}`}
                    className="text-foreground/70 hover:text-foreground"
                  >
                    {tr('footer.googleReview') || 'Review us on Google'}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          {/* Col 2 — Explore */}
          <div>
            <h3 className="font-bold text-foreground mb-4">{tr('footer.explore')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={`/${locale}/tours`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('nav.tours')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/experiences`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('nav.experiences') || 'Experiences'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/yoga`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('nav.yoga') || 'Alpaca Yoga'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/workshops`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('nav.workshops') || 'Weaving Workshops'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/weddings`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('nav.weddings') || 'Weddings & Events'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/alpacas`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('nav.alpacas')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/adopt`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('footer.adopt') || 'Adopt an Alpaca'}
                </Link>
              </li>
              {HERD_FAMILY_LIVE && (
                <li>
                  <Link
                    href={`/${locale}/herd-family`}
                    className="text-foreground/70 hover:text-foreground"
                  >
                    {tr('footer.herdFamily') || 'Herd Family'}
                  </Link>
                </li>
              )}
              {MEMBERSHIP_LIVE && (
                <li>
                  <Link
                    href={`/${locale}/membership`}
                    className="text-foreground/70 hover:text-foreground"
                  >
                    {tr('footer.membership') || 'Annual Farm Pass'}
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href={`/${locale}/sustainability`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('footer.sustainability') || 'Sustainability'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/journal`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('footer.journal') || 'Journal'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/newsletter/archive`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('footer.newsletterArchive') || 'Newsletter Archive'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/about`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('footer.aboutUs')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/contact`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('footer.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 — Shop */}
          <div>
            <h3 className="font-bold text-foreground mb-4">{tr('footer.shopTitle')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={`/${locale}/shop/woven`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('footer.wovenCollection')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/shop/commission`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('footer.customCommission')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/shop/alcaca`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('footer.alpacaManure')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/gifts`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('nav.gifts')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/redeem-voucher`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('footer.redeemVoucher') || 'Redeem a Voucher'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/weaving`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('nav.weaving') || 'Weaving'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/skein`}
                  className="text-foreground/70 hover:text-foreground"
                >
                  {tr('nav.skein') || 'Sponsor a Skein'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4 — Contact */}
          <div>
            <h3 className="font-bold text-foreground mb-4">{tr('footer.contact')}</h3>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li>
                <a
                  href={phoneHref}
                  aria-label={`Call ${legalName}`}
                  className="hover:text-foreground"
                >
                  {phoneDisplay}
                </a>
              </li>
              {whatsappHref && (
              <li>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Chat with ${brandName} on WhatsApp`}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <span aria-hidden="true">💬</span> WhatsApp
                </a>
              </li>
              )}
              <li>
                <a
                  href={mailHref}
                  className="hover:text-foreground break-all"
                  aria-label={`Email ${brandName}`}
                >
                  {contactEmail}
                </a>
              </li>
              <li>
                <address className="not-italic text-foreground/70 leading-relaxed">
                  <span className="block">{address.streetAddress}</span>
                  <span className="block">
                    {address.postalCode} {address.addressLocality}
                  </span>
                  <span className="block">
                    {address.addressRegion}, {countryLabel(address.addressCountry)}
                  </span>
                </address>
              </li>
            </ul>
          </div>
        </div>

        {/* Secondary utility links — donors, press, sitemap */}
        <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-foreground/60">
          <div>
            <p className="font-semibold mb-2">{tr('footer.donors') || 'Donors'}</p>
            <ul className="space-y-1">
              <li>
                <Link href={`/${locale}/my-adoption`} className="hover:text-foreground">
                  {tr('footer.myAdoption') || 'My Adoption Portal'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/preferences`} className="hover:text-foreground">
                  {tr('footer.emailPreferences') || 'Email Preferences'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/recover-certificate`} className="hover:text-foreground">
                  {tr('footer.recoverCertificate') || 'Recover Certificate'}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">{tr('footer.press') || 'Press'}</p>
            <ul className="space-y-1">
              <li>
                <Link href={`/${locale}/press`} className="hover:text-foreground">
                  {tr('footer.pressRoom') || 'Press Room'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/press-kit`} className="hover:text-foreground">
                  {tr('footer.pressKit') || 'Press Kit'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/media`} className="hover:text-foreground">
                  {tr('footer.mediaGallery') || 'Media Gallery'}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">{tr('footer.info') || 'Info'}</p>
            <ul className="space-y-1">
              <li>
                <Link href={`/${locale}/visit`} className="hover:text-foreground">
                  {tr('nav.visit') || 'Plan your visit'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/sitemap`} className="hover:text-foreground">
                  {tr('footer.siteMap') || 'Site Map'}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Build #4 — Regulatory trust section (WWF UK pattern, Spanish equivalents).
             Renders only when the tenant has supplied at least one of the three fields.
             Fail-quiet: each sub-block omits independently when unset. */}
        {(touristRegistration || foodHandlingCert || (trustBadges && trustBadges.length > 0)) && (
          <div className="mt-6 pt-6 border-t border-border text-xs text-foreground/50 space-y-1 text-center">
            {touristRegistration && (
              <p>Turismo Activo: {touristRegistration}</p>
            )}
            {foodHandlingCert && (
              <p>Carnet manipulador alimentos: {foodHandlingCert}</p>
            )}
            {trustBadges && trustBadges.length > 0 && (
              <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                {trustBadges.map((badge, i) => (
                  <li key={i} className="flex items-center gap-1">
                    {badge.logoSrc && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={badge.logoSrc}
                        alt={badge.certifier}
                        className="h-4 w-auto"
                        loading="lazy"
                      />
                    )}
                    <span>{badge.label} · {badge.certifier}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Spanish-law compliance strip */}
        <div className="mt-8 pt-8 border-t border-border text-center text-xs text-foreground/60 space-y-2">
          <p className="leading-relaxed">{legalSegments.join(' · ')}</p>
          <p className="leading-relaxed">{tr('footer.copyright')}</p>
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <li>
              <Link
                href={`/${locale}/privacy`}
                className="hover:text-foreground"
              >
                {tr('footer.privacy')}
              </Link>
            </li>
            <li aria-hidden="true">·</li>
            <li>
              <Link
                href={`/${locale}/terms`}
                className="hover:text-foreground"
              >
                {tr('footer.terms')}
              </Link>
            </li>
            <li aria-hidden="true">·</li>
            <li>
              <Link
                href={`/${locale}/cookies`}
                className="hover:text-foreground"
              >
                {tr('footer.cookies')}
              </Link>
            </li>
            <li aria-hidden="true">·</li>
            <li>
              <Link
                href={`/${locale}/impressum`}
                className="hover:text-foreground"
              >
                {tr('footer.impressum')}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
