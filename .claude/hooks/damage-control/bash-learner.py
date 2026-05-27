# /// script
# requires-python = ">=3.8"
# ///
"""
Bash Failure Learner - PostToolUse Hook
========================================

Learns from failed bash commands by logging to .omni-cortex/bash_learnings.jsonl.
Detects recurring error patterns (3+ occurrences) and surfaces them as systemMessage.

Always exits 0 (never blocks). Silent on success, logs on failure.
"""

import json
import sys
import os
from datetime import datetime, timezone


MAX_LINES = 1000
RECURRENCE_THRESHOLD = 3


def get_learnings_path() -> str:
    """Get path to bash_learnings.jsonl in the project's .omni-cortex directory."""
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
    cortex_dir = os.path.join(project_dir, ".omni-cortex")
    return cortex_dir, os.path.join(cortex_dir, "bash_learnings.jsonl")


def normalize_error(error_text: str) -> str:
    """Extract a normalized error signature for pattern matching."""
    if not error_text:
        return ""
    # Take first meaningful line of stderr
    for line in error_text.strip().split("\n"):
        line = line.strip()
        if line and not line.startswith("+ "):  # Skip bash trace lines
            # Remove file-specific parts (paths, line numbers)
            normalized = line[:120]  # Cap length
            return normalized
    return error_text[:120]


def read_learnings(filepath: str) -> list:
    """Read existing learnings from JSONL file."""
    if not os.path.exists(filepath):
        return []
    lines = []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        lines.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
    except (IOError, OSError):
        return []
    return lines


def write_learnings(filepath: str, learnings: list) -> None:
    """Write learnings to JSONL file, truncating if over MAX_LINES."""
    if len(learnings) > MAX_LINES:
        learnings = learnings[-MAX_LINES:]  # Keep most recent
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            for entry in learnings:
                f.write(json.dumps(entry, ensure_ascii=True) + "\n")
    except (IOError, OSError):
        pass  # Silent failure - never disrupt the pipeline


def count_similar_errors(learnings: list, error_sig: str) -> int:
    """Count how many times a similar error has occurred."""
    if not error_sig:
        return 0
    count = 0
    # Use first 60 chars as the comparison key
    key = error_sig[:60].lower()
    for entry in learnings:
        existing = entry.get("error", "")[:60].lower()
        if key and existing and (key in existing or existing in key):
            count += 1
    return count


def main() -> None:
    try:
        input_data = json.load(sys.stdin)
    except (json.JSONDecodeError, Exception):
        print("{}")
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")

    # Only process Bash tool calls
    if tool_name != "Bash":
        print("{}")
        sys.exit(0)

    # Check for failure (non-zero exit code)
    tool_output = input_data.get("tool_output", {})

    # tool_output might be a string (the raw output) or a dict
    if isinstance(tool_output, str):
        # Can't determine exit code from string output, skip
        print("{}")
        sys.exit(0)

    exit_code = tool_output.get("exit_code")
    if exit_code is None:
        # Try alternate key names
        exit_code = tool_output.get("exitCode", tool_output.get("code"))

    if exit_code is None or exit_code == 0:
        print("{}")
        sys.exit(0)

    # Extract error info
    command = input_data.get("tool_input", {}).get("command", "")
    stderr = tool_output.get("stderr", "")
    stdout = tool_output.get("stdout", "")
    error_text = stderr or stdout  # Prefer stderr, fall back to stdout
    error_sig = normalize_error(error_text)

    # Get learnings file path
    cortex_dir, learnings_path = get_learnings_path()

    # Create .omni-cortex directory if needed
    try:
        os.makedirs(cortex_dir, exist_ok=True)
    except (IOError, OSError):
        print("{}")
        sys.exit(0)

    # Read existing learnings
    learnings = read_learnings(learnings_path)

    # Add new entry
    entry = {
        "command": command[:200],  # Cap command length
        "error": error_sig,
        "exit_code": exit_code,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "project": os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd()).replace("\\", "/"),
    }
    learnings.append(entry)

    # Write updated learnings
    write_learnings(learnings_path, learnings)

    # Check for recurring patterns
    similar_count = count_similar_errors(learnings, error_sig)

    if similar_count >= RECURRENCE_THRESHOLD:
        msg = (
            f"RECURRING BASH ERROR ({similar_count}x): {error_sig[:100]}. "
            f"Consider a different approach."
        )
        print(json.dumps({"systemMessage": msg}))
    else:
        print("{}")

    sys.exit(0)


if __name__ == "__main__":
    main()
