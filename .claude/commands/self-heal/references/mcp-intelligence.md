# MCP Intelligence Layer Reference

The MCP intelligence layer analyzes tool usage patterns, co-occurrence relationships, and API surface overlap across owned MCP servers. Invoked via `--mcp-audit` (standalone) or runs automatically when scope is `global` or `combined`.

## Owned Server Registry

Only **owned** MCPs (servers the user maintains and can modify) are analyzed. Third-party MCPs (google-workspace, supabase, claude-in-chrome) are excluded.

```yaml
owned_servers:
  - name: "omni-cortex"
    source_path: "D:/Projects/omni-cortex/"
    tool_prefix: "mcp__omni-cortex__cortex_"
  - name: "patent-office"
    source_path: "D:/Projects/patent-office-mcp/"
    tool_prefix: "mcp__patent-office__patent_"
  - name: "darkhold"
    source_path: "D:/Projects/darkhold-mcp/"
    tool_prefix: "mcp__darkhold__"
```

Edit this registry when adding or removing owned MCP servers. The `tool_prefix` is used to filter activity log entries.

## Configuration

```yaml
thresholds:
  # Usage classification (calls per window)
  heavy_use: 50        # >50 calls
  regular_use: 10      # 10-50 calls
  light_use: 3         # 3-9 calls
  rare_use: 1          # 1-2 calls
  dormant: 0           # 0 calls (registered but unused)

  # Co-occurrence
  co_occurrence_rate: 0.80      # 80% — flag if tools called together in >80% of shared sessions
  co_occurrence_min_sessions: 3 # Minimum shared sessions before analysis

  # Failure rate
  failure_concern: 0.10         # >10% failure rate = reliability concern

  # Data requirements
  min_mcp_calls: 50             # Minimum total MCP calls before analysis is meaningful

  # Time windows
  default_window_days: 30
  extended_window_days: 90      # Used in deep mode
```

## SQL Queries

### Database Paths

- **Project DB:** `{PROJECT_DIR}/.omni-cortex/cortex.db`
- **Global DB:** `~/.omni-cortex/global.db` (READ ONLY)

### Schema Verification

