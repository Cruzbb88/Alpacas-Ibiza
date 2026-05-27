import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { auth } from '@/app/api/auth/[...nextauth]/route'

/**
 * POST /api/admin/content-stage
 *
 * NextAuth-gated. Accepts a content patch JSON payload and writes it to
 * /staging/<ISO-date>-content-patch.json on the server filesystem.
 *
 * Fail modes:
 * - 401 if not authenticated (no session).
 * - 400 if body is not valid JSON or missing _meta.version field.
 * - 501 if running on a read-only deploy (Vercel serverless — no persistent FS).
 * - 500 on unexpected write errors.
 *
 * Vercel note: Vercel serverless functions run on an ephemeral read-only
 * filesystem. The /tmp dir is writable but not persistent. This route detects
 * the Vercel environment and returns 501 with a note, so the owner falls back
 * to the "Download patch" button. On Node.js self-hosted deploys (Railway,
 * VPS, local dev) the write succeeds.
 *
 * Failsafe entry added to CLAUDE.md in-code failsafe map.
 */

export async function POST(request: NextRequest) {
  // ── Auth gate (fail-CLOSED) ─────────────────────────────────────────────────
  const session = await getServerSession(auth)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Basic shape check: must have _meta.version = 1
  if (
    typeof body !== 'object' ||
    body === null ||
    !('_meta' in body) ||
    typeof (body as Record<string, unknown>)._meta !== 'object' ||
    (body as { _meta: { version?: unknown } })._meta?.version !== 1
  ) {
    return NextResponse.json(
      { error: 'Payload must include _meta.version = 1' },
      { status: 400 },
    )
  }

  // ── Vercel / read-only FS detection ─────────────────────────────────────────
  const isVercel = !!process.env.VERCEL
  if (isVercel) {
    return NextResponse.json(
      {
        error: 'staging-unavailable',
        note: 'Running on Vercel (read-only FS). Use "Download patch" instead and apply the JSON file manually.',
      },
      { status: 501 },
    )
  }

  // ── Write to /staging/ ──────────────────────────────────────────────────────
  // Dynamic import so the build doesn't fail on edge runtimes that lack 'fs'.
  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    // Resolve /staging relative to the project root (process.cwd() in Next.js = project root).
    const stagingDir = path.join(process.cwd(), 'staging')
    await fs.mkdir(stagingDir, { recursive: true })

    const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const filename = `${date}-content-patch.json`
    const filePath = path.join(stagingDir, filename)

    await fs.writeFile(filePath, JSON.stringify(body, null, 2), 'utf-8')

    return NextResponse.json({ path: `staging/${filename}`, status: 'saved' })
  } catch (err) {
    console.error('[content-stage] write error:', err)
    return NextResponse.json(
      { error: 'Write failed — see server logs' },
      { status: 500 },
    )
  }
}
