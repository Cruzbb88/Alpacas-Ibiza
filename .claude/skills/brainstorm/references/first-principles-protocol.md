# First-Principles Decomposition Protocol

Reference file for `--mode first-principles`. Loaded by the brainstorm command when mode is first-principles. This protocol replaces the question-bank-driven Q&A with recursive "why" decomposition.

## Opening Quote

> *"The best part is no part. The best process is no process."* -- Elon Musk

Display this quote at the start of any first-principles brainstorm session (new or resumed).

## The 5-Phase Protocol

### Phase 1: State the Problem

After receiving the brain dump, distill the user's idea/problem into a single clear sentence. Present it back for confirmation:

```
Here's how I understand your idea:

"{Restated problem/idea in one clear sentence}"

Is this accurate, or would you reframe it?
```

Wait for confirmation or correction before proceeding.

**Short brain dump rule:** If the brain dump is fewer than 2 sentences, skip restating and ask the user directly: "Can you state the core problem you're trying to solve in one sentence?" Then use their response as the stated problem.

### Phase 2: Assumption Mining

Analyze the brain dump and stated problem for every embedded assumption. An assumption is anything taken for granted but that could theoretically be different.

**Where to look for assumptions:**

| Category | What to Find | Examples |
|----------|-------------|---------|
| Technology choices | Tools/languages/frameworks stated as requirements | "we need React", "it has to be a REST API", "using PostgreSQL" |
| Architecture patterns | Structural decisions assumed as given | "microservices", "separate backend and frontend", "event-driven" |
| Process assumptions | Workflow or user behavior taken for granted | "users will sign up", "data comes from a database", "manual review step" |
| Scope assumptions | Boundaries or capabilities treated as fixed | "this needs to be real-time", "it must be a web app", "needs mobile support" |
| Convention assumptions | Industry norms accepted without questioning | "because that's how it's usually done", "standard REST patterns", "JSON for everything" |
| Market assumptions | Business or user behavior predictions | "users want this", "the market needs", "competitors do it this way" |

**Hidden Assumptions:** Beyond the categories above, actively search for assumptions the user doesn't realize they're making. These are often embedded in word choice:
- "We need to..." → Why? Who decided this is a need vs. a want?
- "Obviously..." / "Clearly..." → Anything prefixed with certainty words is likely an unexamined assumption
- "The user will..." → Any prediction about user behavior is an assumption
- "It has to be..." → Fixed constraints that might actually be flexible

Use the injected context (from L1 Step 1.5) to cross-reference: Has the user made different assumptions in past projects? Does the project's tech stack suggest alternatives they're not considering?

Present findings:

```
I've identified {N} assumptions in your idea. Let's examine each one:

Assumptions Found:
1. "{assumption}" -- You assumed {X}. But is that actually required?
   Counter: What if {opposite of X}? {1-sentence exploration of the alternative}
2. "{assumption}" -- This implies {Y}. Is that a hard constraint or a habit?
   Counter: What if {opposite of Y}? {1-sentence exploration of the alternative}
3. ...

Let's start with assumption #1. Why does it need to be {X}?
```

**Push-back rule:** Do NOT accept assumptions at face value. For each assumption, your default stance is skepticism. Ask "But is that actually true?" even for assumptions that seem obvious. The value of first-principles thinking is in challenging the obvious — if it survives the challenge, it's genuinely bedrock. If it doesn't, you've found a convention masquerading as a constraint.

**No-assumptions case:** If the brain dump seems free of detectable assumptions, say: "Your idea seems free of assumptions -- let me look deeper." Then probe for hidden conventions by asking:
- "Why does this need to be software at all?"
- "Why does it need to be built new vs. adapted from something existing?"
- "What's the simplest possible version of this?"
- "What would happen if you did nothing? What's the cost of inaction?"
- "Who told you this was a problem? Is it actually your problem to solve?"
- "What if the constraint you see as immovable is actually the thing that should change?"

### Phase 3: Recursive "Why" Decomposition

For each assumption (focus on the 3-5 most impactful if many were found -- those most likely to be CONVENTION rather than BEDROCK), engage in recursive questioning:

**The Loop:**
1. Ask "Why?" -- Why does this need to be done this way?
2. User answers with a reason
3. Classify the reason using the Classification Guide below
4. Based on classification:
   - **BEDROCK** -- Mark and move on. No further decomposition needed.
   - **TECHNICAL** -- Probe one more level: "Could that limitation be worked around?"
   - **CONVENTION** -- Challenge with evidence: "What if we didn't do it this way? Here's an example of someone who didn't: {draw from injected context or general knowledge}. What's the worst that actually happens — not theoretically, but practically?"
   - **PREFERENCE** -- Mark and move on. Respect user choice.
5. If TECHNICAL or CONVENTION, ask "Why?" again on the reason itself
6. Continue until hitting BEDROCK or PREFERENCE

