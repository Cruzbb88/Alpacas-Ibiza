import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { setQuarterlyContent } from '@/lib/quarterly-content-store'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'

/**
 * POST /api/admin/quarterly-update
 *
 * Admin-gated. Saves the farm-news HTML for a given quarter into the
 * in-memory store. The /api/adopt-quarterly-update cron reads from this
 * store at handler time.
 *
 * Body: { quarter: "Q1 2026", newsHtml: "<p>...</p>" }
 * Returns: { ok: true, quarter, updatedAt }
 *
 * Sanitisation policy: we accept caller-supplied HTML AS-IS because the
 * recipient is the owner — the same person composing it. We strip
 * <script> tags as a belt-and-braces guard against future scenarios
 * where this content might be exposed to a less-trusted writer.
 */
export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('admin-quarterly-update', reqId)

  const session = await getServerSession(auth)
  if (!session) {
    return attachRequestId(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      reqId,
    )
  }

  let body: { quarter?: unknown; newsHtml?: unknown }
  try {
    body = await request.json()
  } catch {
    return attachRequestId(
      NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
      reqId,
    )
  }

  const quarter = typeof body.quarter === 'string' ? body.quarter.trim() : ''
  const newsHtmlRaw = typeof body.newsHtml === 'string' ? body.newsHtml : ''

  if (!/^Q[1-4] \d{4}$/.test(quarter)) {
    return attachRequestId(
      NextResponse.json(
        { error: 'quarter must match format "Q1 2026"' },
        { status: 400 },
      ),
      reqId,
    )
  }
  if (newsHtmlRaw.trim().length === 0) {
    return attachRequestId(
      NextResponse.json({ error: 'newsHtml is required' }, { status: 400 }),
      reqId,
    )
  }

  // Strip <script>...</script> blocks. Belt-and-braces — the route is admin-
  // gated so a malicious script here only hurts the owner, but the policy
  // documents that the cron's email path never receives executable content.
  const newsHtml = newsHtmlRaw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/\s(?:href|src|action)\s*=\s*["']?\s*javascript:[^"'>]*/gi, '')
    .slice(0, 50_000) // hard cap to bound memory + email size

  const saved = setQuarterlyContent(quarter, newsHtml)
  log.info('saved quarterly content', { quarter, length: newsHtml.length })

  return attachRequestId(
    NextResponse.json({ ok: true, quarter: saved.quarter, updatedAt: saved.updatedAt }),
    reqId,
  )
}
