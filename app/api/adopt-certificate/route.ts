export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import React from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import { NextResponse } from 'next/server'
import { AdoptionCertificate } from '@/components/adopt/certificate-pdf'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sanitiseDisplayName } from '@/lib/html'
import { renderPdfToResponse } from '@/lib/pdf-renderer'

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

  // AdoptionCertificate renders a <Document> root; cast at the deliberate subset
  // boundary from FunctionComponentElement<CertificateProps> to
  // ReactElement<DocumentProps> — the runtime shape is identical.
  const element = React.createElement(AdoptionCertificate, {
    donorName,
    alpacaName,
    issuedAt,
    certificateId,
  }) as unknown as React.ReactElement<DocumentProps>

  return renderPdfToResponse(element, `adoption-certificate-${certificateId}.pdf`)
}
