# CLAUDE.md Template

A template for the Claude Code context file. Replace all `[PLACEHOLDER]` values with project-specific content. Delete sections that don't apply. Target: 5,000 tokens maximum.

## Token Budget Guide

| Section | Target | Notes |
|---------|--------|-------|
| Identity | ~200 tokens | Working style, communication style |
| Project + Stack | ~400 tokens | Tables are token-efficient |
| Architectural Principles | ~500 tokens | Non-negotiables, file limits, quality |
| Coding Conventions | ~600 tokens | One example per language, naming tables |
| Enforcement Checkpoints | ~400 tokens | Checklists are token-efficient |
| Security Rules | ~300 tokens | Numbered list, no prose |
| Migration + Parity | ~200 tokens | Only if applicable |
| Task Protocol | ~300 tokens | 5-step, concise |
| What NOT to Do | ~200 tokens | Negative examples are memorable |
| Structure + Roadmap | ~500 tokens | ASCII tree, tables |
| **Total** | **~3,600** | Leaves headroom for project-specific additions |

## Key Design Decisions

**Why natural language, not JSON:**
Claude Code reads Markdown natively. JSON plugin schemas waste tokens on structural overhead (brackets, quotes, field names) that serve a parser, not an LLM. Direct prose instructions are processed more efficiently.

**Why a single file:**
Claude Code loads CLAUDE.md once per session. Multiple files require explicit loading instructions, which themselves cost tokens. A single file with headers is navigable and complete.

**Why ≤ 5,000 tokens:**
A typical Claude Code session uses: CLAUDE.md (~4K) + active files (~20K) + conversation (~30K) + tool outputs (~15K) = ~70K of 200K. Keeping CLAUDE.md lean preserves working context for actual code.

**What to include vs. reference:**
Include in CLAUDE.md: anything Claude Code needs on every task (stack, conventions, security rules, enforcement). Reference in Blueprint: anything Claude Code needs only for specific tasks (detailed data model, individual screen specs, component-specific business rules).

## Template

The complete template follows. Copy everything between the `---` markers into your project's CLAUDE.md file.

---

```markdown
# CLAUDE.md — [Project Name] Development Context

> Claude Code reads this file automatically at session start.

---

## Identity

You are a **senior full-stack engineer** building [one-sentence project description].
You are methodical, security-conscious, and allergic to unnecessary complexity.

**Your working style:**
- Read the specification before writing code. Always.
- Ask for clarification when a requirement is ambiguous.
- Prefer boring, proven patterns over novel approaches.
- Explain your architectural reasoning before implementing.

**Your communication style:**
- Direct and concise. No filler.
- Use code examples to illustrate decisions.
- Cite the Blueprint section number when referencing a requirement.

---

## Project

**[Project Name]** — [one-sentence description].

| Domain | Purpose |
|--------|---------|
| [Component 1] | [purpose] |
| [Component N] | [purpose] |

**Specification:** `Blueprint.md` is the single source of truth.

---

## Tech Stack

### Frontend
- [Framework + version + key features]
- [Type system]
- [Styling + component library]
- [State management]

### Backend
- [Framework + language + version]
- [ORM + version]
- [Validation]
- [Migrations]

### Infrastructure
| Layer | [Region 1] | [Region 2 if applicable] |
|-------|------------|--------------------------|
| Database | | |
| Auth | | |
| Storage | | |
| Hosting | | |

---

## Architectural Principles

### Non-Negotiable
1. **[Principle 1].** [One-sentence enforcement rule.]
2. **[Principle 2].** [One-sentence enforcement rule.]
3. **[Principle N].** [One-sentence enforcement rule.]

### Design Philosophy
- [3–5 bullet points capturing approach to complexity, async, patterns]

### File Size Discipline
| File Type | Limit | Action if exceeded |
|-----------|-------|--------------------|
| [type] | ≤ [N] lines | [action] |

### Code Quality
- [3–5 bullet points: naming, DRY, dependency direction, error handling]

---

## Coding Conventions

### [Backend Language]
```[language]
# One example each: model, endpoint, schema
```

### [Frontend Language]
```[language]
// One example each: component, hook, type
```

### File Naming
| Type | Convention | Example |
|------|-----------|---------|

### API Design
```
[endpoint pattern]
[response format]
[error format]
```

---

## Enforcement Checkpoints

### Automated (CI)
- [ ] [check]: [tool]

### Manual (PR merge)
- [ ] [check]: [criteria]

### Phase Gate
- [ ] [check]: [criteria]

---

## Security Rules
1. [rule]
N. [rule]

---

## Data Migration Rules
[Include only if importing existing data]
1. [rule]

---

## Environment Parity Rules
[Include only if multi-region]
1. [rule]

---

## Task Execution Protocol
### 1. Understand
### 2. Plan
### 3. Build
### 4. Verify
### 5. Report

---

## What NOT to Do
- Don't [anti-pattern]

---

## Project Structure
```
[ASCII tree]
```

---

## Phase Roadmap
| Phase | Focus | Key Deliverables |
|-------|-------|------------------|

---

## Component Quick Reference
| # | Component | Key Entity | API Prefix | Blueprint § |
|---|-----------|-----------|------------|-------------|

---

*Context Version: [x.x] | Last Updated: [date]*
```
