'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeroProps {
  title: string
  subtitle: string
  cta?: {
    label: string
    href: string
  }
  secondary?: {
    label: string
    href: string
  }
  backgroundImage?: string
  /** Descriptive alt text for the background image. Defaults to `title`. */
  imageAlt?: string
  videoSrc?: string
  /** Small uppercase kicker rendered above the title (e.g., "Adopt-a-Paca"). */
  eyebrow?: string
  /** Layout alignment. Defaults to 'center'. */
  align?: 'center' | 'left'
  /** Height variant. Defaults to 'md'. */
  size?: 'sm' | 'md' | 'lg'
  /** Small trust signals row under the CTAs (e.g., ["★ 4.9 on Google", "200+ guests/yr"]). */
  trustSignals?: string[]
  /** When true, dim the background overlay further so text is unmissable. */
  darkenOverlay?: boolean
}

const SIZE_CLASSES = {
  sm: 'min-h-[400px] md:min-h-[440px]',
  md: 'min-h-[600px] md:min-h-[700px]',
  lg: 'min-h-[720px] md:min-h-[800px]',
} as const

export function Hero({
  title,
  subtitle,
  cta,
  secondary,
  backgroundImage,
  imageAlt,
  videoSrc,
  eyebrow,
  align = 'center',
  size = 'md',
  trustSignals,
  darkenOverlay = false,
}: HeroProps) {
  const isLeft = align === 'left'
  const sizeClass = SIZE_CLASSES[size]
  const overlayClass = darkenOverlay
    ? 'bg-gradient-to-br from-background/75 to-background/50'
    : 'bg-gradient-to-br from-background/60 to-background/30'
  const hasTrust = Array.isArray(trustSignals) && trustSignals.length > 0

  return (
    <section
      className={`relative w-full ${sizeClass} flex items-center ${
        isLeft ? 'justify-start' : 'justify-center'
      } overflow-hidden`}
    >
      {/* Video Background */}
      {videoSrc && (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Background Image via next/image for LCP optimization */}
      {!videoSrc && backgroundImage && (
        <Image
          src={backgroundImage}
          alt={imageAlt ?? title}
          fill
          priority
          sizes="100vw"
          quality={85}
          className="object-cover z-0"
        />
      )}

      {/* Gradient fallback when neither video nor image */}
      {!videoSrc && !backgroundImage && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(109, 168, 85, 0.1) 0%, rgba(230, 126, 34, 0.08) 100%)',
          }}
        />
      )}

      {/* Legibility overlay (also softens the image-only case) */}
      <div
        className={`absolute inset-0 z-0 ${overlayClass} backdrop-blur-[1px]`}
      />

      <div
        className={`relative z-10 max-w-3xl px-4 py-16 md:py-24 ${
          isLeft
            ? 'mr-auto ml-0 md:ml-12 lg:ml-20 text-left max-w-2xl'
            : 'mx-auto text-center'
        }`}
      >
        {eyebrow && (
          <p className="text-sm md:text-base uppercase tracking-widest font-semibold text-accent mb-3">
            {eyebrow}
          </p>
        )}

        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 leading-tight text-balance">
          {title}
        </h1>

        <p
          className={`text-lg md:text-xl text-foreground/75 mb-8 text-balance leading-relaxed max-w-2xl ${
            isLeft ? '' : 'mx-auto'
          }`}
        >
          {subtitle}
        </p>

        {(cta || secondary) && (
          <div
            className={`flex flex-col sm:flex-row gap-4 ${
              isLeft ? 'justify-start' : 'justify-center'
            }`}
          >
            {cta && (
              <Button
                asChild
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground hover:-translate-y-0.5 transition-transform focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <Link href={cta.href}>
                  {cta.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
            {secondary && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary text-primary hover:bg-primary/5 bg-transparent hover:-translate-y-0.5 transition-transform focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <Link href={secondary.href}>{secondary.label}</Link>
              </Button>
            )}
          </div>
        )}

        {hasTrust && (
          <ul
            className={`mt-8 flex flex-wrap gap-x-6 gap-y-2 ${
              isLeft ? 'justify-start' : 'justify-center'
            }`}
          >
            {trustSignals!.map((signal, i) => (
              <li
                key={`${signal}-${i}`}
                className="text-sm text-muted-foreground inline-flex items-center gap-2"
              >
                <span>{signal}</span>
                {i < trustSignals!.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="hidden md:inline text-foreground/40"
                  >
                    ·
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
