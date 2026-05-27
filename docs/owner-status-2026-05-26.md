# Alpacas Ibiza Website Redesign -- Owner Status
**Date:** 26 May 2026  
**Prepared for:** Bart & San (Es Currals Alpacas Ibiza)  
**Prepared by:** Development team

---

## 1. Where We Are

The new website is built, structured, and ready for real content -- but it is not ready for visitors yet. Think of it like a beautifully renovated finca where the furniture has been placed, the plumbing works, and the walls are painted -- but the family photos aren't hung and the front door key hasn't been cut. The architecture scores higher than comparable Ibiza tourism sites on several technical measures, but the pages that matter most to guests (the alpacas, the shop, the "about us" story) are still waiting for your photos, your words, and a few key decisions.

**Overall readiness: 5.9 out of 10.** The threshold for a confident public launch is 7.0. The gap is almost entirely content and owner decisions, not engineering work.

---

## 2. What We Delivered

| Feature | Status | Notes |
|---|---|---|
| Tour booking page with calendar | Ready | FareHarbor calendar embedded; FAQ, cancellation badge, and "spots filling up" signals all working. Best single page in the build. |
| Six-language support (EN, DE, ES, NL, FR, IT) | Ready | Every page available in 6 languages with a per-review translate button. No competitor offers this -- the live site does 2 languages, the best peer does 3. |
| Mobile-friendly design | Ready | Clean layout on phones, tablets, and desktop. Warm olive/terra/sand colour palette throughout. |
| Contact form with spam protection | Ready | Turnstile protection active; messages delivered via email. |
| Alpaca profiles page | Partial | 14 alpaca names are in place. Photos and bios are blank -- see Section 4 below. |
| Woven products shop | Partial | 6 products listed with real prices. "Add to Cart" button does not work yet -- needs a payment decision from you. |
| Adopt-a-Paca page | Partial | Pricing shown (monthly and annual). Payment button not connected -- waiting on your payment provider choice. |
| Press/media logos | Built but empty | The space for press logos is ready; needs your logo files and article links. |
| Google review badge | Built but empty | Component is ready; needs a Google Places key to display your star rating. |
| Privacy policy & legal pages | Placeholder only | Generic text. Must be replaced with real policies before launch -- EU law requires this. |
| Search engine optimization | Ready | Rich data for Google on tours, alpacas, adoption pricing, and FAQs. Well ahead of the current live site. |
| Admin dashboard with secure login | Ready | 8-hour auto-logout, secure password handling, analytics overview. |
| Founder / team story | Missing | No "About Us" section with your story or photos yet. The live site's Belgium-to-Ibiza narrative is one of its strongest features. |

> *Source: [reports/incompleteness-master-2026-05-26.md](../reports/incompleteness-master-2026-05-26.md)*

---

## 3. How We Compare to Similar Ibiza Businesses

We benchmarked the redesign against three reference sites: your current live site, Can Marti (eco-finca B&B), and Atzaro (luxury agritourism hotel).

| Area | Our Score | Best Competitor | Where we stand |
|---|---|---|---|
| Visual quality | 6/10 | 9 (Can Marti) | Our colour palette is right, but we have no real photos yet -- just gradients and placeholders. |
| Page content | 5/10 | 9 (Atzaro) | 14 alpaca profiles are blank. Shop descriptions are thin. Sustainability page has gaps. |
| Trust signals (press, reviews) | 4/10 | 9 (Can Marti) | Can Marti shows logos from Elle, The Guardian, and Conde Nast. We have the space ready but no files yet. |
| Booking experience | 8/10 | 8 (Atzaro) | This is our strongest area -- calendar, FAQ, urgency signals, cancellation info. Beats all three comparisons. |
| Mobile experience | 8/10 | 8 (tied) | Clean, modern, and responsive. Already better than the live site. |
| Language coverage | 9/10 | 6 (Can Marti) | Our widest lead. Six languages vs the industry norm of 2-3. This directly serves your Belgian, German, and Italian visitors. |
| Online shop | 3/10 | 5 (Can Marti) | The "Add to Cart" button does nothing. This is the single most trust-damaging element on the site right now. |

**Bottom line:** The redesign already beats your current live site (5.4/10) on structure and technology. To match the quality bar set by the best Ibiza peers, we need your content.

> *Source: [reports/reality-check-vs-peers-2026-05-26.md](../reports/reality-check-vs-peers-2026-05-26.md)*

---

## 4. What We Need From You to Launch

These are the five actions that will close the gap between "built" and "ready for visitors." Each one is something only you can provide -- the development side is already done or waiting to plug your input in.

### Action 1: Alpaca photos and short bios (14 animals)

The alpacas page is the heart of your website. Right now it shows 14 names with no photos and no personality. The current live site already has Barbarella's photo and her story. We need the same for all 14 -- a photo and 1-3 sentences each (age, personality, favourite snack). If any alpacas have arrived or left since the live site was last updated, let us know.

**Effort for you:** A few hours with a camera and a notebook.  
**What it unlocks:** The most personality-rich page becomes the most shareable page.

