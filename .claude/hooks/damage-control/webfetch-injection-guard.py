#!/usr/bin/env python3
# /// script
# requires-python = ">=3.8"
# dependencies = ["pyyaml"]
# ///
"""
WebFetch Injection Guard - Detects prompt injection in fetched content.

ADWS-COMPATIBLE: Default permissive mode - warn only, never block or ask.

Runs on PreToolUse for WebFetch tool.
Exit codes:
  0 = Allow (always in permissive mode)
  2 = Block (only in strict mode for critical patterns)

Modes (set in patterns.yaml or CLAUDE_SECURITY_MODE env var):
  permissive (default) = Log warnings to stderr, never interrupt
  strict = Block critical, ask on high severity
"""

import json
import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None


def load_config():
    """Load config from patterns.yaml."""
    config_path = Path(__file__).parent / "patterns.yaml"
    if config_path.exists() and yaml:
        with open(config_path, encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {}


# Known domains used for prompt injection payloads
SUSPICIOUS_DOMAINS = [
    ("pastebin.com", "critical", "Common prompt injection payload host"),
    ("hastebin.com", "high", "Text sharing site often used for payloads"),
    ("rentry.co", "high", "Text sharing site often used for payloads"),
    ("justpaste.it", "high", "Text sharing site often used for payloads"),
    ("ghostbin.com", "high", "Anonymous paste site"),
    ("controlc.com", "medium", "Text sharing site"),
    ("dpaste.org", "medium", "Text sharing site"),
    ("paste.ee", "medium", "Text sharing site"),
]


def main():
    config = load_config()

    # Check env var override first, then config, default to permissive
    mode = os.environ.get("CLAUDE_SECURITY_MODE", config.get("securityMode", "permissive"))

    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")

    if tool_name != "WebFetch":
        sys.exit(0)

    tool_input = input_data.get("tool_input", {})
    url = tool_input.get("url", "")

    if not url:
        sys.exit(0)

    # Check for known suspicious domains
    for domain, severity, description in SUSPICIOUS_DOMAINS:
        if domain in url.lower():
            if mode == "permissive":
                # ADWS-COMPATIBLE: Just log, never interrupt
                print(f"[SECURITY-WARN] Fetching from {domain} ({severity}): {description}", file=sys.stderr)
                sys.exit(0)  # Always allow in permissive mode
            else:
                # Strict mode: block critical, ask on high
                if severity == "critical":
                    print(f"BLOCKED: Fetching from {domain} - {description}", file=sys.stderr)
                    sys.exit(2)  # Block
                else:
                    # Ask for confirmation
                    output = {
                        "hookSpecificOutput": {
                            "hookEventName": "PreToolUse",
                            "permissionDecision": "ask",
                            "permissionDecisionReason": f"Fetching from {domain} - commonly used for prompt injection payloads. Allow?"
                        }
                    }
                    print(json.dumps(output))
                    sys.exit(0)

    # URL looks safe
    sys.exit(0)


if __name__ == "__main__":
    main()
