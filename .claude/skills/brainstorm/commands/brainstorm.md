# Brainstorm Command

> **CLI-first migration (Spec 17):** Fire-and-forget operations (remember, link, update for state persistence)
> use `cortex` CLI via Bash. Interactive operations (list_memories for browsing, recall for reasoning)
> remain as MCP calls since the LLM needs to reason about the results.

Interactive idea-to-spec pipeline with multi-session persistence. 3 layers: Capture & Clarify, Synthesize & Structure, Spec Pipeline.

## Step 0: Parse Arguments

Parse `$ARGUMENTS` for sub-command and mode:

1. **No arguments** → Start new brainstorm (ask for project name, enter L1)
2. **`resume <name>`** → Recall brainstorm by name from cortex, continue L1
3. **`list`** → List all active/completed brainstorms, then stop
4. **`done`** → Trigger L2 synthesis on most recent active brainstorm
5. **`generate`** → Trigger L2 synthesis + L3 spec pipeline
6. **`--mode rapid-fire`** → Set mode (can combine with empty/resume)
7. **`--mode expansion`** → Set mode (can combine with empty/resume)
8. **`--mode first-principles`** → Set mode (can combine with empty/resume)
9. **`branch <number>`** → Go deeper on option N from the most recent expansion
10. **`backtrack`** → Return to the previous branch point in expansion mode
11. **`merge <N,N,...>`** → Merge specified expansion options into a combined working dump
12. **`regenerate [guidance]`** → Re-run expansion with optional directional guidance

Default mode is **solo** if no `--mode` specified.

---

## Sub-command: `list`

Show all brainstorms stored in cortex.

### List Step 1: Query Active Brainstorms

```
cortex_list_memories:
  tags_filter: ["brainstorm", "active"]
  sort_by: "created_at"
  sort_order: "desc"
  limit: 10
```

### List Step 2: Query Completed Brainstorms

```
cortex_list_memories:
  tags_filter: ["brainstorm", "completed"]
  sort_by: "created_at"
  sort_order: "desc"
  limit: 5
```

### List Step 3: Display

```markdown
### Active Brainstorms

| # | Project | Mode | Questions | Sessions | Last Updated |
|---|---------|------|-----------|----------|-------------|
| 1 | {name} | {mode} | {count} | {count} | {relative time} |

### Recently Completed

| # | Project | Specs Generated | Completed |
|---|---------|----------------|-----------|
| 1 | {name} | {count} specs | {relative time} |
```

Parse each memory's content to extract the BRAINSTORM name, MODE, QUESTIONS_ASKED, and SESSIONS fields.

If no active brainstorms found, display: "No active brainstorms. Run `/brainstorm` to start one."

**After displaying the list, stop. Do not continue to L1/L2/L3.**

---

## Sub-command: `resume <name>`

### Resume Step 1: Search Cortex

```
cortex_list_memories:
  tags_filter: ["brainstorm", "active"]
  sort_by: "created_at"
  sort_order: "desc"
  limit: 10
```

Search results for a memory whose content contains `BRAINSTORM: <name>` (case-insensitive).

### Resume Step 2: Load or Suggest

**If found:**
- Load the full memory content
- Parse BRAIN_DUMP, Q&A, QUESTIONS_ASKED, SESSIONS, MODE
- Call `cortex_get_memory_history` with `memory_id: {brainstorm_memory_id}`, `include_content: false`, `limit: 1` to get version count
- Display: "Resuming brainstorm '{name}' — {X} questions asked across {Y} sessions"
- If version count > 1, also display: "This brainstorm has {N} versions. Run `/memory history {id}` to see how it evolved."
- Increment SESSIONS counter
- Continue to L1 with the loaded context (skip the brain dump prompt — go straight to follow-up questions or ask "What else would you like to add?")

**If not found:**
- List similar names from active brainstorms
- Ask: "No active brainstorm named '{name}'. Did you mean one of these, or start a new one?"

---

## Sub-command: `done`

Triggers L2 synthesis on the most recent active brainstorm.

### Done Step 1: Find Active Brainstorm

```
cortex_list_memories:
  tags_filter: ["brainstorm", "active"]
  sort_by: "created_at"
  sort_order: "desc"
  limit: 1
```

If no active brainstorm found: "No active brainstorm. Run `/brainstorm` to start one."

### Done Step 2: Jump to L2

Load the brainstorm memory, then proceed to **Layer 2: Synthesize & Structure** below.

After L2 completes and the user approves the brief, **stop**. Do not proceed to L3. Tell the user: "Brief approved. Run `/brainstorm generate` when ready to create specs."

---

## Sub-command: `generate`

Triggers L2 synthesis + L3 spec pipeline.

### Generate Step 1: Find Active or Synthesized Brainstorm

```
cortex_list_memories:
  tags_filter: ["brainstorm", "active"]
  sort_by: "created_at"
  sort_order: "desc"
  limit: 1
```

Also check for a brainstorm with STATUS: synthesized (brief already approved):
```
cortex_recall:
  query: "brainstorm synthesized brief approved"
  tags_filter: ["brainstorm"]
  limit: 3
```

**If synthesized brainstorm found:** Skip L2, jump straight to L3.
**If active brainstorm found:** Run L2 first, then L3 after user approves the brief.
**If neither found:** "No brainstorm to generate from. Run `/brainstorm` to start one."

---

## Sub-command: `branch <number>`

Explore an expansion option in more depth by generating sub-options.

### Branch Step 1: Load Expansion State

```
cortex_list_memories:
  tags_filter: ["brainstorm", "active"]
  sort_by: "created_at"
  sort_order: "desc"
  limit: 1
```

Parse the memory content for `EXPANSION_STATE`. If no expansion state exists: "No expansion options to branch from. Run `/brainstorm --mode expansion` first."

### Branch Step 2: Validate Option Number

Check that `<number>` is a valid option index in `CURRENT_NODE.OPTIONS`. If invalid: "Option {N} doesn't exist. Available options: 1-{max}."

