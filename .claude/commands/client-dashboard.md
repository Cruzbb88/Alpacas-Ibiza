---
description: Cross-client overview showing status of all active projects with priority matrix
argument-hint: "verbose (optional, for expanded details per project)"
allowed-tools: mcp__omni-cortex__cortex_global_stats, mcp__omni-cortex__cortex_global_search, mcp__omni-cortex__cortex_list_memories, Glob, Bash, Read
---

# Client Dashboard

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md

> **Note:** client-dashboard outputs to the terminal only (not a persisted markdown report). If a future version saves reports, they should go to `reports/client-dashboard/` with prefix `cd-` and follow the full report convention including YAML frontmatter, delta section, and trend tracking.

Cross-client overview showing the health, status, and priority of all active projects. Helps determine which project needs attention most using an Eisenhower-style urgency/importance matrix.

## Purpose

When managing multiple clients simultaneously, this command:
1. Gathers status from Omni-Cortex across all projects
2. Counts open vs. completed specs per project
3. Calculates days since last handoff and last activity
4. Evaluates system health from self-heal reports
5. Presents an Eisenhower matrix to prioritize where to focus

## Instructions

### Step 0: Parse Arguments

Check `$ARGUMENTS` for:
- **Empty / no args** -> Standard dashboard (compact view)
- **"verbose"** -> Expanded dashboard with full handoff summaries and recent decisions per project

### Step 1: Gather Global Stats

Use `cortex_global_stats` to get:
- Total memory count
- Per-project breakdown (project paths and memory counts)
- Tag distribution

Extract the list of unique project paths. These represent all known projects with stored context.

### Step 2: Discover Client Directories

Run `ls D:/Clients/` to enumerate all client directories on disk.

Merge the disk directories with the Omni-Cortex project paths to build a complete client roster. A project may exist on disk but not yet have memories, or may have memories but be archived.

### Step 3: Per-Project Data Collection

For each client project, gather the following in parallel where possible:

#### 3a. Last Handoff

Use `cortex_global_search` with:
- `query`: "handoff session-summary"
- `tags_filter`: ["handoff"]
- `project_filter`: project path or client name substring
- `limit`: 1

Extract:
- **Handoff date** (calculate days since)
- **Brief context** (first 1-2 sentences of CONTEXT section)
- **Next steps count** (how many items in NEXT STEPS)

#### 3b. Open Specs Count

Use `Glob` to count files:
- `specs/todo/*.md` in the client directory -> open specs
- `specs/done/**/*.md` in the client directory -> completed specs (includes project subfolders)

If no `specs/` directory exists, note "N/A".

#### 3c. System Health (if available)

Check for `reports/self-heal/` in the client directory.
If present, read the most recent `sh-*.md` report and extract from YAML frontmatter:
- `composite_score` (or `health_score`)
- `trend` (improving/declining/stable)
- `date`

If no reports exist, health is "Unknown".

#### 3d. Last Activity

Use `cortex_global_search` with:
- `query`: "client-switch OR handoff OR decision"
- `project_filter`: project path
- `limit`: 1
- (no tags_filter — we want ANY recent memory)

This gives the most recent memory creation date, which approximates "last activity".

#### 3e. Recent Decisions (verbose mode only)

If `$ARGUMENTS` contains "verbose":
Use `cortex_global_search` with:
- `query`: "decision architecture"
- `tags_filter`: ["decision"]
- `project_filter`: project path
- `limit`: 3

### Step 4: Calculate Priority Scores

For each project, compute a simple priority score (0-100) based on:

| Factor | Weight | Scoring |
|--------|--------|---------|
| Days since last handoff | 30% | 0-7 days: 20, 8-14 days: 50, 15+ days: 100 |
| Open specs ratio | 25% | open/(open+done) * 100 |
| Health score (inverted) | 25% | (100 - health_score), or 50 if unknown |
| Memory activity recency | 20% | 0-3 days: 10, 4-7 days: 40, 8+ days: 80 |

**Priority = weighted sum of the above factors.**

Higher score = needs more attention.

### Step 5: Build Eisenhower Matrix

Classify each project into quadrants based on priority score and open specs:

