import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { AdminSignOutButton } from '@/components/admin/sign-out-button'

export const dynamic = 'force-dynamic'

interface AdminLink {
  href: string
  title: string
  description: string
  category: 'launch' | 'ops' | 'content' | 'analytics' | 'tools'
}

const ADMIN_LINKS: AdminLink[] = [
  // Launch — setup wizard is FIRST so it surfaces on first login
  { href: '/admin/setup', title: 'Launch setup wizard', description: 'Step-by-step: every API key + sign-up needed for launch, with verify buttons. Start here.', category: 'launch' },
  { href: '/admin/launch-readiness', title: 'Launch readiness', description: '27 live checks — env vars, DNS, content, deploy. Start here before go-live.', category: 'launch' },
  { href: '/admin/env-check', title: 'Environment check', description: 'Per-env-var status with masked previews.', category: 'launch' },
  { href: '/admin/email-setup', title: 'Email setup', description: 'Resend domain verification status + DNS guide.', category: 'launch' },

  // Ops
  { href: '/admin/monitoring', title: 'Monitoring', description: 'Live ops overview — payments, webhooks, email, crons + recent errors. Scan system health in 30 seconds.', category: 'ops' },
  { href: '/admin/migration', title: 'FareHarbor migration', description: 'Paste a FareHarbor CSV export → get per-customer Stripe Checkout links.', category: 'ops' },
  { href: '/admin/quarterly-update', title: 'Quarterly update', description: 'Manually trigger the quarterly adopter email (cron also runs Jan/Apr/Jul/Oct 1).', category: 'ops' },
  { href: '/admin/suppressions', title: 'Email suppressions', description: 'Bounce + complaint list. Add/remove suppressed addresses.', category: 'ops' },

  // Content
  { href: '/admin/content', title: 'Content staging', description: 'Edit homepage / about / hero copy (dev only — Vercel is read-only filesystem).', category: 'content' },
  { href: '/admin/alpacas', title: 'Alpaca profiles', description: 'Per-alpaca bio + personality + photo path management.', category: 'content' },

  // Analytics
  { href: '/admin/analytics', title: 'Analytics overview', description: 'GA4 + booking + adoption metrics dashboard.', category: 'analytics' },
  { href: '/admin/analytics/subscriptions', title: 'Subscriptions', description: 'Active, new, and churned Stripe/Mollie subscriptions with 60s cache.', category: 'analytics' },
  { href: '/admin/analytics/dunning', title: 'Dunning tracker', description: 'At-risk and action-required donors from the in-memory failure tracker.', category: 'analytics' },
  { href: '/admin/analytics/vat', title: 'VAT / OSS threshold', description: 'EU OSS threshold remaining and per-country revenue breakdown.', category: 'analytics' },
  { href: '/admin/analytics/referrals', title: 'Referrals', description: 'Referral code attribution and reward status.', category: 'analytics' },
  { href: '/admin/analytics/events', title: 'Events log', description: 'Recent custom analytics events.', category: 'analytics' },

  // Tools
  { href: '/admin/email-previews', title: 'Email previews', description: 'Render every transactional email template in a sandboxed iframe.', category: 'tools' },
  { href: '/admin/birthday-test', title: 'Birthday card test', description: 'Manually trigger the alpaca birthday-card cron for a specific date.', category: 'tools' },
]

const CATEGORY_LABELS: Record<AdminLink['category'], string> = {
  launch: 'Launch readiness',
  ops: 'Daily operations',
  content: 'Content',
  analytics: 'Analytics',
  tools: 'Developer tools',
}

const CATEGORY_ORDER: AdminLink['category'][] = ['launch', 'ops', 'content', 'analytics', 'tools']

export default async function AdminIndex() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    links: ADMIN_LINKS.filter((l) => l.category === category),
  })).filter((g) => g.links.length > 0)

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      {/* Install banner — visible on mobile only, hidden on md+ */}
      <div className="md:hidden mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        On your phone? Tap browser menu → <strong>Add to Home Screen</strong> to install Alpacas Admin.
      </div>

      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium">{session.user?.name ?? 'admin'}</span> — 8-hour session.
          </p>
        </div>
        <AdminSignOutButton />
      </div>

      {/* Today card — primary entry point for daily ops on mobile */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Daily
        </h2>
        <Link
          href="/admin/today"
          className="block rounded-xl border-2 border-primary bg-primary/5 p-5 hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 min-h-[56px]"
        >
          <div className="font-bold text-lg text-primary">Today&apos;s ops digest</div>
          <div className="text-sm text-muted-foreground mt-1">
            Tours, adopters, at-risk donors, quick actions — tap here first every morning.
          </div>
        </Link>
      </section>

      <nav className="space-y-10">
        {grouped.map((group) => (
          <section key={group.category}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              {CATEGORY_LABELS[group.category]}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <div className="font-semibold text-foreground">{link.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{link.description}</div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </nav>
    </main>
  )
}