### Branch Step 3: Generate Sub-Options

Load the specified option as the new context. Run expansion generation (Step E2) scoped to this option's concept:
- The option's description becomes the "brain dump" for sub-option generation
- The original `CORE_GOAL` remains the anchor
- The injected context (from L1 Step 1.5) carries forward
- Generate 2-3 novel sub-approaches + 2-3 variations, all relative to the selected branch

Present using Step E3 format with plausibility scores.

### Branch Step 4: Update Branch Tree

```
BRANCH_TREE:
  {parent_node}:
    SELECTED: {number}
    CHILDREN:
      BRANCH_{number}:
        OPTIONS: [{sub-options generated}]
        SELECTED: null
        CHILDREN: {}
CURRENT_NODE: BRANCH_{number}
HISTORY: [...previous, BRANCH_{number}]
```

Keep option descriptions concise in the tree state (title + 1 sentence). Full descriptions are in the presentation only.

### Branch Step 5: Persist to Cortex

Update the brainstorm memory with the new branch tree state.

---

## Sub-command: `backtrack`

Return to the previous branch point and re-display those options.

### Backtrack Step 1: Load Expansion State

Same as Branch Step 1. If no expansion state: "No expansion to backtrack in."

### Backtrack Step 2: Check History

If `HISTORY` has only `ROOT`: "Already at the root. Nothing to backtrack to."

### Backtrack Step 3: Navigate Back

Pop the last entry from `HISTORY`. Set `CURRENT_NODE` to the previous entry. Do NOT delete the branch that was explored — the tree is append-only (the user might want to return to it).

### Backtrack Step 4: Re-Display Options

Re-display the options at the restored node using Step E3 format. Include a note: "Backtracked to {node name}. Your previous exploration of option {N} is preserved — you can branch into it again."

### Backtrack Step 5: Persist to Cortex

Update the brainstorm memory with the updated `CURRENT_NODE` and `HISTORY`.

---

## Sub-command: `merge <N,N,...>`

Combine multiple expansion options into a single working dump.

### Merge Step 1: Load Expansion State

Same as Branch Step 1. If no expansion state: "No expansion options to merge."

### Merge Step 2: Parse and Validate Options

Parse the comma-separated option numbers (e.g., `1,3`). Validate each is a valid index in `CURRENT_NODE.OPTIONS`.

### Merge Step 3: Combine Options

Load each specified option's description. Combine them into a merged working dump that synthesizes the key ideas from each option into a coherent concept.

Present the merge:
```
Merged options {N} and {M}:

**Combined concept:** {merged description synthesizing both options}

Use this as your working brain dump? (yes / adjust)
```

### Merge Step 4: Process Confirmation

- **Yes** → Update `WORKING_DUMP` with the merged content. Continue to category-based Q&A (solo-style) from uncovered categories.
- **Adjust** → Ask what to change, apply adjustments, re-present.

Merge is a terminal action — it does NOT create a new branch node. It leads directly to Q&A.

### Merge Step 5: Persist to Cortex

Update the brainstorm memory with the new `WORKING_DUMP` and mark `SELECTED` on the current node with the merged option numbers.

---

## Sub-command: `regenerate [guidance]`

Re-run expansion generation at the current node, optionally with directional guidance.

### Regenerate Step 1: Load Expansion State

Same as Branch Step 1. If no expansion state: "No expansion to regenerate. Run `/brainstorm --mode expansion` first."

### Regenerate Step 2: Prepare Guidance

If guidance text is provided, format it as a constraint:
```
REGENERATION GUIDANCE (from user):
"{guidance text}"
Apply this guidance when generating new options. Avoid directions the user ruled out.
```

If no guidance: proceed with a fresh take using the same context.

### Regenerate Step 3: Re-Run Expansion

Extract `CORE_GOAL` and the parent context (brain dump + injected context). Re-run Step E2 with the guidance (if any) prepended to the generation prompt.

### Regenerate Step 4: Replace Current Options

Replace `CURRENT_NODE.OPTIONS` with the newly generated options. Preserve the rest of the branch tree — do NOT wipe children of other branches.

Present the new options using Step E3 format.

### Regenerate Step 5: Persist to Cortex

Update the brainstorm memory. Store the guidance text if provided:
```
REGENERATE_GUIDANCE: "{guidance text}"
```

---

## New Brainstorm (no sub-command)

### New Step 1: Ask for Project Name

Use `AskUserQuestion` or simply prompt:
"What's the project name for this brainstorm? (short, kebab-case — e.g., 'client-portal', 'video-pipeline')"

### New Step 2: Check for Existing Brainstorm

```
cortex_list_memories:
  tags_filter: ["brainstorm"]
  sort_by: "created_at"
  sort_order: "desc"
  limit: 20
```

Search for any memory with `BRAINSTORM: <name>`:
- **If active exists:** Suggest `resume` instead: "There's already an active brainstorm named '{name}'. Resume it with `/brainstorm resume {name}`, or choose a different name."
- **If completed exists:** Ask: "A completed brainstorm named '{name}' exists. Start a fresh one with the same name?"
- **If no conflict:** Proceed.

### New Step 3: Create Initial Cortex Memory

