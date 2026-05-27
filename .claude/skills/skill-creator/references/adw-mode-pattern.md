# ADW Mode Pattern -- 2-Tier Skill Execution

## Overview

ADW (Agentic Development Workflow) pipelines use a 2-tier mode system:

- **ADW Mode (lean):** Automated pipeline execution. Fast, focused, no extras.
- **Manual Mode (full):** User-invoked execution. Full reports, sub-agents, deep analysis.

When a skill runs inside an ADW pipeline, `runner.py` sets `ADW_MODE=1` in the environment and prepends a lean-mode preamble to the prompt. Skills should detect this and switch to lean behavior.

## Detection

### Environment Variable

The `ADW_MODE=1` environment variable is set by `runner.py` for all pipeline executions. Skills can check it in code:

```python
import os
is_adw = os.environ.get("ADW_MODE") == "1"
```

### Preamble Signal

For prompt-driven skills (most skills), `runner.py` prepends this preamble to phases with `adw_mode: true`:

```
This is an automated ADW pipeline execution (ADW_MODE=1).
Run in LEAN mode:
- Use quick/L1 mode if available
- Do NOT spawn sub-agents (use Agent tool)
- Do NOT write report files
- Do NOT prompt for user input
- Target completion in under 5 minutes
- Focus on essential checks only
```

Skills do not need code changes to respond to this -- the preamble instructs Claude directly.

### SKILL.md Template

Add this section to any skill's SKILL.md for explicit ADW mode handling:

```markdown
## Mode Detection

**Auto-detect ADW mode:** If the preamble mentions "ADW_MODE=1" or
"automated ADW pipeline", run in lean mode (L1 only, no sub-agents,
no reports, <5 min target).
```

## Lean Mode Checklist by Skill Category

### Testing Skills (test, e2e-test)
| Keep | Skip |
|------|------|
| Run tests, report pass/fail | Coverage analysis |
| Basic error output | Trend tracking |
| Single test command | Parallel sub-agents |
| 3 retries max | Extended debugging |

### Security Skills (security, security-fix)
| Keep | Skip |
|------|------|
| Grep-based OWASP checks | Deep SAST analysis |
| Dependency audit | Sub-agent code flow tracing |
| Known-pattern scanning | Report file generation |
| Quick fix application | Exhaustive vulnerability research |

### Review Skills (spec-review)
| Keep | Skip |
|------|------|
| Spec compliance check | Line-by-line analysis |
| File existence verification | Screenshot verification |
| Key requirement matching | Detailed scoring reports |

### E2E Skills (e2e-test)
| Keep | Skip |
|------|------|
| Start server | Full Playwright suite |
| Verify 2-3 routes render | Interaction testing |
| Basic screenshot | Gemini vision analysis |
| 3 retry max | Extended timeout recovery |

## Pipeline Config

Each phase in a pipeline config has an `adw_mode` flag:

```yaml
phases:
  - skill: build
    adw_mode: false       # Build needs full context
    max_turns: 75

  - skill: test
    adw_mode: true        # Lean: run tests, report pass/fail
    max_turns: 50

  - skill: commit
    adw_mode: false       # Already lean
    max_turns: 15
```

**Default:** `adw_mode: true` (opt-out, not opt-in).

Phases that should NOT be lean:
- `build` -- needs full context for code generation
- `commit` -- already minimal
- `migrate` -- already minimal (1 turn)

## max_turns Cap

When `adw_mode: true`, `runner.py` caps `max_turns` at 25 for non-build phases, regardless of the config value. This prevents runaway sessions in automated pipelines.

## Adding ADW Mode to a New Skill

1. Add the SKILL.md template snippet (above) to your skill
2. Define lean vs full behavior for your skill category
3. The preamble handles most cases without code changes
4. For code-driven skills, check `os.environ.get("ADW_MODE")` explicitly
5. Test with `--dry-run` to verify the flag appears in pipeline output
