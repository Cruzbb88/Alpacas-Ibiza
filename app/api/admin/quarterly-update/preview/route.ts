import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getQuarterlyContent } from '@/lib/quarterly-content-store'
import { buildAdoptQuarterlyUpdateEmail } from '@/lib/email-templates'
import { getRequestId, attachRequestId } from '@/lib/request-id'

/**
 * GET /api/admin/quarterly-update/preview?quarter=Q1+2026
 *
 * Renders the quarterly email for the given quarter using a SAMPLE recipient
 * ("Sample Adopter" / alpacaName "Paco") so the owner sees what donors will
 * receive. Returns text/html, never sends anything.
 *
 * Admin session gated — public access would leak the unsent draft.
 *
 * Pulls farmNewsHtml from `lib/quarterly-content-store.ts`. When the requested
 * quarter has no content yet, the email-template's placeholder copy renders so
 * the owner sees what would go out absent a draft.
 */
export async function GET(request: Request) {
  const reqId = getRequestId(request)

  const session = await getServerSession(auth)
  if (!session) {
    return attachRequestId(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      reqId,
    )
  }

  const quarter = (new URL(request.url).searchParams.get('quarter') ?? '').trim()
  if (!/^Q[1-4] \d{4}$/.test(quarter)) {
    return attachRequestId(
      NextResponse.json(
        { error: 'quarter must match format "Q1 2026"' },
        { status: 400 },
      ),
      reqId,
    )
  }

  const stored = getQuarterlyContent(quarter)
  const { subject, html } = buildAdoptQuarterlyUpdateEmail({
    name: 'Sample Adopter',
    alpacaName: 'Paco',
    quarterLabel: quarter,
    locale: 'en',
    ...(stored?.newsHtml ? { farmNewsHtml: stored.newsHtml } : {}),
  })

  // Wrap with a small header banner so the owner remembers this is a preview.
  const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Preview: ${subject}</title>
<meta name="robots" content="noindex,nofollow" />
</head>
<body style="margin:0;background:#f9fafb">
  <div style="background:#fef3c7;border-bottom:1px solid #fcd34d;padding:12px 16px;font-family:system-ui,sans-serif;font-size:13px;color:#78350f">
    <strong>Preview only.</strong> Subject line: <code style="background:#fde68a;padding:2px 6px;border-radius:3px">${subject}</code>${stored?.newsHtml ? '' : ' · No draft saved for this quarter — placeholder copy shown.'}
  </div>
  ${html}
</body>
</html>`

  return new NextResponse(previewHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
