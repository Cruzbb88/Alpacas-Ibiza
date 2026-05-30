import { fetchWithTimeout } from '@/lib/fetch'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_LIST_ID = process.env.SENDGRID_LIST_ID // optional
if (!SENDGRID_API_KEY) {
  console.warn('[newsletter] SENDGRID_API_KEY not defined; newsletter functionality will be disabled.')
}

interface NewsletterResponse {
  success: boolean
  message?: string
}

/**
 * subscribes an email address to the SendGrid Marketing list
 */
export async function subscribe(email: string): Promise<NewsletterResponse> {
  if (!SENDGRID_API_KEY) {
    return { success: false, message: 'API key not configured' }
  }

  const url = 'https://api.sendgrid.com/v3/marketing/contacts'
  const body: { contacts: Array<{ email: string }>; list_ids?: string[] } = { contacts: [{ email }] }
  if (SENDGRID_LIST_ID) {
    body.list_ids = [SENDGRID_LIST_ID]
  }

  const res = await fetchWithTimeout(url, {
    method: 'PUT', // PUT to upsert
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }, 5000)

  if (!res.ok) {
    const text = await res.text()
    console.error('[newsletter] sendgrid error', res.status, text)
    return { success: false, message: `SendGrid error ${res.status}` }
  }

  return { success: true }
}

/**
 * Removes an email address from the SendGrid Marketing list (global unsubscribe).
 *
 * Uses the SendGrid v3 suppression/unsubscribes endpoint — adds the address to
 * the global unsubscribe group so it is excluded from all future sends.
 * This satisfies CAN-SPAM §5(a)(6) and EU PECR opt-out obligations.
 *
 * Fail-quiet: provider down → logs only, returns { success: false }.
 * Never throws — callers must not treat a provider outage as a failure to
 * show the user; the unsubscribe page still renders success.
 */
export async function unsubscribe(email: string): Promise<NewsletterResponse> {
  if (!SENDGRID_API_KEY) {
    console.warn('[newsletter] unsubscribe: SENDGRID_API_KEY not configured — skipping provider call')
    return { success: false, message: 'API key not configured' }
  }

  // Step 1: add to global unsubscribes (suppression list — SendGrid honours on all sends)
  const suppressUrl = 'https://api.sendgrid.com/v3/asm/suppressions/global'
  try {
    const res = await fetchWithTimeout(suppressUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient_emails: [email] }),
    }, 5000)
    if (!res.ok) {
      const text = await res.text()
      console.warn('[newsletter] unsubscribe: sendgrid suppression error', res.status, text)
      return { success: false, message: `SendGrid suppression error ${res.status}` }
    }
  } catch (err) {
    console.warn('[newsletter] unsubscribe: network error adding suppression', String(err))
    return { success: false, message: 'Network error' }
  }

  // Step 2: if a list ID is set, remove the contact from the marketing list too
  if (SENDGRID_LIST_ID) {
    // Look up the contact ID first (required by the contacts DELETE endpoint)
    try {
      const searchUrl = 'https://api.sendgrid.com/v3/marketing/contacts/search/emails'
      const searchRes = await fetchWithTimeout(searchUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emails: [email] }),
      }, 5000)
      if (searchRes.ok) {
        // SendGrid v3 contact-search response: { result: { [email]: { contact: { id } } } }
        const data = (await searchRes.json()) as { result?: Record<string, { contact?: { id?: string } }> }
        const contactId: string | undefined = data?.result?.[email.toLowerCase()]?.contact?.id
        if (contactId) {
          const deleteUrl = `https://api.sendgrid.com/v3/marketing/contacts?ids=${encodeURIComponent(contactId)}`
          const delRes = await fetchWithTimeout(deleteUrl, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
          }, 5000)
          if (!delRes.ok) {
            const text = await delRes.text()
            console.warn('[newsletter] unsubscribe: contact delete error', delRes.status, text)
            // Non-fatal — suppression already added above
          }
        }
      }
    } catch (err) {
      console.warn('[newsletter] unsubscribe: contact lookup/delete failed', String(err))
      // Non-fatal — suppression already added
    }
  }

  return { success: true }
}
