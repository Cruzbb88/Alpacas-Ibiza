# Architecture Decision Tracker Command

> **CLI-first migration (Spec 17):** Fire-and-forget operations (remember for ADR storage, link for
> connecting decisions, recall for pre-fetch) use `cortex` CLI via Bash. Interactive operations
> (list_memories for browsing, recall where LLM reasons about results) remain as MCP.
> Estimated CLI ratio: ~50%.

This is the main execution command for the Architecture Decision Tracker skill.

## Step 0: Parse Arguments

Parse `$ARGUMENTS` for:

1. **Sub-command** (required): `capture`, `search`, `radar`, or `debt`
2. **Description/query**: The decision text (for `capture`) or search query (for `search`)
3. **--project**: Filter by project name (optional, defaults to detecting from current working directory)

Rules:
- First word after `/adr` determines the sub-command
- Everything after the sub-command (excluding flags) is the description/query text
- If no sub-command is recognized, prompt the user to specify one
- Detect project name from working directory if `--project` is not provided:
  - Read the nearest `CLAUDE.md`, `package.json`, or directory name
  - Fall back to "general" if no project can be determined

---

## Layer 1: Capture & Search

### Sub-command: `capture`

Record a new architecture decision.

#### Capture Step 1: Extract Decision Details

From the user's description, extract or ask for:

- **Title**: Short name for the decision (derive from description)
- **Context**: What prompted this decision
- **Decision**: What was decided
- **Rationale**: Why this choice was made
- **Alternatives**: What else was considered (ask if not provided)
- **Consequences**: Positive, negative, and risks
- **Domain**: Classify into one of the domain categories from `references/adr-template.md`
- **Review Date**: Ask if the decision should be periodically reviewed

If the user provided a brief one-liner, expand it into the full ADR format by asking clarifying questions:
1. "What alternatives did you consider?"
2. "What are the main trade-offs or risks?"
3. "Should this decision be reviewed periodically? If so, when?"

If the user provided a detailed description, extract all fields directly without asking.

#### Capture Step 2: Determine ADR Number

Query cortex for existing ADRs in this project:

```
cortex_recall: "ADR project:{project_name}"
cortex_list_memories: filter by tags ["adr", "{project_name}"]
```

Find the highest ADR number for this project. Next number = highest + 1 (or 001 if none exist).

#### Capture Step 3: Format and Store

Read `references/adr-template.md` for the format template.

Build the full ADR text following the template, then store via CLI (fire-and-forget — Spec 17):

```bash
# CLI: store ADR (fire-and-forget, capture ID for linking)
ADR_ID=$( (cortex remember "{full ADR text following template format}" \
  --tags adr,{project_name},{domain} --importance 70 --json 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- \
  remember "{full ADR text following template format}" \
  --tags adr,{project_name},{domain} --importance 70 --json 2>/dev/null) | \
  python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
```

#### Capture Step 4: Link Related Memories

Search for related memories and link them:

```
cortex_recall: "{decision_topic} {domain}"
cortex_recall: "ADR {project_name} {domain}"
```

For each relevant memory found, link via CLI (fire-and-forget — Spec 17):
```bash
(cortex link "$ADR_ID" "{related_memory_id}" 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- link "$ADR_ID" "{related_memory_id}" 2>/dev/null) || true
```

If the decision supersedes an existing ADR:
1. Link the new ADR to the old one
2. Note in output that the old ADR should be updated to status "superseded"

#### Capture Step 5: Output Confirmation

```markdown
## ADR Recorded

- **Number**: ADR-{NNN}
- **Title**: {title}
- **Project**: {project_name}
- **Domain**: {domain}
- **Status**: accepted
- **Review Date**: {date or "none"}
- **Related ADRs**: {linked ADR numbers or "none"}
- **Cortex Memory ID**: {memory_id}

### Summary
{1-2 sentence summary of the decision and its rationale}

### Crystal Ball Integration
This ADR is now available for `/crystal-ball` decay and predict analysis.
```

---

### Sub-command: `search`

Find past decisions by topic.

#### Search Step 1: Query Cortex

Run multiple searches to maximize recall:

```
cortex_recall: "{search_query}"
cortex_recall: "ADR {search_query}"
cortex_global_search: "{search_query} architecture decision"
cortex_list_memories: filter by tags ["adr"]
```

