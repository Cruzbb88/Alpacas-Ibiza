# Agent Teams Config — Alpaca Farm Redesign

**Purpose:** Pre-defined team patterns for parallel-Sonnet work. Reference or invoke via `/agent-teams`.
**Last proven:** 2026-05-26 session (verification team, wave-audit team, peer-pattern-scan team all ran successfully).

---

## Prerequisite

Agent teams require:
```json
// ~/.claude/settings.json → "env"
{ "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }
```
Restart Claude Code after adding. Verify with `/agent-teams` before first run.

---

## Pattern 1: verification

**When to use:** You have 3–15 factual claims from a report, spec, or audit and need to know which are real before acting on them.

**Session proof:** `VERIFICATION_RESULTS.md` — 6 parallel Sonnet agents verified 13 claims in one pass. Result: 12/13 PROVEN, 1/13 corrected. Caught a false framing about file mtime as source-of-truth before it could contaminate PRACTICES.md.

**Spawn one agent per claim. No inter-agent communication needed — use Parallel Agents mode, not Full Team.**

### Prompt template

```
You are a verification agent. Your only job is to determine whether this claim is true.

CLAIM: {CLAIM}
SOURCE: {SOURCE_DOCUMENT} line {LINE_NUMBER}

Steps:
1. Read the files mentioned in the claim directly.
2. If the claim is about live site behavior, use WebFetch on the live URL.
3. Do NOT trust any prior report — go to primary sources only.
4. Return EXACTLY this schema and nothing else:

VERDICT: [PROVEN | WRONG | PARTIALLY-WRONG]
EVIDENCE: [1–3 sentences of direct evidence with file:line or URL]
CORRECTION: [If WRONG or PARTIALLY-WRONG — what is actually true]
```

### Output schema

```
VERDICT: PROVEN | WRONG | PARTIALLY-WRONG
EVIDENCE: <direct quote or measurement>
CORRECTION: <only present if not PROVEN>
```

### Constraints

- Max 6 agents at once (beyond 6, queue the next batch)
- Each agent is stateless — no SendMessage, no TaskCreate needed
- Synthesize results yourself after all agents complete

### Failure modes

| Mode | Recovery |
|------|----------|
| WebFetch network error | Agent should note "NETWORK_ERROR — cannot verify live behavior" and mark UNVERIFIED |
| Claim is ambiguous | Agent should return PARTIALLY-WRONG with the exact ambiguity stated |
| File not found | Agent should return WRONG with path evidence |

---

## Pattern 2: wave-audit

**When to use:** You want a multi-angle audit of the codebase before building. Runs crystal-ball, exploding-pen, probability-storm, and matrix-reload in parallel.

**Session proof:** `reports/wave-0-synthesis-2026-05-26.md` — 4 parallel Sonnet agents in ~210s wall time. Two independent agents converged on the same €15 vs €75/mo Adopt price conflict, confirming the finding before any code was written.

**Use Full Team mode only if you need agents to share findings mid-run. Otherwise use Parallel Agents.**

### Prompt template

```
You are the {SKILL_NAME} agent on the wave-audit team.
Project root: {PROJECT_ROOT}
Mode: {MODE}  (scan | quick | deep — use "scan" for first pass)

Run /skill-name in {MODE} mode against this project.

Output a report to: reports/{SKILL_NAME}-{DATE}.md

Schema:
- Score or finding count (top line)
- Top 5 findings ranked by leverage/effort
- One-line verdict

Do NOT fix anything. Do NOT modify source files. Read only.
```

**Replace `{SKILL_NAME}` with each of:** crystal-ball, exploding-pen, probability-storm, matrix-reload

### Output schema

Each agent writes its own report file. After all complete, you synthesize into `reports/wave-{N}-synthesis-{DATE}.md` using this structure:

```markdown
# Wave N — Audit Synthesis
Skills run: [list]
Method: N parallel Sonnet agents
Wall time: ~Xs (longest agent)

## Score summary
| Skill | Mode | Score | Verdict |

## Cross-agent critical finding
[Any finding flagged by 2+ agents independently — treat as highest priority]

## Top 10 findings (ranked by leverage/effort)
```

### Constraints

- All 4 agents are read-only — no writes, no edits
- If Cortex is unavailable, agents proceed without recall; note in synthesis
- crystal-ball needs `references/ARCHITECTURE.md` to exist in the skill folder — verify before launch

### Failure modes

| Mode | Recovery |
|------|----------|
| One skill hangs | Proceed with 3/4; note missing skill in synthesis header |
| Cortex unavailable | Agents run without recall; synthesis notes "no historical baseline" |
| Score methodology differs between runs | Always specify Mode explicitly so runs are comparable |

---

## Pattern 3: spec-execution

**When to use:** You have 2–4 parallel specs that touch different files and need to be built concurrently.

