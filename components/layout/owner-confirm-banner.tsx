// uft-003 #4 — OwnerConfirmBanner: dev/staging amber alert, hidden in production.
// Centralises the NODE_ENV guard — consumers no longer need to wrap in their own conditional.
// Fixed <section> element (no polymorphic/variant toggle needed: inline pages use the same
// amber palette, only the py- size differs — variant prop handles that).
// No module-scope state. Server-renderable.

type Variant = 'section' | 'banner'

interface OwnerConfirmBannerProps {
  heading: string
  body?: string
  items?: string[]
  /** 'section' = py-10 (adopt, sustainability); 'banner' = py-4 (terms, privacy, cookies) */
  variant?: Variant
}

export function OwnerConfirmBanner({
  heading,
  body,
  items,
  variant = 'section',
}: OwnerConfirmBannerProps) {
  if (process.env.NODE_ENV === 'production') return null

  const py = variant === 'section' ? 'py-10' : 'py-4'
  const borderSide = variant === 'section' ? 'border-t' : 'border-b'

  return (
    <section
      className={`w-full ${py} px-4 bg-amber-50 ${borderSide} border-amber-200`}
      aria-label="Owner confirmation required"
    >
      <div className="max-w-4xl mx-auto">
        <h3 className="text-base font-bold text-amber-800 mb-2">{heading}</h3>
        {body && (
          <p className="text-sm text-amber-700 mb-4">{body}</p>
        )}
        {items && items.length > 0 && (
          <ul className="space-y-1 text-sm font-mono text-amber-800 list-disc list-inside">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