If `--project` is specified, also filter:
```
cortex_recall: "ADR {project_name} {search_query}"
```

#### Search Step 2: Filter and Rank Results

From the cortex results:
1. Filter to only memories tagged with "adr"
2. If `--project` specified, further filter by project tag
3. Rank by relevance to the search query
4. Include related non-ADR memories that provide context (but mark them as "related context")

#### Search Step 3: Format Results

```markdown
## ADR Search: "{query}"

{If --project}: **Filtered to project:** {project_name}

### Matching Decisions

| # | ADR | Title | Project | Status | Date | Domain |
|---|-----|-------|---------|--------|------|--------|
| 1 | ADR-{NNN} | {title} | {project} | {status} | {date} | {domain} |
| 2 | ... | ... | ... | ... | ... | ... |

### Decision Details

#### ADR-{NNN}: {Title}
- **Status**: {status}
- **Date**: {date}
- **Context**: {context summary}
- **Decision**: {decision summary}
- **Rationale**: {rationale summary}

{Repeat for each matching ADR, up to 10 results}

### Related Context
{Any non-ADR memories that provide additional context, if found}

---
**{N} decisions found.** {If 0: "No matching ADRs found. Try broadening your search or check the project filter."}
```

---

## Layer 2: Radar & Debt

### Sub-command: `radar`

Surface decisions that may need revisiting. This is the decay detection layer.

#### Radar Step 1: Gather All ADRs

```
cortex_list_memories: filter by tags ["adr"]
```

If `--project` specified:
```
cortex_list_memories: filter by tags ["adr", "{project_name}"]
```

#### Radar Step 2: Apply Decay Detection

For each ADR, evaluate decay signals:

**Signal 1: Review Date Passed**
- If the ADR has a review date and it is before today's date, flag it
- Severity: HIGH if more than 30 days overdue, MEDIUM if 1-30 days overdue

**Signal 2: Age Without Access**
- ADRs older than 90 days that haven't been accessed or updated
- These may represent forgotten decisions that are still in effect
- Severity: MEDIUM

**Signal 3: Status Mismatch**
- ADRs with status "accepted" that reference technologies/tools no longer in use
- ADRs with status "under-review" for more than 30 days (stalled review)
- Severity: HIGH for stalled reviews, MEDIUM for potential staleness

**Signal 4: Superseded Without Link**
- ADRs with status "superseded" that don't link to a replacement
- Severity: LOW (housekeeping)

#### Radar Step 3: Crystal Ball Integration

Format decay findings for `/crystal-ball` consumption:

```
For each flagged ADR, prepare a decay signal:
{
  source: "adr-radar",
  adr: "ADR-{NNN}",
  project: "{project}",
  signal: "{signal_type}",
  severity: "{HIGH|MEDIUM|LOW}",
  description: "{why this ADR is flagged}",
  last_reviewed: "{date or unknown}",
  age_days: {number}
}
```

Store radar results in cortex for crystal-ball to query:
```
cortex_remember:
  content: "ADR Radar scan {date}: {N} decisions flagged. {summary of findings}"
  tags: ["adr-radar", "crystal-ball-decay", "{project_name or 'all'}"]
  importance: 65
```

#### Radar Step 4: Output Report

```markdown
## ADR Radar Report

**Scan Date**: {YYYY-MM-DD}
**Scope**: {project_name or "all projects"}
**Total ADRs Scanned**: {count}
**Decisions Flagged**: {count}

### Decisions Needing Attention

#### HIGH Priority

| ADR | Title | Project | Signal | Details |
|-----|-------|---------|--------|---------|
| ADR-{NNN} | {title} | {project} | {signal} | {detail} |

#### MEDIUM Priority

| ADR | Title | Project | Signal | Details |
|-----|-------|---------|--------|---------|
| ADR-{NNN} | {title} | {project} | {signal} | {detail} |

#### LOW Priority (Housekeeping)

| ADR | Title | Project | Signal | Details |
|-----|-------|---------|--------|---------|
| ADR-{NNN} | {title} | {project} | {signal} | {detail} |

### Recommendations

1. {Highest priority action item}
2. {Second priority action item}
3. ...

### Crystal Ball Feed
Radar data stored for `/crystal-ball` analysis. Run `/crystal-ball decay` to incorporate ADR health into system-wide decay detection.
```

---

### Sub-command: `debt`

