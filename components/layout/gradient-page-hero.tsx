import Image from 'next/image'
import Link from 'next/link'

// uft-003 #3 — GradientPageHero: lightweight inner-page hero
// Distinct from <Hero>: no video, server-renderable.
// Gradient: from-primary/10 to-accent/10 — matches all 8 inline occurrences in the codebase.
// Fixed <section>/<h1>. No polymorphic element — every inner page hero IS an h1.
// Optional ctaPrimary / ctaSecondary: prevents the double-gradient-section issue on adopt/contact
// (those pages currently have a separate CTA section with the same gradient immediately after the hero).
//
// HOW TO ADD A HERO IMAGE — single-prop change in the page file:
//
//   Step 1: Drop image at:
//             public/images/heroes/<route>.webp   (e.g. sustainability.webp)
//
//   Step 2: In the page that renders <GradientPageHero>, add the prop:
//             <GradientPageHero
//               title="..."
//               backgroundImage="/images/heroes/<route>.webp"
//             />
//
//   When backgroundImage is set: full-bleed image + dark scrim overlay so text stays readable.
//   When backgroundImage is null/absent: gradient background as today (no change).

interface CtaLink {
  label: string
  href: string
}

interface GradientPageHeroProps {
  title: string
  subtitle?: string
  ctaPrimary?: CtaLink
  ctaSecondary?: CtaLink
  /**
   * Optional hero background image.
   * Provide a relative public path: '/images/heroes/<route>.webp'
   * Drop the file at public/images/heroes/<route>.webp first.
   * When absent, renders the gradient background as today.
   */
  backgroundImage?: string
}

export function GradientPageHero({
  title,
  subtitle,
  ctaPrimary,
  ctaSecondary,
  backgroundImage,
}: GradientPageHeroProps) {
  return (
    <section className={`relative w-full py-20 px-4 overflow-hidden ${backgroundImage ? 'min-h-[300px]' : 'bg-gradient-to-br from-primary/10 to-accent/10'}`}>
      {/* Background image + scrim — only rendered when owner supplies the file */}
      {backgroundImage && (
        <>
          <Image
            src={backgroundImage}
            alt=""
            fill
            className="object-cover object-center z-0"
            sizes="100vw"
            priority
          />
          {/* Scrim: keeps text readable regardless of image brightness */}
          <div className="absolute inset-0 z-10 bg-foreground/50" />
        </>
      )}

      <div className="relative z-20 max-w-4xl mx-auto text-center">
        <h1 className={`text-4xl md:text-5xl font-bold mb-6 ${backgroundImage ? 'text-white' : 'text-foreground'}`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`text-lg max-w-2xl mx-auto ${backgroundImage ? 'text-white/85' : 'text-muted-foreground'}`}>
            {subtitle}
          </p>
        )}
        {(ctaPrimary || ctaSecondary) && (
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            {ctaPrimary && (
              <Link
                href={ctaPrimary.href}
                className="inline-block rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {ctaPrimary.label}
              </Link>
            )}
            {ctaSecondary && (
              <Link
                href={ctaSecondary.href}
                className="inline-block rounded-lg border border-primary px-8 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
              >
                {ctaSecondary.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
