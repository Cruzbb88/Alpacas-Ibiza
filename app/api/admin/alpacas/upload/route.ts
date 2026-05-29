import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { makeRequestLogger } from '@/lib/request-id'
import { alpacaGalleryStore } from '@/lib/alpaca-gallery-store'
import { ALPACAS } from '@/lib/data/alpacas'

const log = makeRequestLogger('admin-alpacas-upload', '')

/**
 * POST /api/admin/alpacas/upload
 *
 * NextAuth-gated owner-facing photo upload. Multipart body with:
 *   - alpacaSlug (string, required) — must match the canonical roster
 *   - file       (Blob,   required) — image/*, < 5 MB
 *   - alt        (string, optional) — defaults to "Photo of <Name>"
 *
 * On success: uploads to Vercel Blob via `put(filename, body, {access:'public'})`,
 * records the returned URL in the in-memory `alpacaGalleryStore`, and returns
 * `{ ok: true, url, alt }`.
 *
 * Fail modes:
 *   - 401 if no admin session (fail-CLOSED).
 *   - 503 if BLOB_READ_WRITE_TOKEN env var unset (graceful — same shape as
 *         the Stripe/Mollie checkout 503 contract).
 *   - 400 if alpacaSlug unknown, file missing, MIME not image/*, or > 5 MB.
 *   - 500 on Vercel Blob client errors.
 *
 * Failsafe: BLOB_READ_WRITE_TOKEN missing → documented in launch blockers
 * (CLAUDE.md env tier list — pending append once this lands).
 */

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(request: NextRequest) {
  // ── Auth gate (fail-CLOSED) ─────────────────────────────────────────────────
  const session = await getServerSession(auth)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Blob token gate (fail-graceful 503) ─────────────────────────────────────
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    log.error('[upload] BLOB_READ_WRITE_TOKEN unset — uploads disabled')
    return NextResponse.json(
      {
        error: 'blob-storage-unconfigured',
        note: 'BLOB_READ_WRITE_TOKEN env var not set. Owner upload disabled until configured in Vercel dashboard.',
      },
      { status: 503 },
    )
  }

  // ── Parse multipart body ────────────────────────────────────────────────────
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })
  }

  const alpacaSlug = form.get('alpacaSlug')
  const file = form.get('file')
  const altRaw = form.get('alt')

  if (typeof alpacaSlug !== 'string' || !alpacaSlug) {
    return NextResponse.json({ error: 'alpacaSlug is required' }, { status: 400 })
  }
  // `form.get('file')` returns `FormDataEntryValue | null` (= `string | File | null`).
  // Narrow by checking for the File-shaped surface we actually use (.type / .size / .name).
  if (
    file === null ||
    typeof file === 'string' ||
    typeof (file as { size?: unknown }).size !== 'number' ||
    typeof (file as { type?: unknown }).type !== 'string'
  ) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  const uploadedFile = file as { name?: string; type: string; size: number } & Blob

  // ── Validate alpaca slug against canonical roster ───────────────────────────
  const animal = ALPACAS.find((a) => a.id === alpacaSlug)
  if (!animal) {
    return NextResponse.json({ error: `Unknown alpaca slug: ${alpacaSlug}` }, { status: 400 })
  }

  // ── Validate file type + extension ──────────────────────────────────────────
  // Defence-in-depth: MIME check + extension allowlist. The MIME comes from the
  // client (spoofable), but combined with the extension allowlist we block SVG/HTML
  // uploads that could serve as stored-XSS on the public Blob CDN.
  const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif'])
  const mime = uploadedFile.type || ''
  if (!mime.startsWith('image/')) {
    return NextResponse.json({ error: 'file must be an image/*' }, { status: 400 })
  }
  const ext = (uploadedFile.name || '').split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: `extension .${ext} not allowed (use jpg/png/webp/avif)` }, { status: 400 })
  }
  if (uploadedFile.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `file too large (max ${MAX_BYTES} bytes, got ${uploadedFile.size})` },
      { status: 400 },
    )
  }

  const alt =
    typeof altRaw === 'string' && altRaw.trim().length > 0
      ? altRaw.trim().slice(0, 240)
      : `Photo of ${animal.name}`

  // ── Upload to Vercel Blob ───────────────────────────────────────────────────
  // Dynamic import keeps the build green when @vercel/blob is absent.
  let put: typeof import('@vercel/blob').put
  try {
    ;({ put } = await import('@vercel/blob'))
  } catch (err) {
    log.error('[upload] @vercel/blob SDK missing', { err: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'BLOB_SDK_MISSING' }, { status: 503 })
  }

  const filename = `alpacas/${alpacaSlug}/${Date.now()}-${sanitizeFilename(
    uploadedFile.name || 'upload.bin',
  )}`

  try {
    const blob = await put(filename, uploadedFile, { access: 'public' })
    const uploadedAt = new Date().toISOString()
    await alpacaGalleryStore.add(alpacaSlug, { url: blob.url, alt, uploadedAt })
    return NextResponse.json({ ok: true, url: blob.url, alt })
  } catch (err) {
    log.error('[upload] put() failed', { err: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'upload-failed' }, { status: 500 })
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
}
