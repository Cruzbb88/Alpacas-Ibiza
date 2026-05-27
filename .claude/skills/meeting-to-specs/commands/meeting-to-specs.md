---
description: >-
  Transform meeting notes, diagnostic documents, or transcripts into actionable
  spec files for the /build pipeline. Full extraction with both layers.
argument-hint: <file-path> [--output-dir specs/todo] [--mode quick|deep]
model: claude-opus-4-6
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - mcp__omni-cortex__cortex_remember
  - mcp__omni-cortex__cortex_recall
  - mcp__omni-cortex__cortex_link_memories
---

# /meeting-to-specs

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md

Run the full meeting-to-specs extraction pipeline.

## Arguments

`$ARGUMENTS` is passed directly to the skill engine.

**Usage:**
```
/meeting-to-specs path/to/meeting-notes.md
/meeting-to-specs path/to/transcript.txt --mode quick
/meeting-to-specs path/to/diagnostic.md --output-dir my-project/specs/todo
```

## Execution

This command delegates to the SKILL.md engine which runs:

1. **Layer 1 (Extract & Classify)**: Reads the document, extracts work items, classifies by type/effort/priority, deduplicates, scores, and outputs a summary table.

2. **Layer 2 (Generate & Map)** *(skipped in quick mode)*: Generates full spec files per item, cross-references shared dependencies, builds a dependency graph, generates ROADMAP.md, stores results in Omni-Cortex.

## Quick Reference

| Mode | What You Get |
|------|-------------|
| `--mode quick` | Summary table only (L1). Fast triage. |
| *(default)* | Full specs + ROADMAP + dependency graph (L1+L2) |

## Input Formats Supported

- Markdown meeting notes (`.md`)
- Plain text transcripts (`.txt`)
- Diagnostic documents
- Video transcript extractions (from `/video-transcript-extractor`)
- Raw pasted notes (use `clipboard` as argument)

## Output

- Spec files written to `specs/todo/{NN}-{slug}.md`
- ROADMAP written to `specs/roadmaps/ROADMAP-{project-slug}.md`
- Extraction results stored in Omni-Cortex with tags `["meeting-to-specs", "spec-genesis"]`

## Integration Points

- **Input from**: `/video-transcript-extractor`, manual notes, diagnostic docs
- **Output to**: `/build` (individual specs), `/agent-teams` (parallel phase builds)
- **Uses**: Same ROADMAP format as `/quick-plan`