Use CLI to create the brainstorm memory (fire-and-forget — Spec 17). Capture the memory ID for later updates:
```bash
# CLI: create brainstorm memory and capture ID
BRAINSTORM_CONTENT="BRAINSTORM: {project-name}
STATUS: active
MODE: {solo|rapid-fire|expansion|first-principles}
STARTED: {ISO date}
LAST_UPDATED: {ISO date}

BRAIN_DUMP:
(awaiting input)

Q&A:
(none yet)

QUESTIONS_ASKED: 0
SESSIONS: 1"

BRAINSTORM_ID=$( (cortex remember "$BRAINSTORM_CONTENT" --tags brainstorm,active,{project-name} --importance 80 --json 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- remember "$BRAINSTORM_CONTENT" --tags brainstorm,active,{project-name} --importance 80 --json 2>/dev/null) | \
  python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
```
```

### New Step 4: Enter L1

**If mode is first-principles:** Display the opening quote from `references/first-principles-protocol.md`:
> *"The best part is no part. The best process is no process."* -- Elon Musk

Then prompt: "Tell me about your idea or problem. Brain dump everything -- I'm going to strip it down to bedrock truths and rebuild from there."

**All other modes:** Prompt the user: "Tell me about your idea. Brain dump everything -- the messier the better. I'll ask follow-up questions after."

Then proceed to **Layer 1: Capture & Clarify**.

---

## Layer 1: Capture & Clarify

L1 handles the interactive brain dump and adaptive follow-up questions.

### L1 Step 1: Receive Brain Dump

After the user provides their brain dump:

1. Update the cortex memory with the brain dump content:
```
cortex_update_memory:
  memory_id: {brainstorm_memory_id}
  content: (full updated content with BRAIN_DUMP filled in, LAST_UPDATED updated)
```

2. **If mode is first-principles:** Skip Steps 2-4 below. Instead, proceed to **L1 First-Principles Protocol** (see below).

3. **All other modes:** Analyze the brain dump against the 10 question categories from `references/question-bank.md`.

### L1 Step 1.5: Context Gathering (expansion & first-principles only)

**Skip this step for solo and rapid-fire modes.**

Before mode-specific processing, gather surrounding context to give the LLM material to diverge from:

1. **Cortex Recall:** Run `cortex_recall` with the brain dump's first sentence + project name as query, `limit: 5`. Extract ONLY findings directly relevant to the brain dump topic — discard tangential results.

2. **Project Context:** Check the working directory for `CLAUDE.md` or `README.md` (in that order). If found, read the first 50 lines to extract the project's tech stack and conventions. Do not load entire files.

3. **Conversation Context:** Summarize any prior messages in the current session that provide relevant context (e.g., user mentioned goals, constraints, or prior work before running /brainstorm). If this is the first message, note "No prior session context."

4. **Format the context block:**

```
CONTEXT FOR DIVERGENT THINKING:
---
Prior knowledge (from Cortex):
- {relevant finding 1}
- {relevant finding 2}
- (or "No relevant prior knowledge found" if cortex_recall returned nothing useful)

Project context:
- Tech stack: {extracted from project files}
- Key conventions: {extracted}
- (or "No project files found" if neither CLAUDE.md nor README.md exists)

Session context:
- {summary of relevant prior conversation}
- (or "No prior session context")
---
```

5. Pass this context block alongside the brain dump into mode-specific processing. For expansion mode, prepend it before generating the interpretation tree. For first-principles mode, prepend it before Phase 2 (Assumption Mining).

**Failure handling:** If `cortex_recall` fails or is unavailable, proceed with project + session context only. Never block on cortex failure.

### L1 Step 2: Category Analysis

Read `references/question-bank.md` for the full question bank.

For each of the 10 categories, classify as:
- **Covered**: Brain dump explicitly addresses this
- **Partially covered**: Some signal but incomplete
- **Uncovered**: No relevant information

Signals to detect:
| Category | Signal Keywords/Patterns |
|----------|------------------------|
| Scope | "system", "tool", "one thing", "multiple", "platform" |
| Users | "I use", "clients", "team", "users", "audience" |
| Triggers | "when I", "every time", "before I", "after", "on demand" |
| Outputs | "produces", "generates", "result", "file", "report", "output" |
| Integration | "connects to", "works with", "API", "plugin", existing tool names |
| Edge Cases | "what if", "breaks", "fails", "edge case", "error" |
| Priority | "most important", "first", "MVP", "must have" |
| Anti-Goals | "should not", "don't want", "NOT", "exclude", "avoid" |
| Existing Art | "like X", "similar to", "inspired by", "currently using" |
| Scale | "all projects", "one project", "cross-client", "everyone" |

### L1 Step 3: Determine Question Count

Count covered categories:
- **7-10 covered** (clear, detailed dump) → Ask 1-2 questions from uncovered
- **4-6 covered** (moderate clarity) → Ask 3-5 questions from uncovered
- **0-3 covered** (vague or minimal) → Ask 6-10 questions from uncovered

**Special case — empty/near-empty brain dump:** If the input is fewer than 2 sentences, skip analysis and immediately ask the first 3 questions: Scope, Triggers, Outputs.

### L1 Step 4: Ask Questions (Mode-Dependent)

#### Solo Mode (default)

Present ALL selected questions as a numbered list at once (same as rapid-fire delivery). This lets the user see the full scope of what's being explored and answer in one go.

```
Here are {N} follow-up questions to flesh out your idea. Answer as many as you can — skip any that don't apply:

1. [Question from highest-priority uncovered category]
2. [Question from next uncovered category]
3. ...
```

After user responds, parse their numbered answers and update cortex in one batch. Then summarize what you've captured and ask: "Anything else to add, or ready to synthesize? (Say 'done' to generate the brief, or keep adding)"

#### Rapid-Fire Mode

Present ALL selected questions as a numbered list at once:

```
Here are {N} follow-up questions to flesh out your idea. Answer as many as you can in one go — skip any that don't apply:

