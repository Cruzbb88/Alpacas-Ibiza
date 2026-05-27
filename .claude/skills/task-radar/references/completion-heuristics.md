# Completion Heuristics Reference

> Lookup table for estimating completion % of radar items based on evidence level.

## Evidence Hierarchy

Each level includes all evidence below it. Use the **highest evidence level found** to determine the completion range.

| Evidence Level | Completion % | How to Detect |
|---------------|-------------|---------------|
| Raw idea / Cortex memory only | 5-10% | Memory exists, no spec file, no brainstorm brief |
| Active brainstorm (no brief) | 15% | Cortex memory tagged `brainstorm` with `STATUS: active` |
| Brainstorm brief exists | 20% | Cortex memory tagged `brainstorm` with `STATUS: completed` |
| Spec generated | 25-30% | File exists in `specs/todo/` matching this item |
| Work started | 35-60% | Cortex has `progress` or `build` memories referencing this spec/item |
| Core implementation done | 65-70% | Cortex has `build SUCCESS` memory for this item |
| Post-build skills run | 75-80% | Cortex has `adw-analyze`, `self-heal`, or similar post-build memories |
| E2E tests passing | 85-90% | Cortex has `e2e-test` success memory |
| Merged + deployed + validated | 95-100% | Spec moved to `specs/done/` AND deploy memory exists |

## Within-Range Scoring

When an item falls within a range (e.g., 35-60% for "work started"):

- **Low end (35%):** Single progress memory, early stage
- **Mid (45-50%):** Multiple progress memories, substantial work done
- **High end (60%):** Recent progress memories, most phases described in spec are addressed

## Special Cases

### ADW Pipeline Items
- Assume **complete** unless Cortex shows failure
- Flag only if: no commit evidence, no e2e test, error/corruption in memory, or no deployment
- If flagged: assign 70% (core done but verification missing)

### Deferred Specs (specs/deferred/)
- Mark as **Paused** — separate from incomplete
- Show last known completion % before deferral
- Do not count toward unfinished work totals

### Multi-Spec Projects
- If item is part of a roadmap with N specs:
  - Count completed specs (in specs/done/) vs total
  - Project completion = (completed / total) * 100
  - Individual spec completion uses the standard hierarchy above

## Detection Methods

### Spec file detection
```
Glob: specs/todo/**/*.md → pending
Glob: specs/done/**/*.md → completed
Glob: specs/deferred/**/*.md → paused
```

### Cortex memory detection
```
cortex_recall: "build SUCCESS {item_title}" → build complete
cortex_recall: "e2e-test {item_title}" → e2e done
cortex_recall: "self-heal {project}" → post-build skill run
cortex_recall: "deploy {project}" → deployed
```

### Activity-based scoring
- Count distinct Cortex memories referencing this item
- 1 memory = low end of range
- 3+ memories = mid range
- 5+ memories with recent dates = high end