**Devil's advocate rule:** For each TECHNICAL classification, briefly present one way the limitation could be overcome (even if difficult): "This is hard but not impossible: {example}." For each CONVENTION classification, present one real-world example where the convention was broken successfully. This gives the user concrete evidence, not just abstract challenges.

**Depth is self-limiting.** Real problems typically decompose in 2-4 levels of "Why?". There is no arbitrary depth limit.

**User refuses to answer "Why?":** If the user declines to explain further for any assumption, classify as PREFERENCE and move on gracefully. Do not push.

**Adaptive focus:** Present ALL mined assumptions in the initial list, but only interactively decompose the 3-5 most impactful ones (those most likely to be CONVENTION). Remaining assumptions can be briefly classified based on the user's brain dump context.

### Phase 4: Bedrock Identification

After recursive decomposition, summarize the irreducible truths -- the genuine constraints that survived questioning:

```
## Bedrock Truths

These are the irreducible requirements that survived decomposition:

1. {Genuine constraint that cannot be changed}
2. {Fundamental need the system must satisfy}
3. {Physical or regulatory limitation}
...

Everything else is a design choice, not a requirement.
```

### Phase 5: Problem Reframing

With conventions stripped and bedrock identified, reframe the original problem using ONLY bedrock truths:

```
## Reframed Problem

**Original framing:** "{what the user originally said}"

**First-principles framing:** "{the problem restated using ONLY bedrock truths}"

The reframed problem may suggest a completely different solution approach.
Do you want to proceed with this reframing, or adjust it?
```

Wait for user confirmation before proceeding. When confirmed, the reframed problem replaces the original brain dump as the foundation for L2 synthesis.

**If reframing matches original:** The mode still provided value by confirming the original approach is sound. Say: "Your original framing holds up -- the decomposition confirms your approach is grounded in genuine constraints, not convention."

---

## Assumption Classification Guide

| Classification | Definition | Signal Words | Example |
|---------------|-----------|-------------|---------|
| BEDROCK | Physical, mathematical, or regulatory constraint that cannot be changed | "legally required", "physically impossible", "mathematically proven", "latency of light", "regulated by", "law requires" | "Data must be encrypted at rest (HIPAA)" |
| TECHNICAL | Framework/platform limitation that is hard but possible to change | "the framework doesn't support", "would require rewriting", "our database can't", "performance would degrade", "not supported by" | "We use PostgreSQL so we can't do graph queries natively" |
| CONVENTION | Industry standard or team habit that could be different | "best practice", "everyone does it", "the standard approach", "that's how you're supposed to", "industry norm", "common pattern" | "REST APIs should use JSON" |
| PREFERENCE | User's explicit choice, not questioned further | "I want it that way", "I prefer", "non-negotiable for me", "that's just how I want it", "my choice" | "I want it in Python because that's what I know" |

### Classification Decision Tree

```
User gives a reason for an assumption
  |
  +--> Is it a law of physics/nature/math/regulation?
  |      YES --> BEDROCK
  |      NO  +--> Is it a real technical limitation?
  |              YES --> TECHNICAL (probe one more level)
  |              NO  +--> Is the user explicitly choosing this?
  |                      YES --> PREFERENCE
  |                      NO  --> CONVENTION (challenge it)
```

### Signal Words Quick Reference

**BEDROCK signals:** must, legally, regulated, impossible, proven, law, physics, hardware limit, cannot ever
**TECHNICAL signals:** framework, rewrite, migration, performance, compatibility, integration, legacy
**CONVENTION signals:** best practice, standard, typical, normal, usually, everyone, supposed to, common
**PREFERENCE signals:** want, prefer, like, choose, my decision, non-negotiable, personally

---

## Reframing Patterns

When constructing the first-principles reframing, use these patterns:

### Pattern 1: Subtract Conventions
Remove all CONVENTION-classified assumptions from the problem statement. What remains?

### Pattern 2: Flip Constraints
For each TECHNICAL constraint, ask: "If this constraint didn't exist, what would the ideal solution look like?"

### Pattern 3: Start from Outcome
State only the desired end state using BEDROCK truths: "We need {outcome} given {bedrock constraints}."

### Pattern 4: Analogy Breaking
If the original framing uses an analogy ("it's like X but for Y"), strip the analogy and describe the raw need.

### Pattern 5: Zero-Based Design
Pretend nothing exists. Given only the bedrock truths, what would you build from scratch?

---

## Cortex Persistence Format

First-principles mode uses an adapted cortex memory format:

```
BRAINSTORM: {name}
STATUS: active
MODE: first-principles
STARTED: {ISO date}
LAST_UPDATED: {ISO date}

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

QUESTIONS_ASKED: {count -- counts each "why?" as a question}
SESSIONS: {count}
```

**Incremental persistence:** Update cortex after each decomposition exchange (each "Why?" + answer cycle). This ensures crash-safety -- `/brainstorm resume {name}` restores the full decomposition state including partially-completed assumptions.

**Resume behavior:** When resuming a first-principles brainstorm mid-decomposition, continue from the last unclassified assumption. Display a summary of what's been decomposed so far before continuing.