Report on decision debt: overdue reviews, high-impact unvalidated decisions, status distribution.

#### Debt Step 1: Gather All ADRs

Same as Radar Step 1 — query cortex for all ADRs (optionally filtered by project).

#### Debt Step 2: Compute Debt Metrics

**Metric 1: Status Distribution**
Count ADRs by status:
- `accepted`: Active decisions
- `under-review`: Decisions being reconsidered
- `superseded`: Replaced decisions
- `deprecated`: Retired decisions

**Metric 2: Overdue Reviews**
Count ADRs where review date < today's date.
Break down by how overdue:
- 1-30 days: Recently overdue
- 31-90 days: Significantly overdue
- 90+ days: Critically overdue

**Metric 3: Domain Coverage**
Count ADRs by domain. Identify domains with zero coverage (potential blind spots).

**Metric 4: Decision Velocity**
ADRs created per month over the last 6 months. Trends:
- Increasing: Rapid architectural evolution (may need more review cycles)
- Decreasing: Stabilizing or possibly undocumented decisions happening
- Zero: Architecture decisions not being recorded

**Metric 5: Orphaned Decisions**
ADRs with no related links (isolated decisions that may lack context).

#### Debt Step 3: Output Report

```markdown
## Architecture Decision Debt Report

**Report Date**: {YYYY-MM-DD}
**Scope**: {project_name or "all projects"}
**Total ADRs**: {count}

### Status Distribution

| Status | Count | % |
|--------|------:|--:|
| Accepted | {n} | {pct}% |
| Under Review | {n} | {pct}% |
| Superseded | {n} | {pct}% |
| Deprecated | {n} | {pct}% |

### Overdue Reviews

| Urgency | Count | ADRs |
|---------|------:|------|
| Critically overdue (90+ days) | {n} | {ADR list} |
| Significantly overdue (31-90 days) | {n} | {ADR list} |
| Recently overdue (1-30 days) | {n} | {ADR list} |
| **Total overdue** | **{n}** | |

### Domain Coverage

| Domain | ADR Count | Last Decision |
|--------|----------:|--------------|
| infrastructure | {n} | {date or "never"} |
| data | {n} | {date or "never"} |
| api | {n} | {date or "never"} |
| frontend | {n} | {date or "never"} |
| backend | {n} | {date or "never"} |
| security | {n} | {date or "never"} |
| integration | {n} | {date or "never"} |
| tooling | {n} | {date or "never"} |
| process | {n} | {date or "never"} |

**Blind spots** (domains with 0 ADRs): {list or "none"}

### Decision Velocity (Last 6 Months)

| Month | ADRs Created |
|-------|------------:|
| {month} | {count} |
| ... | ... |

**Trend**: {increasing/decreasing/stable/insufficient data}

### Orphaned Decisions
ADRs with no related links: {count}
{List ADR numbers if count > 0}

### Debt Score

**Overall Decision Debt: {LOW|MEDIUM|HIGH|CRITICAL}**

Scoring:
- Overdue reviews > 5: +1 severity level
- Blind spot domains > 3: +1 severity level
- Orphaned decisions > 50%: +1 severity level
- Under-review stalled > 30 days: +1 severity level

### Recommendations

1. {Highest priority recommendation}
2. {Second priority recommendation}
3. ...
```

#### Debt Step 4: Store Report

```
cortex_remember:
  content: "ADR Debt Report {date}: {total} ADRs, {overdue} overdue, debt level {level}. {key_finding}"
  tags: ["adr-debt", "crystal-ball-decay", "{project_name or 'all'}"]
  importance: 60
```

---

## Safety Rules

1. **The skill captures decisions, it does NOT make them.** Always present as recording, never as recommending.
2. **No sensitive data in ADRs.** Do not store API keys, credentials, passwords, or personal information. Architecture decisions only.
3. **Per-project numbering.** ADR-001 in one project is independent from ADR-001 in another.
4. **Superseded ADRs must link.** When a decision replaces another, both must reference each other.
5. **Graceful degradation.** If cortex is unavailable, inform the user and suggest storing the ADR as a local file instead.
6. **Review dates are optional.** Do not force a review date on every decision.
7. **Do not invent context.** If the user's description is too brief, ask clarifying questions rather than fabricating details.
8. **Crystal Ball integration is informational.** Radar and debt data feeds into crystal-ball but does not trigger automated actions.
