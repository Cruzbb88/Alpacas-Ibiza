# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Analyze tool failure JSONL data and produce a trends report.

Reads JSONL from stdin (one failure entry per line).
Each entry: {timestamp, tool_name, error, input_summary, project_path}

Usage:
  cat failures.jsonl | uv run analyze_failures.py [--days N] [--top N] [--category tool|error|project]
"""

import json
import sys
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import PurePosixPath, PureWindowsPath


def parse_args():
    parser = argparse.ArgumentParser(description="Analyze tool failure trends")
    parser.add_argument("--days", type=int, default=7, help="Analyze last N days")
    parser.add_argument("--top", type=int, default=10, help="Top N results per category")
    parser.add_argument(
        "--category",
        choices=["tool", "error", "project", "all"],
        default="all",
        help="Grouping category",
    )
    return parser.parse_args()


def normalize_error(error: str) -> str:
    """Normalize error string to a pattern for grouping."""
    if not error:
        return "unknown"
    # Take first 100 chars, strip paths and numbers for pattern matching
    pattern = error[:100].strip()
    return pattern


def get_project_name(project_path: str) -> str:
    """Extract project name from full path."""
    if not project_path:
        return "unknown"
    try:
        return PureWindowsPath(project_path).name
    except Exception:
        try:
            return PurePosixPath(project_path).name
        except Exception:
            return project_path.rstrip("/\\").split("\\")[-1].split("/")[-1]


def trend_indicator(current: int, previous: int) -> str:
    """Return trend indicator comparing current to previous period."""
    if previous == 0:
        return "NEW" if current > 0 else "-"
    diff = current - previous
    if diff > 0:
        return f"+{diff}"
    elif diff < 0:
        return str(diff)
    return "="


def main():
    args = parse_args()
    cutoff = datetime.now() - timedelta(days=args.days)
    mid_point = datetime.now() - timedelta(days=args.days // 2)

    # Read entries from stdin
    entries = []
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
            entries.append(entry)
        except json.JSONDecodeError:
            continue

    if not entries:
        print(json.dumps({"status": "empty", "message": "No failure data found"}))
        return

    # Filter by date range
    filtered = []
    older = []
    for e in entries:
        try:
            ts = datetime.fromisoformat(e.get("timestamp", ""))
            if ts >= cutoff:
                filtered.append(e)
                if ts < mid_point:
                    older.append(e)
            # Keep older entries for trend comparison
        except (ValueError, TypeError):
            filtered.append(e)  # Include entries without valid timestamps

    if not filtered:
        print(
            json.dumps(
                {
                    "status": "empty",
                    "message": f"No failures in the last {args.days} days",
                    "total_all_time": len(entries),
                }
            )
        )
        return

    # Split into current half and previous half for trends
    current_half = [e for e in filtered if e not in older]
    previous_half = older

    # === Analysis ===
    tool_counts = Counter()
    error_patterns = Counter()
    project_counts = Counter()
    tool_errors = defaultdict(Counter)  # tool -> error patterns
    error_tools = defaultdict(set)  # error pattern -> tools affected
    error_projects = defaultdict(set)  # error pattern -> projects
    project_top_tool = defaultdict(Counter)
    project_top_error = defaultdict(Counter)

    # Previous period counts for trends
    prev_tool_counts = Counter()

    for e in filtered:
        tool = e.get("tool_name", "unknown")
        error = normalize_error(e.get("error", ""))
        project = get_project_name(e.get("project_path", ""))

        tool_counts[tool] += 1
        error_patterns[error] += 1
        project_counts[project] += 1
        tool_errors[tool][error] += 1
        error_tools[error].add(tool)
        error_projects[error].add(project)
        project_top_tool[project][tool] += 1
        project_top_error[project][error] += 1

    for e in previous_half:
        prev_tool_counts[e.get("tool_name", "unknown")] += 1

    total = len(filtered)

    # Build report
    report = {
        "status": "ok",
        "period_days": args.days,
        "total_failures": total,
        "total_all_time": len(entries),
        "projects_affected": len(project_counts),
        "trend": (
            "increasing"
            if len(current_half) > len(previous_half) * 1.2
            else "decreasing" if len(current_half) < len(previous_half) * 0.8 else "stable"
        ),
    }

    # By Tool
    if args.category in ("tool", "all"):
        by_tool = []
        for tool, count in tool_counts.most_common(args.top):
            most_common_error = tool_errors[tool].most_common(1)
            by_tool.append(
                {
                    "tool": tool,
                    "failures": count,
                    "pct": round(count / total * 100, 1),
                    "trend": trend_indicator(
                        sum(1 for e in current_half if e.get("tool_name") == tool),
                        sum(1 for e in previous_half if e.get("tool_name") == tool),
                    ),
                    "top_error": most_common_error[0][0] if most_common_error else "-",
                }
            )
        report["by_tool"] = by_tool

    # By Error Pattern
    if args.category in ("error", "all"):
        by_error = []
        for pattern, count in error_patterns.most_common(args.top):
            by_error.append(
                {
                    "pattern": pattern,
                    "count": count,
                    "tools": sorted(error_tools[pattern]),
                    "projects": sorted(error_projects[pattern]),
                }
            )
        report["by_error"] = by_error

    # By Project
    if args.category in ("project", "all"):
        by_project = []
        for project, count in project_counts.most_common(args.top):
            top_tool = project_top_tool[project].most_common(1)
            top_error = project_top_error[project].most_common(1)
            by_project.append(
                {
                    "project": project,
                    "failures": count,
                    "top_tool": top_tool[0][0] if top_tool else "-",
                    "top_error": top_error[0][0] if top_error else "-",
                }
            )
        report["by_project"] = by_project

    # Recurring patterns (3+ occurrences)
    recurring = []
    for pattern, count in error_patterns.most_common():
        if count < 3:
            break
        recurring.append(
            {
                "pattern": pattern,
                "count": count,
                "tools": sorted(error_tools[pattern]),
                "recommendation": _recommend_fix(pattern, error_tools[pattern]),
            }
        )
    report["recurring"] = recurring

    print(json.dumps(report, indent=2))


def _recommend_fix(pattern: str, tools: set) -> str:
    """Generate a recommendation based on the error pattern."""
    p = pattern.lower()

    if "path" in p and ("not found" in p or "no such" in p or "does not exist" in p):
        return "Verify paths exist before operations. Consider adding path validation to CLAUDE.md."
    if "permission" in p or "access" in p:
        return "Check file/directory permissions. May need elevated access."
    if "exit code 1" in p or "exit code" in p:
        return "Review Bash commands for common failure modes. Add error handling."
    if "timeout" in p:
        return "Increase timeout or break operation into smaller steps."
    if "encoding" in p or "codec" in p or "charmap" in p:
        return "Set PYTHONIOENCODING=utf-8 or use chcp 65001. Add encoding param to file operations."
    if "import" in p or "module" in p:
        return "Missing dependency. Add to requirements or install globally."
    if "unique" in p and "edit" in p.lower():
        return "Edit tool old_string not unique. Use more context lines for unique matches."
    if "syntax" in p:
        return "Fix syntax errors in generated code. Review before writing."

    return "Investigate root cause. Consider adding to CLAUDE.md if systemic."


if __name__ == "__main__":
    main()
