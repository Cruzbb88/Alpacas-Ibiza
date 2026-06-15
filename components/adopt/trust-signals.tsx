import { Lock, RefreshCcw, Mail, ShieldCheck } from 'lucide-react'

interface TrustSignalsProps {
  /** Localised section heading. */
  heading: string
  /** Localised lines (4 short reassurance points). */
  securePayments: string
  cancelAnyTime: string
  responsiveSupport: string
  receiptIncluded: string
  /** Localised "We accept" label above the payment method icons. */
  acceptedLabel: string
}

/**
 * TrustSignals — strip directly below the primary CTA explaining that the
 * purchase is safe (Stripe security, cancel any time, donor support, receipt).
 *
 * Displays the four trust pillars as icon + short text tiles, plus a stylised
 * list of accepted payment-method names. No external logos shipped — we use
 * Lucide icons and text wordmarks to avoid trademark surface area.
 *
 * Pure presentation; no client state.
 */
export function TrustSignals({
  heading,
  securePayments,
  cancelAnyTime,
  responsiveSupport,
  receiptIncluded,
  acceptedLabel,
}: TrustSignalsProps) {
  return (
    <section aria-labelledby="trust-signals-heading" className="w-full">
      <h2
        id="trust-signals-heading"
        className="text-center text-xs uppercase tracking-[0.25em] font-semibold text-muted-foreground mb-8"
      >
        {heading}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-10">
        <TrustTile icon={Lock} text={securePayments} />
        <TrustTile icon={RefreshCcw} text={cancelAnyTime} />
        <TrustTile icon={Mail} text={responsiveSupport} />
        <TrustTile icon={ShieldCheck} text={receiptIncluded} />
      </div>

      {/* Accepted payment methods — text wordmarks, no logos */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          {acceptedLabel}
        </p>
        <ul className="flex flex-wrap justify-center items-center gap-2 list-none p-0">
          <PaymentWordmark>Visa</PaymentWordmark>
          <PaymentWordmark>Mastercard</PaymentWordmark>
          <PaymentWordmark>Amex</PaymentWordmark>
          <PaymentWordmark>Apple Pay</PaymentWordmark>
          <PaymentWordmark>Google Pay</PaymentWordmark>
          <PaymentWordmark>SEPA</PaymentWordmark>
          <PaymentWordmark>iDEAL</PaymentWordmark>
          <PaymentWordmark>Bancontact</PaymentWordmark>
        </ul>
      </div>
    </section>
  )
}

function TrustTile({
  icon: Icon,
  text,
}: {
  icon: typeof Lock
  text: string
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-sm text-foreground/80 leading-snug">{text}</p>
    </div>
  )
}

function PaymentWordmark({ children }: { children: string }) {
  return (
    <li className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground tracking-wide">
      {children}
    </li>
  )
}
