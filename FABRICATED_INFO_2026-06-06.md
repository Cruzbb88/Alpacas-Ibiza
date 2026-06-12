# Fabricated / unverified info — found by checking against your real sources

**Ground truth used:** your live **FareHarbor booking widget** (rendered in a real browser — the prices/specs a customer actually sees) + your live **alpacasibiza.com** pages.

**Your entire bookable catalogue in FareHarbor is exactly 3 items:**
| Item | Real spec (FareHarbor) |
|---|---|
| **Alpaca Tour** | All Ages · **1 hour** · **From €21.19** |
| **Alpaca Yoga** | **Ages 15+** · **1.5 hr** · (€30 per live site) |
| **Gift Card** | — |

That one fact exposes most of the fabrication: the site invented a 4-tour taxonomy and an all-day timeline for what is really **one 1-hour tour**.

---

## ✅ CONFIRMED FAKE — already fixed

| What | Was (fake) | Now (real source) |
|---|---|---|
| Tour price | **€30** (a third-party *aggregator's* reseller markup) | **€21.19** — FareHarbor |
| Tour duration (FAQ) | "Standard tours are **2–3 hours**" | "approximately **1 hour**" — FareHarbor |
| Tour duration (experiences grid) | "**90 min**" | "**1 hour**" — FareHarbor |
| `config.ts` comment | called the €30 "Verified live" | corrected to state it was aggregator-sourced |

---

## 🚩 LIKELY FABRICATED — needs your call (presented as fact, no source, contradicts the 1-item / 1-hour reality)

1. **The 4 "tour types"** (Meet the Herd / Weaving / Farm Experience / Photo Session) shown as separate tours — FareHarbor has **one** "Alpaca Tour." Keep as descriptions of what's *in* the tour, or cut?
2. **The 5-stage timeline** on /tours ("Arrival → Morning → Mid-day → Afternoon → Closing") — implies an all-day visit; the real tour is **1 hour**. This is invented.
3. **Experience durations / group sizes** (no source): Weaving "3 hours / Up to 8", Romantic Sunset "2 hours / 2 guests", Family & Corporate "half/full day". Not in FareHarbor.
4. **Experience inclusions** (specific, unsourced — almost certainly AI-written): e.g. Romantic Sunset's "glass of cava + tapas board + professional photographer for 30 minutes + digital download." Confirm or replace.

*(These were built by earlier cycles. I didn't auto-delete them because some — weddings, weaving, corporate — are real offerings; it's the invented **specifics** that need your truth or removal.)*

---

## ⚠️ CONFLICTS — two of your *own* sources disagree (you decide)

5. **Yoga duration** — FareHarbor says **"1.5 hr"**; your live /alpaca-yoga page says **"1 hour 15 minutes."** Code currently uses 75 min.
6. **Yoga age** — FareHarbor says **"Ages 15+."** Make sure no page calls yoga "all ages."

---

## ✔ VERIFIED REAL (cross-checked — leave alone)

Tour €21.19 · Yoga €30 · Adopt €75/mo, €900/yr · Skein €200 · 14 named alpacas (real photos) · founders San & Bart · Es Currals, Santa Eulària · Yoga Wed/Sat, max 6.

---

**Bottom line:** the *prices and names* are now real. The remaining fabrication is concentrated in the **experiences/tour detail** (durations, the timeline, the 4-type split, the inclusion lists) — invented by earlier build cycles. Tell me "cut the invented specifics" and I'll strip them to honest "Contact for details," or give me the real numbers and I'll set them.
