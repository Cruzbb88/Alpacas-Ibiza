/**
 * Shared HTML email template pieces. All user-controlled values must already
 * be escaped by the caller (use lib/html#escapeHtml) — this module assumes
 * its inputs are either trusted or pre-escaped.
 */

const BRAND = {
    name: 'Alpacas Ibiza',
    primary: '#556B2F',
    secondary: '#f5f5dc',
}

export function emailLayout(innerHtml: string): string {
    return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#2d2d2d;padding:16px">
${innerHtml}
<hr style="border:none;border-top:1px solid #eee;margin:32px 0" />
<p style="color:#999;font-size:12px">${BRAND.name} · info@alpacasibiza.com · <a href="https://wa.me/32475586544" style="color:${BRAND.primary}">WhatsApp</a></p>
</div>
`.trim()
}

export interface ReminderInput {
    escapedName: string
    escapedTourName: string
    dateStr: string
    locale: string
    whatsappUrl?: string
    mapsUrl?: string
    weatherUrl?: string
}

export function reminderEmailHtml({
    escapedName,
    escapedTourName,
    dateStr,
    whatsappUrl = 'https://wa.me/32475586544',
    mapsUrl = 'https://maps.google.com/?q=Alpacas+Ibiza,+San+Carlos,+Ibiza,+Spain',
    weatherUrl = 'https://www.google.com/search?q=weather+san+carlos+ibiza',
}: ReminderInput): string {
    return emailLayout(`
<h2 style="color:${BRAND.primary}">Hi ${escapedName} 👋</h2>
<p>We're getting ready for <strong>${escapedTourName}</strong> on <strong>${dateStr}</strong>!</p>
<h3 style="margin-top:24px">Before you arrive</h3>
<ul style="line-height:1.6">
  <li>👕 <strong>Wear:</strong> closed shoes, the paddocks get dusty/muddy</li>
  <li>🧢 <strong>Bring:</strong> sun hat, sunscreen, water</li>
  <li>📸 <strong>Cameras:</strong> yes — tag us @alpacasibiza on Instagram</li>
  <li>🌦️ <strong>Weather:</strong> <a href="${weatherUrl}" style="color:${BRAND.primary}">check the San Carlos forecast</a></li>
</ul>
<h3 style="margin-top:24px">How to find us</h3>
<p>Rural north of Ibiza, near San Carlos. <a href="${mapsUrl}" style="color:${BRAND.primary}">Open in Google Maps</a>. Parking is free on-site.</p>
<h3 style="margin-top:24px">Need to change anything?</h3>
<p>Free cancellation up to 24h before. Message us on WhatsApp: <a href="${whatsappUrl}" style="color:${BRAND.primary}">+32 475 58 65 44</a>.</p>
<p style="margin-top:32px">See you soon 🦙</p>
`)
}

export interface ReviewRequestInput {
    escapedName: string
    escapedTourName: string
    googleReviewUrl?: string
    tripadvisorUrl?: string
    returnCode?: string
}

export function reviewRequestEmailHtml({
    escapedName,
    escapedTourName,
    googleReviewUrl = 'https://g.page/r/alpacasibiza/review',
    tripadvisorUrl = 'https://www.tripadvisor.com/UserReviewEdit-g3410459-d27056780',
    returnCode = 'RETURN10',
}: ReviewRequestInput): string {
    return emailLayout(`
<h2 style="color:${BRAND.primary}">Hi ${escapedName} 👋</h2>
<p>Thank you for visiting us for <strong>${escapedTourName}</strong>. We hope the herd made your day.</p>
<p>If you have 30 seconds, a review makes a huge difference for our small farm:</p>
<div style="text-align:center;margin:24px 0">
  <a href="${googleReviewUrl}" style="display:inline-block;margin:4px;padding:12px 24px;background:${BRAND.primary};color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Review on Google</a>
  <a href="${tripadvisorUrl}" style="display:inline-block;margin:4px;padding:12px 24px;background:#00AA6C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Review on TripAdvisor</a>
</div>
<p>Want to come back? Save 10% with code <strong>${returnCode}</strong> on your next visit.</p>
<p style="margin-top:24px">With gratitude,<br/>The ${BRAND.name} team 🦙</p>
`)
}

/** Subject-line helpers keyed by locale with English fallback. */
export function reminderSubject(locale: string): string {
    switch (locale) {
        case 'es': return '¡Nos vemos pronto! Tu visita a los alpacas 🦙'
        case 'de': return 'Wir freuen uns auf dich! Dein Alpaka-Besuch 🦙'
        default: return 'See you soon! Your alpaca visit 🦙'
    }
}

export function reviewRequestSubject(locale: string): string {
    switch (locale) {
        case 'es': return '¿Cómo fue tu visita a los alpacas? 🦙'
        case 'de': return 'Wie war dein Besuch bei den Alpakas? 🦙'
        default: return 'How were the alpacas? 🦙'
    }
}