```
## Priority Matrix

         URGENT                    NOT URGENT
  +------------------------+------------------------+
  |                        |                        |
  | DO FIRST               | SCHEDULE               |
I | [Projects: score>70    | [Projects: score 40-70 |
M | AND open specs > 3]    | AND open specs > 0]    |
P |                        |                        |
O +------------------------+------------------------+
R |                        |                        |
T | DELEGATE/DISCUSS       | MONITOR                |
A | [Projects: score>70    | [Projects: score<40    |
N | AND open specs <= 3]   | AND open specs <= 3]   |
T |                        |                        |
  +------------------------+------------------------+
```

### Step 6: Display Dashboard

#### Compact View (default)

```
## Client Dashboard - {YYYY-MM-DD}

### Priority Matrix

**DO FIRST:** {project names}
**SCHEDULE:** {project names}
**DELEGATE/DISCUSS:** {project names}
**MONITOR:** {project names}

### Project Status

| Client | Last Handoff | Days Ago | Health | Open/Done Specs | Priority | Status |
|--------|-------------|----------|--------|-----------------|----------|--------|
| Ralph  | 2026-02-13  | 0        | 85/100 | 5/20            | 42       | SCORM grading |
| Surity | 2026-02-08  | 5        | --     | 2/0             | 71       | Data pipeline |

### Summary
- **Total clients:** {count}
- **Total open specs:** {sum across all projects}
- **Most urgent:** {highest priority project name} ({reason})
- **Healthiest:** {lowest priority project name}

### Recommended Focus
Based on the priority matrix, consider working on **{highest priority client}** next.
Reason: {explain — e.g., "5 days since handoff, 3 open specs, health declining"}
```

#### Verbose View (`/client-dashboard verbose`)

Same as compact PLUS for each project:

```
### {Client Name} - Detail

**Last Handoff Summary:**
{Full CONTEXT from handoff}

**In Progress:**
- {items}

**Next Steps:**
1. {items}

**Recent Decisions:**
- {decision 1}
- {decision 2}
- {decision 3}

**Open Specs:**
- spec-name-1.md
- spec-name-2.md
```

### Step 7: Offer Navigation

End with:
```
Quick actions:
- `/client-switch <name>` — Switch to a specific client
- `/pickup` — Resume from last handoff in current project
- `/client-onboard <name>` — Set up a new client project
- `/client-dashboard verbose` — Expanded view with full details
```

## Edge Cases

- **No clients on disk:** Report "No client directories found in D:\Clients\. Use `/client-onboard <name>` to create one."
- **Client on disk but no memories:** Show with health "New" and priority score based on directory age.
- **Memories exist but directory deleted/moved:** Flag as "Archived?" in the status column.
- **Single client:** Still show the dashboard (useful for tracking even one project).

## Example Usage

**Standard dashboard:**
```
/client-dashboard
```

**Detailed view with handoff summaries:**
```
/client-dashboard verbose
```

## Notes

- This is a read-only command. It does not modify any state or create memories.
- Priority scores are heuristic, not absolute. Use them as a guide, not a mandate.
- The Eisenhower matrix quadrant boundaries (score thresholds) can be adjusted if they feel miscalibrated.
- Run this at the start of a workday to decide which client to focus on.
- Pairs well with `/client-switch` for immediate context loading after choosing a client.

## Workflow

1. Parse $ARGUMENTS for "verbose" flag
2. Run cortex_global_stats to get all project paths and memory counts
3. List D:/Clients/ directories to merge with Cortex project list
4. For each client, gather in parallel: last handoff, open/done spec counts, health score, last activity
5. Calculate priority scores using the weighted formula (days since handoff, open specs, health, activity)
6. Classify each project into the Eisenhower matrix quadrants
7. Display compact or verbose dashboard based on $ARGUMENTS
8. Offer navigation shortcuts at the end

## Report

```
## Client Dashboard - {YYYY-MM-DD}

### Priority Matrix
**DO FIRST:** {client names}
**SCHEDULE:** {client names}
**DELEGATE/DISCUSS:** {client names}
**MONITOR:** {client names}

### Project Status
| Client | Last Handoff | Days Ago | Health | Open/Done Specs | Priority | Status |

### Summary
- Total clients: {N}
- Total open specs: {N}
- Most urgent: {client} ({reason})

### Recommended Focus
{highest priority client} — {reason}
```
