# /// script
# requires-python = ">=3.8"
# ///
"""
Bash Quality Verifier - PreToolUse Hook
========================================

Provides systemMessage guidance for common bash mistakes on Windows.
Never blocks execution (always exits 0). Returns suggestions only.

Rules checked:
  1. Unquoted Windows backslash paths
  2. PowerShell commands used in bash
  3. pkill/killall on Windows
  4. Non-ASCII characters (cp1252 encoding failures)
"""

import json
import sys
import re


def check_command(command: str) -> list:
    """Check a bash command for common issues. Returns list of warnings."""
    warnings = []

    # Rule 1: Unquoted Windows backslash paths
    # Match C:\path or D:\path NOT inside quotes
    # Strategy: find all backslash paths, then check if they're quoted
    backslash_paths = re.findall(r'[A-Z]:\\[^\s"\']+', command)
    if backslash_paths:
        # Check if the path appears inside quotes in the original command
        for path in backslash_paths:
            escaped = re.escape(path)
            # Check if path is inside single or double quotes
            in_quotes = (
                re.search(rf'"[^"]*{escaped}[^"]*"', command) or
                re.search(rf"'[^']*{escaped}[^']*'", command)
            )
            if not in_quotes:
                warnings.append(
                    f"Use forward slashes: '{path}' -> "
                    f"'{path.replace(chr(92), '/')}'"
                )
                break  # One warning per category is enough

    # Rule 2: PowerShell commands in bash
    ps_commands = {
        'Get-Content': 'cat',
        'Select-String': 'grep',
        'Test-Path': 'test -f',
        'Remove-Item': 'rm',
        'Set-Location': 'cd',
        'Get-ChildItem': 'ls',
        'Copy-Item': 'cp',
        'Move-Item': 'mv',
        'Write-Output': 'echo',
        'Invoke-WebRequest': 'curl',
    }
    for ps_cmd, posix_cmd in ps_commands.items():
        if re.search(rf'\b{re.escape(ps_cmd)}\b', command, re.IGNORECASE):
            warnings.append(
                f"PowerShell detected: use '{posix_cmd}' instead of '{ps_cmd}'"
            )
            break  # One warning per category

    # Rule 3: pkill/killall on Windows
    if re.search(r'\b(pkill|killall)\b', command):
        warnings.append(
            "Use 'taskkill /f /im process.exe' instead of pkill/killall on Windows"
        )

    # Rule 4: Non-ASCII characters
    non_ascii = [c for c in command if ord(c) > 127]
    if non_ascii:
        chars = ''.join(set(non_ascii))[:5]
        warnings.append(
            f"Non-ASCII chars detected: '{chars}' - cp1252 encoding may fail. Use ASCII only."
        )

    return warnings


def main() -> None:
    try:
        input_data = json.load(sys.stdin)
    except (json.JSONDecodeError, Exception):
        sys.exit(0)  # Never block on parse errors

    tool_name = input_data.get("tool_name", "")

    # Only check Bash commands
    if tool_name != "Bash":
        print("{}")
        sys.exit(0)

    command = input_data.get("tool_input", {}).get("command", "")
    if not command:
        print("{}")
        sys.exit(0)

    warnings = check_command(command)

    if warnings:
        tip = "BASH TIP: " + " | ".join(warnings)
        print(json.dumps({"systemMessage": tip}))
    else:
        print("{}")

    sys.exit(0)


if __name__ == "__main__":
    main()