1. [Question from highest-priority uncovered category]
2. [Question from next uncovered category]
3. ...
```

After user responds, parse their numbered answers and update cortex in one batch.

#### Expansion Mode

After receiving the brain dump and gathering context (L1 Step 1.5):

**Step E1: Extract Core Goal**
Distill the user's brain dump into a single goal statement:
"The core goal is: {what the user is ultimately trying to achieve}"

Present this to the user for confirmation before generating options.

**Step E2: Generate Options (Hybrid)**
Using the brain dump, injected context, and confirmed goal, generate two categories of options:

**Novel Approaches** (2-3 options):
Generate approaches the user has NOT mentioned that still achieve the core goal. Draw inspiration from:
- The injected Cortex context (past projects, decisions, patterns)
- The project context (tech stack, conventions)
- Lateral thinking: different paradigms, tools, architectures, or workflows
- Each must be a genuinely different route, not a rephrasing

A novel approach uses a fundamentally different method, technology, or paradigm. Changing a variable name or rephrasing is NOT novel.

**Variations** (2-3 options):
Branch the user's stated idea into variations by adjusting:
- Scope (bigger/smaller MVP)
- Components (swap a technology or pattern)
- Approach (same idea, different execution strategy)
- Each must preserve the user's core concept while modifying an aspect

**Step E3: Present Options**

Format all options using the Plausibility Scoring Protocol (see that section below). Each option must include a plausibility score:

```
Your core goal: "{goal statement}"

### Novel Approaches

**Option 1: {Title}** (Novel)
{2-3 sentence description of the approach and how it achieves the goal differently}
Plausibility: {XX}% — {1-line rationale}

**Option 2: {Title}** (Novel)
{2-3 sentence description}
Plausibility: {XX}% — {1-line rationale}

### Variations on Your Idea

**Option 3: {Title}** (Variation)
{2-3 sentence description of how this varies from the original}
Plausibility: {XX}% — {1-line rationale}

**Option 4: {Title}** (Variation)
{2-3 sentence description}
Plausibility: {XX}% — {1-line rationale}

---
Pick one to explore deeper (`/brainstorm branch N`), combine multiple (`/brainstorm merge 1,3`), or regenerate with guidance (`/brainstorm regenerate "more practical"`). You can also backtrack later with `/brainstorm backtrack`.
```

**Step E4: Process Selection**
After user picks:
- Single pick → That option becomes the working brain dump. Continue to category-based Q&A (solo-style) from uncovered categories.
- Multiple picks → Use `/brainstorm merge N,N` to combine selected options into a merged working dump.
- "Branch N" or `/brainstorm branch N` → Go deeper on that option (generates sub-options).
- "Regenerate" or `/brainstorm regenerate [guidance]` → Re-run expansion with optional directional guidance.

Update cortex memory with the selected option(s) and the full expansion output for branch history.

#### First-Principles Mode

When mode is `first-principles`, L1 replaces the category-based Q&A with a structured decomposition protocol. Read `references/first-principles-protocol.md` for the full protocol details, classification guide, and reframing patterns.

**Context injection:** Before proceeding to Phase 2 (Assumption Mining), run the Context Gathering step (L1 Step 1.5) to inject Cortex recall results, project context, and session context. Use this injected context to identify assumptions the user might not see — patterns from past projects that contradict current assumptions, or industry knowledge that challenges the user's framing.

**Phase 1: State the Problem**

After receiving the brain dump, restate the user's idea/problem as a single clear statement. Present it back:

```
Here's how I understand your idea:

"{Restated problem/idea in one clear sentence}"

Is this accurate, or would you reframe it?
```

Wait for confirmation or correction before proceeding.

**Short brain dump rule:** If the brain dump is fewer than 2 sentences, skip restating and ask directly: "Can you state the core problem you're trying to solve in one sentence?" Use their response as the stated problem.

Update cortex memory with the STATED_PROBLEM field.

**Phase 2: Assumption Mining**

Analyze the brain dump and stated problem for every embedded assumption. Look for:
- Technology choices stated as requirements
- Architecture patterns assumed as given
- Process assumptions about how things must work
- Scope assumptions about what's required
- Convention assumptions based on "how it's usually done"

Present the assumptions as a numbered list:

```
I've identified {N} assumptions in your idea. Let's examine each one:

Assumptions Found:
1. "{assumption}" -- You assumed {X}. But is that actually required?
2. "{assumption}" -- This implies {Y}. Is that a hard constraint or a habit?
3. ...

Let's start with assumption #1. Why does it need to be {X}?
```

**No-assumptions case:** If no assumptions are detectable, say: "Your idea seems free of assumptions -- let me look deeper." Then probe with:
- "Why does this need to be software at all?"
- "Why does it need to be built new vs. adapted from something existing?"
- "What's the simplest possible version of this?"

Update cortex memory with the ASSUMPTIONS field.

**Phase 3: Recursive "Why" Decomposition**

For each assumption (focus on the 3-5 most impactful if many found -- prioritize those likely to be CONVENTION):

1. Ask "Why?" -- Why does this need to be done this way?
2. User answers with a reason
3. Classify the reason (see `references/first-principles-protocol.md` for Classification Guide):
   - **BEDROCK** (immutable) -- Laws of nature, hardware limits, regulatory requirements. Mark and move on.
   - **TECHNICAL** (hard but possible to change) -- Framework limitations, legacy requirements. Mark and probe one more level.
   - **CONVENTION** (arbitrary) -- Industry norms, habits. Mark and challenge: "What if we didn't do it this way?"
   - **PREFERENCE** (user choice) -- Explicit user decision. Mark and move on.
4. If TECHNICAL or CONVENTION, ask "Why?" again on the reason itself
5. Continue until hitting BEDROCK or PREFERENCE

**User refuses to answer:** Classify as PREFERENCE and move gracefully to the next assumption.

Persist each decomposition exchange to cortex incrementally (update after each Why? + answer cycle). Each "Why?" counts as one question in QUESTIONS_ASKED.

After decomposition, present the assumption audit:

```
## Assumption Audit

| # | Assumption | Classification | Verdict |
|---|-----------|---------------|---------|
| 1 | "{assumption}" | BEDROCK | Genuine constraint -- keep |
| 2 | "{assumption}" | CONVENTION | Arbitrary -- can be eliminated |
| 3 | "{assumption}" | TECHNICAL | Changeable with effort |
| 4 | "{assumption}" | PREFERENCE | User choice -- keep |
```

**Phase 4: Bedrock Identification**

Summarize the irreducible truths that survived questioning:

```
## Bedrock Truths

