# /// script
# dependencies = []
# ///
"""
Incremental Report Builder — Generate task-radar reports with delta tracking.

Reads previous report, merges with new findings, calculates deltas,
and writes a new numbered report.

Usage:
    python report_builder.py --input items.json --project-path "D:/Workshop"
    python report_builder.py --input items.json --project-path "D:/Workshop" --global
"""

import argparse
import glob
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone


def find_latest_report(reports_dir: str, prefix: str = "rd-") -> str | None:
    """Find the latest report file by number."""
    pattern = os.path.join(reports_dir, f"{prefix}*.md")
    files = sorted(glob.glob(pattern))
    return files[-1] if files else None


def find_all_reports(reports_dir: str, prefix: str = "rd-") -> list[str]:
    """Find all report files sorted by number (ascending)."""
    pattern = os.path.join(reports_dir, f"{prefix}*.md")
    return sorted(glob.glob(pattern))


def parse_frontmatter(filepath: str) -> dict:
    """Parse YAML frontmatter from a report file into a dict."""
    result = {}
    if not filepath or not os.path.isfile(filepath):
        return result
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except (OSError, IOError):
        return result

    if not lines or lines[0].strip() != "---":
        return result

    for line in lines[1:]:
        if line.strip() == "---":
            break
        m = re.match(r"^(\w[\w_]*)\s*:\s*(.+)$", line.strip())
        if m:
            key = m.group(1)
            val = m.group(2).strip().strip('"').strip("'")
            # Try to parse as int
            try:
                val = int(val)
            except (ValueError, TypeError):
                # Try float
                try:
                    val = float(val)
                except (ValueError, TypeError):
                    pass
            result[key] = val

    result["_filename"] = os.path.basename(filepath)
    return result


def calculate_trend(reports_dir: str, prefix: str = "rd-", window: int = 5) -> dict | None:
    """Calculate trend data from the last N reports.

    Returns None if fewer than 3 reports exist. Otherwise returns a dict with:
    - reports: list of frontmatter dicts (newest first)
    - direction_total: (arrow, old, new, pct_change)
    - direction_q1: (arrow, old, new, pct_change)
    - velocity: avg resolved+completed per scan
    - health: "healthy" | "steady" | "falling-behind"
    """
    all_reports = find_all_reports(reports_dir, prefix)
    if len(all_reports) < 3:
        return None

    # Take last N reports (most recent last in file list)
    selected = all_reports[-window:]
    frontmatters = []
    for rpath in selected:
        fm = parse_frontmatter(rpath)
        if fm:
            frontmatters.append(fm)

    if len(frontmatters) < 3:
        return None

    # Oldest first in frontmatters (matching file sort order), reverse for display
    display_order = list(reversed(frontmatters))  # newest first for table

    oldest = frontmatters[0]
    newest = frontmatters[-1]

    # Direction: total items
    old_total = oldest.get("items_total", 0)
    new_total = newest.get("items_total", 0)
    if old_total > 0:
        pct_total = round((new_total - old_total) / old_total * 100)
    else:
        pct_total = 0
    arrow_total = "\u2193" if new_total < old_total else ("\u2191" if new_total > old_total else "\u2192")

    # Direction: Q1
    old_q1 = oldest.get("q1_count", 0)
    new_q1 = newest.get("q1_count", 0)
    if old_q1 > 0:
        pct_q1 = round((new_q1 - old_q1) / old_q1 * 100)
    else:
        pct_q1 = 0
    arrow_q1 = "\u2193" if new_q1 < old_q1 else ("\u2191" if new_q1 > old_q1 else "\u2192")

    # Velocity: avg resolved + completed per scan
    total_resolved = sum(fm.get("items_resolved", 0) for fm in frontmatters)
    total_completed = sum(fm.get("completed_this_session", 0) for fm in frontmatters)
    velocity = round((total_resolved + total_completed) / len(frontmatters), 1)

    # Health assessment
    q1_decreasing = new_q1 < old_q1
    q1_increasing = new_q1 > old_q1
    total_decreasing = new_total < old_total
    total_increasing = new_total > old_total

    if q1_decreasing and total_decreasing:
        health = "healthy"
        health_label = "Healthy -- clearing backlog"
    elif q1_increasing or total_increasing:
        health = "falling-behind"
        health_label = "Falling behind -- items accumulating faster than resolution"
    else:
        health = "steady"
        health_label = "Steady -- maintaining"

    return {
        "reports": display_order,
        "window": len(frontmatters),
        "direction_total": (arrow_total, old_total, new_total, pct_total),
        "direction_q1": (arrow_q1, old_q1, new_q1, pct_q1),
        "velocity": velocity,
        "health": health,
        "health_label": health_label,
    }


