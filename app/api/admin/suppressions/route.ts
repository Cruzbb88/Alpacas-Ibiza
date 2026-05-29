import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { listSuppressions, unsuppressEmail, suppressEmail } from '@/lib/email-suppression'
import { isValidEmail } from '@/lib/validate-email'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'

/**
 * Admin REST surface for the email suppression list.
 *
 * GET    /api/admin/suppressions             — list all entries (JSON)
 * POST   /api/admin/suppressions { email }   — manually suppress an address
 * DELETE /api/admin/suppressions?email=…     — unsuppress an address
 *
 * All routes require an authenticated admin session (next-auth). Returns 401
 * to anyone else — no leakage of "suppression list exists" beyond that.
 */

async function requireSession(request: Request) {
  const session = await getServerSession(auth)
  if (!session) {
    const reqId = getRequestId(request)
    return attachRequestId(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      reqId,
    )
  }
  return null
}

export async function GET(request: Request) {
  const sessionErr = await requireSession(request)
  if (sessionErr) return sessionErr

  const reqId = getRequestId(request)
  return attachRequestId(
    NextResponse.json({ entries: listSuppressions() }),
    reqId,
  )
}

export async function POST(request: Request) {
  const sessionErr = await requireSession(request)
  if (sessionErr) return sessionErr

  const reqId = getRequestId(request)
  const log = makeRequestLogger('admin-suppressions-post', reqId)

  let body: { email?: unknown }
  try {
    body = await request.json()
  } catch {
    return attachRequestId(
      NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
      reqId,
    )
  }
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!isValidEmail(email)) {
    return attachRequestId(
      NextResponse.json({ error: 'Valid email required' }, { status: 400 }),
      reqId,
    )
  }

  suppressEmail(email, 'manual')
  log.info('manually suppressed', { email_first4: email.slice(0, 4) + '…' })
  return attachRequestId(NextResponse.json({ ok: true, email }), reqId)
}

export async function DELETE(request: Request) {
  const sessionErr = await requireSession(request)
  if (sessionErr) return sessionErr

  const reqId = getRequestId(request)
  const log = makeRequestLogger('admin-suppressions-delete', reqId)

  const email = (new URL(request.url).searchParams.get('email') ?? '').trim()
  if (!isValidEmail(email)) {
    return attachRequestId(
      NextResponse.json({ error: 'Valid email required' }, { status: 400 }),
      reqId,
    )
  }

  const removed = unsuppressEmail(email)
  log.info('unsuppress requested', {
    email_first4: email.slice(0, 4) + '…',
    removed,
  })
  return attachRequestId(NextResponse.json({ ok: true, email, removed }), reqId)
}
