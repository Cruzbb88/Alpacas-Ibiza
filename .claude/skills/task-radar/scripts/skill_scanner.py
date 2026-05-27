# /// script
# dependencies = []
# ///
"""
Global Skill Scanner — Discover skills and commands across all project directories.

Searches ~/.claude/skills/, ~/.claude/commands/, and project-local skill directories
to build a comprehensive inventory. Outputs JSON for the cached skill-map.json.

Usage:
    python skill_scanner.py
    python skill_scanner.py --extra-paths "D:/Projects/custom"
"""

import argparse
import glob
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


SEARCH_PATHS = [
    os.path.expanduser("~/.claude/skills"),
    os.path.expanduser("~/.claude/commands"),
    "D:/Projects/*/skills",
    "D:/Projects/*/.claude/skills",
    "D:/Projects/*/.claude/commands",
    "D:/Workshop/skills",
    "D:/Workshop/.claude/skills",
]


def extract_skill_info(path: str) -> dict | None:
    """Extract skill name and description from a SKILL.md or command .md file."""
    path = path.replace("\\", "/")
    name = None
    description = None

    # Determine if this is a skill directory or a command file
    if os.path.isdir(path):
        skill_md = os.path.join(path, "SKILL.md")
        if not os.path.isfile(skill_md):
            return None
        target = skill_md
        name = "/" + os.path.basename(path)
    elif path.endswith(".md") and os.path.isfile(path):
        target = path
        basename = os.path.basename(path)
        name = "/" + basename.replace(".md", "")
    else:
        return None

    # Parse frontmatter
    try:
        with open(target, "r", encoding="utf-8", errors="replace") as f:
            content = f.read(2000)  # first 2KB is enough for frontmatter

        # Extract YAML frontmatter
        if content.startswith("---"):
            end = content.find("---", 3)
            if end != -1:
                frontmatter = content[3:end]
                # Extract name
                name_match = re.search(r"^name:\s*(.+)$", frontmatter, re.MULTILINE)
                if name_match:
                    n = name_match.group(1).strip().strip('"').strip("'")
                    name = "/" + n

                # Extract description
                desc_match = re.search(
                    r"^description:\s*>?\s*\n?([\s\S]*?)(?=\n\w|\nallowed|\nargument|\nmodel|\n---)",
                    frontmatter, re.MULTILINE
                )
                if desc_match:
                    description = " ".join(
                        desc_match.group(1).strip().split()
                    )[:200]
                else:
                    # Single-line description
                    desc_match = re.search(
                        r"^description:\s*(.+)$", frontmatter, re.MULTILINE
                    )
                    if desc_match:
                        description = desc_match.group(1).strip().strip('"').strip("'")[:200]

    except (OSError, IOError):
        return None

    if not name:
        return None

    # Get last modified time
    try:
        mtime = os.path.getmtime(target)
        last_modified = datetime.fromtimestamp(mtime, tz=timezone.utc).strftime("%Y-%m-%d")
    except OSError:
        last_modified = "unknown"

    return {
        "name": name,
        "location": path.replace("\\", "/"),
        "description": description or "",
        "last_modified": last_modified,
    }


def scan_directory(base_path: str) -> list:
    """Scan a directory for skills and commands."""
    results = []
    base_path = base_path.replace("\\", "/")

    # Handle glob patterns
    if "*" in base_path:
        expanded = glob.glob(base_path)
        for p in expanded:
            results.extend(scan_directory(p))
        return results

    if not os.path.isdir(base_path):
        return results

    # Check if this IS a skill directory (has SKILL.md)
    if os.path.isfile(os.path.join(base_path, "SKILL.md")):
        info = extract_skill_info(base_path)
        if info:
            results.append(info)
        return results

    # Scan children
    try:
        for entry in os.listdir(base_path):
            full = os.path.join(base_path, entry)
            if os.path.isdir(full):
                # Could be a skill directory
                info = extract_skill_info(full)
                if info:
                    results.append(info)
            elif entry.endswith(".md") and os.path.isfile(full):
                # Could be a command file
                # Skip non-command files
                if entry.startswith("ROADMAP") or entry.startswith("REPORT") or entry.startswith("SKILLS"):
                    continue
                info = extract_skill_info(full)
                if info:
                    results.append(info)
    except (OSError, PermissionError):
        pass

    return results


def compute_hash(inventory: list) -> str:
    """Compute a hash of all skill locations + dates for change detection."""
    data = "|".join(
        f"{s['name']}:{s['location']}:{s['last_modified']}"
        for s in sorted(inventory, key=lambda x: x["name"])
    )
    return hashlib.sha256(data.encode()).hexdigest()[:16]


def main():
    parser = argparse.ArgumentParser(description="Scan for skills and commands")
    parser.add_argument(
        "--extra-paths", nargs="*", default=[],
        help="Additional directories to scan"
    )
    args = parser.parse_args()

    all_paths = SEARCH_PATHS + args.extra_paths

    # Scan all paths
    inventory = []
    seen_names = set()

    for path in all_paths:
        for skill in scan_directory(path):
            # Deduplicate by name (keep first found — global takes precedence)
            if skill["name"] not in seen_names:
                seen_names.add(skill["name"])
                inventory.append(skill)

    # Sort by name
    inventory.sort(key=lambda x: x["name"])

    result = {
        "skills_hash": compute_hash(inventory),
        "scan_timestamp": datetime.now(timezone.utc).isoformat(),
        "total_found": len(inventory),
        "inventory": inventory,
    }

    json.dump(result, sys.stdout, indent=2)


if __name__ == "__main__":
    main()
