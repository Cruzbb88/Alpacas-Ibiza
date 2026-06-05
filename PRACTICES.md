# Practices & Failsafes — Alpacas Ibiza Project

**Purpose:** Rules I (Claude) must follow on every session in this repo so I don't repeat mistakes. Built from real session failures, not abstract principles.

**When to read:** First, before any audit / claim / "what's missing" report. After: append a new rule whenever a session reveals a new failure mode.

---

## Pre-flight checks — run these BEFORE claiming anything is missing

Mandatory order:

1. **List every `*.md` in repo root** and skim titles. A finding doesn't count as a "discovery" if a markdown file already documented it.
2. **Read the most recently dated status file.** Filename pattern `*_YYYY-MM-DD.md` or similar — that's the source of truth, not the original README. Today's example: [INTEGRATION_STATUS_2026-04-20.md](INTEGRATION_STATUS_2026-04-20.md) superseded INTEGRATION_CHECKLIST.md.
3. **Read [middleware.ts](middleware.ts) and `next.config.mjs`** before commenting on routes — redirects make some files dead code.
4. **Read [lib/config.ts](lib/config.ts)** before claiming an integration is missing — env-driven feature flags often live there.
5. **Grep for the thing** before claiming it doesn't exist. Agent reports lie; `Grep` doesn't.

If any pre-flight finding contradicts a claim in your report, **strike or amend the claim before publishing**.

6. **Before any runtime-behavior claim** ("X works", "X is wired", "X fires", "X is broken"), perform the **Research → Confirm → Test** gate (Rule 11). Output a STOP if any step is unresolved before continuing.

---

## Active rules

Each rule: **Trigger** (when it fires) / **Rule** (what to do) / **Verify** (how to check you followed it) / **Why** (the real session that taught this).

---

### Rule 1 — Read existing docs before claiming gaps

- **Trigger:** about to write "X is missing" or "X is wrong" in any audit / report / plan.
- **Rule:** Grep every `*.md` in the project root for keywords related to your finding. If a doc mentions it, reference that doc instead of re-discovering.
- **Verify:** Every gap in your report has a "Where I should have looked" column proving the gap isn't already documented.
- **Why:** Session 2026-05-26 — I produced REALITY_CHECK.md flagging "Adopt-a-Paca missing" and "Stripe not wired" without reading [OWNER_INPUT_NEEDED.md](OWNER_INPUT_NEEDED.md) (which had Adopt as a Yes/No question) and [INTEGRATION_STATUS_2026-04-20.md](INTEGRATION_STATUS_2026-04-20.md) (which explicitly says shop is FareHarbor-only by design).

---

### Rule 2 — "Missing" requires a Grep, not a vibe

