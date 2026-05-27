# Cortex CLI-First Patterns for Skills

Reference for integrating Omni-Cortex into generated skills. The `cortex` CLI (`pip install omni-cortex`) handles fire-and-forget operations; MCP tools handle interactive reasoning.

## Decision Matrix

| Operation | Interface | When to Use |
|-----------|-----------|-------------|
| `cortex remember "..." --tags t1,t2` | CLI (Bash) | Storing findings, decisions, summaries — LLM does not need the memory ID |
| `cortex link <id1> <id2>` | CLI (Bash) | Connecting related memories — no return value needed |
| `cortex log-activity "action"` | CLI (Bash) | Tracking skill execution progress — fire-and-forget |
| `cortex export --tags tag --format jsonl` | CLI (Bash) | Batch export — pipe to file or jq |
| `cortex batch-remember < memories.jsonl` | CLI (Bash) | Bulk creation — no per-item reasoning needed |
| `cortex recall "query" --json > file` | CLI (Bash) | Pre-fetching context to a file for later grep/jq extraction |
| `cortex_recall` | MCP | LLM must reason about recalled memories to make a decision |
| `cortex_list_memories` | MCP | LLM presents results to user or selects from them |
| `cortex_search_entities` | MCP | LLM uses entity relationships for in-context reasoning |
| `cortex_get_memory` | MCP | LLM reads full memory content for decision-making |

**Decision rule:** If the LLM needs the result to continue reasoning, use MCP. If the result is stored/logged and the LLM moves on, use CLI.

## CLI Command Reference

### Fire-and-forget remember
```bash
cortex remember "Decision: chose X over Y because Z" --tags decision,architecture --importance 80
```

### Chained operations (single bash call)
```bash
cortex remember "Session summary: completed A, B, C" --tags session-summary && \
cortex log-activity "completed task X"
```

### Pre-fetch to file (CLI recall)
```bash
cortex recall "architecture decisions" --limit 5 --json > /tmp/decisions.json
```

### Extract specific field with jq
```bash
cortex recall "handoff notes" --json | jq -r '.[0].content'
```

### Batch remember from JSONL
```bash
echo '{"content":"item 1","tags":["batch"]}' >> /tmp/batch.jsonl
echo '{"content":"item 2","tags":["batch"]}' >> /tmp/batch.jsonl
cortex batch-remember < /tmp/batch.jsonl
```

### Export filtered memories
```bash
cortex export --tags brainstorm --format json > /tmp/brainstorm-export.json
```

## Per-Layer Recommendations

| Layer | CLI Operations | MCP Operations |
|-------|---------------|----------------|
| **L1 (Analysis/Research)** | `cortex remember` to store findings | `cortex_recall` to discover prior context for decision-making |
| **L2 (Planning)** | `cortex remember` to store decisions | `cortex_list_memories` to present options to user |
| **L3 (Execution)** | `cortex remember` results, `cortex link` relationships, `cortex log-activity` progress | None — execution is fire-and-forget |
| **L4 (Verification)** | `cortex recall --json \| jq` to verify stored data | MCP only if user needs to see verification results interactively |
| **L5 (Reporting)** | `cortex remember` report metadata, `cortex export` for data aggregation | None |
| **L6 (Handoff)** | `cortex remember` session/handoff summaries | `cortex_recall` only for final summary retrieval if LLM needs it in-context |

## Anti-Patterns

### 1. MCP for fire-and-forget storage
```
# BAD — wastes context, LLM doesn't need the memory ID
cortex_remember: {"content": "found 3 issues", "tags": ["scan"]}

# GOOD — fire-and-forget via CLI
cortex remember "found 3 issues" --tags scan
```

### 2. MCP recall when result goes to a file
```
# BAD — loads all results into LLM context just to write to file
cortex_recall: {"query": "all architecture decisions"}
# ...then writes results to file

# GOOD — pipe directly, never enters context
cortex recall "all architecture decisions" --json > /tmp/arch-decisions.json
```

### 3. Multiple MCP calls for batch operations
```
# BAD — N tool calls, N * 2-5KB context
cortex_remember: {"content": "item 1", ...}
cortex_remember: {"content": "item 2", ...}
cortex_remember: {"content": "item 3", ...}

# GOOD — one bash call, ~200 tokens
cortex batch-remember < /tmp/items.jsonl
```

### 4. Using MCP when CLI + jq suffices
```
# BAD — full MCP round-trip to check if a memory exists
cortex_recall: {"query": "handoff for project X"}

# GOOD (when you just need a yes/no or single field)
cortex recall "handoff for project X" --limit 1 --json | jq -r '.[0].content // "none"'
```

## Pipe Patterns for Common Workflows

### Store scan results then log completion
```bash
cortex remember "Scan found 12 issues: 3 critical, 9 minor" --tags scan,results --importance 75 && \
cortex log-activity "completed security scan"
```

### Export + analyze in Python
```bash
cortex export --tags scan --format jsonl > /tmp/scans.jsonl && \
python3 -c "
import json, sys
scans = [json.loads(l) for l in open('/tmp/scans.jsonl')]
print(f'Total scans: {len(scans)}')
print(f'Avg importance: {sum(s.get(\"importance\",50) for s in scans)/len(scans):.0f}')
"
```

### Check for prior context before expensive analysis
```bash
# Pre-fetch to see if we already analyzed this
PRIOR=$(cortex recall "analysis of module X" --limit 1 --json | jq -r 'length')
if [ "$PRIOR" -gt 0 ]; then
  echo "Prior analysis exists — skipping re-analysis"
else
  echo "No prior analysis — proceeding with full scan"
fi
```

## Windows Compatibility Notes

- Use forward slashes in all paths: `D:/Workshop/reports/` not `D:\Workshop\reports\`
- Use `tempfile.gettempdir()` in Python scripts instead of hardcoded `/tmp/`
- Bash pipe patterns work in Git Bash on Windows
- `jq` is available in Git Bash; if missing, fall back to Python for JSON extraction

## Interim Bridge (mcp2cli)

If the `cortex` CLI is not yet installed, use `mcp2cli` as a bridge:
```bash
pip install mcp2cli
mcp2cli --mcp-stdio "python -m omni_cortex.server" call cortex_remember '{"content":"test","tags":["bridge"]}'
```

This provides 94-96% token reduction vs native MCP for batch/scripted work. Migrate to native `cortex` CLI when available.
