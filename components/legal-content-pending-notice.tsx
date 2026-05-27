/**
 * Spec 002 acceptance criterion #5: when owner has not provided real legal text,
 * render this single notice instead of the boilerplate translations. The
 * boilerplate exists as a draft for the owner's lawyer to edit — it must NOT be
 * shown to users as if it were the canonical privacy/terms/cookies policy.
 *
 * Activated by `LEGAL_CONTENT_LIVE=true` env var. Until that flag is set, every
 * legal page renders this notice + the owner's published contact email so users
 * can ask questions.
 */

export function isLegalContentLive(): boolean {
  return process.env.LEGAL_CONTENT_LIVE === 'true'
}

function contactEmail(): string {
  return process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'
}

interface Props {
  pageKind: 'privacy' | 'terms' | 'cookies'
}

const KIND_LABEL: Record<Props['pageKind'], string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  cookies: 'Cookie Policy',
}

export function LegalContentPendingNotice({ pageKind }: Props) {
  const label = KIND_LABEL[pageKind]
  return (
    <section className="w-full py-16 md:py-24 px-4 bg-background">
      <div className="max-w-3xl mx-auto">
        <div
          role="status"
          className="rounded-lg border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 p-6 md:p-8"
        >
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {label} — content pending
          </h2>
          <p className="text-foreground/80 mb-3">
            We are finalising the {label.toLowerCase()} with our lawyers before
            publishing it here. In the meantime, you can ask any data-protection
            or terms question by email and we will respond within 7 days.
          </p>
          <p className="text-foreground/80 mb-0">
            Contact:{' '}
            <a
              href={`mailto:${contactEmail()}?subject=${encodeURIComponent(label + ' enquiry')}`}
              className="underline font-semibold text-accent"
            >
              {contactEmail()}
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
