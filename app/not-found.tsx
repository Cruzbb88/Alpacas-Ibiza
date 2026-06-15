/**
 * Root-level 404 handler.
 *
 * Next.js App Router sets HTTP 404 status automatically when this boundary
 * renders (triggered by notFound() or an unmatched route).
 *
 * The previous implementation called redirect(`/${locale}`) which returned a
 * 307 → 200 chain — Playwright and crawlers followed the redirect and recorded
 * HTTP 200, masking the 404 (axe SITE_DATA_EXTRACT soft-404 finding).
 *
 * Locale-prefixed unknowns (/en/foo) hit app/[locale]/not-found.tsx first.
 * This file handles bare unknowns (/foo) that bypass the intl middleware.
 */
export default function RootNotFound() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 16px',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <p style={{ fontSize: 72, margin: 0 }} aria-hidden="true">🦙</p>
      <h1 style={{ fontSize: 36, fontWeight: 700, margin: '16px 0 8px' }}>
        Page not found
      </h1>
      <p style={{ color: '#71717a', marginBottom: 32 }}>
        This page doesn&apos;t exist or has moved.
      </p>
      <a
        href="/en"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          background: 'hsl(var(--accent, 30 80% 40%))',
          color: '#fff',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Go home
      </a>
    </div>
  )
}
