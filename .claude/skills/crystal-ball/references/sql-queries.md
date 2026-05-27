# Crystal Ball — Pre-Built SQL Queries

Use Python with sqlite3 to run these against the Omni-Cortex cortex.db.

## Locate Database

```python
import sqlite3, os

# Project-level (preferred)
project_db = os.path.join(os.getcwd(), '.omni-cortex', 'cortex.db')
# Global (fallback)
global_db = os.path.expanduser('~/.omni-cortex/global.db')

db_path = project_db if os.path.exists(project_db) else global_db
conn = sqlite3.connect(db_path)
```

## Check Schema First

Always verify tables exist before querying:

```sql
SELECT name FROM sqlite_master WHERE type='table';
```

Expected tables: `activities`, `memories`, `relationships`, `sessions`
Optional: `user_messages` (if UserPromptSubmit hook is active)

---

## Session Stress Detection

Detect if the current or recent session had a high tool failure rate:

```sql
-- Current session stress
SELECT
  COUNT(*) as total_activities,
  SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failures,
  ROUND(SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as failure_rate,
  ROUND(AVG(duration_ms), 0) as avg_duration_ms
FROM activities
WHERE session_id = '{session_id}';
```

Threshold: failure_rate > 20% = "stressed session"

## Decision Revision Rate

Find which categories of decisions get revised most often:

```sql
-- Decisions that were superseded (revised)
SELECT
  m1.tags,
  COUNT(*) as times_revised
FROM memories m1
JOIN relationships r ON r.source_id = m1.id
WHERE r.relationship_type = 'supersedes'
GROUP BY m1.tags
ORDER BY times_revised DESC;
```

```sql
-- Total decisions per category for percentage calculation
SELECT tags, COUNT(*) as total_decisions
FROM memories
WHERE type = 'decision'
  OR tags LIKE '%architecture%'
  OR tags LIKE '%planning%'
GROUP BY tags
ORDER BY total_decisions DESC;
```

## Stale Decisions

Decisions with high importance but low recent access — may need re-validation:

```sql
SELECT
  id,
  substr(content, 1, 200) as content_preview,
  importance_score,
  access_count,
  ROUND(julianday('now') - julianday(created_at), 1) as days_old,
  status
FROM memories
WHERE
  importance_score > 70
  AND access_count < 3
  AND julianday('now') - julianday(created_at) > 7
  AND (type = 'decision' OR tags LIKE '%architecture%' OR tags LIKE '%planning%')
ORDER BY importance_score DESC, days_old DESC;
```

## Contradicting Decisions

Directly query the relationships table for contradictions:

```sql
SELECT
  m1.id as decision_1_id,
  substr(m1.content, 1, 150) as decision_1,
  m2.id as decision_2_id,
  substr(m2.content, 1, 150) as decision_2,
  r.created_at as contradiction_date
FROM relationships r
JOIN memories m1 ON r.source_id = m1.id
JOIN memories m2 ON r.target_id = m2.id
WHERE r.relationship_type = 'contradicts'
ORDER BY r.created_at DESC;
```

## Recent Error Patterns

Find the most common error types from recent sessions:

```sql
SELECT
  tool_name,
  error_message,
  COUNT(*) as occurrence_count,
  MAX(timestamp) as last_seen
FROM activities
WHERE success = 0
  AND timestamp > datetime('now', '-7 days')
GROUP BY tool_name, error_message
HAVING COUNT(*) >= 2
ORDER BY occurrence_count DESC;
```

## Decision Debt — Deferred Items

Find items that appear in multiple handoff NEXT STEPS without being completed:

```sql
-- This requires text analysis of handoff memories
-- Use cortex_list_memories with tags_filter ["handoff"] and compare NEXT STEPS across sessions
SELECT
  id,
  substr(content, 1, 300) as handoff_excerpt,
  created_at
FROM memories
WHERE tags LIKE '%handoff%'
ORDER BY created_at DESC
LIMIT 10;
```

## Crystal Ball Audit History

Track previous Crystal Ball runs for trend analysis:

```sql
SELECT
  id,
  substr(content, 1, 200) as audit_summary,
  tags,
  created_at,
  importance_score
FROM memories
WHERE tags LIKE '%crystal-ball%'
ORDER BY created_at DESC;
```

## Session Timeline

Get chronological view of recent sessions:

```sql
SELECT
  id,
  started_at,
  ended_at,
  substr(summary, 1, 200) as summary,
  tags,
  ROUND((julianday(ended_at) - julianday(started_at)) * 24 * 60, 1) as duration_minutes
FROM sessions
ORDER BY started_at DESC
LIMIT 10;
```

## User Message Patterns (if available)

Analyze user prompts for decision-making style:

```sql
-- Check if table exists first
SELECT name FROM sqlite_master WHERE type='table' AND name='user_messages';

-- If exists:
SELECT
  AVG(word_count) as avg_word_count,
  SUM(has_questions) * 100.0 / COUNT(*) as question_pct,
  tone_indicators,
  COUNT(*) as message_count
FROM user_messages
WHERE length(content) > 30
GROUP BY tone_indicators
ORDER BY message_count DESC;
```

## Cross-Project Search

For cross-project patterns, use the Omni-Cortex MCP tool instead of direct SQL:

```
cortex_global_search with:
  query: "{pattern description}"
  tags_filter: ["architecture", "error-handling"]
  limit: 10
```

The global index at `~/.omni-cortex/global.db` aggregates from all project databases.
