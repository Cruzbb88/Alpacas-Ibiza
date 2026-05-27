# ADR Format Template

This is the standard format for Architecture Decision Records stored in Omni-Cortex.

## ADR Structure

Every ADR stored in cortex follows this format:

```
ADR-{NNN}: {Title}
Date: {YYYY-MM-DD}
Project: {project-name}
Status: {accepted|superseded|deprecated|under-review}
Domain: {infrastructure|data|api|frontend|backend|security|integration|tooling|process}

Context:
{What situation prompted this decision. 2-4 sentences describing the problem space,
constraints, and what triggered the need for a decision.}

Decision:
{What we decided. 1-2 sentences stating the choice clearly.}

Rationale:
{Why we chose this over alternatives. 2-4 sentences explaining the reasoning,
trade-offs considered, and key factors that tipped the decision.}

Alternatives Considered:
1. {Alternative 1}: {Why rejected — 1 sentence}
2. {Alternative 2}: {Why rejected — 1 sentence}
3. {Alternative 3}: {Why rejected — 1 sentence}

Consequences:
- Positive: {What improves because of this decision}
- Negative: {What trade-offs we accept}
- Risks: {What could go wrong}

Review Date: {YYYY-MM-DD or "none"}
Related: {ADR-NNN, spec-name, memory-id, or "none"}
Tags: [adr, {project}, {domain}]
```

## Field Rules

### ADR Number (ADR-{NNN})
- Per-project sequential numbering starting at 001
- ADR-001 in project "ralph" is independent from ADR-001 in project "video-studio"
- To determine the next number: query cortex for existing ADRs in the project, find the highest number, increment by 1
- If no ADRs exist for the project, start at ADR-001

### Status Values
| Status | Meaning | When to Use |
|--------|---------|------------|
| `accepted` | Active, current decision | Default for new ADRs |
| `superseded` | Replaced by a newer decision | Link to the replacing ADR in Related field |
| `deprecated` | No longer applicable | System/feature was removed or changed |
| `under-review` | Being reconsidered | Flagged by radar or manual review |

### Domain Values
Choose the most specific domain that applies:
- `infrastructure`: Hosting, deployment, CI/CD, server architecture
- `data`: Database schema, data storage, ETL, caching
- `api`: API design, endpoints, protocols, authentication
- `frontend`: UI framework, component architecture, state management
- `backend`: Server-side logic, services, business rules
- `security`: Auth, encryption, access control, compliance
- `integration`: Third-party services, MCP tools, external APIs
- `tooling`: Development tools, build systems, IDE configuration
- `process`: Workflow decisions, team processes, methodology

### Review Date
- Optional — not every decision needs periodic review
- Set a review date for decisions that:
  - Depend on external factors that may change (pricing, API availability)
  - Were made under time pressure with known compromises
  - Involve technology choices that evolve rapidly
- Format: YYYY-MM-DD
- If no review needed: "none"

### Related Field
- Link to other ADRs by number: `ADR-005`
- Link to specs by name: `spec-10-architecture-decision-tracker`
- Link to cortex memory IDs when available
- Multiple links separated by commas
- "Superseded" ADRs MUST link to the replacement ADR

## Cortex Storage

### Tags
Every ADR gets tagged with:
1. `adr` — always present, identifies the memory as an ADR
2. `{project-name}` — the project this decision belongs to
3. `{domain}` — the domain category from the list above

### Importance
- Default importance: 70
- High-impact decisions (affecting multiple systems or hard to reverse): 85
- Low-impact decisions (easily reversible, single-system): 55

### Linking
After storing an ADR, search cortex for related memories and link them:
- Other ADRs in the same project
- Specs that the decision affects
- Handoff notes mentioning the same topic
- Previous decisions on the same domain

## Content Rules

1. **Architecture decisions only.** Do not store implementation details, API keys, credentials, or personal information.
2. **Be specific.** "We chose X because Y" not "We thought X was better."
3. **Record the context.** Future readers need to understand WHY, not just WHAT.
4. **Name alternatives.** Even if only one option was seriously considered, document what else was available.
5. **Honest consequences.** Every decision has trade-offs. Document the negatives.
6. **The skill captures decisions, it does not MAKE them.** Present as recording, not recommending.
