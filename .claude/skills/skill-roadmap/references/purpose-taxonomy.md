# Purpose Taxonomy Reference

Classification system for grouping capabilities by their role in a project lifecycle.

## Purpose Groups

### Audit
**When to assign:** Pre-build analysis, risk detection, design validation, coherence checking.

**Signals in project context:**
- Multiple interdependent specs (5+ -> crystal-ball-matrix is essential)
- Existing architecture decisions that need validation
- Pre-production readiness requirements
- Security audit requirements

**Typical skills:** crystal-ball, crystal-ball-matrix, crystal-ball-premortem, crystal-ball-constraints, crystal-ball-decay, crystal-ball-predict, probability-storm, redteam, security (all variants)

### Map
**When to assign:** Data/schema/process mapping, system topology discovery, dependency analysis.

**Signals in project context:**
- ETL or data transformation requirements
- Database schemas or API integrations
- Cross-system data flows
- Process documentation needs

**Typical skills:** data-pipeline, unified-field-theory, architecture-decision-tracker

### Document
**When to assign:** Process documentation, SOPs, proposals, meeting notes conversion.

**Signals in project context:**
- Business processes mentioned in requirements
- Client-facing deliverables needed
- Meeting notes that need structuring
- Onboarding or training documentation

**Typical skills:** sop-gen, proposal-builder, meeting-to-specs, docs, create-teaching-materials

### Build
**When to assign:** Code construction, skill creation, feature implementation, scaffolding.

**Signals in project context:**
- Specs in `specs/todo/` waiting for implementation
- Feature requirements in CLAUDE.md or roadmaps
- New skill/command/MCP creation tasks
- Multi-spec parallel builds

**Typical skills:** build, agent-teams, quick-plan, new-feature, skill-creator, gigafactory, mcp-builder, create-command, template-factory

### Validate
**When to assign:** Post-build quality checks, performance analysis, parameter tuning.

**Signals in project context:**
- Completed specs that need verification
- Performance requirements or SLAs
- Configuration parameters that need optimization
- Gap analysis needs

**Typical skills:** crystal-ball (full audit), performance-optimizer, resonance-finder, exploding-pen, spec-review, test, check, coverage, bdd-refactor

### Maintain
**When to assign:** Ongoing maintenance, health monitoring, memory management, reporting.

**Signals in project context:**
- Long-running projects with accumulated history
- Multiple sessions of work on the same codebase
- Memory/context management needs
- Regular reporting cadence

**Typical skills:** memory, self-heal, portfolio-health, weekly-digest, time-report, retrospective, clean, improve, refactor, matrix-reload

## Classification Decision Tree

For each capability, walk through in order:

1. **Does it analyze before building?** -> Audit
2. **Does it discover structure or map data flows?** -> Map
3. **Does it produce documentation or SOPs?** -> Document
4. **Does it create code, skills, or infrastructure?** -> Build
5. **Does it verify quality or optimize performance?** -> Validate
6. **Does it maintain, clean, or report on existing work?** -> Maintain

If a capability spans multiple purposes, assign its PRIMARY purpose (the one it does first/most).

## Essential vs Recommended vs Optional

| Classification | Rule |
|---------------|------|
| **Essential** | Directly addresses a KNOWN project need visible in specs, CLAUDE.md, or package.json |
| **Recommended** | Provides HIGH-VALUE analysis for the project type even if not explicitly requested |
| **Optional** | Available but not specifically needed for this project's current state |

### Essential Signals
- Spec mentions the exact tool by name
- Project has ETL requirements and data-pipeline exists
- Project has 5+ interdependent specs and crystal-ball-matrix exists
- Project has security requirements and security tools exist
- Project uses technology X and an X-specific tool exists

### Recommended Signals
- Codebase >1000 lines -> exploding-pen recommended
- Any project with specs -> crystal-ball recommended
- Any long-running project -> time-report, memory recommended
- Any project with dependencies -> vulnerability scanning recommended
- Business processes described -> sop-gen recommended

### Optional Signals
- Tool exists but project domain doesn't match (e.g., billing tool on non-billing project)
- Tool duplicates capability already classified as essential
- Tool is for a workflow phase not yet reached
