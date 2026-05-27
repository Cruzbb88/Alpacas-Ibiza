'use client'
import { useEffect } from 'react'

/**
 * Catches uncaught errors + unhandled promise rejections in the browser and
 * posts them to /api/log-error. Mounted at root layout. Silent — never visible.
 *
 * Uses navigator.sendBeacon when available (survives page unload), falls back
 * to fetch with keepalive=true.
 */
export function ClientErrorReporter() {
  useEffect(() => {
    function send(payload: object) {
      const body = JSON.stringify(payload)
      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' })
          navigator.sendBeacon('/api/log-error', blob)
          return
        }
      } catch { /* sendBeacon may throw in private mode */ }
      try {
        fetch('/api/log-error', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => { /* silent — don't recurse */ })
      } catch { /* silent */ }
    }

    function onError(e: ErrorEvent) {
      send({
        message: e.message,
        stack: e.error instanceof Error ? e.error.stack : '',
        pathname: window.location.pathname,
        type: 'error',
      })
    }
    function onRejection(e: PromiseRejectionEvent) {
      const reason = e.reason
      send({
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : '',
        pathname: window.location.pathname,
        type: 'unhandledrejection',
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
