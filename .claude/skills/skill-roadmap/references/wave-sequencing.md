# Wave Sequencing Reference

Algorithm for assigning capabilities to execution waves in skill-execution roadmaps.

## Default Wave Ordering

Purpose groups map to waves in lifecycle order:

| Wave | Purpose Group | Default Execution | Rationale |
|------|--------------|-------------------|-----------|
| 0 | Audit (essential only) | SEQUENTIAL if chain, PARALLEL otherwise | Must run before building |
| 1 | Map + Analyze | PARALLEL where independent | Discovery informs documentation |
| 2 | Document | PARALLEL (SOPs are independent) | Can start once structure is mapped |
| 3 | Build | Follow spec dependency chain | Core implementation |
| 4 | Validate | PARALLEL (all read-only post-build) | Quality gates after build |
| 5 | Maintain | PARALLEL (ongoing ops) | Long-term health |

## Wave Assignment Rules

1. Only **Essential** and **Recommended** capabilities get wave assignments. Optional capabilities are listed in an appendix but NOT assigned to waves.
2. If a purpose group has zero Essential/Recommended entries, skip that wave number entirely.
3. Renumber waves contiguously after skipping (no gaps: W0, W1, W2 — never W0, W2, W5).

## Execution Method Decision Matrix

For each wave, determine execution method:

| Condition | Execution Method |
|-----------|-----------------|
| Single capability in wave | SEQUENTIAL |
| Multiple light/medium, all independent | PARALLEL (agent-teams xN) |
| Multiple heavy, all independent | PARALLEL (terminal xN) |
| Mix of heavy + light | PARALLEL (mixed) |
| Capabilities with chain dependency within wave | SEQUENTIAL within wave |
| Interactive capability (needs user input) | SEQUENTIAL (separate terminal) |

## Sub-Wave Splitting

If a wave has >5 steps:
1. Split into sub-waves (e.g., Wave 2A, Wave 2B)
2. Target 3-5 steps per sub-wave
3. Group related capabilities together in the same sub-wave
4. Independent sub-waves can run in parallel

## Dependency Detection

Within a wave, check for implicit dependencies:
- Audit tools that feed into each other (crystal-ball -> crystal-ball-decay -> crystal-ball-constraints)
- Build tools where one creates what another modifies
- Validate tools that check outputs of other validate tools

Cross-wave dependencies are handled by wave ordering (earlier waves complete before later ones).

## Argument Pre-Fill Patterns

| Hint Pattern | Context Signal | Resolution |
|-------------|---------------|------------|
| `<file-path>` | Glob for relevant project files | Most relevant file path |
| `<spec-file>` | `specs/todo/*.md` | First matching spec |
| `<description>` | Project CLAUDE.md context | Generated description |
| `<roadmap-path>` | `specs/roadmaps/ROADMAP-*.md` | Most relevant roadmap |
| Mode flags (`quick \| deep`) | Classification tier | essential=deep, recommended=default, optional=quick |
| No clear match | -- | Leave bare (user fills in) |
