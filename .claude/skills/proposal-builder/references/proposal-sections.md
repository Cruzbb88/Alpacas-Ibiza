# Proposal Sections Reference

Standard 10-section template for consulting proposals. Each section includes its purpose, target length, tone guidance, and content structure.

---

## 1. Executive Summary

**Purpose:** Give the reader the entire proposal in one paragraph. A busy executive should be able to read this section alone and understand the problem, proposed solution, and expected outcome.

**Target length:** 3-5 sentences (one paragraph)

**Structure:**
- Sentence 1: The problem or opportunity the client faces
- Sentence 2: The proposed solution at a high level
- Sentence 3: Expected outcomes and business impact
- Sentence 4-5 (optional): Timeline and investment overview (if known)

**Tone:** Confident, outcome-focused, no jargon. Write for a non-technical decision-maker.

**Common mistakes to avoid:**
- Too long (should be ONE paragraph, not a full page)
- Too vague ("We will help you improve operations" — say HOW)
- Leading with the consultant instead of the client ("We are a leading..." — start with the client's problem)

---

## 2. Background & Context

**Purpose:** Demonstrate understanding of the client's current situation, pain points, and business context. Shows you listened and understood.

**Target length:** 3-8 bullet points or 2-3 short paragraphs

**Structure:**
- Current state: What the client is doing now
- Pain points: What isn't working, what's costing time/money
- Business context: Why this matters now (growth, compliance, competition)
- Previous attempts: What they've tried before (if known)

**Tone:** Empathetic, factual. Mirror the client's own language from scope notes.

**Data sources:** Scope notes, meeting transcripts, cortex recall of past interactions.

**Common mistakes to avoid:**
- Inventing context not in the scope notes (flag as [NEEDED] instead)
- Being condescending about their current process
- Ignoring industry-specific context

---

## 3. Scope of Work

**Purpose:** Define exactly what will be delivered. This is the contractual heart of the proposal.

**Target length:** 1 deliverables table + brief narrative (10-20 lines total)

**Structure:**

Narrative paragraph explaining the overall scope, followed by a deliverables table:

| # | Deliverable | Description | Acceptance Criteria |
|---|-------------|-------------|---------------------|
| 1 | {Name} | {What it includes} | {How client knows it's done} |
| 2 | {Name} | {What it includes} | {How client knows it's done} |

**Acceptance criteria examples:**
- "Functional login page with SSO integration passing all test cases"
- "Dashboard displaying real-time KPIs with <2s load time"
- "SOP document reviewed and approved by operations team"
- "Data migration completed with 100% record validation"

**Tone:** Precise, unambiguous. Every deliverable must be concretely verifiable.

**Common mistakes to avoid:**
- Vague deliverables ("Improve the system" — what system? what improvement?)
- Missing acceptance criteria (how does the client know it's done?)
- Including activities instead of deliverables ("Hold meetings" is an activity, not a deliverable)

---

## 4. Approach & Methodology

**Purpose:** Explain HOW the work will be done. Builds confidence that you have a plan.

**Target length:** 5-15 lines describing phases or methodology

**Structure:**
- High-level approach (agile, waterfall, hybrid, phased)
- Phase breakdown if applicable:
  - Phase 1: Discovery / Requirements
  - Phase 2: Design / Architecture
  - Phase 3: Build / Implementation
  - Phase 4: Test / Validate
  - Phase 5: Deploy / Handoff
- Tools and technologies to be used
- Team composition (if relevant)
- Communication cadence (weekly standups, milestone reviews, etc.)

**Tone:** Professional, methodical. Show structured thinking without being rigid.

**Common mistakes to avoid:**
- Over-engineering the methodology section (keep it proportional to project size)
- Using internal jargon the client won't understand
- Not mentioning communication/reporting cadence

---

## 5. Timeline & Milestones

**Purpose:** Set expectations for when things will be delivered. Provides a visual roadmap.

**Target length:** 1 Gantt-style table + brief narrative

**Structure:**

| Phase | Duration (Est.) | Dependencies | Key Deliverable |
|-------|----------------|--------------|-----------------|
| 1. Discovery | 1 week | None | Requirements document |
| 2. Design | 2 weeks | Phase 1 | Architecture spec |
| 3. Build | 4 weeks | Phase 2 | Working system |
| 4. Test | 1 week | Phase 3 | Test results |
| 5. Deploy | 1 week | Phase 4 | Live system |

**Timeline heuristics (rough guidance):**
- Simple deliverable (config, script, single endpoint): 1-3 days
- Moderate deliverable (feature, basic integration): 1-2 weeks
- Complex deliverable (platform, migration): 1-3 months
- Enterprise-scale (multi-system transformation): 3-6 months

**ALWAYS include the caveat:** "All timelines are estimated and subject to adjustment based on discovery findings and client availability."

**Tone:** Realistic, not aggressive. Under-promise, over-deliver.

**Common mistakes to avoid:**
- Unrealistic timelines (discovery alone takes 1-2 weeks for any non-trivial project)
- Not showing dependencies (Phase 3 can't start until Phase 2 is complete)
- Missing the caveat about estimates

---

## 6. Investment

**Purpose:** Present the cost structure. This is the most sensitive section.

**CRITICAL RULE: NEVER auto-generate pricing.** This section is ALWAYS `[TO BE DETERMINED]` unless the user explicitly provides pricing data.

**Target length:** 1 pricing table (when provided) + payment terms

**Structure (when pricing IS provided by user):**

| # | Item | Hours (Est.) | Rate | Total |
|---|------|-------------|------|-------|
| 1 | {Phase/Deliverable} | {N} | ${rate}/hr | ${total} |
| | **Total** | **{N}** | | **${total}** |

Pricing models:
- **Fixed price**: Total cost for defined scope
- **Hourly/T&M**: Hourly rate with estimated range
- **Retainer**: Monthly fee for ongoing support
- **Hybrid**: Fixed for core scope + hourly for extras

**Structure (when pricing is NOT provided):**

```markdown
### 6. Investment

> **[TO BE DETERMINED]**
>
> Investment details will be confirmed following scope alignment discussion.
> Pricing structure options: Fixed Price | Hourly | Retainer | Hybrid
```

**All calculations MUST be done via Bash/Python** — never LLM-computed:
```bash
python3 -c "hours=40; rate=150; print(f'Total: ${hours * rate:,.2f}')"
```

**Tone:** Transparent, value-focused. Frame as "investment" not "cost."

---

## 7. Assumptions & Exclusions

**Purpose:** Protect both parties by making expectations explicit. Prevents scope creep and misunderstandings.

**Target length:** 5-10 assumptions + 3-5 exclusions

**Structure:**

**Assumptions (things we assume to be true):**
- Client provides timely access to systems and stakeholders
- Client designates a single point of contact with decision-making authority
- Existing systems are in a functional state for integration
- (project-specific assumptions)

**Exclusions (things NOT included in this proposal):**
- Third-party software licensing costs
- Hardware procurement
- Training beyond the scope defined in deliverables
- (project-specific exclusions)

**Source:** Pull templates from `references/clause-library.md` and customize for the engagement.

**Tone:** Clear, factual, non-adversarial. Frame as "clarity" not "legal protection."

---

## 8. Terms & Conditions

**Purpose:** Standard business terms governing the engagement.

**Target length:** 5-10 bullet points (not full legal text — refer to MSA if applicable)

**Standard terms to include:**
- **Payment terms**: Net 30, milestone-based, or as agreed
- **IP ownership**: Client owns all deliverables upon final payment
- **Confidentiality**: Both parties maintain confidentiality of proprietary information
- **Change management**: Scope changes require written agreement and may affect timeline/cost
- **Termination**: Either party may terminate with 30 days written notice
- **Warranty**: {period} warranty on deliverables for defects

**Tone:** Professional, balanced. Not adversarial.

**Note:** For formal engagements, reference a Master Services Agreement (MSA) rather than embedding full legal terms in the proposal.

---

## 9. About Us

**Purpose:** Brief introduction to the consultant/company. Builds credibility.

**Target length:** 3-5 sentences or bullet points

**Structure:**
- Who we are (company/consultant introduction)
- What we specialize in (relevant expertise)
- Track record (key metrics, notable clients if appropriate)
- Why we're the right fit for this engagement

**Data source:** Pull from cortex (`cortex_recall "business positioning about us"`). If not stored, flag as `[NEEDED: Company/consultant biography]`.

**Tone:** Confident but not boastful. Focus on relevance to THIS client's needs.

**Common mistakes to avoid:**
- Generic company boilerplate that doesn't relate to the engagement
- Too long (this is a proposal, not a capabilities deck)
- Missing entirely (even a brief bio builds credibility)

---

## 10. Next Steps

**Purpose:** Create a clear call to action. Tell the client exactly what happens next.

**Target length:** 3-5 numbered steps

**Structure:**
1. Review this proposal and provide feedback by {date or "[DATE]"}
2. Schedule a call to discuss questions and align on scope
3. Sign off on proposal and confirm engagement terms
4. Kick-off meeting to begin Phase 1 (Discovery)

**Tone:** Action-oriented, forward-looking. Create momentum.

**Common mistakes to avoid:**
- Ending with "Let us know if you have questions" (passive, not a call to action)
- Not including a concrete next action
- Missing urgency or timeline for response
