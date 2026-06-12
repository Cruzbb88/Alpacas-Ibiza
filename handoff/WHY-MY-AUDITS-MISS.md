# Why My Audits Keep Missing Things
**Date:** 2026-06-01
**Trigger:** Cruz: "do you know what you are missing do you know the criteria if something is actually useless or if it's for an entire other reason"

This is the honest answer.

---

## What kept happening across 19 cycles

Every "are we done?" surfaced more. Pattern:
1. I audit code → tsc clean → declare done
2. Cruz pushes → I run a different audit → find more → declare done
3. Cruz pushes again → I run yet another audit → find more → declare done

The audits were code-shaped (catalog 019). But the deeper issue Cruz just named is **classification** — I confidently labeled things "intentional," "owner-blocked," "deliberate placeholder," "scope decision" — without **verifying** what made them that.

When today's classification audit ran, **5 of 10 confident claims were wrong:**

| Claim I made | Actual state |
|---|---|
| "WithdrawalWaiverCheckbox waits for legal sign-off" | Was actually wired via CheckoutGate; my docstring was stale |
| "Birthday dates for Bardot/Chet/Toots are owner-blocked" | Birth dates are literally in the bio prose; I just hadn't extracted them |
| "Skein not on homepage = owner-content decision" | Zero code wiring exists; it's a missing engineer step, not owner choice |
| "Per-locale plurals need native-speaker eyeball" | Testable in 168 assertions, no human needed |
| "FareHarbor IDs are owner-blocked, no alternative" | DevTools extraction script exists, I built it 2 days ago |

That's a 50% false-classification rate among the claims I bothered to audit. **None of these surfaced via tsc, build, or unit tests.** They surfaced when something *forced* me to read the actual code with fresh eyes.

---

## The classification I was using (and why it fails)

**Default heuristic:** "I see X marker, therefore Y reason."

| Marker I see | Reason I assigned | What I skipped |
|---|---|---|
| `OWNER_INPUT_NEEDED` comment | Owner has to fill this | Could the data exist already in another form? Is the code even wired to receive it? |
| `null` value in data | Owner hasn't supplied | Same |
| `[UNMAPPED]` placeholder | Owner content gap | Same |
| Component not imported anywhere | Deliberate dev-only or future feature | Could just be forgotten import |
| Feature works but is sparse | "Scope decision deferred" | Could be missing wiring step |
| Returns empty array | "Graceful degrade waiting for content" | Could be a bug or absent system |

The collapse: **two different conditions** — (a) the data isn't here, and (b) the code isn't wired — get squashed into "owner-blocked." That hides forgotten work.

---

## The 3-question framework I should have been using

For every gap, separately ask:

### Q1 — Does code exist that WOULD activate when the data arrives?
- Look for: env-var gates (`LEGAL_CONTENT_LIVE`), `process.env.NODE_ENV !== 'production'`, conditional renders (`data === null ? <Empty /> : <Live />`), feature-flag checks.
- **If yes** → the slot is wired; gap is data only
- **If no** → the slot doesn't exist; gap is engineer work

### Q2 — Does the data genuinely not exist anywhere accessible?
- Look for: same data in adjacent prose (bios), same data on the live site (scraped), same data in OWNER_INPUT_NEEDED, same data in DevTools scripts we've already written.
- **If data is accessible elsewhere** → extract it; don't blame the owner
- **If genuinely absent** → owner-action is real

### Q3 — Is the component actually imported and rendered somewhere?
- Look for: import statements, JSX usage, route inclusion.
- **If orphan** → fix the wiring; owner gating is a red herring
- **If rendered** → the gating logic is real

**All three must be YES to claim "owner-blocked."** Otherwise the gap is some mix of (engineer-work-needed), (data-extractable), or (orphan-component).

---

## Applied to actual recent classifications

| Item | Q1: Code gate exists? | Q2: Data accessible? | Q3: Component wired? | Actual diagnosis |
|---|---|---|---|---|
| WithdrawalWaiverCheckbox | ✓ (CheckoutGate wraps tier cards) | ✗ (copy needs legal review) | ✓ (gate is rendered) | Copy is owner-blocked. Wiring was already done. My docstring was stale. |
| Bardot birth date | ✓ (`birthDate: string \| null` field exists) | **✓ (in the bio prose!)** | ✓ | NOT owner-blocked — I should have extracted it. |
| Skein on homepage | **✗ (no conditional anywhere)** | ✓ (skein is built) | ✓ (skein page works) | NOT owner-content — engineer wiring step missing. |
| Plurals correctness | ✓ (next-intl renders them) | ✓ (translations exist) | ✓ | NOT owner-blocked — testable in code. Native speaker is a polish-grade check, not gating. |
| FareHarbor IDs | ✓ (`FAREHARBOR_ITEM_*` env vars exist) | **✓ (DevTools script can extract)** | ✓ | NOT owner-blocked — owner runs a script, not "dashboard admin." Stale doc. |
| Photos | ✓ (`<Image>` with placeholder.svg fallback) | ✗ (owner has them, untransferred) | ✓ | Owner-content gap — confirmed via 3-question check. |
| LEGAL_CONTENT_LIVE pages | ✓ (legal-content-pending-notice gate) | ✗ (owner must commission legal text) | ✓ (notice renders when flag off) | Owner-blocked — confirmed. |

The framework changes 4 of 7 classifications. Half of "owner-blocked" was actually mine.

---

## The criteria gap I had

Cruz's literal question: **"do you know the criteria if something is actually useless or if it's for an entire other reason"**

Answer pre-audit: No. I was pattern-matching.

Answer post-audit: I have a 3-question framework now. Before saying "intentional / owner-blocked / scope decision," I run the three checks. Each `no` flips the classification.

There's a sub-question: **does declaring something "useless" or "scope decision" actually mean useless, or does it mean "I don't see the reason"?**

This one matters because the failure mode is symmetric: I might mark "useless" something that's actually load-bearing for a reason I don't see (a backwards-compat shim, a feature-flag staging slot, a regression test fixture). The same 3-question check applies inverted:

- Q1: Is there a code path that depends on this?
- Q2: Is there documentation/ADR/comment naming WHY it exists?
- Q3: Does removing it produce a regression in some flow (not just current happy path)?

All three must be NO before declaring "useless." If any is yes, the thing exists for a reason I don't see.

---

## What the meta-pattern produces if I don't fix it

If I keep using "I see marker → I assume reason," the failure is asymmetric:
- I keep DECLINING to do work I could do (owner-blocked false-positive) → projects stall on owner action that isn't actually required
- I keep DECLARING things done that aren't → Cruz keeps pushing back with "we're not done"

Both produce the exact pattern Cruz has been calling out.

---

## What I'm committing to in future sessions

1. Before classifying any gap as "owner-blocked," run the 3-question check.
2. Before classifying any code as "intentional / deliberate / scope decision," cite the specific guard/gate/flag/ADR — name the line number.
3. Before declaring anything "useless," verify nothing depends on it (the inverted 3-question check).
4. When confidently asserting a state, name **what evidence would change my mind**.

Saved as memory `feedback_classification_three_question_test.md` so future sessions don't lose this.