def extract_report_number(filepath: str) -> int:
    """Extract NNN from rd-NNN-date-slug.md or gtr-NNN-date-slug.md."""
    basename = os.path.basename(filepath)
    match = re.match(r"(?:rd|gtr)-(\d{3})-", basename)
    return int(match.group(1)) if match else 0


def next_available_number(reports_dir: str, prefix: str, start_num: int,
                          date_str: str, slug: str) -> tuple[int, str]:
    """Find the next available report number, skipping any that already exist on disk.

    This prevents naming collisions when parallel builds (e.g., ADW worktrees)
    both compute the same next_num from the same directory state.

    Returns (number, filepath) for the first NNN where no file exists.
    """
    num = start_num
    while True:
        filename = f"{prefix}{num:03d}-{date_str}-{slug}.md"
        filepath = os.path.join(reports_dir, filename).replace("\\", "/")
        if not os.path.exists(filepath):
            return num, filepath
        num += 1


def parse_previous_report(filepath: str) -> dict:
    """Parse a previous report to extract items for delta calculation."""
    items = {}
    if not filepath or not os.path.isfile(filepath):
        return items

    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except (OSError, IOError):
        return items

    # Parse table rows from Q1-Q4 sections
    # Format: | # | Item | Age | Type | Completion | Last Touched | Staleness | Source | Owner |
    # (also supports older format without Owner column)
    for match in re.finditer(
        r"\|\s*\d+\s*\|\s*(.+?)\s*\|\s*(\w+)\s*\|\s*(\d+)%\s*\|.*?\|\s*(\w+.*?)\s*\|\s*(.+?)\s*\|",
        content
    ):
        title = match.group(1).strip()
        item_type = match.group(2).strip()
        completion = int(match.group(3))
        staleness = match.group(4).strip()
        source = match.group(5).strip()

        item_id = f"{title}:{source}"
        items[item_id] = {
            "title": title,
            "type": item_type,
            "completion": completion,
            "staleness": staleness,
            "source": source,
        }

    # Also try to extract quadrant assignments
    current_quadrant = None
    for line in content.split("\n"):
        if "Q1:" in line or "Do Now" in line:
            current_quadrant = "Q1"
        elif "Q2:" in line or "Schedule" in line:
            current_quadrant = "Q2"
        elif "Q3:" in line or "Automate" in line:
            current_quadrant = "Q3"
        elif "Q4:" in line or "Review" in line:
            current_quadrant = "Q4"

        if current_quadrant:
            for item_id, item in items.items():
                if item["title"] in line:
                    item["quadrant"] = current_quadrant

    return items


