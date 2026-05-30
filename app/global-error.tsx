'use client'
import React, { useEffect } from 'react'

/**
 * global-error.tsx — catches uncaught server errors that escape the root layout.
 * Must include <html> + <body> because it replaces the root layout entirely.
 * Kept minimal so it works even if Tailwind stylesheet failed to load.
 * Colors match project palette: #556B2F (olive), #F5F5DC (beige), #708090 (slate).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        pathname: typeof window !== 'undefined' ? window.location.pathname : '',
        type: 'react-error-boundary',
      }),
      keepalive: true,
    }).catch(() => { /* silent */ })
  }, [error])

  // global-error replaces the root layout entirely, meaning i18n context may not
  // be available and window.location is not safe during SSR. Use 'en' so links
  // are always valid regardless of when this boundary fires.
  const locale = 'en'

  const btnBase: React.CSSProperties = {
    padding: '0.625rem 1.25rem',
    backgroundColor: 'transparent',
    color: '#556B2F',
    border: '2px solid #556B2F',
    borderRadius: '0.5rem',
    fontWeight: 600,
    textDecoration: 'none',
    fontSize: '0.9375rem',
    display: 'inline-block',
  }

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F5F5DC',
          fontFamily: 'system-ui, sans-serif',
          padding: '1rem',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }} aria-hidden="true">
            🦙
          </span>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#556B2F',
              marginBottom: '0.75rem',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: '#708090',
              marginBottom: '2rem',
              lineHeight: 1.6,
            }}
          >
            One of our alpacas seems to have wandered off with the page. Our team has
            been notified — please try again or head back home.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#556B2F',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9375rem',
              }}
            >
              Try again
            </button>
            <a href={`/${locale}`} style={btnBase}>
              Back to home
            </a>
            <a href={`/${locale}/tours`} style={btnBase}>
              Browse tours
            </a>
            <a href={`/${locale}/adopt`} style={btnBase}>
              Adopt an alpaca
            </a>
          </div>
          {error.digest && (
            <p
              style={{
                marginTop: '2rem',
                fontSize: '0.75rem',
                color: '#708090',
              }}
            >
              Error ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
