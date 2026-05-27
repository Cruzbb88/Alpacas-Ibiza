#!/usr/bin/env python3
"""Analyze an existing skill or command and produce a gap report.

Usage:
    python analyze_skill.py <skill-name>
    python analyze_skill.py adw-analyze
    python analyze_skill.py --json adw-analyze   # JSON output

Searches 4 paths in priority order:
    1. {cwd}/.claude/skills/{name}/SKILL.md
    2. ~/.claude/skills/{name}/SKILL.md
    3. ~/.claude/commands/{name}.md
    4. {cwd}/.claude/commands/{name}.md
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

# Fix Windows cp1252 encoding for emoji characters in print statements
if sys.stdout.encoding and sys.stdout.encoding.lower().startswith('cp'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


def find_skill(name: str) -> tuple[Path | None, str]:
    """Find a skill or command by name. Returns (path, type)."""
    cwd = Path.cwd()
    home = Path.home()

    search_paths = [
        (cwd / ".claude" / "skills" / name / "SKILL.md", "project-skill"),
        (cwd / ".claude" / "skills" / name / "skill.md", "project-skill"),
        (home / ".claude" / "skills" / name / "SKILL.md", "global-skill"),
        (home / ".claude" / "skills" / name / "skill.md", "global-skill"),
        (home / ".claude" / "commands" / f"{name}.md", "global-command"),
        (cwd / ".claude" / "commands" / f"{name}.md", "project-command"),
    ]

    for path, skill_type in search_paths:
        if path.exists():
            return path, skill_type
    return None, "not-found"


def parse_frontmatter(content: str) -> dict:
    """Extract YAML frontmatter from markdown."""
    match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return {}
    fm = {}
    for line in match.group(1).split("\n"):
        if ":" in line:
            key, _, value = line.partition(":")
            fm[key.strip()] = value.strip().strip('"').strip("'")
    return fm


def analyze(name: str) -> dict:
    """Run gap analysis on a skill/command."""
    path, skill_type = find_skill(name)

    result = {
        "name": name,
        "path": str(path) if path else None,
        "type": skill_type,
        "score": 100,
        "gaps": [],
        "has": [],
    }

    if not path:
        result["score"] = 0
        result["gaps"].append({"category": "existence", "message": f"Skill '{name}' not found in any search path", "deduction": 100})
        return result

    content = path.read_text(encoding="utf-8")
    fm = parse_frontmatter(content)
    skill_dir = path.parent if skill_type.endswith("-skill") else None

    # 1. Frontmatter checks
    if not fm.get("name"):
        result["gaps"].append({"category": "frontmatter", "priority": "HIGH", "message": "Missing 'name' field", "deduction": 15})
        result["score"] -= 15
    else:
        result["has"].append("name field")

    desc = fm.get("description", "")
    if not desc:
        result["gaps"].append({"category": "frontmatter", "priority": "HIGH", "message": "Missing 'description' field", "deduction": 15})
        result["score"] -= 15
    elif "use when" not in desc.lower():
        result["gaps"].append({"category": "triggers", "priority": "MEDIUM", "message": "Description missing 'Use when:' triggers", "deduction": 5})
        result["score"] -= 5
    else:
        result["has"].append("description with triggers")

    if not fm.get("argument-hint"):
        result["gaps"].append({"category": "frontmatter", "priority": "HIGH", "message": "Missing 'argument-hint' field", "deduction": 15})
        result["score"] -= 15
    else:
        result["has"].append("argument-hint")

    # 2. Layered architecture
    has_layers = bool(re.search(r"\bL[1-4]\b", content))
    if not has_layers:
        result["gaps"].append({"category": "layers", "priority": "HIGH", "message": "No layered architecture (L1-L4) defined", "deduction": 25})
        result["score"] -= 25
    else:
        layer_count = len(set(re.findall(r"\b(L[1-4])\b", content)))
        result["has"].append(f"layered architecture ({layer_count} layers)")

    # 3. Modes
    has_modes = bool(re.search(r"\b(quick|default|deep)\b.*mode", content, re.IGNORECASE))
    mode_matrix = bool(re.search(r"\|\s*Mode\s*\|", content))
    if not has_modes:
        result["gaps"].append({"category": "modes", "priority": "HIGH", "message": "No modes (quick/default/deep) defined", "deduction": 20})
        result["score"] -= 20
    else:
        result["has"].append("modes defined")
    if not mode_matrix and has_modes:
        result["gaps"].append({"category": "modes", "priority": "MEDIUM", "message": "No mode matrix table", "deduction": 5})
        result["score"] -= 5

    # 4. Scoring
    has_scoring = bool(re.search(r"composite|scoring|weight", content, re.IGNORECASE))
    if not has_scoring and has_layers:
        result["gaps"].append({"category": "scoring", "priority": "MEDIUM", "message": "No composite scoring formula", "deduction": 10})
        result["score"] -= 10
    elif has_scoring:
        result["has"].append("composite scoring")

    # 5. Reports
    has_reports = bool(re.search(r"reports?/|NNN|numbered report", content, re.IGNORECASE))
    if not has_reports:
        result["gaps"].append({"category": "reports", "priority": "MEDIUM", "message": "No numbered report convention", "deduction": 15})
        result["score"] -= 15
    else:
        result["has"].append("numbered reports")

    # 6. References directory
    if skill_dir:
        refs_dir = skill_dir / "references"
        if refs_dir.is_dir() and any(refs_dir.iterdir()):
            result["has"].append(f"references/ ({len(list(refs_dir.glob('*.md')))} files)")
        else:
            result["gaps"].append({"category": "references", "priority": "MEDIUM", "message": "No references/ directory or empty", "deduction": 10})
            result["score"] -= 10
    elif skill_type.endswith("-command"):
        result["gaps"].append({"category": "structure", "priority": "HIGH", "message": "Command file — no skill directory structure (no references/, scripts/)", "deduction": 10})
        result["score"] -= 10

    # 7. Scripts directory
    if skill_dir:
        scripts_dir = skill_dir / "scripts"
        if scripts_dir.is_dir() and any(scripts_dir.iterdir()):
            result["has"].append(f"scripts/ ({len(list(scripts_dir.glob('*.py')))} Python files)")
        else:
            result["gaps"].append({"category": "scripts", "priority": "LOW", "message": "No scripts/ directory or empty", "deduction": 5})
            result["score"] -= 5

    # Floor at 0
    result["score"] = max(0, result["score"])

    # Assessment
    if result["score"] >= 90:
        result["assessment"] = "Excellent — minimal gaps"
    elif result["score"] >= 70:
        result["assessment"] = "Good — some enhancements needed"
    elif result["score"] >= 50:
        result["assessment"] = "Fair — significant gaps, enhancement recommended"
    else:
        result["assessment"] = "Poor — major restructuring needed"

    # Recommendation
    if skill_type.endswith("-command"):
        result["recommendation"] = "Convert command -> skill with full layered architecture"
    elif result["score"] < 70:
        result["recommendation"] = "Add missing layers, modes, and scoring"
    else:
        result["recommendation"] = "Minor enhancements only"

    return result


def format_markdown(result: dict) -> str:
    """Format analysis result as markdown."""
    lines = [
        f"## Gap Analysis: /{result['name']}",
        f"**Location:** `{result['path']}`",
        f"**Type:** {result['type']}",
        f"**Score:** {result['score']}/100 — {result['assessment']}",
        "",
    ]

    if result["has"]:
        lines.append("### Present")
        for item in result["has"]:
            lines.append(f"  [OK] {item}")
        lines.append("")

    if result["gaps"]:
        lines.append("### Gaps Found")
        for gap in result["gaps"]:
            lines.append(f"  [-{gap['deduction']}] [{gap['priority']}] {gap['message']}")
        lines.append("")

    if result.get("recommendation"):
        lines.append(f"**Recommendation:** {result['recommendation']}")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Analyze a skill/command for gaps")
    parser.add_argument("name", help="Skill or command name (e.g., adw-analyze)")
    parser.add_argument("--json", action="store_true", help="Output as JSON instead of markdown")
    args = parser.parse_args()

    result = analyze(args.name)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(format_markdown(result))

    # Exit code: 0 if score >= 70, 1 if below
    sys.exit(0 if result["score"] >= 70 else 1)


if __name__ == "__main__":
    main()