These are the irreducible requirements that survived decomposition:

1. {Genuine constraint that cannot be changed}
2. {Fundamental need the system must satisfy}
3. {Physical or regulatory limitation}
...

Everything else is a design choice, not a requirement.
```

Update cortex memory with BEDROCK_TRUTHS field.

**Phase 5: Problem Reframing**

With conventions stripped and bedrock identified, reframe the original problem:

```
## Reframed Problem

**Original framing:** "{what the user originally said}"

**First-principles framing:** "{the problem restated using ONLY bedrock truths}"

The reframed problem may suggest a completely different solution approach.
Do you want to proceed with this reframing, or adjust it?
```

Wait for user confirmation. When confirmed, the reframed problem replaces the original brain dump as the foundation for L2 synthesis.

Update cortex memory with REFRAMED_PROBLEM field.

**If reframing matches original:** Say: "Your original framing holds up -- the decomposition confirms your approach is grounded in genuine constraints, not convention."

After Phase 5 confirmation, proceed to **L1 Step 6: Transition Check** (same as other modes).

#### First-Principles Cortex Persistence Format

For first-principles mode, use this adapted cortex memory format instead of the standard Q&A format:

```
cortex_update_memory:
  memory_id: {brainstorm_memory_id}
  content: |
    BRAINSTORM: {name}
    STATUS: active
    MODE: first-principles
    STARTED: {original date}
    LAST_UPDATED: {now}

    BRAIN_DUMP:
    {original brain dump}

    STATED_PROBLEM:
    {one-sentence restatement}

    ASSUMPTIONS:
    1. {assumption} -- {classification} -- {verdict}
    2. ...

    DECOMPOSITION:
    A1: {assumption}
      Why? {user answer}
      Classification: {type}
      Why? {user answer -- if probed deeper}
      Classification: {type}
      BEDROCK: {final truth reached}
    A2: ...

    BEDROCK_TRUTHS:
    1. {truth}
    2. {truth}

    REFRAMED_PROBLEM:
    {first-principles reframing}

    QUESTIONS_ASKED: {count -- each "why?" counts as one question}
    SESSIONS: {count}
  tags: ["brainstorm", "active", "{project-name}"]
  importance: 80
```

Update incrementally after each phase/exchange for crash-safety.

#### Resume Mid-Decomposition

When resuming a first-principles brainstorm that was interrupted mid-decomposition:
1. Display a summary of what's been decomposed so far (assumptions classified, bedrock truths found)
2. Continue from the last unclassified assumption
3. If all assumptions were classified but reframing wasn't done, proceed to Phase 4/5

### Plausibility Scoring Protocol

Each expansion option generated in expansion mode MUST include a plausibility score. This protocol also applies to any mode that generates multiple solution options for the user to choose from.

**Scoring template:**

```
**Option N: {Title}** — {1-sentence description}
Plausibility: {XX}% — {1-line rationale}
{if below 40%: "⚠ Low plausibility — explore with caution"}
```

**Scoring dimensions** (weight equally, 0-100 each):
- **Technical feasibility:** Can this be built with known, available tools and patterns?
- **Effort proportionality:** Is the build effort reasonable relative to the value delivered?
- **Domain fit:** Does this align with the user's tech stack, workflow, and ecosystem?

**Final score** = average of the three dimensions, rounded to nearest 5%.

**Display rules:**
- Score ≥ 70%: High confidence — present normally
- Score 40-69%: Moderate — present normally
- Score < 40%: Low plausibility — append warning flag after the rationale line

**Context dependency:** Scores should leverage the context block from L1 Step 1.5 when available. Project context improves domain fit scoring; Cortex recall improves technical feasibility scoring by surfacing known patterns and past decisions.

### L1 Step 5: Persist to Cortex

After EACH exchange (question + answer), update the brainstorm memory:

```
cortex_update_memory:
  memory_id: {brainstorm_memory_id}
  content: |
    BRAINSTORM: {name}
    STATUS: active
    MODE: {mode}
    STARTED: {original date}
    LAST_UPDATED: {now}

    BRAIN_DUMP:
    {accumulated brain dump text}

    Q&A:
    Q1: {question}
    A1: {answer}
    Q2: {question}
    A2: {answer}
    ...

    QUESTIONS_ASKED: {count}
    SESSIONS: {count}
  tags: ["brainstorm", "active", "{project-name}"]
  importance: 80
```

**Expansion mode additional fields:** When mode is `expansion`, also include:

```
EXPANSION_STATE:
  CORE_GOAL: {extracted goal}
  BRANCH_TREE:
    ROOT:
      OPTIONS:
        1: {title} (Novel) — {plausibility}%
        2: {title} (Novel) — {plausibility}%
        3: {title} (Variation) — {plausibility}%
        4: {title} (Variation) — {plausibility}%
      SELECTED: {option number or null}
      CHILDREN:
        BRANCH_{N}:
          OPTIONS: [{sub-options if branched}]
          SELECTED: null
          CHILDREN: {}
  CURRENT_NODE: ROOT
  HISTORY: [ROOT]
  WORKING_DUMP: {the merged/selected content now being used}
  REGENERATE_GUIDANCE: {guidance text if regenerated, null otherwise}
