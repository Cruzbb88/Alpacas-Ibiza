# Collab Handoff -- Layered System

## Layer Definitions

| Layer | Name | Scope | Weight | Spec |
|-------|------|-------|--------|------|
| L1 | Memory Extraction Engine | Time-range query + relationship traversal + project grouping | 50% | 07 |
| L2 | Export Packaging | Adaptive bundling + convention naming + Git staging | 50% | 07 |
| L3 | Import Engine | Parse handoff files + create Cortex memories + ID mapping | -- | 08 |
| L4 | Conflict Detection | Compare incoming vs existing + human-in-the-loop | -- | 08 |

## Mode Matrix

| Mode | Arg | Layers | Saves Files | Sub-agents |
|------|-----|--------|-------------|------------|
| Export (Cortex) | `export [time]` | L1 + L2 | Yes (handoff MD) | No |
| Export (Manual) | `export --no-cortex` | L2 only | Yes (handoff MD) | No |
| Import | `import` | L3 + L4 | No (creates memories) | No |
| Status | `status` | None | No | No |

## Scoring

This skill does not use composite scoring. Success is measured by:
- Memory count extracted (L1)
- Files generated and staged (L2)
- Import accuracy (L3 -- Spec 08)
- Conflict resolution rate (L4 -- Spec 08)

## Data Flow

```
L1: Cortex memories --> ExtractedMemory[] --> grouped by project
      |
      v
L2: ExtractedMemory[] --> handoff MD files --> git staged
      |
      v
L3: handoff MD files --> parsed --> new Cortex memories (Spec 08)
      |
      v
L4: new memories vs existing --> conflict report (Spec 08)
```
