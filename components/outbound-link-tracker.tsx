'use client'
import { useEffect } from 'react'
import { trackEngagement } from '@/lib/analytics-engagement'

export function OutboundLinkTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest('a')
      if (!a) return
      const href = a.getAttribute('href') ?? ''
      if (!href) return

      // Outbound link: starts with http(s) and host !== current host
      try {
        const url = new URL(href, window.location.origin)
        if (url.host && url.host !== window.location.host) {
          trackEngagement.outboundLink(url.toString(), a.textContent ?? undefined)
          return
        }
      } catch { /* invalid URL — skip */ }

      // File download: known extension
      const lower = href.toLowerCase()
      const exts = ['.pdf', '.zip', '.docx', '.xlsx', '.csv', '.epub']
      if (exts.some((ext) => lower.endsWith(ext))) {
        const filename = lower.split('/').pop() ?? lower
        trackEngagement.fileDownload(href, filename)
      }
    }
    document.addEventListener('click', onClick, { capture: true, passive: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])
  return null
}
