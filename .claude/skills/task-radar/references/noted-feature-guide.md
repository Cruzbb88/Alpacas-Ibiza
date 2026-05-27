# Task Radar — Complete Argument Reference

## All Arguments

| Argument | Layer | Speed | Description |
|----------|-------|-------|-------------|
| *(empty)* | L2 | ~60s | Deep Radar — full Cortex + prompt mining scan |
| `quick` | L1 | <15s | Quick Scan — specs + recent handoffs only |
| `deep` | L2+L3 | ~90s | Deep Radar + Pipeline Audit with completion scoring |
| `global` | L4 | ~120s+ | Cross-project sweep (interactive project selection) |
| `report` | — | <5s | Show last report without re-scanning |
| `prune` | — | ~30s | Q4 traffic light cleanup (green/yellow/red) |
| `verify` | — | ~60s | Re-verify last report's items against current state |
| `update` | — | interactive | Mark items as done/progress/resolved in latest report |
| `note <text>` | — | <5s | Quick sticky note — store brain dump to Cortex (primary) |
| `noted <text>` | — | <5s | Alias for `note` — still works, same behavior |
| `note extract <text>` | — | ~15s | Extract actionable items from longer text/transcript |
| `note list` | — | <10s | Show all pending noted items in Eisenhower format |
| `note clear` | — | ~15s | Clear noted items matched to completed work |
| `note recap` | — | ~15s | Summarize all noted items into themes with recommendations |
| `note promote <id>` | — | <10s | Promote a noted item to full task with Eisenhower scoring |

---

## Note Feature — Detailed Usage

> **`note` is the primary command, `noted` still works as an alias.**

### `/task-radar note <text>` — Quick Sticky Note

Capture any idea, task, or brain dump without leaving your current workflow.

**Examples:**
```
/task-radar note Need to add department selector to PO upload flow — Ralph flagged this during the workshop
/task-radar note Maxeda SAP PO format uses 4-letter type codes and 8 PO types — need to write parser config
/task-radar note brainstorm session needed for AWCL project hierarchy and approval cascade
/task-radar note Jessica wants one-click translate Chinese to Dutch/French for AWCL spreadsheets
/task-radar note check if Fumasoft API sample has arrived from Jessie
```

**What happens:**
1. Cross-checks Cortex for duplicates (skips if >80% match found)
2. Stores with tags `task-radar-noted, sticky-note`, importance 60
3. Quick Eisenhower classification via keyword heuristics
4. Returns one-line confirmation: `[NOTED] Stored as mem_XXX (Q2: Schedule)`

---

### `/task-radar note extract <text or filepath>` — Extract from Text/Transcript (alias: `noted extract`)

Parse a longer block of text (meeting notes, transcript excerpt, brain dump) into individual actionable items.

**Examples:**
```
/task-radar note extract Ralph said we need: 1) reference data tables for supplier codes, 2) department mapping that's not on product master, 3) port/DC code lookups. Also Jessica wants translation for AWCL Excel files and PDF documents.

/task-radar note extract D:/Clients/Ralph/Surity_Project/Docs/Transcripts/AI workshop POC (Cluely part 1).md

/task-radar note extract The talking points from the demo: we showed PO upload and it worked, but the dashboard tab had errors. Ralph wants to see analytics next — how many POs processed, amendment rates, checklist generation counts. Also need to fix the Vercel CDN cache issue.
```

**What happens:**
1. Reads file if path provided, otherwise uses inline text
2. Extracts individual actionable items (imperatives, "need to", numbered lists)
3. Cross-references each against Cortex — marks EXISTING vs NEW
4. Stores only NEW items individually
5. Returns summary table with counts

---

### `/task-radar note list` — Show Pending Notes

Display all un-resolved noted items in Eisenhower matrix format.

**Example:**
```
/task-radar note list
```

**Output:**
```
## Noted Items (7 pending)

+----------------------------------+----------------------------------+
|  Q1: DO NOW (2)                  |  Q2: SCHEDULE (3)                |
|  [NOTED] Fix CDN cache   [85u]   |  [NOTED] Ref data tables [60i]   |
|  [NOTED] PO dash bug     [75u]   |  [NOTED] AWCL hierarchy  [65i]   |
|                                   |  [NOTED] Maxeda parser   [55i]   |
+----------------------------------+----------------------------------+
|  Q3: DELEGATE (1)                |  Q4: REVIEW (1)                  |
|  [NOTED] Translation UX  [55u]   |  [NOTED] Voice agent     [30i]   |
+----------------------------------+----------------------------------+

/task-radar note clear — remove completed
/task-radar note promote <keyword> — promote to spec
```

