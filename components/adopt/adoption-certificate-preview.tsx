/**
 * AdoptionCertificatePreview — visual mockup of the adoption certificate.
 *
 * Makes the abstract "adoption certificate" benefit concrete. Renders as a
 * stylised paper certificate card so donors can see what they'll receive
 * before they pay. When the donor has picked a specific alpaca, the
 * preview is personalised with that alpaca's name; otherwise it shows
 * "Your alpaca" as a placeholder.
 *
 * Pure render. All copy localised through props so the /adopt page owns i18n.
 */

interface AdoptionCertificatePreviewProps {
  /** Heading above the preview, e.g. "Your adoption certificate". */
  title: string
  /** Subheading explaining what the certificate is. */
  subtitle: string
  /** Localised "Adoption certificate" header rendered ON the certificate itself. */
  certificateLabel: string
  /** Localised "presented to" copy. */
  presentedToLabel: string
  /** Localised "is the proud sponsor of" copy. */
  sponsorOfLabel: string
  /** Localised footer line on the certificate (e.g. "Es Currals, Ibiza"). */
  certificateFooter: string
  /** Name of the alpaca the donor picked, or null for the "Your alpaca" placeholder. */
  alpacaName: string | null
  /** Localised placeholder name shown when alpacaName is null. */
  alpacaPlaceholder: string
  /** Localised placeholder for donor name (we don't know it yet at preview time). */
  donorPlaceholder: string
}

export function AdoptionCertificatePreview({
  title,
  subtitle,
  certificateLabel,
  presentedToLabel,
  sponsorOfLabel,
  certificateFooter,
  alpacaName,
  alpacaPlaceholder,
  donorPlaceholder,
}: AdoptionCertificatePreviewProps) {
  const displayAlpaca = alpacaName ?? alpacaPlaceholder

  return (
    <section aria-labelledby="cert-preview-heading" className="w-full">
      <div className="text-center mb-8">
        <h2
          id="cert-preview-heading"
          className="text-3xl md:text-4xl font-bold text-foreground mb-3"
        >
          {title}
        </h2>
        <p className="text-foreground/70 max-w-2xl mx-auto">{subtitle}</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* The certificate itself — styled to look like paper, with decorative border */}
        <div
          role="img"
          aria-label={`${certificateLabel}: ${displayAlpaca}`}
          className="relative aspect-[4/3] bg-gradient-to-br from-[#fdf8ef] to-[#f3ead3] border-4 border-double border-primary/40 rounded-lg shadow-xl p-8 md:p-12 flex flex-col items-center justify-center text-center overflow-hidden"
        >
          {/* Ornamental corner stamps */}
          <CornerStamp className="top-3 left-3" />
          <CornerStamp className="top-3 right-3 rotate-90" />
          <CornerStamp className="bottom-3 left-3 -rotate-90" />
          <CornerStamp className="bottom-3 right-3 rotate-180" />

          {/* Centre seal */}
          <span
            aria-hidden="true"
            className="text-3xl md:text-4xl mb-3"
            style={{ filter: 'sepia(40%)' }}
          >
            🦙
          </span>

          <p className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.3em] text-primary/70 mb-2">
            {certificateLabel}
          </p>

          <p className="text-xs md:text-sm text-foreground/70 italic mb-1">
            {presentedToLabel}
          </p>
          <p className="text-xl md:text-2xl font-serif font-semibold text-foreground/90 mb-4 border-b border-primary/20 pb-1 min-w-[60%]">
            {donorPlaceholder}
          </p>

          <p className="text-xs md:text-sm text-foreground/70 italic mb-1">
            {sponsorOfLabel}
          </p>
          <p className="text-2xl md:text-4xl font-serif font-bold text-primary mb-6">
            {displayAlpaca}
          </p>

          <p className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] text-foreground/50">
            {certificateFooter}
          </p>
        </div>

        {/* Caption under the preview — sets expectations that it's a preview */}
        <p className="text-xs text-center text-muted-foreground italic mt-3">
          Preview — the printed certificate ships within 7–10 days of adoption.
        </p>
      </div>
    </section>
  )
}

function CornerStamp({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute h-5 w-5 md:h-6 md:w-6 border-l-2 border-t-2 border-primary/40 ${className}`}
    />
  )
}
