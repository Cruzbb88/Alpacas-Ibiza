/**
 * PDF render helper — shared by adopt-certificate and donor-receipt.
 *
 * Handles:
 *   - Dynamic import of @react-pdf/renderer (safe build without SDK)
 *   - The @ts-expect-error cast for Node.js Readable → Response
 *   - Content-Type, Content-Disposition, Cache-Control headers
 *   - 503 if SDK missing, 500 on render error
 */

import type { ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'

async function importReactPdf() {
  try {
    return await import('@react-pdf/renderer')
  } catch {
    return null
  }
}

/**
 * Render a react-pdf `<Document>` element to a streaming PDF Response.
 *
 * @param doc      ReactElement whose root is a react-pdf `<Document>` component.
 * @param filename Filename for Content-Disposition (without path, e.g. "receipt-R-ABC.pdf").
 * @param extra    Optional extra response headers (e.g. X-Robots-Tag).
 *
 * Returns a 503 if the SDK is not installed, a 500 on render error,
 * or a 200 streaming application/pdf response on success.
 */
export async function renderPdfToResponse(
  doc: ReactElement<DocumentProps>,
  filename: string,
  extra?: Record<string, string>,
): Promise<Response> {
  const pdfLib = await importReactPdf()
  if (!pdfLib) {
    console.warn('[pdf-renderer] @react-pdf/renderer missing — returning 503')
    const { NextResponse } = await import('next/server')
    return NextResponse.json({ ok: false, code: 'PDF_SDK_MISSING' }, { status: 503 })
  }

  try {
    const stream = await pdfLib.renderToStream(doc)

    // @ts-expect-error renderToStream returns a Node.js Readable; Response accepts it on Node runtime
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
        ...extra,
      },
    })
  } catch (err) {
    console.error('[pdf-renderer] render error', err)
    const { NextResponse } = await import('next/server')
    return NextResponse.json({ ok: false, code: 'PDF_RENDER_ERROR' }, { status: 500 })
  }
}
