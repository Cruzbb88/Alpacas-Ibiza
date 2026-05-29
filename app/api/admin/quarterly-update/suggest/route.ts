import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getTenant } from '@/lib/tenants/server'
import { getProviders } from '@/lib/integrations'
import { buildQuarterStarterDraft } from '@/lib/quarterly-suggest'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'

/**
 * GET /api/admin/quarterly-update/suggest?quarter=Q1+2026
 *
 * Admin-gated. Builds a deterministic "starter draft" HTML string for the
 * given quarter, using the tenant's content provider for the animal roster.
 *
 * No AI / OpenAI / external services are called — the owner is the editor,
 * "suggest" is a pure-function sketch that cuts the blank-textarea problem.
 *
 * Returns: { ok: true, draftHtml: "<p>...</p>..." }
 */
export async function GET(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('admin-quarterly-suggest', reqId)

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

  const tenant = await getTenant()
  const providers = getProviders(tenant)
  const animals = providers.content.listAnimals()

  const draftHtml = buildQuarterStarterDraft({ quarter, animals })
  log.info('built quarterly starter draft', {
    quarter,
    animalCount: animals.length,
    length: draftHtml.length,
  })

  return attachRequestId(
    NextResponse.json({ ok: true, draftHtml }),
    reqId,
  )
}