```

Keep option descriptions concise in the tree state (title + 1 sentence max). Full descriptions are in the presentation only. The tree is append-only — backtracking navigates but never deletes branches.

This ensures crash-safety — if the session ends mid-brainstorm, `/brainstorm resume {name}` restores everything.

### L1 Step 6: Transition Check

When the user signals they're done (says "done", "that's it", "ready", etc.) OR when all questions have been asked and answered:

- If invoked via `done` sub-command → Proceed to L2
- If invoked via `generate` sub-command → Proceed to L2, then L3
- If invoked via new brainstorm or resume → Ask: "Ready to synthesize your brief? (Say 'done' to generate, or keep brainstorming)"

---

## Layer 2: Synthesize & Structure

L2 consolidates all brain dump + Q&A into a structured Brainstorm Brief.

### L2 Step 1: Load Full Context

If not already loaded, retrieve the brainstorm memory from cortex. Parse the full BRAIN_DUMP and all Q&A entries.

### L2 Step 2: Synthesis Analysis

Analyze the accumulated content to extract:

1. **Vision**: Distill the entire idea into one paragraph — what it is, why it matters
2. **Pain points**: Look for problem language ("the issue is", "it's frustrating", "the gap", "currently I have to", "takes too long", "manually")
   - Identify the PRIMARY pain point (the #1 problem)
   - Extract up to 4 supporting pain points
3. **Goals**: Look for outcome language ("I want", "it should", "the goal is", "so that", "enable", "automate")
4. **Features**: Decompose into discrete capabilities/components — each should be independently buildable
5. **Dependencies**: Map which features reference or require others
6. **Scope decisions**: Explicit mentions of what's in/out, plus inferences from anti-goals Q&A
7. **Open questions**: Anything unresolved, contradictory, or needing user input before spec generation

### L2 Step 3: Generate Brainstorm Brief

Present the brief to the user. **If mode is first-principles**, include the additional sections (Assumption Audit, Bedrock Truths, Problem Reframe) after Vision and before Pain Points. The synthesis should use the **reframed problem** as its foundation rather than the original brain dump -- Features and Goals should be solutions to the reframed problem, not the original framing.

```markdown
## Brainstorm Brief: {Project Name}

### Vision
{1-paragraph distillation of the entire idea — what it is, why it matters}

### Assumption Audit *(first-principles mode only)*
| # | Assumption | Classification | Survived? |
|---|-----------|---------------|-----------|
| 1 | "{assumption}" | BEDROCK | Yes — genuine constraint |
| 2 | "{assumption}" | CONVENTION | No — eliminated |
| 3 | "{assumption}" | TECHNICAL | Partially — workaround identified |
| 4 | "{assumption}" | PREFERENCE | Yes — user choice |

### Bedrock Truths *(first-principles mode only)*
The irreducible requirements this solution must satisfy:
1. {truth}
2. {truth}
3. {truth}

### Problem Reframe *(first-principles mode only)*
**Original:** "{original problem statement}"
**First-Principles:** "{reframed problem using only bedrock truths}"