---

### `/task-radar note clear` — Clear Completed Notes

Automatically find and mark noted items that have been completed.

**Example:**
```
/task-radar note clear
```

**What happens:**
1. Queries all `task-radar-noted` items
2. Cross-references against: specs/done/, recent commits, handoff COMPLETED sections
3. Tags matched items as `resolved`
4. Reports what was cleared and why

---

### `/task-radar note recap` — Summarize Themes

Group all pending notes by topic and recommend next actions.

**Example:**
```
/task-radar note recap
```

**Output:**
```
## Noted Items Recap (7 items, 4 themes)

### Theme 1: Reference Data Management (3 notes)
- Supplier code lookup tables
- Port/DC code mappings
- Department field missing from Product Master
Recommendation: /brainstorm — these form a cohesive feature set

### Theme 2: PO Dashboard Fixes (2 notes)
- Console error on dashboard tab
- Field name mismatches
Recommendation: Just fix it — both are quick bug fixes

### Theme 3: AWCL Enhancements (1 note)
- Project hierarchy and approval cascade
Recommendation: /brainstorm — complex enough for a design session

### Uncategorized (1 note)
- Random idea about voice agent
Recommendation: Keep or archive — low priority
```

---

### `/task-radar note promote <id or keyword>` — Promote to Full Task

Elevate a noted item to a properly scored task with next-step recommendation.

**Examples:**
```
/task-radar note promote reference data
/task-radar note promote mem_1773855000000_abc123
```

**Output:**
```
Promoted: "Reference data lookup tables"
  Quadrant: Q1 (Do Now) — Importance: 75, Urgency: 80
  Recommendation: /quick-plan "Reference data management — admin CRUD for supplier codes, port/DC codes, department mapping. Blocks Maxeda PO conversion."
```

---

## Workflows

### Brain Dump During a Session
```
# While working on PO features, an idea hits you:
/task-radar note We should add bulk PO upload — Ralph mentioned handling 50+ POs at once

# Continue working... later another thought:
/task-radar note The analytics dashboard needs per-department breakdown — Jesse's request

# At end of session, see what accumulated:
/task-radar note list
```

### Extract Tasks from Meeting Transcript
```
# After a workshop, extract all action items:
/task-radar note extract D:/Clients/Ralph/Surity_Project/Docs/Transcripts/AI workshop POC (Cluely part 1).md

# Review what was found:
/task-radar note list

# Clean up items already done:
/task-radar note clear
```

### Weekly Noted Cleanup
```
# See themes and patterns:
/task-radar note recap

# Clear anything that got done this week:
/task-radar note clear

# Promote important items to specs:
/task-radar note promote reference data
/task-radar note promote AWCL hierarchy
```

### Promote Idea to Spec
```
# Start with a quick note:
/task-radar note PDF extraction pipeline for vendor documents — pre-populate AWCL from existing artwork PDFs

# Later, when ready to formalize:
/task-radar note promote PDF extraction

# Follow the recommendation:
/brainstorm generate PDF Extraction Pipeline for Surity...
```

---

## How Note Items Appear in Reports

> Both `note` and `noted` work — `noted` is preserved as an alias for backward compatibility.

When you run any scan (`/task-radar`, `/task-radar deep`, `/task-radar quick`, `/task-radar global`), noted items are automatically included:

1. Pending noted items are fetched from Cortex using triple-tag search (queries `task-radar-noted`, `noted+task-radar`, and `sticky-note` tags, then deduplicates)
2. Items tagged `resolved` are excluded
3. Each gets `[NOTED]` prefix in the Eisenhower matrix
4. They appear alongside specs, handoff items, and brainstorms
5. Keyword-based Eisenhower classification determines their quadrant

**Example in a deep report:**
```
## Q1: DO NOW (5 items)
| # | Item | Source | Completion | Urgency |
|---|------|--------|------------|---------|
| 1 | Fix CDN cache stale bundles | handoff-58 | 0% | 90 |
| 2 | [NOTED] PO dashboard console error | mem_xxx | 0% | 85 |
| 3 | S08 Vendor Portal spec | specs/todo | 25% | 70 |
| 4 | [NOTED] Reference data tables | mem_yyy | 0% | 65 |
| 5 | Fix packaging formats 500 | handoff-55 | 0% | 60 |
```

The `[NOTED]` prefix makes it easy to distinguish brain dumps from structured items.