- **Trigger:** report says "X is missing from the codebase."
- **Rule:** Run `Grep` for the symbol/name/keyword in the actual repo (not just trust a subagent's report). Include `node_modules` exclusion. If no match, then the claim is allowed. If matches exist, investigate them.
- **Verify:** Every "missing" claim cites the grep query you ran and the file count it returned.
- **Why:** Session 2026-05-26 — initial agent report missed that `app/shop/*` non-localized routes existed and had hardcoded prices duplicating the localized versions. A single `Glob app/**/page.tsx` revealed them in 2 seconds.

---

### Rule 3 — "By design" beats "looks broken"

- **Trigger:** about to call something a bug because it looks half-implemented (dead buttons, missing handlers, stub functions).
- **Rule:** Search for the term in `INTEGRATION_STATUS*.md` and docs. If marked `⚪ N/A by design`, the gap is intentional. Frame the finding as "design decision encoded as X, owner-confirm if still correct" not "broken."
- **Verify:** Every "broken" claim distinguishes "design decision" from "implementation gap" by citing where the decision is documented (or noting it isn't, which itself is the gap).
- **Why:** Session 2026-05-26 — I called the dead "Add to Cart" buttons "fake e-commerce." They're intentional: `lib/config.ts:48-57` routes shop categories through FareHarbor item IDs. Cart UI is the *fallback* path when item IDs aren't configured, not a real shopping flow.

---

### Rule 4 — Duplicate routes are dead until proven alive

- **Trigger:** find two route paths with similar names (`/shop/x` AND `/[locale]/shop/x`).
- **Rule:** Check [middleware.ts](middleware.ts) and `next.config.mjs` redirects/rewrites. If the unprefixed path is redirected to the prefixed one, the unprefixed file is dead code. Recommend deletion in the plan.
- **Verify:** Cite the middleware line number that proves the redirect. Run `curl -I` or note it as needing one.
- **Why:** Session 2026-05-26 — `app/shop/page.tsx` and `app/[locale]/shop/page.tsx` both existed. middleware.ts:60-66 redirects all unprefixed paths to `/{locale}/...`. The non-localized version was unreachable but still maintained, drifting from the localized one (stale prices).

---

### Rule 5 — Never invent data. Flag UNMAPPED.

- **Trigger:** owner hasn't confirmed a price / name / fact, but a page requires it to render.
- **Rule:** Use a sentinel like `null`, `"UNMAPPED"`, or `__OWNER_INPUT_REQUIRED__` rather than a plausible-looking placeholder. Render UI clearly states "coming soon" / "TBD." Add the missing item to [OWNER_INPUT_NEEDED.md](OWNER_INPUT_NEEDED.md).
- **Verify:** Grep for the sentinel. Verify the page visibly shows "TBD" / "coming soon" in the browser, not a fake number.
- **Why:** Per memory `feedback_never_guess_data` — hardcoded €45 woven scarves, €30/€45/€140 alcaca tiers, and `reviewCount: 127` are all examples of invented numbers that look real and create owner-trust problems if shipped.

---

### Rule 6 — Single source of truth for prices, IDs, URLs

- **Trigger:** find the same number / URL / ID hardcoded in multiple files.
- **Rule:** Add a constant to [lib/config.ts](lib/config.ts) (the existing config home). All other files import from it.
- **Verify:** Grep for the literal value (e.g. `'30'`, `'alpacasibiza'`, `'G-Y946QDVVQV'`). After fix, only one file owns it.
- **Why:** Session 2026-05-26 — tour price was `€30` in copy and `'20'` in structured data with no central constant. Fix: `TOUR_BASE_PRICE_EUR` in config.ts.

---

### Rule 7 — Sonnet for scans, Opus for synthesis

- **Trigger:** an audit / cross-cutting question.
- **Rule:** Fan out Sonnet subagents in parallel for scans (live site crawl, competitor profile, local file audit). Opus synthesizes. Never have Opus do all three sequentially — wastes ~35% tokens per the model-selection memory.
- **Verify:** Parent agent's first turn fires multiple `Agent` tool calls in a single message.
- **Why:** Memory `feedback_model_selection`. Verified again this session: three parallel Sonnet scans completed in ~200s total wall time, would have taken ~10 min sequential.

---

### Rule 8 — Verify subagent claims with direct tools

- **Trigger:** an Agent subagent returns a report claiming files exist / don't exist / contain X.
- **Rule:** For any specific file path, line number, or "missing from codebase" claim that you'll cite publicly — verify with `Read` / `Grep` / `Glob` directly before publishing.
- **Verify:** Cite tool calls, not agent narration.
- **Why:** Subagents work from excerpts and can miss content past their read window. Session 2026-05-26 — the local-audit Sonnet correctly read 17 routes but didn't surface that `app/shop/*` were dead duplicates because they weren't directly inspected.

---

### Rule 9 — File mtime ≠ source of truth. Check content currency.

- **Trigger:** find multiple docs that contradict each other, or find a dated file (`*_YYYY-MM-DD.md`).
- **Rule:** A newer file modification time does NOT mean the file's content is more current. Read each doc and check whether its claims match the actual code state. The accurate doc is the source of truth, not the most-recently-touched one.
- **Verify:** Before calling any doc "source of truth," cite at least one code file whose state matches that doc and contradicts the other docs.
- **Why:** Session 2026-05-26 — I called INTEGRATION_STATUS_2026-04-20.md the "newer source of truth" because of its dated filename. Independent verification revealed it's actually the OLDEST of three docs (README mtime 2026-10-02, CHECKLIST 2026-06-03, STATUS 2026-04-20). The STATUS file IS accurate — but for content reasons (it documents Resend, FareHarbor-only shop), not because it's newest. Newer files were touched but not updated to match code.

### Rule 10 — Verify cross-cutting claims with parallel Sonnet agents before publishing

- **Trigger:** about to publish an audit / gap report / "what's missing" doc covering 3+ distinct claims.
- **Rule:** Spawn one Sonnet subagent per claim, each told "do NOT trust prior reports, independently verify by reading the actual files/URLs." Each returns `VERDICT: PROVEN | WRONG | PARTIALLY-WRONG` with file:line evidence. Synthesize verdicts into a `VERIFICATION_RESULTS.md` companion file before publishing the audit.
- **Verify:** Every claim in the published audit has a corresponding verdict line in VERIFICATION_RESULTS.md with file:line citations.
- **Why:** Session 2026-05-26 — Cruz asked "have the things you found just AI delusion or research?" Six parallel verification agents proved 12/13 claims real with line evidence and caught 1 wrong framing (Rule 9 above). Without that step, the wrong claim would've shipped. Pattern: trust-but-verify with smaller AIs is cheaper than one Opus pass that re-reads everything.

### Rule 11 — Research → Confirm → Test gate (with explicit STOP)

- **Trigger:** about to make a runtime-behavior claim ("X works", "X is wired", "X fires", "X is missing"), OR about to make a code change that depends on knowing the intended end state.
- **Rule:** Walk three steps in order. If any step can't be completed from observable artifacts, output `STOP — needs <specific input>` and route to OWNER_INPUT_NEEDED.md before proceeding.
  1. **Research** — read code + commit messages + ADRs + status docs together (not in isolation). Note when they contradict.
  2. **Confirm** — pick ONE source of truth (always code over doc) and state the resolved fact.
  3. **Test** — exercise the behavior with a tool call: grep / curl / page load / `npm run build` / view-source. Cite the artifact (file:line or command output).
- **Verify:** Every claim has three citations: Research (which files / commits read), Confirm (which one wins and why), Test (what tool call proved it). If you wrote any of those as "I think" / "should be" / "probably", the gate failed — STOP.
- **Why:** Session 2026-05-26 (review skill) — I said "Fix the GTM lie in docs: NJRGZPGS removed, KR3CGLS6 is the only one" based on a single grep. Skipped Research (commit `c436555` intentionally removed NJRGZPGS but INTEGRATION_STATUS written AFTER it lists both as live — that's an unresolved intent question, not a "doc lie"). Skipped Confirm (which is right — single or dual?). Skipped Test (no page-source view to see what actually fires). The correct output was `STOP — needs Cruz's intent on dual-container`, not a fix recommendation.

### Rule 12 — Audit findings are claims; fix agents verify both directions before acting

- **Trigger:** about to apply a fix that came from an audit / gap-scanner subagent (exploding-pen, crystal-ball, matrix-reload, etc.).
- **Rule:** The fix agent's first action is to **re-verify the finding** against the current code:
  - If the finding is a **false positive** (already fixed / not present) → no edit; report back.
  - If the finding is a **false negative** by extension (agent said "sister routes don't exist" but Glob proves they do) → check the extended scope yourself, don't skip it.
  - In both cases, output the verification result before any edit.
- **Verify:** Every fix-agent report explicitly states (a) whether the original finding reproduced and (b) whether any "doesn't apply because X" claim was independently checked. No edit without those two answers.
- **Why:** Session 2026-05-26 — exploding-pen flagged `/api/contact` as missing `escapeHtml()`. Fix agent verified it was already protected (false positive — caught, no harm). Same agent claimed `/api/commission` and `/api/newsletter` "do not exist" — a Glob proved both exist. Newsletter had the vulnerability the audit was searching for, and the fix would have been skipped. Audit findings + fix-agent claims BOTH need independent verification.

---

### Rule 13 — Verification must reach the defect's surface (tsc is never enough)

- **Trigger:** about to commit / call "done" a change touching a route, page, data file (JSON/YAML), config, env, or rendered output — and the only check run was `tsc --noEmit`.
- **Rule:** Run the verification that can actually OBSERVE the defect class: `pnpm build` for routes/config/edge-runtime/framework-conventions; a live-server `curl` for content/i18n/HTTP-method/empty-state; a spec/ADR diff for value-correctness (ISR seconds, constants, prices). `tsc` validates types — it is blind to missing JSON keys, UTF-8 BOM, wrong constants, GET-vs-POST, stale ISR values, and edge-runtime conflicts.
- **Verify:** Each "done" claim names which surface was driven (build log exit 0 / curl output / ADR line) — not "tsc green."
- **Why:** Session 2026-06-01 (philosophy 020) — shipped the next-intl migration, 33 blank-label pages, a UTF-8 BOM build-breaker, `revalidate=7200` (ADR says 1800), and GET-only cron routes (405 on POST) all on tsc-green. Every one was invisible to the type checker and visible only at build/runtime/spec. The `feedback_runtime_verify_beats_static` memory said this already; it recurred ~6× in one session, which is why it's now a hard rule with `scripts/classify-suspect.sh` discipline behind it.

---

### Rule 14 — Determine WHY code exists before judging it (Chesterton's Fence)

- **Trigger:** about to call any artifact "dead / useless / a mistake / leave-it-alone / in-progress junk," or about to remove/revert it.
- **Rule:** First run the classification — `bash scripts/classify-suspect.sh <symbol-or-path>` — and read the evidence: static callers, dynamic/string-keyed refs, `vercel.json` crons + webhook routes, Next framework conventions (file-routing, metadata, generateStaticParams), intentional empty-state/failsafe markers, and spec/ADR mentions. Genuinely-useless bar: removing it changes observable behavior in NONE of {build, test, runtime, a spec/ADR} AND every evidence section is empty. If ANY section has hits, it exists for a reason → wire / keep / document, do NOT remove.
- **Verify:** Every "remove / revert / it's dead / leave it" disposition cites the classifier evidence it's based on — never appearance alone.
- **Why:** Session 2026-06-01 (philosophy 021) — mislabeled the cancel-feedback migration a "linter mistake" (it was intentional; reverting re-broke it), trusted agents that called a BOM build-break "missing exports" (the exports existed), and nearly treated `alpaca-birthday-cards` as half-built WIP when a `vercel.json` cron drives it. The classifier proved `CUserscruzbdevlog.txt` was the ONLY genuinely-dead artifact (0 refs, untracked, stray dev log) — everything else was load-bearing.

---

## Append protocol — how to add a new rule

When a session reveals a new failure mode:

1. **Reproduce the failure in one sentence.** Don't generalize yet.
2. **Identify the Trigger** — what was I about to do when the failure happened?
3. **Write the Rule** as a concrete action (with a tool name if applicable).
4. **Write the Verify step** — a check that proves you applied the rule. If you can't verify it, the rule is too vague.
5. **Write Why** — cite the session date + the actual mistake. No abstract justifications.
6. **Append at the bottom of "Active rules"** with the next sequential number. Date stays in the Why.
7. **Don't delete prior rules** — retire them under "Retired rules" with a strikethrough and reason.

Template:

```markdown
### Rule N — <short imperative>

- **Trigger:** <when this rule fires>
- **Rule:** <concrete action, tool name if applicable>
- **Verify:** <a check that proves you followed it>
- **Why:** Session YYYY-MM-DD — <one-sentence failure that motivated this>.
```

---

## Retired rules

(none yet)

---

## How this file grows

Three growth signals — each is a new rule candidate:

1. **Cruz corrects me on something specific.** Save the correction immediately as a rule (matches the auto-memory `feedback` type).
2. **An audit produces a wrong finding.** The mistake itself is a rule's Why.
3. **A pattern recurs across sessions.** If you find yourself running the same Grep over and over to verify a claim, that Grep belongs in pre-flight checks.

Cap at ~15 active rules. If you hit 15, retire the lowest-signal ones — anything I'd remember without the rule is dead weight.
