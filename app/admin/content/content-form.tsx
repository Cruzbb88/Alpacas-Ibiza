'use client'

import { useState, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContentPatch {
  _meta: { generatedAt: string; version: 1 }
  brand: {
    primaryHex: string
    accentHex: string
    themeColorHex: string
  }
  tenant: {
    cif: string
    noreplyEmail: string
    logoUrl: string
    ogImageUrl: string
    googleReviewUrl: string
    twitterHandle: string
    instagramUrl: string
  }
  alpacas: Array<{ id: string; name: string; bio: string; imageUrl: string }>
  press: Array<{ id: string; outlet: string; logoUrl: string; articleUrl: string }>
  testimonials: Array<{
    id: string
    name: string
    date: string
    rating: string
    body: string
    source: string
    locale: string
  }>
  awards: Array<{
    id: string
    name: string
    issuer: string
    category: string
    year: string
    verifyUrl: string
    logoUrl: string
  }>
  events: Array<{
    id: string
    title: string
    type: string
    date: string
    recurrence: string
    durationMinutes: string
    priceLabel: string
    ctaUrl: string
    description: string
  }>
  media: Array<{
    id: string
    photoUrl: string
    caption: string
    category: string
  }>
  journal: Array<{
    slug: string
    title: string
    excerpt: string
    body: string
    author: string
    date: string
    category: string
    heroImage: string
  }>
  fareHarbor: {
    tourMeetHerd: string
    tourWeavingWorkshop: string
    tourFarmExperience: string
    tourPhotoSession: string
    yoga: string
    woven: string
    commission: string
    alcaca: string
    giftCard: string
    romanticSunset: string
    weddings: string
    photoshoots: string
    businessIncentives: string
    familyFarmDays: string
  }
  stripe: {
    adoptPriceIdMonthly: string
    adoptPriceIdYearly: string
    discountCodeWeaving: string
    discountCodeFarmshop: string
  }
  legal: {
    privacyBody: string
    termsBody: string
    cookiesBody: string
  }
}

// ── Seed data (current values from source files, UNMAPPED shown as empty) ────

const ALPACA_SEEDS = [
  { id: 'barbarella', name: 'Barbarella' },
  { id: 'avalon',     name: 'Avalon' },
  { id: 'bardot',     name: 'Bardot' },
  { id: 'chet',       name: 'Chet' },
  { id: 'dusty',      name: 'Dusty' },
  { id: 'fela',       name: 'Fela' },
  { id: 'fonda',      name: 'Fonda' },
  { id: 'lewis',      name: 'Lewis' },
  { id: 'marron',     name: 'Marron' },
  { id: 'mojo',       name: 'Mojo' },
  { id: 'moloko',     name: 'Moloko' },
  { id: 'nelson',     name: 'Nelson' },
  { id: 'suki',       name: 'Suki' },
  { id: 'toots',      name: 'Toots' },
]

const PRESS_SEEDS = [
  { id: 'gazet-van-antwerpen-metropool', outlet: 'Gazet van Antwerpen — Metropool' },
  { id: 'gazet-van-antwerpen',           outlet: 'Gazet van Antwerpen' },
  { id: 'hln',                           outlet: 'Het Laatste Nieuws (HLN)' },
  { id: 'hln-kempen',                    outlet: 'HLN — Kempen' },
  { id: 'tribes-and-nomads',             outlet: 'Tribes & Nomads' },
  { id: 'diario',                        outlet: 'Diario de Ibiza' },
]

function blankAlpacas() {
  return ALPACA_SEEDS.map((a) => ({ id: a.id, name: a.name, bio: '', imageUrl: '' }))
}

function blankPress() {
  return PRESS_SEEDS.map((p) => ({ id: p.id, outlet: p.outlet, logoUrl: '', articleUrl: '' }))
}

function buildInitialPatch(): ContentPatch {
  return {
    _meta: { generatedAt: '', version: 1 },
    brand: { primaryHex: '#556B2F', accentHex: '#AD561A', themeColorHex: '#6da855' },
    tenant: {
      cif: '',
      noreplyEmail: '',
      logoUrl: '',
      ogImageUrl: '',
      googleReviewUrl: '',
      twitterHandle: '',
      instagramUrl: 'https://www.instagram.com/wishfulfillingweaving/',
    },
    alpacas: blankAlpacas(),
    press: blankPress(),
    testimonials: [],
    awards: [],
    events: [],
    media: [],
    journal: [],
    fareHarbor: {
      tourMeetHerd: '', tourWeavingWorkshop: '', tourFarmExperience: '', tourPhotoSession: '',
      yoga: '', woven: '', commission: '', alcaca: '',
      giftCard: '', romanticSunset: '', weddings: '', photoshoots: '',
      businessIncentives: '', familyFarmDays: '',
    },
    stripe: {
      adoptPriceIdMonthly: '', adoptPriceIdYearly: '',
      discountCodeWeaving: '', discountCodeFarmshop: '',
    },
    legal: { privacyBody: '', termsBody: '', cookiesBody: '' },
  }
}

// ── Helper field components ───────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'textarea' | 'color' | 'url'
  placeholder?: string
  hint?: string
}) {
  const base = 'w-full rounded border border-gray-300 px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-olive-600'
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      {type === 'textarea' ? (
        <textarea
          className={`${base} h-28 resize-y`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : type === 'color' ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-12 cursor-pointer rounded border border-gray-300 p-0.5"
          />
          <input
            type="text"
            className={`${base} w-32`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#RRGGBB"
          />
        </div>
      ) : (
        <input
          type={type}
          className={base}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="mb-4 rounded-lg border border-gray-200 bg-white shadow-sm">
      <summary className="cursor-pointer select-none rounded-lg bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800 hover:bg-gray-100">
        {title}
      </summary>
      <div className="px-4 pb-4 pt-3">{children}</div>
    </details>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function ContentStagingForm() {
  const [patch, setPatch] = useState<ContentPatch>(buildInitialPatch)
  const [staged, setStaged] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [postMsg, setPostMsg] = useState<string | null>(null)

  // Generic nested setter helpers
  const setField = useCallback(
    <K extends keyof ContentPatch>(section: K) =>
      (field: string, value: string) => {
        setPatch((prev) => ({
          ...prev,
          [section]: { ...(prev[section] as Record<string, unknown>), [field]: value },
        }))
      },
    [],
  )

  const setAlpaca = (idx: number, field: string, value: string) => {
    setPatch((prev) => {
      const updated = [...prev.alpacas]
      updated[idx] = { ...updated[idx], [field]: value }
      return { ...prev, alpacas: updated }
    })
  }

  const setPressMention = (idx: number, field: string, value: string) => {
    setPatch((prev) => {
      const updated = [...prev.press]
      updated[idx] = { ...updated[idx], [field]: value }
      return { ...prev, press: updated }
    })
  }

  // Add row helpers for empty arrays
  const addTestimonial = () =>
    setPatch((prev) => ({
      ...prev,
      testimonials: [
        ...prev.testimonials,
        { id: `t-${Date.now()}`, name: '', date: '', rating: '', body: '', source: 'facebook', locale: 'en' },
      ],
    }))

  const setTestimonial = (idx: number, field: string, value: string) => {
    setPatch((prev) => {
      const updated = [...prev.testimonials]
      updated[idx] = { ...updated[idx], [field]: value }
      return { ...prev, testimonials: updated }
    })
  }

  const addAward = () =>
    setPatch((prev) => ({
      ...prev,
      awards: [
        ...prev.awards,
        { id: `award-${Date.now()}`, name: '', issuer: '', category: 'tourism', year: '', verifyUrl: '', logoUrl: '' },
      ],
    }))

  const setAward = (idx: number, field: string, value: string) => {
    setPatch((prev) => {
      const updated = [...prev.awards]
      updated[idx] = { ...updated[idx], [field]: value }
      return { ...prev, awards: updated }
    })
  }

  const addEvent = () =>
    setPatch((prev) => ({
      ...prev,
      events: [
        ...prev.events,
        { id: `event-${Date.now()}`, title: '', type: 'other', date: '', recurrence: '', durationMinutes: '', priceLabel: '', ctaUrl: '', description: '' },
      ],
    }))

  const setEvent = (idx: number, field: string, value: string) => {
    setPatch((prev) => {
      const updated = [...prev.events]
      updated[idx] = { ...updated[idx], [field]: value }
      return { ...prev, events: updated }
    })
  }

  const addMedia = () =>
    setPatch((prev) => ({
      ...prev,
      media: [
        ...prev.media,
        { id: `photo-${Date.now()}`, photoUrl: '', caption: '', category: 'farm' },
      ],
    }))

  const setMedia = (idx: number, field: string, value: string) => {
    setPatch((prev) => {
      const updated = [...prev.media]
      updated[idx] = { ...updated[idx], [field]: value }
      return { ...prev, media: updated }
    })
  }

  const addJournalPost = () =>
    setPatch((prev) => ({
      ...prev,
      journal: [
        ...prev.journal,
        { slug: '', title: '', excerpt: '', body: '', author: '', date: '', category: 'general', heroImage: '' },
      ],
    }))

  const setJournalPost = (idx: number, field: string, value: string) => {
    setPatch((prev) => {
      const updated = [...prev.journal]
      updated[idx] = { ...updated[idx], [field]: value }
      return { ...prev, journal: updated }
    })
  }

  // ── Download patch ──────────────────────────────────────────────────────────
  const downloadPatch = () => {
    const payload: ContentPatch = {
      ...patch,
      _meta: { generatedAt: new Date().toISOString(), version: 1 },
    }
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `content-patch-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Stage to server ─────────────────────────────────────────────────────────
  const stagePatch = async () => {
    setPosting(true)
    setPostMsg(null)
    try {
      const payload: ContentPatch = {
        ...patch,
        _meta: { generatedAt: new Date().toISOString(), version: 1 },
      }
      const res = await fetch('/api/admin/content-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as { path?: string; error?: string; note?: string }
      if (res.ok) {
        setStaged(data.path ?? null)
        setPostMsg(data.note ?? `Staged at ${data.path}`)
      } else {
        setPostMsg(`Error: ${data.error ?? res.statusText}`)
      }
    } catch (err) {
      setPostMsg(`Network error: ${String(err)}`)
    } finally {
      setPosting(false)
    }
  }

  const setBrand = setField('brand')
  const setTenant = setField('tenant')
  const setFareHarbor = setField('fareHarbor')
  const setStripe = setField('stripe')
  const setLegal = setField('legal')

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Staging</h1>
        <p className="mt-1 text-sm text-gray-600">
          Fill owner-supplied slots. Click <strong>Download patch</strong> to get a JSON file to review and apply,
          or <strong>Stage on server</strong> to save to <code className="bg-gray-100 px-1 rounded">/staging/</code> for later merge.
        </p>
        <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <strong>v1 — staging only.</strong> This page does NOT write to source files. The downloaded patch is a proposal — a developer applies it.
        </div>
      </div>

      {/* ── 1. Brand ── */}
      <Section title="1. Brand colors (lib/brand.ts)">
        <p className="text-xs text-gray-500 mb-3">Currently: primary #556B2F (olive), accent #AD561A (burnt-orange WCAG AA), themeColor #6da855 (mobile chrome). OWNER REVIEW NEEDED per CLAUDE.md.</p>
        <Field label="Primary hex (nav active, headings)" value={patch.brand.primaryHex} onChange={(v) => setBrand('primaryHex', v)} type="color" />
        <Field label="Accent hex (CTAs — must pass WCAG AA 4.5:1 white on it)" value={patch.brand.accentHex} onChange={(v) => setBrand('accentHex', v)} type="color" />
        <Field label="Theme color hex (mobile browser bar)" value={patch.brand.themeColorHex} onChange={(v) => setBrand('themeColorHex', v)} type="color" />
      </Section>

      {/* ── 2. Tenant config ── */}
      <Section title="2. Tenant config (lib/tenants/alpacasibiza.ts)">
        <Field label="CIF (Spanish tax ID — required on all commercial websites)" value={patch.tenant.cif} onChange={(v) => setTenant('cif', v)} placeholder="B12345678" hint="Format: B followed by 8 digits. Footer auto-shows when set." />
        <Field label="No-reply / transactional sender email" value={patch.tenant.noreplyEmail} onChange={(v) => setTenant('noreplyEmail', v)} placeholder="info@alpacasibiza.com" type="url" />
        <Field label="Logo URL (drop file at public/images/logo.webp first)" value={patch.tenant.logoUrl} onChange={(v) => setTenant('logoUrl', v)} placeholder="/images/logo.webp" />
        <Field label="OG default image URL (drop file at public/images/og-default.webp first)" value={patch.tenant.ogImageUrl} onChange={(v) => setTenant('ogImageUrl', v)} placeholder="/images/og-default.webp" />
        <Field label="Google review shortlink" value={patch.tenant.googleReviewUrl} onChange={(v) => setTenant('googleReviewUrl', v)} placeholder="https://g.page/r/..." type="url" />
        <Field label="Twitter/X handle (with @)" value={patch.tenant.twitterHandle} onChange={(v) => setTenant('twitterHandle', v)} placeholder="@alpacasibiza" />
        <Field label="Instagram URL (confirm: @wishfulfillingweaving vs @alpacasibiza)" value={patch.tenant.instagramUrl} onChange={(v) => setTenant('instagramUrl', v)} placeholder="https://www.instagram.com/..." type="url" />
      </Section>

      {/* ── 3. Alpacas ── */}
      <Section title="3. Alpaca bios + photos (14 animals)">
        <p className="text-xs text-gray-500 mb-3">Drop photos at public/images/alpacas/&lt;id&gt;.webp — path to enter below is /images/alpacas/&lt;id&gt;.webp</p>
        {patch.alpacas.map((alpaca, idx) => (
          <details key={alpaca.id} className="mb-2 border rounded">
            <summary className="cursor-pointer px-3 py-2 bg-gray-50 text-sm font-medium">
              {alpaca.name} {alpaca.bio || alpaca.imageUrl ? '✓' : '(empty)'}
            </summary>
            <div className="px-3 py-2">
              <Field label="Bio" value={alpaca.bio} onChange={(v) => setAlpaca(idx, 'bio', v)} type="textarea" placeholder={`${alpaca.name}'s personality, background, fun facts…`} />
              <Field label="Photo URL" value={alpaca.imageUrl} onChange={(v) => setAlpaca(idx, 'imageUrl', v)} placeholder={`/images/alpacas/${alpaca.id}.webp`} />
            </div>
          </details>
        ))}
      </Section>

      {/* ── 4. Press ── */}
      <Section title="4. Press logos + article URLs (6 outlets)">
        <p className="text-xs text-gray-500 mb-3">Drop logos at public/images/press/&lt;id&gt;.svg</p>
        {patch.press.map((mention, idx) => (
          <details key={mention.id} className="mb-2 border rounded">
            <summary className="cursor-pointer px-3 py-2 bg-gray-50 text-sm font-medium">
              {mention.outlet} {mention.logoUrl ? '✓' : '(empty)'}
            </summary>
            <div className="px-3 py-2">
              <Field label="Logo URL" value={mention.logoUrl} onChange={(v) => setPressMention(idx, 'logoUrl', v)} placeholder={`/images/press/${mention.id}.svg`} />
              <Field label="Article URL (optional)" value={mention.articleUrl} onChange={(v) => setPressMention(idx, 'articleUrl', v)} placeholder="https://..." type="url" />
            </div>
          </details>
        ))}
      </Section>

      {/* ── 5. Testimonials ── */}
      <Section title="5. Testimonials (add new)">
        <p className="text-xs text-gray-500 mb-3">6 live Facebook reviews already seeded in source. Add new ones here. Each new entry goes in as status: pending until applied.</p>
        {patch.testimonials.map((t, idx) => (
          <details key={t.id} className="mb-2 border rounded">
            <summary className="cursor-pointer px-3 py-2 bg-gray-50 text-sm font-medium">
              {t.name || '(new testimonial)'}
            </summary>
            <div className="px-3 py-2">
              <Field label="Name" value={t.name} onChange={(v) => setTestimonial(idx, 'name', v)} placeholder="Sue Rose" />
              <Field label="Date (YYYY-MM-DD)" value={t.date} onChange={(v) => setTestimonial(idx, 'date', v)} placeholder="2025-06-01" />
              <Field label="Rating (1–5, or leave blank if unknown)" value={t.rating} onChange={(v) => setTestimonial(idx, 'rating', v)} placeholder="5" />
              <Field label="Body" value={t.body} onChange={(v) => setTestimonial(idx, 'body', v)} type="textarea" />
              <Field label="Source" value={t.source} onChange={(v) => setTestimonial(idx, 'source', v)} placeholder="facebook | google | tripadvisor" />
              <Field label="Locale (BCP47)" value={t.locale} onChange={(v) => setTestimonial(idx, 'locale', v)} placeholder="en" />
            </div>
          </details>
        ))}
        <button onClick={addTestimonial} className="mt-1 rounded border border-dashed border-gray-400 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">
          + Add testimonial
        </button>
      </Section>

      {/* ── 6. Awards ── */}
      <Section title="6. Awards / certifications (add new)">
        {patch.awards.map((a, idx) => (
          <details key={a.id} className="mb-2 border rounded">
            <summary className="cursor-pointer px-3 py-2 bg-gray-50 text-sm font-medium">
              {a.name || '(new award)'}
            </summary>
            <div className="px-3 py-2">
              <Field label="Name" value={a.name} onChange={(v) => setAward(idx, 'name', v)} placeholder="Travelers' Choice" />
              <Field label="Issuer" value={a.issuer} onChange={(v) => setAward(idx, 'issuer', v)} placeholder="TripAdvisor" />
              <Field label="Category" value={a.category} onChange={(v) => setAward(idx, 'category', v)} placeholder="tourism | sustainability | animal-welfare | travel-award | other" />
              <Field label="Year" value={a.year} onChange={(v) => setAward(idx, 'year', v)} placeholder="2024" />
              <Field label="Logo URL (drop at public/images/awards/)" value={a.logoUrl} onChange={(v) => setAward(idx, 'logoUrl', v)} placeholder="/images/awards/tripadvisor-tc.svg" />
              <Field label="Verify URL (optional)" value={a.verifyUrl} onChange={(v) => setAward(idx, 'verifyUrl', v)} placeholder="https://..." type="url" />
            </div>
          </details>
        ))}
        <button onClick={addAward} className="mt-1 rounded border border-dashed border-gray-400 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">
          + Add award
        </button>
      </Section>

      {/* ── 7. Events ── */}
      <Section title="7. Events / What's On (add new)">
        {patch.events.map((ev, idx) => (
          <details key={ev.id} className="mb-2 border rounded">
            <summary className="cursor-pointer px-3 py-2 bg-gray-50 text-sm font-medium">
              {ev.title || '(new event)'}
            </summary>
            <div className="px-3 py-2">
              <Field label="Title" value={ev.title} onChange={(v) => setEvent(idx, 'title', v)} placeholder="Alpaca Yoga" />
              <Field label="Type" value={ev.type} onChange={(v) => setEvent(idx, 'type', v)} placeholder="yoga | workshop | wedding | photoshoot | open-day | private | other" />
              <Field label="Date (ISO — leave blank for recurring)" value={ev.date} onChange={(v) => setEvent(idx, 'date', v)} placeholder="2025-07-15" />
              <Field label="Recurrence (e.g. weekly:wed,sat or monthly:1st-sat)" value={ev.recurrence} onChange={(v) => setEvent(idx, 'recurrence', v)} placeholder="weekly:wed,sat" />
              <Field label="Duration (minutes)" value={ev.durationMinutes} onChange={(v) => setEvent(idx, 'durationMinutes', v)} placeholder="75" />
              <Field label="Price label" value={ev.priceLabel} onChange={(v) => setEvent(idx, 'priceLabel', v)} placeholder="€30/person" />
              <Field label="CTA URL" value={ev.ctaUrl} onChange={(v) => setEvent(idx, 'ctaUrl', v)} placeholder="https://... or mailto:..." type="url" />
              <Field label="Description" value={ev.description} onChange={(v) => setEvent(idx, 'description', v)} type="textarea" />
            </div>
          </details>
        ))}
        <button onClick={addEvent} className="mt-1 rounded border border-dashed border-gray-400 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">
          + Add event
        </button>
      </Section>

      {/* ── 8. Media gallery ── */}
      <Section title="8. Media gallery (add photos)">
        <p className="text-xs text-gray-500 mb-3">Drop files at public/images/gallery/. Categories: farm | alpacas | weaving | events | press</p>
        {patch.media.map((m, idx) => (
          <details key={m.id} className="mb-2 border rounded">
            <summary className="cursor-pointer px-3 py-2 bg-gray-50 text-sm font-medium">
              {m.caption || m.id}
            </summary>
            <div className="px-3 py-2">
              <Field label="Photo URL" value={m.photoUrl} onChange={(v) => setMedia(idx, 'photoUrl', v)} placeholder="/images/gallery/farm-morning-01.webp" />
              <Field label="Caption" value={m.caption} onChange={(v) => setMedia(idx, 'caption', v)} placeholder="Morning light on the herd" />
              <Field label="Category" value={m.category} onChange={(v) => setMedia(idx, 'category', v)} placeholder="farm | alpacas | weaving | events | press" />
            </div>
          </details>
        ))}
        <button onClick={addMedia} className="mt-1 rounded border border-dashed border-gray-400 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">
          + Add photo
        </button>
      </Section>

      {/* ── 9. Journal posts ── */}
      <Section title="9. Journal posts (add new)">
        <p className="text-xs text-gray-500 mb-3">Drop hero images at public/images/journal/&lt;slug&gt;.webp. Categories: farm-life | alpacas | weaving | seasonal | recipes | press | general</p>
        {patch.journal.map((post, idx) => (
          <details key={idx} className="mb-2 border rounded">
            <summary className="cursor-pointer px-3 py-2 bg-gray-50 text-sm font-medium">
              {post.title || '(new post)'}
            </summary>
            <div className="px-3 py-2">
              <Field label="Slug (URL-safe: lowercase, hyphens only)" value={post.slug} onChange={(v) => setJournalPost(idx, 'slug', v)} placeholder="shearing-day-2025" />
              <Field label="Title" value={post.title} onChange={(v) => setJournalPost(idx, 'title', v)} placeholder="Shearing Day at Es Currals" />
              <Field label="Excerpt (1–2 sentences)" value={post.excerpt} onChange={(v) => setJournalPost(idx, 'excerpt', v)} type="textarea" />
              <Field label="Body (double newlines = paragraph breaks)" value={post.body} onChange={(v) => setJournalPost(idx, 'body', v)} type="textarea" />
              <Field label="Author" value={post.author} onChange={(v) => setJournalPost(idx, 'author', v)} placeholder="Signe" />
              <Field label="Date (YYYY-MM-DD)" value={post.date} onChange={(v) => setJournalPost(idx, 'date', v)} placeholder="2025-06-01" />
              <Field label="Category" value={post.category} onChange={(v) => setJournalPost(idx, 'category', v)} placeholder="farm-life" />
              <Field label="Hero image URL" value={post.heroImage} onChange={(v) => setJournalPost(idx, 'heroImage', v)} placeholder="/images/journal/shearing-day-2025.webp" />
            </div>
          </details>
        ))}
        <button onClick={addJournalPost} className="mt-1 rounded border border-dashed border-gray-400 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">
          + Add post
        </button>
      </Section>

      {/* ── 10. Legal text ── */}
      <Section title="10. Legal text (translations/en.json legal.*.body)">
        <p className="text-xs text-gray-500 mb-3">Paste lawyer-supplied text. Will need to be applied across all 6 locales (en/de/it/es/nl/fr) after download.</p>
        <Field label="Privacy policy body" value={patch.legal.privacyBody} onChange={(v) => setLegal('privacyBody', v)} type="textarea" hint="legal.privacy.body in translations/*.json" />
        <Field label="Terms of service body" value={patch.legal.termsBody} onChange={(v) => setLegal('termsBody', v)} type="textarea" hint="legal.terms.body in translations/*.json" />
        <Field label="Cookies policy body" value={patch.legal.cookiesBody} onChange={(v) => setLegal('cookiesBody', v)} type="textarea" hint="legal.cookies.body in translations/*.json" />
      </Section>

      {/* ── 11. FareHarbor item IDs ── */}
      <Section title="11. FareHarbor item IDs (env vars + tenant config)">
        <p className="text-xs text-gray-500 mb-3">Get IDs from FareHarbor admin → Items → numeric ID per tour. These become FAREHARBOR_ITEM_* env vars.</p>
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Meet the Herd" value={patch.fareHarbor.tourMeetHerd} onChange={(v) => setFareHarbor('tourMeetHerd', v)} placeholder="123456" />
          <Field label="Weaving Workshop" value={patch.fareHarbor.tourWeavingWorkshop} onChange={(v) => setFareHarbor('tourWeavingWorkshop', v)} placeholder="123456" />
          <Field label="Farm Experience" value={patch.fareHarbor.tourFarmExperience} onChange={(v) => setFareHarbor('tourFarmExperience', v)} placeholder="123456" />
          <Field label="Photo Session" value={patch.fareHarbor.tourPhotoSession} onChange={(v) => setFareHarbor('tourPhotoSession', v)} placeholder="123456" />
          <Field label="Yoga" value={patch.fareHarbor.yoga} onChange={(v) => setFareHarbor('yoga', v)} placeholder="123456" />
          <Field label="Woven (shop)" value={patch.fareHarbor.woven} onChange={(v) => setFareHarbor('woven', v)} placeholder="123456" />
          <Field label="Commission" value={patch.fareHarbor.commission} onChange={(v) => setFareHarbor('commission', v)} placeholder="123456" />
          <Field label="Alcaca" value={patch.fareHarbor.alcaca} onChange={(v) => setFareHarbor('alcaca', v)} placeholder="123456" />
          <Field label="Gift Card" value={patch.fareHarbor.giftCard} onChange={(v) => setFareHarbor('giftCard', v)} placeholder="123456" />
          <Field label="Romantic Sunset" value={patch.fareHarbor.romanticSunset} onChange={(v) => setFareHarbor('romanticSunset', v)} placeholder="123456" />
          <Field label="Weddings" value={patch.fareHarbor.weddings} onChange={(v) => setFareHarbor('weddings', v)} placeholder="123456" />
          <Field label="Photoshoots" value={patch.fareHarbor.photoshoots} onChange={(v) => setFareHarbor('photoshoots', v)} placeholder="123456" />
          <Field label="Business Incentives" value={patch.fareHarbor.businessIncentives} onChange={(v) => setFareHarbor('businessIncentives', v)} placeholder="123456" />
          <Field label="Family Farm Days" value={patch.fareHarbor.familyFarmDays} onChange={(v) => setFareHarbor('familyFarmDays', v)} placeholder="123456" />
        </div>
      </Section>

      {/* ── 12. Stripe ── */}
      <Section title="12. Stripe price IDs + discount codes (env vars)">
        <Field label="Adopt monthly price ID" value={patch.stripe.adoptPriceIdMonthly} onChange={(v) => setStripe('adoptPriceIdMonthly', v)} placeholder="price_..." />
        <Field label="Adopt yearly price ID" value={patch.stripe.adoptPriceIdYearly} onChange={(v) => setStripe('adoptPriceIdYearly', v)} placeholder="price_..." />
        <Field label="Weaving discount code (10% off)" value={patch.stripe.discountCodeWeaving} onChange={(v) => setStripe('discountCodeWeaving', v)} placeholder="ADOPT10" />
        <Field label="Farmshop discount code (15% off)" value={patch.stripe.discountCodeFarmshop} onChange={(v) => setStripe('discountCodeFarmshop', v)} placeholder="ADOPT15" />
      </Section>

      {/* ── Action bar ── */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
        <button
          onClick={downloadPatch}
          className="rounded bg-olive-700 px-4 py-2 text-sm font-semibold text-white hover:bg-olive-800 focus:outline-none focus:ring-2"
          style={{ backgroundColor: '#556B2F' }}
        >
          Download patch JSON
        </button>
        <button
          onClick={stagePatch}
          disabled={posting}
          className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 disabled:opacity-50"
        >
          {posting ? 'Staging…' : 'Stage on server'}
        </button>
        {postMsg && (
          <span className={`text-xs ${staged ? 'text-green-700' : 'text-red-600'}`}>{postMsg}</span>
        )}
        <p className="ml-auto text-xs text-gray-500">
          v1: download = patch file for manual apply. Server-stage saves to /staging/ dir for later merge.
        </p>
      </div>
    </div>
  )
}
