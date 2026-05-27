/**
 * GA4 enhanced engagement events — scroll depth, outbound links, file downloads.
 *
 * This module has NO React dependency and NO 'use client' directive so it can be
 * imported from server-safe paths and tested in Node without JSDOM.
 *
 * All functions are no-ops when:
 *   - called during SSR (typeof window === 'undefined')
 *   - window.gtag is not a function (e.g. Consent Mode v2 has denied analytics_storage)
 */
export const trackEngagement = {
  scrollDepth(percent: 25 | 50 | 75 | 100, path: string) {
    if (typeof window === 'undefined') return
    if (typeof window.gtag !== 'function') return
    window.gtag('event', 'scroll_depth', { percent, page_path: path })
  },

  outboundLink(href: string, label?: string) {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
    window.gtag('event', 'outbound_click', { link_url: href, link_label: label })
  },

  fileDownload(href: string, filename: string) {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'unknown'
    window.gtag('event', 'file_download', { file_name: filename, file_extension: ext, link_url: href })
  },
}
