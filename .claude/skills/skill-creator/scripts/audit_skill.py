#!/usr/bin/env python3
"""Audit a skill's weight and ADW compatibility, producing a diet report.

Usage:
    python audit_skill.py <skill-name>
    python audit_skill.py <skill-name> --json
    python audit_skill.py /path/to/SKILL.md --json

Searches paths in priority order:
    1. {cwd}/.claude/skills/{name}/SKILL.md
    2. ~/.claude/skills/{name}/SKILL.md
    3. ~/.claude/commands/{name}.md
    4. {cwd}/.claude/commands/{name}.md
"""

import argparse
import json
import re
import sys
from pathlib import Path

# Fix Windows cp1252 encoding for emoji characters in print statements
if sys.stdout.encoding and sys.stdout.encoding.lower().startswith('cp'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


def find_skill(name: str) -> tuple:
    """Find a skill or command by name. Returns (path, type)."""
    # If name looks like a path, use it directly
    candidate = Path(name)
    if candidate.is_file():
        if candidate.parent.name in ("skills", "commands"):
            return candidate, "direct-command"
        return candidate, "direct-skill"

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


def get_body(content: str) -> str:
    """Extract body after YAML frontmatter."""
    match = re.match(r"^---\s*\n.*?\n---\s*\n?", content, re.DOTALL)
    if match:
        return content[match.end():]
    return content


def count_tokens(text: str) -> int:
    """Estimate token count: words * 1.3."""
    words = len(text.split())
    return int(words * 1.3)


def count_steps(body: str) -> int:
    """Count procedural steps: numbered lines + ### headers."""
    numbered = len(re.findall(r"^\d+\.\s", body, re.MULTILINE))
    headers = len(re.findall(r"^###\s", body, re.MULTILINE))
    return numbered + headers


def count_agent_mentions(body: str) -> int:
    """Count agent/spawn patterns (imperative, not descriptive)."""
    patterns = [
        r"Agent\s+tool",
        r"sub-agent",
        r"subagent",
        r"\bspawn\b",
        r"parallel\s.*agent",
        r"Agent\(",
        r"launch\s.*agent",
        r"use\s+the\s+agent",
    ]
    combined = "|".join(patterns)
    return len(re.findall(combined, body, re.IGNORECASE))


def count_interactive_prompts(body: str) -> int:
    """Count interactive prompt patterns."""
    patterns = [
        r"AskUser",
        r"\bconfirm\b.*\buser\b",
        r"\bprompt\b.*\buser\b",
        r"ask\s+the\s+user",
        r"AskUserQuestion",
    ]
    combined = "|".join(patterns)
    return len(re.findall(combined, body, re.IGNORECASE))


def has_quick_mode(body: str) -> bool:
    """Check for quick/L1 mode support."""
    patterns = [
        r"\bquick\b.*\bmode\b",
        r"\bL1\b",
        r"--mode\s+quick",
        r"mode\s*=\s*['\"]?quick",
    ]
    combined = "|".join(patterns)
    return bool(re.search(combined, body, re.IGNORECASE))


def has_adw_mode(body: str) -> bool:
    """Check for ADW mode support."""
    patterns = [
        r"ADW_MODE",
        r"adw_mode",
        r"adw\s*[\-_]?\s*mode",
    ]
    combined = "|".join(patterns)
    return bool(re.search(combined, body, re.IGNORECASE))


def count_references(skill_path: Path, skill_type: str) -> int:
    """Count files in references/ and scripts/ subdirectories."""
    if skill_type.endswith("-command"):
        return 0  # commands are single files, no subdirectories
    skill_dir = skill_path.parent
    count = 0
    for subdir in ("references", "scripts"):
        d = skill_dir / subdir
        if d.is_dir():
            count += sum(1 for f in d.iterdir() if f.is_file() and not f.name.startswith("__"))
    return count


def grade(value: int, threshold: int) -> str:
    """Return OK or HEAVY based on threshold."""
    return "HEAVY" if value > threshold else "OK"


def calculate_adw_score(
    quick_mode: bool,
    agent_mentions: int,
    step_count: int,
    token_estimate: int,
    interactive_prompts: int,
) -> tuple:
    """Calculate ADW compatibility score (0-100) with breakdown."""
    breakdown = {
        "quick_mode": 30 if quick_mode else 0,
        "no_mandatory_agents": 20 if agent_mentions <= 1 else 0,
        "low_tool_baseline": 20 if step_count <= 8 else 0,
        "low_token_cost": 15 if token_estimate < 2000 else 0,
        "no_interactive": 15 if interactive_prompts == 0 else 0,
    }
    return sum(breakdown.values()), breakdown


def audit(name: str) -> dict:
    """Run diet audit on a skill/command."""
    path, skill_type = find_skill(name)

    if not path:
        return {
            "skill_name": name,
            "skill_path": None,
            "error": f"Skill '{name}' not found in any search path",
        }

    content = path.read_text(encoding="utf-8")
    body = get_body(content)

    token_est = count_tokens(body)
    steps = count_steps(body)
    agents = count_agent_mentions(body)
    interactive = count_interactive_prompts(body)
    quick = has_quick_mode(body)
    adw = has_adw_mode(body)
    refs = count_references(path, skill_type)

    adw_score, adw_breakdown = calculate_adw_score(
        quick, agents, steps, token_est, interactive
    )

    return {
        "skill_name": name,
        "skill_path": str(path),
        "skill_type": skill_type,
        "token_estimate": token_est,
        "token_grade": grade(token_est, 3000),
        "step_count": steps,
        "step_grade": grade(steps, 10),
        "agent_mentions": agents,
        "agent_grade": grade(agents, 2),
        "reference_count": refs,
        "reference_grade": grade(refs, 5),
        "has_quick_mode": quick,
        "has_adw_mode": adw,
        "interactive_prompts": interactive,
        "adw_score": adw_score,
        "adw_score_breakdown": adw_breakdown,
    }


def format_table(result: dict) -> str:
    """Format audit result as a human-readable table."""
    if "error" in result:
        return f"ERROR: {result['error']}"

    lines = [
        f"Diet Audit: /{result['skill_name']}",
        f"Path: {result['skill_path']}",
        f"Type: {result['skill_type']}",
        "",
        "Metric              | Value     | Grade",
        "--------------------|-----------|------",
        f"Token estimate       | {result['token_estimate']:>9} | {result['token_grade']}",
        f"Step count           | {result['step_count']:>9} | {result['step_grade']}",
        f"Agent mentions       | {result['agent_mentions']:>9} | {result['agent_grade']}",
        f"Reference files      | {result['reference_count']:>9} | {result['reference_grade']}",
        f"Interactive prompts  | {result['interactive_prompts']:>9} |",
        f"Has quick mode       | {'Yes':>9} |" if result['has_quick_mode'] else f"Has quick mode       | {'No':>9} |",
        f"Has ADW mode         | {'Yes':>9} |" if result['has_adw_mode'] else f"Has ADW mode         | {'No':>9} |",
        "",
        f"ADW Compatibility Score: {result['adw_score']}/100",
        "",
        "ADW Score Breakdown:",
    ]

    bd = result["adw_score_breakdown"]
    lines.append(f"  Quick mode bonus:      {bd['quick_mode']:>3}/30")
    lines.append(f"  No mandatory agents:   {bd['no_mandatory_agents']:>3}/20")
    lines.append(f"  Low tool baseline:     {bd['low_tool_baseline']:>3}/20")
    lines.append(f"  Low token cost:        {bd['low_token_cost']:>3}/15")
    lines.append(f"  No interactive:        {bd['no_interactive']:>3}/15")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Audit a skill's weight and ADW compatibility")
    parser.add_argument("name", help="Skill or command name (e.g., security, commit)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    result = audit(args.name)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(format_table(result))

    # Exit 1 if skill not found
    if "error" in result:
        sys.exit(1)


if __name__ == "__main__":
    main()