def calculate_deltas(new_items: list, prev_items: dict) -> list:
    """Calculate changes between new and previous items."""
    deltas = []
    new_ids = set()

    for item in new_items:
        item_id = f"{item.get('title', '')}:{item.get('source', '')}"
        new_ids.add(item_id)

        if item_id in prev_items:
            prev = prev_items[item_id]
            # Check for quadrant change
            old_q = prev.get("quadrant", "")
            new_q = item.get("quadrant", "")
            if old_q and new_q and old_q != new_q:
                deltas.append(f"[MOVED] {item['title']}: {old_q} -> {new_q}")

            # Check for completion change
            old_c = prev.get("completion", 0)
            new_c = item.get("completion", 0)
            if new_c > old_c:
                deltas.append(f"[PROGRESS] {item['title']}: {old_c}% -> {new_c}%")
        else:
            deltas.append(f"[NEW] {item.get('title', 'Unknown')} (source: {item.get('source', 'N/A')})")

    # Check for resolved items
    for item_id, prev in prev_items.items():
        if item_id not in new_ids:
            deltas.append(f"[RESOLVED] {prev['title']}")

    return deltas




def resolve_owner(item: dict, project_path: str) -> str:
    """Determine item owner using spec frontmatter or git authorship.

    Priority:
    1. If item already has 'owner' field set, use it
    2. If item has a spec filepath, check frontmatter for owner: field
    3. Fall back to git log to find original author of the file
    4. Map known usernames: AllCytes/Tony -> Tony, behnker/Ralph -> Ralph
    """
    # 1. Already set on the item
    if item.get("owner"):
        return _map_owner_name(item["owner"])

    # 2. Try to find a spec file path from the item source
    source = item.get("source", "")
    filepath = item.get("filepath", "")
    spec_path = filepath or ""

    # Extract spec path from source if it looks like a file path
    if not spec_path and ("specs/" in source or source.endswith(".md")):
        spec_path = source.strip()

    # If we have a spec path, try reading frontmatter for owner
    if spec_path:
        full_path = spec_path
        if not os.path.isabs(spec_path):
            full_path = os.path.join(project_path, spec_path)
        if os.path.isfile(full_path):
            try:
                with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                    fc = f.read(2000)  # Only need frontmatter
                # Check for owner in YAML frontmatter
                if fc.startswith("---"):
                    fm_end = fc.find("---", 3)
                    if fm_end > 0:
                        fm_block = fc[3:fm_end]
                        owner_match = re.search(r"^owner\s*:\s*(.+)$", fm_block, re.MULTILINE)
                        if owner_match:
                            return _map_owner_name(owner_match.group(1).strip().strip('"').strip("'"))
            except (OSError, IOError):
                pass

            # 3. Fall back to git original author
            try:
                result = subprocess.run(
                    ["git", "log", "--diff-filter=A", "--format=%an", "--", full_path],
                    capture_output=True, text=True, timeout=5,
                    cwd=project_path
                )
                if result.returncode == 0 and result.stdout.strip():
                    author = result.stdout.strip().split("\n")[0]
                    return _map_owner_name(author)
            except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
                pass

    # Default: unknown
    return "\u2014"


def _map_owner_name(name: str) -> str:
    """Map git usernames and aliases to canonical owner names."""
    normalized = name.strip().lower()
    if normalized in ("allcytes", "tony", "medinacanthony"):
        return "Tony"
    if normalized in ("behnker", "ralph", "ralph behnke", "ralph.behnke"):
        return "Ralph"
    if normalized in ("cruz", "cruzbb88"):
        return "Cruz"
    # Return original name if no mapping found
    return name.strip() if name.strip() else "\u2014"