Run before any analysis to verify expected tables and columns:

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name='activities';
```

```sql
PRAGMA table_info(activities);
```

Expected columns: `id`, `tool_name`, `success`, `duration_ms`, `created_at`, `session_id`.

If `session_id` column is missing, co-occurrence analysis is skipped (usage profiler and overlap detection still work).

### 1. Usage Profiler

```sql
SELECT tool_name,
       COUNT(*) as call_count,
       SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failures,
       ROUND(SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as fail_pct,
       ROUND(AVG(duration_ms), 0) as avg_duration_ms,
       MAX(created_at) as last_used
FROM activities
WHERE tool_name LIKE 'mcp__%'
  AND created_at > datetime('now', '-{window_days} days')
GROUP BY tool_name
ORDER BY call_count DESC;
```

Filter results client-side against owned server `tool_prefix` values.

### 2. Co-occurrence Analysis

```sql
SELECT a1.tool_name as tool_a,
       a2.tool_name as tool_b,
       COUNT(DISTINCT a1.session_id) as shared_sessions
FROM activities a1
JOIN activities a2 ON a1.session_id = a2.session_id
  AND a1.tool_name < a2.tool_name
WHERE a1.tool_name LIKE 'mcp__%'
  AND a2.tool_name LIKE 'mcp__%'
  AND a1.created_at > datetime('now', '-{window_days} days')
GROUP BY a1.tool_name, a2.tool_name
HAVING shared_sessions >= {co_occurrence_min_sessions}
ORDER BY shared_sessions DESC;
```

### 3. Per-Tool Session Count (for co-occurrence rate)

```sql
SELECT tool_name, COUNT(DISTINCT session_id) as session_count
FROM activities
WHERE tool_name LIKE 'mcp__%'
  AND created_at > datetime('now', '-{window_days} days')
GROUP BY tool_name;
```

Co-occurrence rate = `shared_sessions / max(tool_a_sessions, tool_b_sessions)`. Flag pairs above threshold.

### 4. Registered Tools Discovery

To find tools registered but never used (truly dormant):

```sql
-- All MCP tools that have EVER been called
SELECT DISTINCT tool_name
FROM activities
WHERE tool_name LIKE 'mcp__%';
```

Compare against the known tool catalog (below) to find tools that exist but have zero activity entries.

## Overlap Detection Heuristics

### 1. Functional Category Mapping

Classify each owned MCP tool into categories:

| Category | Description | Example Tools |
|----------|-------------|---------------|
| Search/Query | Retrieve information by criteria | cortex_recall, cortex_global_search, patent_search_packages |
| Create/Store | Store new data | cortex_remember, cortex_log_activity |
| Update/Modify | Change existing data | cortex_update_memory, cortex_link_memories |
| Delete/Remove | Remove data | cortex_forget |
| Analysis/Report | Generate insights from data | patent_prior_art_report, vulnerability_scan_tool |
| Session/Lifecycle | Manage session state | cortex_start_session, cortex_end_session |
| List/Browse | Enumerate available items | cortex_list_memories, cortex_list_tags |
| Export/Sync | Move data between systems | cortex_export, cortex_sync_to_global |

### 2. Cross-Server Overlap Detection

Flag tools meeting ANY of these criteria:
- **Same category, different servers**: Two search tools from different MCPs
- **Name similarity**: Tools with shared verb stems (search, find, query, get, list)
- **Wrapper relationship**: One tool's output is a superset of another's

### 3. Same-Server Redundancy Detection

Flag tools on the SAME server with overlapping functionality:
- `cortex_recall` vs `cortex_global_search` — both search, different scope
- `cortex_list_memories` vs `cortex_recall` — listing vs targeted search

### 4. Parameter Shape Comparison

Tools with similar input parameters may serve similar purposes:
- Both accept `query: string` = likely search operations
- Both accept `tags_filter: array` = likely filtering operations
- Both return lists = likely enumeration operations

Overlap detection is heuristic-based — frame all findings as "potential" overlaps for user review.

## Recommendation Templates

### By Finding Type

| Finding | Category | Zone | Template |
|---------|----------|------|----------|
| Dormant tool (0 calls) | Document or Remove | GRAY (source) / DANGER (registration) | "Tool `{name}` has 0 calls in {window}d. Document its use case or consider removing." |
| High failure rate (>10%) | Fix Root Cause | GRAY | "Tool `{name}` has {rate}% failure rate ({failures}/{total}). Investigate in MCP source." |
| High co-occurrence (>80%) | Consider Combined Tool | GRAY | "Tools `{a}` and `{b}` called together in {rate}% of sessions. Consider combined tool." |
| Cross-server overlap | Document Differentiation | SAFE (docs only) | "Tools `{a}` and `{b}` serve similar functions. Document when to use each." |
| Same-server redundancy | Document or Merge | GRAY (merge) / SAFE (docs) | "Tools `{a}` and `{b}` overlap on `{server}`. {guidance}" |
| Rare tool with alternative | Document | SAFE | "Tool `{name}` ({count} calls) may be superseded by `{alt}` ({alt_count} calls)." |

### Zone Classification for MCP Actions

| Action Type | Zone | Rationale |
|-------------|------|-----------|
| Documentation changes | SAFE | Only adds/updates docs |
| MCP source code changes | GRAY | Owned code, needs review |
| MCP tool removal (source) | GRAY | Source code change, reversible |
| MCP registration changes | DANGER | Modifying .claude.json |
| Server consolidation | GRAY | Major architecture change |

## Report Section Format

```markdown
### MCP Intelligence Summary

**Servers Analyzed:** {N} ({server_names})
**Total Tools:** {N} | Active: {N} | Dormant: {N} | High-Failure: {N}
**Data Window:** {window_days} days | Total MCP Calls: {total_calls}

#### Usage Health
| Server | Tools | Active | Dormant | Avg Fail% | Top Tool |
|--------|-------|--------|---------|-----------|----------|
| {name} | {total} | {active} | {dormant} | {avg}% | {tool} ({calls} calls) |

#### Tool Usage Details
| Server | Tool | Calls | Failures | Fail% | Avg ms | Last Used | Status |
|--------|------|-------|----------|-------|--------|-----------|--------|
| {srv} | {tool} | {N} | {N} | {pct}% | {ms} | {date} | {Heavy/Regular/Light/Rare/Dormant} |

#### Co-occurrence Patterns
| Tool A | Tool B | Shared Sessions | Rate | Recommendation |
|--------|--------|----------------|------|----------------|
| {a} | {b} | {N} | {pct}% | {text} |

#### Potential Overlaps
| Tool A | Tool B | Overlap Type | Recommendation |
|--------|--------|-------------|----------------|
| {a} | {b} | {type} | {text} |

#### Consolidation Opportunities
1. [{ZONE}] {description}
2. [{ZONE}] {description}

#### Trend (vs Last MCP Audit)
- {server}: usage {arrow} {pct}% ({detail})
- New dormant: {list or "none"}
- Failure rate changes: {list or "stable"}
```

## Cortex Storage Format

After analysis, store a snapshot for trend tracking:

```
cortex_remember:
  content: "MCP Intelligence Snapshot - {date}
    Servers analyzed: {N}
    Total tools: {N}, Active: {N}, Dormant: {list}
    High failure: {list}
    Co-occurrence pairs: {list}
    Overlaps detected: {list}
    Key recommendations: {top 3}"
  tags: ["mcp-intelligence", "self-heal", "trend-data"]
  importance: 60
```

## MCP Intelligence Scoring

```
mcp_score = 100
mcp_score -= (dormant_tools * 5)            # Each dormant tool = -5
mcp_score -= (high_failure_tools * 10)       # Each >10% failure tool = -10
mcp_score -= (unresolved_overlaps * 3)       # Each overlap finding = -3
mcp_score -= (high_co_occurrence_pairs * 2)  # Each >80% pair = -2 (not necessarily bad)
Floor at 0, cap at 100.
```

When scope is `combined`, MCP score integrates into composite:
```
composite = layer_1 * 0.25 + global * 0.10 + mcp * 0.10 + layer_2 * 0.20 + layer_3 * 0.15 + layer_4 * 0.15 + (0.05 to highest-impact)
```

When `--mcp-audit` standalone: MCP score IS the report score (no composite).

## Known Tool Catalog

Pre-populated for the 3 owned servers. Update when tools are added/removed.

### omni-cortex (19 tools)

| Tool | Category |
|------|----------|
| cortex_remember | Create/Store |
| cortex_recall | Search/Query |
| cortex_list_memories | List/Browse |
| cortex_update_memory | Update/Modify |
| cortex_forget | Delete/Remove |
| cortex_link_memories | Update/Modify |
| cortex_get_memory | Search/Query |
| cortex_get_memory_history | Search/Query |
| cortex_start_session | Session/Lifecycle |
| cortex_end_session | Session/Lifecycle |
| cortex_get_session_context | Session/Lifecycle |
| cortex_log_activity | Create/Store |
| cortex_get_activities | List/Browse |
| cortex_get_timeline | Analysis/Report |
| cortex_list_tags | List/Browse |
| cortex_review_memories | Analysis/Report |
| cortex_global_search | Search/Query |
| cortex_global_stats | Analysis/Report |
| cortex_export | Export/Sync |
| cortex_sync_to_global | Export/Sync |

### patent-office (5 tools)

| Tool | Category |
|------|----------|
| patent_search_packages | Search/Query |
| patent_search_patterns | Search/Query |
| patent_prior_art_report | Analysis/Report |
| patent_evaluate_solution | Analysis/Report |
| patent_cross_domain_search | Search/Query |

### darkhold (4 tools)

| Tool | Category |
|------|----------|
| vulnerability_scan_tool | Analysis/Report |
| threat_intelligence_tool | Search/Query |
| attack_surface_map_tool | Analysis/Report |
| check_credential_exposure_tool | Search/Query |