### Pain Points
**Primary:** {The #1 problem this solves — one clear sentence}

Supporting:
- {Pain point 2}
- {Pain point 3}
- {Pain point 4 — if applicable}
- {Pain point 5 — if applicable}

### Goals
1. {Goal 1 — what we're trying to accomplish}
2. {Goal 2}
3. {Goal 3}

### Features Identified
1. **{Feature Name}** — {1-sentence description}
2. **{Feature Name}** — {1-sentence description}
3. **{Feature Name}** — {1-sentence description}
...

### Dependencies
- Feature B depends on Feature A ({reason})
- Feature C is independent

### Scope Decisions
**IN:** {What we are building}
**OUT:** {What we are explicitly not building}

### Open Questions
- {Unresolved items that need answers before spec generation}
- {If none: "None — ready for spec generation"}
```

### L2 Step 4: User Review Gate

**CRITICAL: Never auto-generate specs without user approval of the brief.**

Present the brief and ask: "Review the brief above. You can:"
- "**Approve** — looks good, proceed"
- "**Edit** — I want to change something (tell me what)"
- "**Add** — I want to add more context (back to Q&A)"
- "**Probability Check** — run a probability scan before deciding"

If user selects "Probability Check":
1. Extract the Vision + Primary Pain Point from the brief
2. Run: `/probability-storm --gate` (this reads the brainstorm context from Cortex automatically)
3. Display the probability scan results inline
4. After scan completes, return to this approval gate with the scan context preserved
5. The user can now Approve/Edit/Add with the probability data in mind

If user wants edits:
- Apply their changes to the brief
- Re-present the updated brief
- Ask for approval again

If user wants to add more:
- Return to L1 follow-up mode
- After new input, re-run L2 synthesis

### L2 Step 5: Update Cortex State

After user approves the brief:

```
cortex_update_memory:
  memory_id: {brainstorm_memory_id}
  content: (full content with STATUS changed to "synthesized", brief appended)
  tags: ["brainstorm", "active", "{project-name}"]
  importance: 85
```

### L2 Step 6: Save Brainstorm Report (on `done` or `generate`)

After the brief is approved, save it as a report file following the standard report convention (see `~/.claude/skills/REPORT-CONVENTION.md`).

**Report details:**
- **Directory:** `reports/brainstorm/`
- **Prefix:** `bs-`
- **Slug:** brainstorm project name (kebab-case, max 50 chars)
- **Format:** `bs-{NNN}-{YYYY-MM-DD}-{slug}.md`

**Numbering logic:**
```bash
FOLDER="reports/brainstorm"
PREFIX="bs"
mkdir -p "$FOLDER"
LAST=$(ls "$FOLDER"/${PREFIX}-*.md 2>/dev/null | \
  sed "s/.*${PREFIX}-\([0-9]\{3\}\).*/\1/" | sort -n | tail -1)
NEXT=$(printf "%03d" $(( ${LAST:-0} + 1 )))
FILENAME="${PREFIX}-${NEXT}-$(date +%Y-%m-%d)-${SLUG}.md"
```

**Report content:** The saved file contains YAML frontmatter followed by the full Brainstorm Brief.

```yaml
---
report_type: "brainstorm"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{brainstorm project name}"
project_tag: "{slug}"
status: "done"
mode: "{solo|rapid-fire|expansion|first-principles}"
topics_covered: {count of Q&A entries}
features_identified: {count of features in brief}
open_questions: {count of open questions}
specs_to_generate: null
composite_score: null
previous_composite: null
score_delta: "---"
trend: "first_run"
---
```

After frontmatter, write the full Brainstorm Brief content (Vision, Pain Points, Goals, Features, Dependencies, Scope, Open Questions -- and Assumption Audit / Bedrock Truths / Problem Reframe sections if first-principles mode).

**Read previous report before generating:**
1. Glob `reports/brainstorm/bs-*.md` to find existing reports
2. If found, read the most recent one's YAML frontmatter
3. Extract `project_tag` — if it matches current brainstorm, extract `report_number` for `previous_composite` reference
4. Extract feature count and open question count for delta comparison
5. Calculate `trend`: brainstorm reports have no composite score, so trend is always `"stable"` if previous exists, `"first_run"` if not

**Delta section (if previous report with same project_tag exists):**

Include a "Changes Since Last Report" section after the frontmatter and before the brief content:

```markdown
## Changes Since Last Report

**NEW** ({count} items):
- [NEW] {new feature or pain point not in previous brief}

**RESOLVED** ({count} items):
- [RESOLVED] {open question that was answered}

**MOVED** ({count} items):
- [MOVED] {feature}: {previous_priority} -> {current_priority}

**PROGRESS** ({count} items):
- [PROGRESS] {item}: {previous state} -> {current state}
```

Rules: Omit categories with 0 items. First report = omit delta section entirely. Compare features, pain points, and open questions between briefs.

**Trend section (if 3+ reports with same project_tag exist):**

```markdown
## Trend (last {N} reports)

| Report | Date | Features | Open Questions | Mode |
|--------|------|----------|----------------|------|
| bs-{NNN} | {date} | {count} | {count} | {mode} |
| ... | ... | ... | ... | ... |

**Direction:** {first_features} -> {last_features} features ({arrow}, {+/-N})
```

If fewer than 3 reports exist, show: `> Trend tracking available after 3+ reports ({N} exist).`

**When to save:** Only on `done` (L2 completion) or `generate` (before proceeding to L3). Do NOT save during L1 Q&A.

After saving, display the report path: `"Report saved: reports/brainstorm/{filename}"`

---

If invoked via `done` sub-command: **Stop here.** Tell the user: "Brief approved and saved. Run `/brainstorm generate` when ready to create specs."

If invoked via `generate` sub-command or user says to proceed: Continue to L3.

---

## Layer 3: Spec Pipeline

L3 takes the approved Brainstorm Brief and generates specs via `/quick-plan`.

### L3 Step 1: Extract Feature List

Parse the approved brief's "Features Identified" section. For each feature, prepare a `/quick-plan` prompt.

### L3 Step 1.5: Classify Features and Route Build Tools

After extracting the feature list, classify each feature to determine the correct build tool.

**Classification procedure:**

For each feature, concatenate its name + description into a single search string and check against these signal patterns (in priority order — first match wins):

| Type | Signal Keywords/Patterns | Confidence |
|------|------------------------|------------|
| **MCP** | "MCP", "model context protocol", "MCP server", "tools and resources", "stdio transport", "server process" | High |
| **Skill** | "skill", "layers", "layered", "4-layer", "SKILL.md", "/skill-creator", "commands/ and references/", "layered-system.md", "multi-file skill" | High |
| **Skill** | "discovery", "analysis", "generation" (when describing multiple operational modes) | Medium |
| **Command** | "slash command", "/create-command", "single-file command" | Medium |
| **Command** | Feature is a single workflow with no sub-modes, no references directory | Low |
| **Generic** | No signals match above | Default fallback |

**Matching rules:**
- A feature matches a type if it contains **1+ high-confidence** signals OR **2+ medium-confidence** signals for that type
- Classification priority: MCP > Skill > Command > Generic
- When ambiguous between Skill and Command, prefer **Skill** (more capable, can always simplify)
- Avoid false positives: "command" alone (without "slash" or "/create-command") does NOT trigger Command classification

**Routing instruction templates:**

| Type | Instruction injected into `/quick-plan` prompt |
|------|------------------------------------------------|
| **Skill** | `"Build via /skill-creator with layered architecture. Install to ~/.claude/skills/{name}/."` |
| **Command** | `"Build via /create-command. Install to ~/.claude/commands/{name}.md."` |
| **MCP** | `"Build via /mcp-builder following MCP server patterns."` |
| **Generic** | *(no instruction added — standard /quick-plan behavior)* |

**Routing confirmation display:**

If ANY feature is classified as non-Generic, show the routing table before proceeding:

```markdown
### Build Tool Routing

| # | Feature | Detected Type | Build Tool |
|---|---------|---------------|------------|
| 1 | {name} | Skill | /skill-creator |
| 2 | {name} | Command | /create-command |
| 3 | {name} | Generic | /quick-plan (standard) |

Proceed with this routing? (approve / change)
```

- **If user approves:** Continue to Step 1.7
- **If user wants to change:** Ask which feature to reclassify, accept new type, redisplay table
- **If ALL features are Generic:** Skip the routing display entirely (no noise for standard brainstorms)

### L3 Step 1.7: Skill-Type Completeness Injection

**Skip this step if NO features were classified as Skill in Step 1.5.**

If one or more features are classified as **Skill**, the brainstorm output is a skill-type project. Inject completeness patterns into spec generation and run a gap check after.

**Detection confirmation — at least one of:**
- Any feature classified as Skill in Step 1.5
- Brief mentions "skill", "SKILL.md", "layers", "L1/L2/L3/L4", "argument routing"
- Output is intended for `~/.claude/skills/` or `~/.claude/commands/`

**1. Inject completeness patterns into Step 2 prompts**

For each Skill-classified feature, append the following to the `/quick-plan` prompt constructed in Step 2:

```
This is a Claude Code skill. Ensure the spec includes:
- Numbered incremental reports ({prefix}-NNN-YYYY-MM-DD-{slug}.md) if the skill produces analysis
- Trend tracking across reports (delta sections, score comparisons) if reports exist
- An `update` argument for modifying existing output without full rescan
- A `verify` argument for validating output against actual system state
- Integration points with /pickup, /handoff, and /self-heal where applicable
- Cache file for cross-session state persistence
- Full argument-hint in SKILL.md frontmatter
```

**2. Gap check after all specs are generated (run before Step 3)**

Compare the generated spec list against the Closed-Loop Checklist (from /skill-creator):

| Pattern | Description |
|---------|-------------|
| Create | Produces the primary artifact |
| Track | Numbered reports, incremental output |
| Update | Modify existing output without full rescan |
| Verify | Validate output against real system state |
| Report | Structured analysis output |
| Trend | Cross-report delta tracking |
| Integrate | Hooks into /pickup, /handoff, /self-heal |
| Self-describe | Full SKILL.md with argument-hint frontmatter |

Check which patterns are covered by the generated specs. If any are missing, suggest additional specs:

```markdown
### Skill Completeness Gap Check

Covered: Create, Track, Report
Missing: Update, Verify, Trend

Want me to generate additional specs for:
- **Update mode** -- mark items done without rescan
- **Verify mode** -- validate output against real state
- **Trend tracking** -- cross-report delta analysis
```

- If user approves additional specs, generate them via `/quick-plan` before proceeding to Step 3
- If user declines, proceed to Step 3 as-is

**3. Non-skill brainstorms:** If no features are classified as Skill, skip this step entirely.

### L3 Step 2: Generate Specs (Sequential, No Pausing)

**IMPORTANT: Run `/quick-plan` sequentially, not in parallel.** Later specs may depend on earlier ones.

**CRITICAL: Generate ALL specs in one continuous flow.** Do NOT pause, ask for confirmation, or present intermediate reports between specs. The user already approved the brief in L2 — that approval covers the entire spec generation pipeline. Only stop and present results at L3 Step 5 (final summary) after ALL specs are generated.

For each feature in order:

1. Construct a prompt for `/quick-plan` that includes:
   - The feature name and description
   - Relevant pain points and goals from the brief
   - Dependencies on other features (with file paths if earlier specs exist)
   - Scope decisions (IN/OUT) relevant to this feature
   - The project name for consistent naming
   - Build tool instruction from Step 1.5 classification (omit for Generic features)
   - Skill completeness patterns from Step 1.7 (only for Skill-classified features)
   - **Batch context:** "This is spec {N} of {total} being generated as part of a brainstorm pipeline. Do NOT present a 'Next: Run /build' suggestion — the brainstorm pipeline will present a combined summary after all specs are generated."

2. Run `/quick-plan` via the Skill tool:
```
Skill: quick-plan
Args: {constructed prompt for this feature}
```

3. Note the generated spec file path (typically `specs/todo/{slug}.md`)

4. **Immediately proceed to the next feature** — do not output anything to the user between specs

### L3 Step 3: ROADMAP Generation

If 2+ specs were generated, `/quick-plan` should auto-generate a ROADMAP (built into the quick-plan skill). If it didn't:

1. Read all generated spec files
2. Analyze dependencies between them
3. Group into parallel-safe phases
4. Write `specs/roadmaps/ROADMAP-{project-name}.md`

### L3 Step 4: Link in Cortex

1. Update brainstorm memory to completed state:
```
cortex_update_memory:
  memory_id: {brainstorm_memory_id}
  content: (STATUS → "completed", append list of generated spec paths)
  tags: ["brainstorm", "completed", "{project-name}"]
  importance: 85
```

2. For each generated spec, link via CLI (fire-and-forget — Spec 17):
```bash
# CLI: link brainstorm to generated specs
(cortex link "{brainstorm_memory_id}" "{spec_memory_id}" 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- link "{brainstorm_memory_id}" "{spec_memory_id}" 2>/dev/null) || true
```

### L3 Step 5: Present Summary

```markdown
## Brainstorm Complete: {Project Name}

Specs Generated: {N}
1. `specs/todo/{spec-1}.md` -- {feature name} ({build tool or "standard"})
2. `specs/todo/{spec-2}.md` -- {feature name} ({build tool or "standard"})
3. `specs/todo/{spec-3}.md` -- {feature name} ({build tool or "standard"})

Roadmap: `specs/roadmaps/ROADMAP-{project-name}.md` (if generated)
Build Order: Phase 1 ({type}) -> Phase 2 ({type}) -> ...

### Next Steps
- Run `/build specs/todo/{first-spec}.md` to start building
- Or: `/agent-teams specs/roadmaps/ROADMAP-{name}.md phase-1` for parallel execution
- Tip: Run `/probability-storm --deep` on any spec before building for risk analysis
```

---

## Safety Rules

1. **Brief approval gate is mandatory.** L2 → L3 transition MUST wait for explicit user approval. Never auto-generate specs.
2. **Cortex persistence after every exchange.** Each Q&A round updates cortex so resume works even if the session crashes.
3. **Project name uniqueness.** Check for existing brainstorms before creating. Suggest resume for active, ask before overwriting completed.
4. **Sequential spec generation.** `/quick-plan` calls run one at a time — later specs may depend on earlier ones.
5. **Mode persistence.** Store mode in the brainstorm memory so it carries across resume sessions.
6. **Initial expansion depth = 1.** Deeper exploration happens via `/brainstorm branch`. Never auto-recurse without user selection.
7. **Memory size awareness.** If brain dump + Q&A exceeds ~4000 chars, the cortex memory may get large. This is acceptable — Omni-Cortex handles it. Do not split unless cortex errors occur.
8. **Graceful cortex failure.** If cortex is unavailable, continue the brainstorm in-session but warn: "Cortex unavailable — this brainstorm won't persist across sessions."
9. **Context injection is mandatory for expansion and first-principles modes.** If cortex_recall fails, proceed with project + session context only. Never skip context gathering entirely.
10. **Every expansion option must include a plausibility score.** Never present expansion options without scores. See the Plausibility Scoring Protocol section for the scoring template and dimensions.
