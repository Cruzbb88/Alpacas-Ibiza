# Convention Bridge

Links collab-handoff to the unified report convention system.

## Primary Reference

`~/.claude/skills/REPORT-CONVENTION.md`

## Collab-Handoff Convention Summary

| Property | Value |
|----------|-------|
| Prefix | `ch-` |
| Subdirectory | `handoffs/{username}/` |
| Report type | Collaborative handoff package |
| Naming pattern | `ch-{NNN}-{YYYY-MM-DD}-{project-slug}-handoff.md` |

## Differences from Standard Reports

1. **Per-user subdirectories**: Unlike other reports that use flat `reports/{skill}/` directories, handoffs use `handoffs/{username}/` -- one folder per collaborator
2. **Location**: Handoffs live in `handoffs/` at repo root, not `reports/`
3. **No scoring**: Handoff files have `composite_score: null` -- they transfer context, not metrics
4. **Cross-repo**: The `--dest` flag can point to a different repo, enabling handoffs via a shared "collab kit" repo

## Numbering

Sequential within each user's directory:
```
handoffs/tony/ch-001-2026-02-17-surity-handoff.md
handoffs/tony/ch-002-2026-02-17-workshop-handoff.md
handoffs/ralph/ch-001-2026-02-17-surity-handoff.md
```

Each user's numbering is independent.