def generate_report(data: dict, prev_report: str | None, report_num: int) -> str:
    """Generate the markdown report content."""
    project_name = data.get("project_name", "Unknown")
    project_path = data.get("project_path", "").replace("\\", "/")
    layer = data.get("layer", "L1")
    items = data.get("items", [])
    is_global = data.get("is_global", False)
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # MST/MDT timestamp — UTC-6 during US DST (Mar-Nov), UTC-7 otherwise
    from datetime import timedelta
    utc_now = datetime.now(timezone.utc)
    # Simple DST check: Mar second Sunday to Nov first Sunday
    month = utc_now.month
    is_dst = 3 <= month <= 10  # approximate DST range
    offset_hours = -6 if is_dst else -7
    local_time = utc_now + timedelta(hours=offset_hours)
    tz_label = "MDT" if is_dst else "MST"
    # Use %#I on Windows, %-I on Unix for non-zero-padded hour
    try:
        generated_at = local_time.strftime(f"%#I:%M %p {tz_label}")
    except ValueError:
        generated_at = local_time.strftime(f"%-I:%M %p {tz_label}")
    generated_at_full = f"{date} {generated_at}"

    # Read item ledger for age tracking and defer counts
    ledger_path = os.path.join(project_path, "reports", "task-radar", ".item-ledger.yaml")
    ledger = _read_ledger(ledger_path)

    # Classify items into quadrants
    quadrants = {"Q1": [], "Q2": [], "Q3": [], "Q4": []}
    for item in items:
        q = item.get("quadrant", "Q4")
        if q in quadrants:
            quadrants[q].append(item)
        # Enrich item with age from ledger
        _enrich_item_age(item, ledger, date)
        # Resolve owner for each item
        if not item.get("owner"):
            item["owner"] = resolve_owner(item, project_path)

    # Sort within quadrants: defer-adjusted urgency desc, then age desc, then importance desc
    for q in quadrants:
        quadrants[q].sort(
            key=lambda x: (
                x.get("urgency", 0) - x.get("defer_penalty", 0),
                x.get("age_days", 0),
                x.get("importance", 0),
            ),
            reverse=True,
        )

    # Update ledger with current items
    _update_ledger(ledger, items, date, report_num)
    _write_ledger(ledger_path, ledger)

    total = len(items)
    # Parse previous for deltas
    prev_items = parse_previous_report(prev_report) if prev_report else {}
    deltas = calculate_deltas(items, prev_items)

    new_count = sum(1 for d in deltas if d.startswith("[NEW]"))
    resolved_count = sum(1 for d in deltas if d.startswith("[RESOLVED]"))
    moved_count = sum(1 for d in deltas if d.startswith("[MOVED]"))

    # Build report
    lines = []

    # YAML frontmatter
    lines.append("---")
    lines.append("type: task-radar")
    lines.append(f"layer: {layer}")
    lines.append(f'project: "{project_name}"')
    lines.append(f'directory: "{project_path}"')
    lines.append(f'date: "{date}"')
    lines.append(f'generated_at: "{generated_at_full}"')
    if prev_report:
        lines.append(f'previous_report: "{os.path.basename(prev_report)}"')
    lines.append(f"items_total: {total}")
    lines.append(f"items_new: {new_count}")
    lines.append(f"items_resolved: {resolved_count}")
    lines.append(f"items_reclassified: {moved_count}")
    lines.append(f"q1_count: {len(quadrants['Q1'])}")
    lines.append(f"q2_count: {len(quadrants['Q2'])}")
    lines.append(f"q3_count: {len(quadrants['Q3'])}")
    lines.append(f"q4_count: {len(quadrants['Q4'])}")
    lines.append(f"completed_this_session: {data.get('completed_this_session', 0)}")
    # Trend fields (only when trend data is available)
    if "_trend" in data and data["_trend"] is not None:
        trend = data["_trend"]
        lines.append(f'trend: "{trend["health"]}"')
        lines.append(f"trend_window: {trend['window']}")
        lines.append(f"velocity: {trend['velocity']}")
    lines.append("---")
    lines.append("")

    # Title
    if is_global:
        lines.append("# Task Radar — Global Sweep")
    else:
        lines.append(f"# Task Radar — {project_name}")
    lines.append("")
    lines.append(f"> Scanned: {date} | Layer: {layer} | Items: {total} ({new_count} new, {resolved_count} resolved)")
    lines.append("")

    # Cross-project summary for global reports
    if is_global and "project_summaries" in data:
        lines.append("## Cross-Project Summary")
        lines.append("")
        lines.append("| Project | Q1 | Q2 | Q3 | Q4 | Total | Avg Completion |")
        lines.append("|---------|----|----|----|----|-------|---------------|")
        for ps in data["project_summaries"]:
            lines.append(
                f"| {ps['name']} | {ps.get('q1', 0)} | {ps.get('q2', 0)} | "
                f"{ps.get('q3', 0)} | {ps.get('q4', 0)} | {ps.get('total', 0)} | "
                f"{ps.get('avg_completion', 0)}% |"
            )
        lines.append("")

    # Eisenhower Matrix
    lines.append("## Eisenhower Matrix")
    lines.append("")

    quadrant_labels = {
        "Q1": "Q1: Do Now (Important + Urgent)",
        "Q2": "Q2: Schedule (Important, Not Urgent)",
        "Q3": "Q3: Delegate/Automate (Not Important, Urgent)",
        "Q4": "Q4: Review/Prune (Not Important, Not Urgent)",
    }

    for q_key, q_label in quadrant_labels.items():
        q_items = quadrants[q_key]
        lines.append(f"### {q_label}")
        lines.append("")
        if q_items:
            lines.append("| # | Item | Age | Type | Completion | Last Touched | Staleness | Source | Owner |")
            lines.append("|---|------|-----|------|-----------|-------------|-----------|--------|-------|")
            for i, item in enumerate(q_items, 1):
                age_str = f"[{item.get('age_days', 0)}d]"
                defer_marker = f" (d{item.get('defer_count', 0)})" if item.get("defer_count", 0) > 0 else ""
                owner = item.get("owner", "—")
                lines.append(
                    f"| {i} | {item.get('title', 'N/A')}{defer_marker} | "
                    f"{age_str} | "
                    f"{item.get('type', 'N/A')} | "
                    f"{item.get('completion', 0)}% | "
                    f"{item.get('last_touched', 'N/A')} | "
                    f"{item.get('staleness_label', 'N/A')} | "
                    f"{item.get('source', 'N/A')} | "
                    f"{owner} |"
                )
        else:
            lines.append("*No items in this quadrant.*")
        lines.append("")


    # Ownership Summary -- right after Q4 table
    ownership_counts = {}  # owner -> {Q1: n, Q2: n, Q3: n, Q4: n}
    for q_key in ("Q1", "Q2", "Q3", "Q4"):
        for item in quadrants[q_key]:
            owner = item.get("owner", "—")
            if owner not in ownership_counts:
                ownership_counts[owner] = {"Q1": 0, "Q2": 0, "Q3": 0, "Q4": 0}
            ownership_counts[owner][q_key] += 1

    if ownership_counts:
        lines.append("## Ownership Summary")
        lines.append("")
        lines.append("| Owner | Q1 | Q2 | Q3 | Q4 | Total |")
        lines.append("|-------|----|----|----|----|-------|")
        for owner in sorted(ownership_counts.keys()):
            counts = ownership_counts[owner]
            owner_total = sum(counts.values())
            lines.append(
                f"| {owner} | {counts['Q1']} | {counts['Q2']} | "
                f"{counts['Q3']} | {counts['Q4']} | {owner_total} |"
            )
        lines.append("")

    # Surfaced from Conversations (if any)
    conv_items = [i for i in items if i.get("type") == "conversation-intent"]
    if conv_items:
        lines.append("## Surfaced from Conversations")
        lines.append("")
        lines.append("Items extracted from session transcripts that may have been forgotten:")
        lines.append("")
        lines.append("| # | Intent | Confidence | Source | Date |")
        lines.append("|---|--------|-----------|--------|------|")
        for i, item in enumerate(conv_items, 1):
            lines.append(
                f"| {i} | {item.get('title', 'N/A')} | "
                f"{item.get('intent_confidence', 0):.2f} | "
                f"{item.get('source', 'N/A')} | "
                f"{item.get('last_touched', 'N/A')} |"
            )
        lines.append("")

    # Overdue Skills (if any)
    overdue = [i for i in items if i.get("overdue_skills")]
    if overdue:
        lines.append("## Overdue Skills")
        lines.append("")
        for item in overdue:
            lines.append(f"**{item['title']}:**")
            for skill_info in item["overdue_skills"]:
                lines.append(f"  - {skill_info}")
            lines.append("")

    # Changes Since Last Report
    if deltas:
        lines.append("## Changes Since Last Report")
        lines.append("")
        for d in deltas:
            lines.append(f"- {d}")
        lines.append("")

    # Trend section (injected by caller if trend data exists)
    if "_trend" in data and data["_trend"] is not None:
        trend = data["_trend"]
        lines.append(f"## Trend (last {trend['window']} reports)")
        lines.append("")
        lines.append("| Report | Date | Total | Q1 | Q2 | Q3 | Q4 | Resolved | Completed |")
        lines.append("|--------|------|-------|----|----|----|----|----------|-----------|")
        for fm in trend["reports"]:
            lines.append(
                f"| {fm.get('_filename', 'N/A').replace('.md', '')} "
                f"| {fm.get('date', 'N/A')} "
                f"| {fm.get('items_total', 0)} "
                f"| {fm.get('q1_count', 0)} "
                f"| {fm.get('q2_count', 0)} "
                f"| {fm.get('q3_count', 0)} "
                f"| {fm.get('q4_count', 0)} "
                f"| {fm.get('items_resolved', 0)} "
                f"| {fm.get('completed_this_session', 0)} |"
            )
        lines.append("")

        arr_t, old_t, new_t, pct_t = trend["direction_total"]
        arr_q, old_q, new_q, pct_q = trend["direction_q1"]
        lines.append(f"**Direction:** Total items {arr_t} ({old_t} -> {new_t}, {pct_t:+d}%), Q1 {arr_q} ({old_q} -> {new_q}, {pct_q:+d}%)")
        lines.append(f"**Velocity:** Avg {trend['velocity']} items resolved per scan")
        lines.append(f"**Health:** {trend['health_label']}")
        lines.append("")
    elif "_trend" in data and data["_trend"] is None:
        lines.append("> Trend tracking available after 3+ reports.")
        lines.append("")

    # Deferred specs
    deferred = data.get("deferred_specs", [])
    if deferred:
        lines.append("## Paused (Deferred)")
        lines.append("")
        lines.append("| # | Spec | Last Modified | Notes |")
        lines.append("|---|------|-------------|-------|")
        for i, spec in enumerate(deferred, 1):
            lines.append(
                f"| {i} | {spec.get('path', 'N/A')} | "
                f"{spec.get('last_modified', 'N/A')} | "
                f"Intentionally shelved |"
            )
        lines.append("")

    return "\n".join(lines)


