export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { AdoptionCertificate } from '@/components/adopt/certificate-pdf'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sanitiseDisplayName } from '@/lib/html'

async function importReactPdf() {
  try {
    return await import('@react-pdf/renderer')
  } catch {
    return null
  }
}


export async function GET(request: Request) {
  const ip = getClientIp(request)
  const limited = rateLimit({ key: `adopt-cert:${ip}`, limit: 10, windowMs: 5 * 60 * 1000 })
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, code: 'RATE_LIMITED' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(limited.resetMs / 1000)) },
    })
  }

  const url = new URL(request.url)
  const donorName = sanitiseDisplayName(url.searchParams.get('donor_name')) ?? 'Honoured friend'
  const alpacaName = sanitiseDisplayName(url.searchParams.get('alpaca_name'))
  const issuedAt = new Date().toISOString()
  const certificateId = crypto.randomUUID().slice(0, 8).toUpperCase()

  const pdfLib = await importReactPdf()
  if (!pdfLib) {
    console.warn('[adopt-certificate] @react-pdf/renderer missing — returning 503')
    return NextResponse.json({ ok: false, code: 'PDF_SDK_MISSING' }, { status: 503 })
  }

  try {
    // AdoptionCertificate renders a <Document> root; cast at the
    // deliberate subset boundary from FunctionComponentElement<CertificateProps>
    // to ReactElement<DocumentProps> — the runtime shape is identical.
    const element = React.createElement(AdoptionCertificate, {
      donorName,
      alpacaName,
      issuedAt,
      certificateId,
    }) as unknown as React.ReactElement<DocumentProps>

    const stream = await pdfLib.renderToStream(element)

    // @ts-expect-error renderToStream returns a Node.js Readable; Response accepts it on Node runtime
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="adoption-certificate-${certificateId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[adopt-certificate] PDF render error', err)
    return NextResponse.json({ ok: false, code: 'PDF_RENDER_ERROR' }, { status: 500 })
  }
}
