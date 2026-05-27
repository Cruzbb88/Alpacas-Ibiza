# Eisenhower Classification Reference

> Scoring rules for classifying radar items into the 4-quadrant Eisenhower matrix.

## Two-Axis Scoring (0-100 each)

### Importance Axis

**Primary source:** Cortex importance score (0-100), used directly when available.

**Fallback estimation** (when no Cortex importance score exists):

| Item Type | Base Importance |
|-----------|----------------|
| Spec (specs/todo/) | 60 |
| Decision (type: decision) | 50 |
| Brainstorm (active) | 40 |
| Micro-task (mentioned in handoff) | 45 |
| Conversation intent (from prompt mining) | 25 |

### Urgency Axis

**Base score from staleness** (days since last touch):

| Days Since Last Touch | Base Urgency | Label |
|----------------------|-------------|-------|
| 0-3 | 20 | fresh |
| 3-7 | 40 | aging |
| 7-14 | 70 | stale |
| 14+ | 90 | buried |

**Modifiers** (additive, cap at 100):

| Condition | Modifier |
|-----------|----------|
| Item has explicit "NEXT STEPS" or "blocker" mention | +20 |
| Item appears in multiple handoffs (recurring forgotten) | +10 |
| Item is part of an active roadmap | +10 |
| Item has a deadline or time reference | +15 |
| Item is post-build validation with <50% completion (E2E, test, verify) | +25 |
| Item is blocking user acceptance testing (e.g., Eva PO test) | +30 |

**Defer penalty** (subtractive, applied to urgency):

| Condition | Modifier |
|-----------|----------|
| Item deferred once (`defer_count: 1`) | -20 urgency |
| Item deferred twice (`defer_count: 2`) | -35 urgency |
| Item deferred 3+ times (`defer_count: 3+`) | -50 urgency (floor at 10) |

Defer penalties move the item down within its quadrant (lower urgency = lower sort position). If the penalty drops urgency below the quadrant threshold (e.g., Q1 requires urgency >= 50), the item moves to Q2 instead. Defer counts are tracked in `.item-ledger.yaml` and persist across reports.

**Defer decay:** Defer penalties decay over time. After 7 days without being deferred again, `defer_count` decreases by 1 (min 0). This prevents permanently buried items.

**Hard cap:** Final urgency score is capped at 100 after all modifiers are applied. Floor at 10 (items never reach 0 urgency).

## Quadrant Assignment

| Quadrant | Condition | Action |
|----------|-----------|--------|
| **Q1: Do Now** | importance >= 50 AND urgency >= 50 | Immediate attention, top of report |
| **Q2: Schedule** | importance >= 50 AND urgency < 50 | Plan into next session |
| **Q3: Delegate/Automate** | importance < 50 AND urgency >= 50 | Suggest automation or batch execution |
| **Q4: Review/Prune** | importance < 50 AND urgency < 50 | Traffic light cleanup (spec 02) |

## Sorting

Within each quadrant, sort by:
1. **Defer-adjusted urgency descending** (most urgent first, after defer penalties applied)
2. Ties broken by **age descending** (oldest items first — items in queue longest get priority)
3. Further ties broken by importance descending

## Age Display

Every item in Q1-Q4 tables MUST show its age as `[Xd]` in a dedicated Age column:
- Age = days since `first_seen_date` in `.item-ledger.yaml` (NOT days since last touch)
- If no ledger entry exists (new item), age = `[0d]`
- Format: `[3d]`, `[14d]`, `[45d]`
- This is separate from staleness (staleness = days since last touch, age = days since first appearing in radar)

## Project Grouping

When multiple specs belong to the same roadmap:
1. **Group as a single item** in the compact table display (e.g., "Living-docs [8 specs]")
2. **Use the roadmap name** as the item title
3. **Importance:** Use spec base importance (60) — same for all specs in the group
4. **Urgency:** Use the most urgent spec in the group (highest staleness)
5. **Within-group ordering:** Sort by roadmap phase order, then spec number
6. **Expanded view:** In full reports (L2+), list individual specs under the group heading

This prevents a single project from flooding one quadrant with identical-score items.

## Staleness Calculation

```
staleness_days = (report_generation_date - item_last_touched_date).days
```

- `last_touched_date` = most recent of: Cortex memory created/accessed date, spec file modified date, or handoff mention date
- For handoff-sourced items: use the handoff memory's `created_at` date as `last_touched_date`
- For conversation intents: use the transcript file date
- Use the report generation date as "now", not the current time (for reproducibility)

## Special Categories

### Deferred Specs (specs/deferred/)
- These are **paused**, not forgotten
- Show in a separate "Paused" section, NOT in Q4
- Do not apply staleness urgency — they were intentionally shelved

### ADW Pipeline Items
- Assume complete unless Cortex shows failure
- Only flag if: no commit evidence, no e2e test, corrupted, or deployment failure
