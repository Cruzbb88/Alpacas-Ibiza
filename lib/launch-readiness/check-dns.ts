/**
 * Launch-readiness: Email DNS checks (SPF, DKIM, DMARC).
 * Uses Node's dns.promises module. Results cached 1h in-memory.
 */

import dns from 'dns'
import type { CheckResult } from './check-env'

interface CacheEntry {
  results: CheckResult[]
  ts: number
}

// Process-scoped cache — 1h TTL
declare global {
  // eslint-disable-next-line no-var
  var __dnsCheckCache: Map<string, CacheEntry> | undefined
}
const cache: Map<string, CacheEntry> =
  globalThis.__dnsCheckCache ?? (globalThis.__dnsCheckCache = new Map())

const TTL_MS = 60 * 60 * 1000 // 1 hour

export async function checkEmailDNS(domain: string, bypassCache = false): Promise<CheckResult[]> {
  const now = Date.now()
  const cached = cache.get(domain)
  if (!bypassCache && cached && now - cached.ts < TTL_MS) {
    return cached.results
  }

  const results = await runDNSChecks(domain)
  cache.set(domain, { results, ts: now })
  return results
}

async function runDNSChecks(domain: string): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  // SPF
  try {
    const txtRecords = await dns.promises.resolveTxt(domain)
    const spfRecord = txtRecords.flat().find((r) => r.includes('v=spf1'))
    results.push({
      id: 'dns_spf',
      label: 'SPF record',
      status: spfRecord ? 'green' : 'red',
      detail: spfRecord
        ? `Found: ${spfRecord.slice(0, 80)}${spfRecord.length > 80 ? '…' : ''}`
        : `No v=spf1 record found on ${domain}`,
      fixHint: !spfRecord
        ? 'Resend dashboard → Domains → alpacasibiza.com → copy SPF TXT record → paste into DNS registrar'
        : undefined,
    })
  } catch {
    results.push({
      id: 'dns_spf',
      label: 'SPF record',
      status: 'red',
      detail: `DNS lookup failed for ${domain}`,
      fixHint: 'Check domain DNS is reachable',
    })
  }

  // DKIM (Resend uses resend._domainkey.<domain> CNAME)
  try {
    const cname = await dns.promises.resolveCname(`resend._domainkey.${domain}`)
    results.push({
      id: 'dns_dkim',
      label: 'DKIM (Resend)',
      status: cname.length > 0 ? 'green' : 'red',
      detail: cname.length > 0
        ? `CNAME found: ${cname[0]}`
        : `No CNAME at resend._domainkey.${domain}`,
      fixHint:
        cname.length === 0
          ? 'Resend dashboard → Domains → alpacasibiza.com → copy DKIM CNAME → paste into DNS registrar'
          : undefined,
    })
  } catch {
    results.push({
      id: 'dns_dkim',
      label: 'DKIM (Resend)',
      status: 'red',
      detail: `resend._domainkey.${domain} — NXDOMAIN or lookup error`,
      fixHint:
        'Resend dashboard → Domains → alpacasibiza.com → copy DKIM CNAME → paste into DNS registrar',
    })
  }

  // DMARC
  try {
    const txtRecords = await dns.promises.resolveTxt(`_dmarc.${domain}`)
    const dmarcRecord = txtRecords.flat().find((r) => r.includes('v=DMARC1'))
    results.push({
      id: 'dns_dmarc',
      label: 'DMARC record',
      status: dmarcRecord ? 'green' : 'red',
      detail: dmarcRecord
        ? `Found: ${dmarcRecord.slice(0, 80)}${dmarcRecord.length > 80 ? '…' : ''}`
        : `No v=DMARC1 record found on _dmarc.${domain}`,
      fixHint: !dmarcRecord
        ? 'Resend dashboard → Domains → alpacasibiza.com → copy DMARC TXT record → paste into DNS registrar'
        : undefined,
    })
  } catch {
    results.push({
      id: 'dns_dmarc',
      label: 'DMARC record',
      status: 'red',
      detail: `_dmarc.${domain} — NXDOMAIN or lookup error`,
      fixHint:
        'Resend dashboard → Domains → alpacasibiza.com → copy DMARC TXT record → paste into DNS registrar',
    })
  }

  return results
}
