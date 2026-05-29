/**
 * Shared HTML response shell for /api/mollie-manage/{cancel,status,update-payment}.
 *
 * These three routes each used to inline a near-identical `htmlPage(title, body, status)`
 * helper — same `<head>` block, same footer line, same response headers. The diff
 * between them was a handful of route-specific CSS rules. Extracting consolidates ~72
 * lines and removes the risk of one route's noindex tag drifting from another's.
 *
 * SECURITY: all three routes carry capability tokens. The response headers below
 * (no-store + X-Robots-Tag: noindex) are NOT optional — see the CLAUDE.md failsafe
 * map "mollie-manage HTML routes set X-Robots-Tag: noindex, nofollow".
 */
import { NextResponse } from 'next/server'
import { SITE_BASE_URL } from './config.ts'

/** Base CSS shared by every mollie-manage HTML page. */
const BASE_CSS = `
  body{font-family:system-ui,sans-serif;background:#f9f9f9;color:#2d2d2d;margin:0;padding:48px 24px;line-height:1.5}
  main{max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
  h1{color:#556B2F;font-size:24px;margin:0 0 16px}
  a{color:#556B2F}
  .muted{color:#888;font-size:13px;margin-top:24px}
  form{margin-top:24px}
  a.cancel{display:inline-block;margin-left:12px;color:#888;font-size:14px}
`.trim()

export interface HtmlMollieManageOpts {
  /** Extra CSS appended after BASE_CSS. Route-specific buttons, badges, grids. */
  extraCss?: string
  /** Override the default 560px `main` max-width (status page uses 640). */
  mainMaxWidthPx?: number
}

/**
 * Render an HTML response for a mollie-manage route.
 *
 * @param title  Page title text (also <title> tag content).
 * @param body   Main content HTML, slotted inside <main>. Caller is responsible
 *               for HTML-escaping any donor-controlled data they inject.
 * @param status HTTP status code — 200 for success, 4xx for invalid links, etc.
 * @param opts   Optional CSS overrides; see HtmlMollieManageOpts.
 */
export function htmlMollieManagePage(
  title: string,
  body: string,
  status: number,
  opts: HtmlMollieManageOpts = {},
): NextResponse {
  const mainWidth = opts.mainMaxWidthPx ?? 560
  const overrideCss = mainWidth !== 560
    ? `\n  main{max-width:${mainWidth}px}`
    : ''
  const extra = opts.extraCss ? `\n${opts.extraCss}` : ''
  const css = `${BASE_CSS}${overrideCss}${extra}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title} — Alpacas Ibiza</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<style>
${css}
</style>
</head>
<body><main>${body}<p class="muted">Alpacas Ibiza · <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a> · <a href="${SITE_BASE_URL}">${SITE_BASE_URL}</a></p></main></body>
</html>`
  return new NextResponse(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