def _read_ledger(path: str) -> dict:
    """Read item ledger YAML. Returns dict of canonical_title -> entry."""
    if not os.path.isfile(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except (OSError, IOError):
        return {}
    # Simple YAML parsing for flat item entries
    ledger = {}
    current = None
    for line in content.split("\n"):
        if line.startswith("  - title:"):
            current = {"title": line.split(":", 1)[1].strip().strip('"')}
        elif current and line.strip().startswith("canonical:"):
            current["canonical"] = line.split(":", 1)[1].strip().strip('"')
        elif current and line.strip().startswith("first_seen_date:"):
            current["first_seen_date"] = line.split(":", 1)[1].strip().strip('"')
        elif current and line.strip().startswith("first_seen_report:"):
            current["first_seen_report"] = line.split(":", 1)[1].strip().strip('"')
        elif current and line.strip().startswith("defer_count:"):
            current["defer_count"] = int(line.split(":", 1)[1].strip())
        elif current and line.strip().startswith("last_deferred_date:"):
            current["last_deferred_date"] = line.split(":", 1)[1].strip().strip('"')
        elif current and line.strip().startswith("reports_seen_count:"):
            current["reports_seen_count"] = int(line.split(":", 1)[1].strip())
        elif current and line.strip().startswith("current_quadrant:"):
            current["current_quadrant"] = line.split(":", 1)[1].strip().strip('"')
        elif current and line.strip().startswith("last_seen_date:"):
            current["last_seen_date"] = line.split(":", 1)[1].strip().strip('"')
            # Entry complete
            key = current.get("canonical", current["title"].lower())
            ledger[key] = current
            current = None
    if current:
        key = current.get("canonical", current.get("title", "unknown").lower())
        ledger[key] = current
    return ledger


def _write_ledger(path: str, ledger: dict) -> None:
    """Write item ledger as YAML."""
    lines = ["# Task Radar Item Ledger", "# Auto-maintained by report_builder.py",
             f'# Updated: {datetime.now(timezone.utc).strftime("%Y-%m-%d")}',
             'version: "1.0"', "", "items:"]
    for _key, entry in sorted(ledger.items()):
        lines.append(f'  - title: "{entry.get("title", "")}"')
        lines.append(f'    canonical: "{entry.get("canonical", "")}"')
        lines.append(f'    first_seen_date: "{entry.get("first_seen_date", "")}"')
        lines.append(f'    first_seen_report: "{entry.get("first_seen_report", "")}"')
        lines.append(f'    defer_count: {entry.get("defer_count", 0)}')
        lines.append(f'    last_deferred_date: "{entry.get("last_deferred_date", "")}"')
        lines.append(f'    reports_seen_count: {entry.get("reports_seen_count", 0)}')
        lines.append(f'    current_quadrant: "{entry.get("current_quadrant", "")}"')
        lines.append(f'    last_seen_date: "{entry.get("last_seen_date", "")}"')
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
    except (OSError, IOError):
        pass


def _fuzzy_match(a: str, b: str) -> float:
    """Simple ratio of matching chars for fuzzy title comparison."""
    from difflib import SequenceMatcher
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _enrich_item_age(item: dict, ledger: dict, today: str) -> None:
    """Add age_days and defer info to item from ledger."""
    title = item.get("title", "")
    canonical = title.lower()
    # Try exact match first, then fuzzy
    entry = ledger.get(canonical)
    if not entry:
        for key, e in ledger.items():
            if _fuzzy_match(canonical, key) > 0.8:
                entry = e
                break
    if entry and entry.get("first_seen_date"):
        try:
            first = datetime.strptime(entry["first_seen_date"], "%Y-%m-%d")
            now = datetime.strptime(today, "%Y-%m-%d")
            item["age_days"] = (now - first).days
        except (ValueError, TypeError):
            item["age_days"] = 0
        item["defer_count"] = entry.get("defer_count", 0)
        # Calculate defer penalty
        dc = item["defer_count"]
        if dc >= 3:
            item["defer_penalty"] = 50
        elif dc == 2:
            item["defer_penalty"] = 35
        elif dc == 1:
            item["defer_penalty"] = 20
        else:
            item["defer_penalty"] = 0
    else:
        item["age_days"] = 0
        item["defer_count"] = 0
        item["defer_penalty"] = 0


def _update_ledger(ledger: dict, items: list, today: str, report_num: int) -> None:
    """Update ledger with current report items."""
    report_name = f"rd-{report_num:03d}"
    for item in items:
        title = item.get("title", "")
        canonical = title.lower()
        # Find existing entry
        entry = ledger.get(canonical)
        if not entry:
            for key, e in ledger.items():
                if _fuzzy_match(canonical, key) > 0.8:
                    entry = e
                    canonical = key  # Use existing key
                    break
        if entry:
            entry["reports_seen_count"] = entry.get("reports_seen_count", 0) + 1
            entry["last_seen_date"] = today
            entry["current_quadrant"] = item.get("quadrant", "")
        else:
            ledger[canonical] = {
                "title": title,
                "canonical": canonical,
                "first_seen_date": today,
                "first_seen_report": report_name,
                "defer_count": 0,
                "last_deferred_date": "",
                "reports_seen_count": 1,
                "current_quadrant": item.get("quadrant", ""),
                "last_seen_date": today,
            }


def main():
    parser = argparse.ArgumentParser(description="Build task-radar report")
    parser.add_argument("--input", required=True, help="JSON input file with items")
    parser.add_argument("--project-path", required=True, help="Project root directory")
    parser.add_argument("--global-report", action="store_true", help="Generate global cross-project report")
    args = parser.parse_args()

    # Read input data
    try:
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(json.dumps({"error": str(e), "report_path": None}))
        sys.exit(1)

    project_path = args.project_path.replace("\\", "/")
    reports_dir = os.path.join(project_path, "reports", "task-radar")

    # Determine prefix and find previous report
    prefix = "gtr-" if args.global_report else "rd-"
    data["is_global"] = args.global_report

    # Ensure reports directory exists
    os.makedirs(reports_dir, exist_ok=True)

    # Find previous report
    prev_report = find_latest_report(reports_dir, prefix)

    # Determine next report number
    if prev_report:
        next_num = extract_report_number(prev_report) + 1
    else:
        next_num = 1

    # Calculate trend data (requires 3+ existing reports)
    trend_data = calculate_trend(reports_dir, prefix)
    data["_trend"] = trend_data

    # Generate report
    report_content = generate_report(data, prev_report, next_num)

    # Build filename
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    project_slug = data.get("project_name", "unknown").lower().replace(" ", "-")
    if args.global_report:
        project_slug = "global"

    next_num, report_path = next_available_number(
        reports_dir, prefix, next_num, date_str, project_slug
    )

    # Write report
    try:
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report_content)
    except (OSError, IOError) as e:
        print(json.dumps({"error": str(e), "report_path": None}))
        sys.exit(1)

    # Update last-run.json
    items = data.get("items", [])
    quadrant_counts = {"Q1": 0, "Q2": 0, "Q3": 0, "Q4": 0}
    for item in items:
        q = item.get("quadrant", "Q4")
        if q in quadrant_counts:
            quadrant_counts[q] += 1

    cache_dir = os.path.expanduser("~/.claude/skills/task-radar/cache")
    os.makedirs(cache_dir, exist_ok=True)
    last_run = {
        "last_run": datetime.now(timezone.utc).isoformat(),
        "last_report": report_path,
        "layer": data.get("layer", "L1"),
        "project_path": project_path,
        "items_count": len(items),
        "q1_count": quadrant_counts["Q1"],
        "q2_count": quadrant_counts["Q2"],
        "q3_count": quadrant_counts["Q3"],
        "q4_count": quadrant_counts["Q4"],
    }

    if args.global_report:
        last_run["global_selections"] = data.get("global_selections", [])

    try:
        with open(os.path.join(cache_dir, "last-run.json"), "w", encoding="utf-8") as f:
            json.dump(last_run, f, indent=2)
    except (OSError, IOError):
        pass  # Non-fatal

    # Output result
    result = {
        "report_path": report_path,
        "report_number": next_num,
        "items_total": len(items),
        "q1": quadrant_counts["Q1"],
        "q2": quadrant_counts["Q2"],
        "q3": quadrant_counts["Q3"],
        "q4": quadrant_counts["Q4"],
        "deltas": {
            "new": sum(1 for d in calculate_deltas(items, parse_previous_report(prev_report)) if d.startswith("[NEW]")),
            "resolved": sum(1 for d in calculate_deltas(items, parse_previous_report(prev_report)) if d.startswith("[RESOLVED]")),
            "moved": sum(1 for d in calculate_deltas(items, parse_previous_report(prev_report)) if d.startswith("[MOVED]")),
        },
        "error": None,
    }

    json.dump(result, sys.stdout, indent=2)


if __name__ == "__main__":
    main()