> *File to update: `lib/data/alpacas.ts` -- referenced in [reports/incompleteness-master, item #1](../reports/incompleteness-master-2026-05-26.md)*

### Action 2: One good farm photo for the homepage

The homepage opens with a colour gradient where a photo should be. Can Marti and Atzaro both open with real photography. We need one strong image -- alpacas on the farm, the landscape, your family with the herd -- anything that says "this is a real place."

**Effort for you:** Pick your favourite existing photo, or take one new one (landscape orientation, at least 1920px wide).  
**What it unlocks:** First impressions. This is what every visitor sees first.

> *Referenced in [reports/reality-check, fix #5](../reports/reality-check-vs-peers-2026-05-26.md)*

### Action 3: Shop payment decision

The woven shop lists 6 products with prices, but the "Add to Cart" button does nothing. We need you to choose one of these paths:

- **Option A:** Connect a payment provider (Stripe, Mollie, or FareHarbor subscriptions) so visitors can buy directly.
- **Option B:** Replace the button with "Contact us to order" linking to WhatsApp or email. Quick, honest, and functional.
- **Option C:** Remove the shop entirely for launch and add it later.

A button that does nothing is worse than no button at all.

**Effort for you:** A 10-minute decision. If you choose Option A, there will be some setup time with the payment provider.  
**What it unlocks:** Either real sales or a clear path to inquiries -- both better than the current dead end.

> *Referenced in [reports/reality-check, fix #2](../reports/reality-check-vs-peers-2026-05-26.md)*

### Action 4: Legal pages and business details

The privacy policy, terms, and cookie pages currently show placeholder text from early 2024. For any EU business, these must be real before you go live. We also need your Spanish business registration number (CIF), legal business name, and full address for the website footer.

**Effort for you:** Provide your real data-handling practices, or have a lawyer draft the pages. Supply CIF + registered name + address.  
**What it unlocks:** Legal compliance. Without this, the site cannot launch publicly.

> *Referenced in [reports/incompleteness-master, item #4](../reports/incompleteness-master-2026-05-26.md), [specs/todo/002](../specs/todo/002-legal-content-gdpr.md)*

### Action 5: FareHarbor booking IDs (8 items, 2 minutes each)

Each tour type (Meet the Herd, Weaving Workshop, Farm Experience, Photo Session, etc.) needs its own booking ID so the "Book Now" button goes to the right calendar. Right now they all go to one generic calendar. The IDs are visible in your FareHarbor admin panel -- just copy the number from the URL for each tour.

**Effort for you:** Log into FareHarbor, click each tour, copy the number. About 15 minutes total.  
**What it unlocks:** Per-tour booking buttons that work correctly.

> *Referenced in [reports/incompleteness-master, item #14](../reports/incompleteness-master-2026-05-26.md)*

---

## 5. Open Decisions (for discussion)

These are choices that affect the direction of the site. They are covered in more detail in the meeting-prep document.

| Decision | Options | Why it matters |
|---|---|---|
| Default language | English (current) or Dutch (like the live site) | Affects which page Google shows first and what returning visitors see. Your core audience is Dutch/Belgian. |
| Italian and French pages | Keep (with a "machine-translated" note) or remove | Six languages is a strength, but only if the translations are good enough. |
| Wishfulfilling Weaving brand | Keep as a section of the shop, or give it its own top-level page | The live site treats it as a co-equal brand. The redesign currently folds it into the shop. |
| Adopt-a-Paca payment | Stripe subscriptions, FareHarbor, Mollie, or keep as email-inquiry | This is a live revenue stream on your current site. The redesign needs to handle it before switchover. |
| Cancellation policy | Confirm the "free cancellation up to 24 hours" shown on every page | Must match what FareHarbor actually enforces. A mismatch creates legal risk. |

> *Full detail in the meeting-prep document and [OWNER_INPUT_NEEDED.md](../OWNER_INPUT_NEEDED.md)*

---

## 6. Suggested Timeline

| Week | What happens | Who |
|---|---|---|
| **Week 1** | You provide alpaca photos + bios, one hero photo, and your CIF/legal details. Choose the shop approach (Action 3). | Owner |
| **Week 1** | We plug in your content, wire the shop decision, and complete 7 small code improvements that are ready to go. | Dev team |
| **Week 2** | You provide FareHarbor item IDs, confirm cancellation policy, and decide on default language. Legal pages drafted. | Owner |
| **Week 2** | We configure per-tour booking, set up the Google review badge, and deploy a private preview for you to review. | Dev team |
| **Week 3** | You review the preview, provide any corrections, and approve for launch. Press logos and article links if available. | Owner |
| **Week 3** | Final adjustments, performance testing, and public launch. | Dev team |

**Realistic launch window: 3 weeks from the day you start providing content.**

---

## 7. What's Working Well (keep doing this)

Three areas where the redesign is genuinely ahead of every competitor we benchmarked:

1. **Booking experience** -- the tour page with its calendar, FAQ, urgency signals, and cancellation badge is the best version of this page across all four sites we compared. Visitors will find it easy and reassuring to book.

2. **Language coverage** -- six languages with a per-review translate button. No Ibiza competitor offers this. It directly serves your Belgian, German, and Italian visitors in their own language.

3. **Behind-the-scenes reliability** -- spam protection on forms, secure admin login, safe handling of external services, automatic timeouts so the site never hangs. None of this is visible to visitors, but it means the site will not embarrass you during high season.

---

*This document references findings from the following project reports:*
- *[Peer comparison and scoring](../reports/reality-check-vs-peers-2026-05-26.md)*
- *[Complete inventory of open items](../reports/incompleteness-master-2026-05-26.md)*
- *[Execution plan](../PLAN.md)*
- *[Development roadmap](../specs/roadmaps/ROADMAP-skill-execution.md)*
