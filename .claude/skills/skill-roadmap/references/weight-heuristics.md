# Weight Heuristics Reference

Context consumption estimates for classifying skills/commands by resource weight.

## Weight Tiers

| Weight | Context Usage | Typical Duration | Description |
|--------|-------------|-----------------|-------------|
| **Light** | <20% | <5 min | Single-file ops, quick scans, simple transforms |
| **Medium** | 20-60% | 5-15 min | Multi-step workflows, moderate analysis, file generation |
| **Heavy** | 60%+ | 15+ min | Deep analysis, multi-agent orchestration, full codebase scans |

## Classification Signals

### Light Signals
- Single-layer or no layers
- No `deep` mode
- Simple file read/write/transform operations
- No sub-agent spawning
- Quick-only or scan-only skills
- Examples: commit, deploy, logging, hotfix, voice, clear-cache

### Medium Signals
- 2-3 layers
- Has default + quick modes
- Generates reports or structured output
- Single-pass analysis
- May read multiple files but doesn't do exhaustive scanning
- Examples: quick-plan, spec-review, time-report (quick/default), sop-gen, proposal-builder

### Heavy Signals
- 4+ layers
- Has `deep` mode with sub-agents
- Multi-agent orchestration (agent-teams)
- Full codebase scanning or cross-project analysis
- Extensive external API calls
- Long-running analysis pipelines
- Examples: crystal-ball (full), unified-field-theory (deep), performance-optimizer (deep), exploding-pen (deep), matrix-reload (deep), resonance-finder (deep), probability-storm (deep), agent-teams

## Auto-Detection Rules

Apply in order — first match wins:

1. **If skill spawns agent-teams or uses TeamCreate** -> Heavy
2. **If skill has 4+ layers AND a `deep` mode** -> Heavy (default mode may be Medium)
3. **If skill has `deep` mode with sub-agents** -> Heavy
4. **If skill has 2-3 layers** -> Medium
5. **If skill generates numbered reports** -> Medium (at minimum)
6. **If skill is a single command file (<200 lines)** -> Light
7. **If skill has no layers/modes** -> Light
8. **Default fallback** -> Medium

## Per-Mode Weight Override

Some skills are Light in quick mode but Heavy in deep mode. When classifying, use the DEFAULT mode weight unless the user specifically asks about a mode.

| Skill | Quick | Default | Deep |
|-------|-------|---------|------|
| crystal-ball | Medium | Medium | Heavy |
| exploding-pen | Light | Medium | Heavy |
| time-report | Light | Medium | Heavy |
| performance-optimizer | Light | Medium | Heavy |
