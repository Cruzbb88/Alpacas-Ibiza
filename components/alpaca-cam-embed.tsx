/**
 * AlpacaCamEmbed — env-gated live camera slot.
 *
 * Renders null until owner sets ALPACA_CAM_EMBED_URL. No layout shift.
 *
 * Failsafe: only renders when ALPACA_CAM_EMBED_URL is set to a non-TODO,
 * non-empty value AND the URL passes the allowlist check below.
 * See CLAUDE.md failsafe map for the canonical entry.
 *
 * Allowed URL patterns (safe-embed allowlist):
 *   - YouTube embed: https://www.youtube.com/embed/... or https://youtube.com/embed/...
 *   - YouTube nocookie: https://www.youtube-nocookie.com/embed/...
 *   - Twitch embed: https://player.twitch.tv/...
 *   - Vimeo embed: https://player.vimeo.com/...
 *
 * Any other URL returns null (silent, never throws). This prevents an operator
 * typo from introducing an arbitrary iframe source. The owner should use the
 * embed URL form (e.g. youtube.com/embed/<id>) not the watch URL.
 *
 * Server component — reads env var at request time (no client bundle impact).
 */

const ALLOWED_EMBED_ORIGINS = [
  'https://www.youtube.com',
  'https://youtube.com',
  'https://www.youtube-nocookie.com',
  'https://player.twitch.tv',
  'https://player.vimeo.com',
]

function isSafeEmbedUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    // Exact origin comparison — prevents prefix-bypass attacks like
    // https://player.twitch.tv.evil.com (which u.origin catches as a
    // different host). startsWith on a raw string was the prior bug.
    return ALLOWED_EMBED_ORIGINS.includes(u.origin)
  } catch {
    return false
  }
}

export function AlpacaCamEmbed() {
  const url = process.env.ALPACA_CAM_EMBED_URL
  if (!url || url.startsWith('TODO_') || url === '__OWNER_INPUT_REQUIRED__') return null
  if (!isSafeEmbedUrl(url)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[AlpacaCamEmbed] ALPACA_CAM_EMBED_URL is set but not on the allowed-origin list. Rendering null.')
    }
    return null
  }

  return (
    <section
      aria-labelledby="alpaca-cam-heading"
      className="w-full py-12 px-4 bg-primary/5 border-y border-primary/20"
    >
      <div className="max-w-4xl mx-auto">
        <h2
          id="alpaca-cam-heading"
          className="text-2xl font-bold text-foreground text-center mb-4"
        >
          Live at the farm
        </h2>
        <p className="text-sm text-foreground/60 text-center mb-6">
          Watch our alpacas in real time — live from Es Currals, Ibiza.
        </p>
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          {/* eslint-disable-next-line react/iframe-missing-sandbox */}
          <iframe
            src={url}
            title="Live alpaca cam — Es Currals Ibiza"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full rounded-xl border border-border"
          />
        </div>
      </div>
    </section>
  )
}
