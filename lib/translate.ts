/**
 * Translation provider abstraction.
 *
 * Provider: MyMemory free tier (https://mymemory.translated.net)
 * - No API key required for free tier (up to 10,000 chars/day per IP)
 * - Supports auto-detection via "Autodetect|tgt" langpair syntax
 * - Input capped at 500 chars to stay within free-tier limits
 *
 * Failsafe: any network error, non-200, or malformed response returns a
 * noop result with the original text — never throws.
 *
 * Privacy: text content is NEVER logged.
 */

import { fetchWithTimeout } from '@/lib/fetch'

export interface TranslationResult {
  translated: string
  detectedSourceLang: string
  provider: 'mymemory' | 'cache' | 'noop'
  attribution: string
}

const MAX_CHARS = 500

interface MyMemoryResponse {
  responseData: {
    translatedText: string
    match: number
  }
  responseStatus: number | string
  respondId?: string
}

export async function translateText(opts: {
  text: string
  sourceLang?: string
  targetLang: string
}): Promise<TranslationResult> {
  const { targetLang } = opts
  const sourceLang = opts.sourceLang ?? 'auto'

  // Cap input length — free tier limit
  let text = opts.text
  let truncated = false
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS)
    truncated = true
  }

  const noop = (): TranslationResult => ({
    translated: opts.text,
    detectedSourceLang: sourceLang === 'auto' ? 'unknown' : sourceLang,
    provider: 'noop',
    attribution: '',
  })

  try {
    // MyMemory langpair syntax: "Autodetect|en" for auto-detection
    const langpair =
      sourceLang === 'auto' ? `Autodetect|${targetLang}` : `${sourceLang}|${targetLang}`

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`

    const res = await fetchWithTimeout(url, {}, 5000)

    if (!res.ok) return noop()

    const json = (await res.json()) as MyMemoryResponse

    if (
      !json ||
      typeof json !== 'object' ||
      !json.responseData ||
      typeof json.responseData.translatedText !== 'string'
    ) {
      return noop()
    }

    const translatedRaw = json.responseData.translatedText
    // MyMemory occasionally returns the text unchanged when it can't translate
    if (!translatedRaw || translatedRaw === text) return noop()

    const translated = truncated ? `${translatedRaw} (truncated)` : translatedRaw

    // Detect source lang from response — MyMemory may return it in the respondId or we fall back
    const detectedSourceLang =
      sourceLang !== 'auto' ? sourceLang : 'unknown'

    return {
      translated,
      detectedSourceLang,
      provider: 'mymemory',
      attribution: 'Translated by MyMemory',
    }
  } catch {
    return noop()
  }
}