**Session proof:** Wave 1 ran 5 parallel agents (unified-field-theory + 3 site-assets + devtools-extract) against independent targets with no file conflicts. `reports/wave-1-synthesis-2026-05-26.md` documents the run.

**Preflight gate is mandatory (Rule 11). Run it before spawning.**

### Preflight gate (run before launch)

```
For each spec pair:
1. List all files each spec will touch (Read the spec, extract "Files" section)
2. Check for overlap: any file in both lists → sequence those specs, don't parallelize
3. Confirm each spec passes its own preconditions (e.g., design tokens exist before component work)
4. Max 4 agents in flight at once
```

### Prompt template

```
You are a build agent executing one spec.

Spec: {SPEC_PATH}
Project root: {PROJECT_ROOT}
Your file scope: {FILE_LIST}  ← extracted from spec

Rules:
- Do NOT touch files outside your scope
- Run type checks after every file change: npx tsc --noEmit
- If you discover a conflict (another agent owns a file you need), STOP and message team lead
- When done: mark task complete, post summary to team lead

Read PRACTICES.md and CANT_BE_DONE.md before starting.
```

### Spawn config

```json
{
  "subagent_type": "general-purpose",
  "team_name": "{PROJECT}-phase{N}",
  "name": "{spec-slug}-builder",
  "mode": "bypassPermissions",
  "model": "sonnet",
  "prompt": "<filled template above>"
}
```

### Constraints

- Hard cap: 4 agents in flight
- File ownership is exclusive — two agents, one file = guaranteed conflict
- Sequential dependencies (spec B imports spec A's output) must be serialized with `addBlockedBy`
- Never spawn on specs in `specs/done/` — check first

### Failure modes

| Mode | Recovery |
|------|----------|
| File conflict detected mid-run | Agent stops; lead resolves by sequencing with addBlockedBy |
| Type check fails | Agent fixes before reporting done — no half-done tasks |
| Agent goes idle unexpectedly | SendMessage to wake; if no response in 2 turns, spawn replacement |
| Owner-input-blocked spec | Do not spawn — move to CANT_BE_DONE.md or OWNER_INPUT_NEEDED.md first |

---

## Pattern 4: peer-pattern-scan

**When to use:** You have 2–5 competitor URLs and want steal/learn/avoid patterns extracted in parallel.

**Session proof:** `reports/site-assets/sa-002-2026-05-26-canmarti-peer.md` and `sa-003-2026-05-26-atzaro-peer.md` — 2 peer scans ran in parallel alongside live-site extraction. Canmarti scan surfaced press logos, contact-first booking, and inline image carousels as adoptable patterns before any design work started.

**Use Parallel Agents mode — no inter-agent communication needed.**

### Prompt template

```
You are a competitive research agent.

Target URL: {COMPETITOR_URL}
Peer label: {PEER_NAME}

Tasks:
1. Use WebFetch to load the homepage and up to 3 key interior pages
2. Run /site-assets to extract brand colors, typography, and visual hierarchy
3. Identify patterns in each of these three buckets:

STEAL: [Patterns that would work directly on the alpaca farm site — be specific]
LEARN: [Patterns that reveal a better approach worth adapting — explain the principle]
AVOID: [Anti-patterns that hurt UX or brand — explain why]

Output to: reports/site-assets/sa-{NNN}-{DATE}-{PEER_NAME}.md

Schema per finding:
- Pattern name
- Where it appears on the peer site (URL + section)
- Why it works or fails
- How to adapt it (or what to avoid)
```

### Constraints

- Cap at 5 agents (beyond 5, diminishing returns on competitor surface area)
- Each agent writes to its own output file — no shared state
- Do not extract copyrighted assets (logos, photos) — describe only
- Synthesize after all agents complete; flag any pattern 2+ peers share as high-signal

### Failure modes

| Mode | Recovery |
|------|----------|
| WebFetch blocked (403, bot protection) | Agent notes "BLOCKED — manual review needed" and returns what was accessible |
| Site is down | Agent returns "UNREACHABLE" and skips |
| No meaningful patterns found | Still output the file with "nothing to steal" — absence is data |

---

## When NOT to use agent-teams

- **Single-file edits** — coordination overhead exceeds the work
- **Sequential dependencies** — if step B needs step A's output, run serially with `/build`
- **Owner-input-blocked items** — do not parallelize blocked work; it creates hallucinated specs
- **Destructive operations** — never parallelize registry, partition, or system changes (see CLAUDE.md HARD RULES)
- **Same-file writes** — use `/git-worktrees` instead; parallel agents on the same file cause last-write-wins data loss

---

## Invocation reference

```
# Roadmap mode (preferred for spec-execution)
/agent-teams specs/roadmaps/ROADMAP-alpaca.md phase-2

# Named pattern (manual)
/agent-teams [describe pattern and targets inline, referencing this file]

# Check teams env var is set
cat ~/.claude/settings.json | grep AGENT_TEAMS
```
