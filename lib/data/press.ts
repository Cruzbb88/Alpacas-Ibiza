/**
 * Press mentions of Alpacas Ibiza. Mirrors the outlets listed on the live site's
 * /wat-doen-wij-1 page. Logo files are owner-supplied — until provided, this
 * component renders nothing. See OWNER_INPUT_NEEDED.md "Press logos" section.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO ACTIVATE A PRESS LOGO — single-file edit:
 *
 *   Step 1: Drop logo file at:
 *             public/images/press/<id>.svg   (PNG also accepted)
 *
 *   Step 2: Edit the entry below — set `logoUrl`, optionally `articleUrl`,
 *           set `status: 'live'`, then change no other file:
 *
 *     Before:
 *       { id: 'hln', outlet: 'Het Laatste Nieuws (HLN)',
 *         articleUrl: null, logoUrl: null, status: 'pending' },
 *
 *     After:
 *       { id: 'hln', outlet: 'Het Laatste Nieuws (HLN)',
 *         articleUrl: 'https://www.hln.be/...',
 *         logoUrl: '/images/press/hln.svg',
 *         status: 'live' },
 *
 *   articleUrl is optional — omit (leave null) if the article isn't available.
 *
 * Component fail-quiet: PressLogos returns null in production until at least
 * one entry has logoUrl !== null. Dev mode shows a dashed amber hint box instead.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type PressMentionStatus = 'pending' | 'live'

export interface PressMention {
  id: string
  outlet: string
  articleUrl: string | null  // null until owner provides; deep-link to the article when known
  logoUrl: string | null     // null until owner provides logo file
  status: PressMentionStatus
}

export const press: PressMention[] = [
  {
    id: 'gazet-van-antwerpen-metropool',
    outlet: 'Gazet van Antwerpen — Metropool',
    articleUrl: null, // UNMAPPED — owner provides
    logoUrl: null,    // UNMAPPED — owner provides
    status: 'pending',
  },
  {
    id: 'gazet-van-antwerpen',
    outlet: 'Gazet van Antwerpen',
    articleUrl: null, // UNMAPPED — owner provides
    logoUrl: null,    // UNMAPPED — owner provides
    status: 'pending',
  },
  {
    id: 'hln',
    outlet: 'Het Laatste Nieuws (HLN)',
    articleUrl: null, // UNMAPPED — owner provides
    logoUrl: null,    // UNMAPPED — owner provides
    status: 'pending',
  },
  {
    id: 'hln-kempen',
    outlet: 'HLN — Kempen',
    articleUrl: null, // UNMAPPED — owner provides
    logoUrl: null,    // UNMAPPED — owner provides
    status: 'pending',
  },
  {
    id: 'tribes-and-nomads',
    outlet: 'Tribes & Nomads',
    articleUrl: null, // UNMAPPED — owner provides
    logoUrl: null,    // UNMAPPED — owner provides
    status: 'pending',
  },
  {
    id: 'diario',
    outlet: 'Diario de Ibiza',
    articleUrl: null, // UNMAPPED — owner provides
    logoUrl: null,    // UNMAPPED — owner provides
    status: 'pending',
  },
]

export function hasLivePress(): boolean {
  return press.some((p) => p.logoUrl !== null)
}
