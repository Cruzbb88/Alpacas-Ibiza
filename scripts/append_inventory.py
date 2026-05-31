APPEND = """

---

## Round 2 - legal + remaining pages (2026-05-31 late)

| Page | Slug | Status | Content length | Target key | NL | EN | Sentinels |
|---|---|---|---|---|---|---|---|
| T&C | /algemene-voorwaarden | SCRAPED | 18 articles, full verbatim | terms.art1Title..art18Title | Yes | Yes | 39 art keys x4 locales |
| Privacy policy | /privacy-policy | 404 | - | terms.privacy (existing 5-section stub retained) | Unchanged | Unchanged | - |
| Privacy (NL slug) | /privacyverklaring | 404 | - | - | - | - | - |
| Cookie policy | /cookies | 404 | - | cookies.* (existing stub retained) | Unchanged | Unchanged | - |
| Cookie (NL slug) | /cookieverklaring | 404 | - | - | - | - | - |
| Corporate | /business-incentives-brainstormsessies | SCRAPED | Short (live is sparse, 3 sentences) | corporate.liveBodyNL / liveBodyEN | Yes | Yes | 2 keys x4 locales |
| About / team | /wie-zijn-wij | SCRAPED | Founder bios: San + Bart | about.metaTitle added; storyText already populated | Yes | Yes | - |
| Weddings | /weddings-photoshoots | SCRAPED | ~300 words | weddings.* (17 keys NL, 18 EN) | Yes | Yes | 1 key x4 locales |
| Weaving info | /informatie-weaving | SCRAPED | Studio history + 4 process steps | weaving.processStep* + studioHistoryBody | Yes | Yes | 6 keys x4 locales |
| Weaving collection | /informatie-weaving-1 | SCRAPED | Collection intro paragraph | weaving.collectionSubhead | Yes | Yes | included in 6 above |
| Contact alt | /contact-1 | SCRAPED | PLACEHOLDER BUG (see note) | n/a - no real content to transfer | n/a | n/a | n/a |

### /contact-1 placeholder bug
Live text on the contact-1 page includes the literal stub: **"Hier nog een tekst voorzien."** (Dutch: "Text to be added here"). This is an incomplete Squarespace page never finished by the owner. The rest of the page duplicates the main /contact info (email, private farm warning, appointment-only). Owner should delete /contact-1 on the live site or add real content before relaunch.

### Notes
- /privacy-policy and /privacyverklaring both 404 on the live site. Existing redesign privacy section (5 sections, synthesised GDPR) is retained unchanged. Owner must supply verbatim Dutch privacy text before launch.
- /cookies and /cookieverklaring both 404. No cookie banner on live site. Existing cookie section retained unchanged. Owner must supply real cookie policy before launch.
- terms.section[1-7]Title/Items keys (old 7-section stub) removed; replaced with 18-article art* structure from live T&C verbatim. terms/page.tsx rewritten to render art1-art18.
- Live T&C Article 2 contains legal identity: Sandra De Wilde, C/3 Bungalow Park 22 07850 San Carlos, phone +34 689 446 781, VAT ESY6917111J.
- Weaving process steps translated from /informatie-weaving. Live page confirmed: Big Ben loom, 92-year-old mentor, hibiscus/avocado natural dyes.
- Corporate live copy is sparse (3 sentences). Existing richer redesign keys retained and supplemented with live verbatim liveBodyNL/EN keys.
- Weddings live page confirms: first-and-only alpaca farm on Ibiza, 14 alpacas, US trend now Europe, on/off-site. No pricing. weddings.details.* remain contact-for-details.
"""

with open(
    r"C:\Users\cruzb\Projects\alpaca-farm-redesign\handoff\LIVE_SITE_CONTENT_INVENTORY.md",
    "a",
    encoding="utf-8",
) as f:
    f.write(APPEND)
print("Appended OK")
