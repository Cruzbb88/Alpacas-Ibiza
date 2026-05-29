import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { makeRequestLogger } from '@/lib/request-id'
import { alpacaGalleryStore } from '@/lib/alpaca-gallery-store'
import { ALPACAS } from '@/lib/data/alpacas'

const log = makeRequestLogger('admin-alpacas-delete-upload', '')

/**
 * DELETE /api/admin/alpacas/delete-upload?alpacaSlug=…&url=…
 *
 * NextAuth-gated. Removes the upload from the in-memory store AND deletes
 * the Vercel Blob object via `del(url)`.
 *
 * Static `AnimalEntity.gallery` photos (owner-typed in code) cannot be
 * deleted from here — they live in tenant content modules. This route
 * silently 404s if the URL isn't in the runtime store, which also covers
 * the case where a caller tries to delete a static photo.
 *
 * Fail modes:
 *   - 401 if no admin session.
 *   - 503 if BLOB_READ_WRITE_TOKEN unset.
 *   - 400 if alpacaSlug / url missing or alpacaSlug unknown.
 *   - 404 if url is not in this slug's upload list.
 *   - 500 if `del()` throws (record removed from store either way).
 */

export async function DELETE(request: NextRequest) {
  // ── Auth gate (fail-CLOSED) ─────────────────────────────────────────────────
  const session = await getServerSession(auth)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Blob token gate (fail-graceful 503) ─────────────────────────────────────
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    log.error('[delete-upload] BLOB_READ_WRITE_TOKEN unset')
    return NextResponse.json(
      { error: 'blob-storage-unconfigured' },
      { status: 503 },
    )
  }

  const { searchParams } = new URL(request.url)
  const alpacaSlug = searchParams.get('alpacaSlug')
  const url = searchParams.get('url')

  if (!alpacaSlug) {
    return NextResponse.json({ error: 'alpacaSlug is required' }, { status: 400 })
  }
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }
  if (!ALPACAS.find((a) => a.id === alpacaSlug)) {
    return NextResponse.json({ error: `Unknown alpaca slug: ${alpacaSlug}` }, { status: 400 })
  }

  // ── Confirm the URL exists in this slug's upload list (404 if not) ──────────
  const uploads = await alpacaGalleryStore.list(alpacaSlug)
  if (!uploads.some((u) => u.url === url)) {
    return NextResponse.json(
      { error: 'upload not found for this alpaca (may be a static gallery photo)' },
      { status: 404 },
    )
  }

  // ── Remove from store first ─────────────────────────────────────────────────
  await alpacaGalleryStore.remove(alpacaSlug, url)

  // ── Best-effort delete from Vercel Blob ─────────────────────────────────────
  try {
    const { del } = await import('@vercel/blob')
    await del(url)
  } catch (err) {
    log.error('[delete-upload] del() failed', { err: err instanceof Error ? err.message : String(err) })
    // Store has been updated; report 500 so the operator knows the blob may linger,
    // but the UI list will already be correct on next render.
    return NextResponse.json(
      { ok: false, error: 'blob-del-failed', note: 'Removed from store; blob may persist.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
