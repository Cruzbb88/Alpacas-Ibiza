#!/usr/bin/env python3
# /// script
# requires-python = ">=3.8"
# dependencies = ["pyyaml"]
# ///
"""
Bash Output Validator - PostToolUse hook.

ADWS-COMPATIBLE: Always runs after tool execution.
- Permissive mode: Log to stderr only
- Strict mode: Log + add warning message to output

Scans command output for signs of:
- Credential exposure
- Unexpected privilege escalation
- Persistence mechanisms
- Download and execute patterns
"""

import json
import os
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None


# Sensitive data patterns to detect in output
SENSITIVE_PATTERNS = [
    # API Keys and Tokens (generic)
    (r"\b[A-Za-z0-9_-]{32,64}\b", "Possible API key/token in output (32-64 char string)", "low"),
    (r"-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----", "Private key exposed", "critical"),
    (r"-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----", "SSH private key exposed", "critical"),
    (r"-----BEGIN\s+PGP\s+PRIVATE\s+KEY-----", "PGP private key exposed", "critical"),

    # Password patterns
    (r"password\s*[:=]\s*['\"]?[^\s'\"]{8,}['\"]?", "Password visible in output", "high"),
    (r"passwd\s*[:=]\s*['\"]?[^\s'\"]{8,}['\"]?", "Password visible in output", "high"),
    (r"secret\s*[:=]\s*['\"]?[^\s'\"]{8,}['\"]?", "Secret visible in output", "high"),

    # Cloud provider credentials
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key ID exposed", "critical"),
    (r"AWS_SECRET_ACCESS_KEY\s*=", "AWS Secret Key reference exposed", "high"),
    (r"ANTHROPIC_API_KEY\s*=", "Anthropic API key reference exposed", "high"),
    (r"OPENAI_API_KEY\s*=", "OpenAI API key reference exposed", "high"),
    (r"GOOGLE_APPLICATION_CREDENTIALS\s*=", "GCP credentials reference exposed", "high"),
    (r"AZURE_CLIENT_SECRET\s*=", "Azure secret reference exposed", "high"),

    # Specific token patterns
    (r"ghp_[A-Za-z0-9]{36}", "GitHub Personal Access Token exposed", "critical"),
    (r"gho_[A-Za-z0-9]{36}", "GitHub OAuth Token exposed", "critical"),
    (r"ghr_[A-Za-z0-9]{36}", "GitHub Refresh Token exposed", "critical"),
    (r"sk-[A-Za-z0-9]{48}", "OpenAI API key pattern exposed", "critical"),
    (r"sk-ant-[A-Za-z0-9-]{40,}", "Anthropic API key pattern exposed", "critical"),
    (r"xox[baprs]-[A-Za-z0-9-]{10,}", "Slack token exposed", "critical"),
    (r"Bearer\s+[A-Za-z0-9\-_\.]{20,}", "Bearer token exposed", "high"),

    # Database connection strings
    (r"mongodb(\+srv)?://[^@]+@", "MongoDB connection string with credentials", "critical"),
    (r"postgres://[^@]+@", "PostgreSQL connection string with credentials", "critical"),
    (r"mysql://[^@]+@", "MySQL connection string with credentials", "critical"),
    (r"redis://[^@]+@", "Redis connection string with credentials", "critical"),
]

# Suspicious command patterns in output (signs of compromise)
SUSPICIOUS_PATTERNS = [
    (r"(curl|wget)\s+.*\|\s*(ba)?sh", "Download and execute pattern detected", "critical"),
    (r"(curl|wget)\s+.*\|\s*python", "Download and execute Python pattern", "critical"),
    (r"nc\s+-[a-z]*l", "Netcat listener pattern", "high"),
    (r"nc\s+.*\s+\d+", "Netcat connection pattern", "medium"),
    (r"base64\s+-d", "Base64 decode (potential obfuscation)", "medium"),
    (r"\beval\s*\(", "Eval execution pattern", "high"),
    (r"exec\s*\(", "Exec execution pattern", "medium"),
    (r"/etc/passwd", "Password file access", "medium"),
    (r"/etc/shadow", "Shadow file access (password hashes)", "critical"),
    (r"chmod\s+[u+]*s", "SUID/SGID bit modification", "high"),
    (r"chmod\s+777", "World-writable permissions", "medium"),
    (r"crontab\s+-e", "Crontab modification", "medium"),
    (r"/tmp/\.[a-z]", "Hidden file in /tmp (common malware pattern)", "high"),
    (r"reverse\s*shell", "Reverse shell reference", "critical"),
    (r"bind\s*shell", "Bind shell reference", "critical"),
    (r"meterpreter", "Metasploit payload reference", "critical"),
    (r"mimikatz", "Credential extraction tool reference", "critical"),
]


def load_config():
    """Load config from patterns.yaml."""
    config_path = Path(__file__).parent / "patterns.yaml"
    if config_path.exists() and yaml:
        with open(config_path, encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {}


def check_output(content: str) -> list:
    """Check output for sensitive data and suspicious patterns."""
    findings = []

    for pattern, reason, severity in SENSITIVE_PATTERNS:
        try:
            if re.search(pattern, content, re.IGNORECASE):
                findings.append({"type": "sensitive", "reason": reason, "severity": severity})
        except re.error:
            continue

    for pattern, reason, severity in SUSPICIOUS_PATTERNS:
        try:
            if re.search(pattern, content, re.IGNORECASE):
                findings.append({"type": "suspicious", "reason": reason, "severity": severity})
        except re.error:
            continue

    return findings


def main():
    config = load_config()

    # Check env var override first, then config, default to permissive
    mode = os.environ.get("CLAUDE_SECURITY_MODE", config.get("securityMode", "permissive"))

    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        print("{}")
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")

    if tool_name != "Bash":
        print("{}")
        sys.exit(0)

    tool_output = input_data.get("tool_output", {})

    # Handle different output formats
    stdout = ""
    stderr = ""
    if isinstance(tool_output, dict):
        stdout = str(tool_output.get("stdout", ""))
        stderr = str(tool_output.get("stderr", ""))
    elif isinstance(tool_output, str):
        stdout = tool_output

    combined_output = stdout + "\n" + stderr

    # Limit scan to first 50KB
    combined_output = combined_output[:51200]

    if len(combined_output) < 10:
        print("{}")
        sys.exit(0)

    findings = check_output(combined_output)

    if findings:
        critical = [f for f in findings if f["severity"] == "critical"]
        high = [f for f in findings if f["severity"] == "high"]
        sensitive = [f for f in findings if f["type"] == "sensitive"]
        suspicious = [f for f in findings if f["type"] == "suspicious"]

        # Log findings to stderr
        if critical:
            print(f"[SECURITY-CRITICAL] {len(critical)} critical finding(s) in Bash output:", file=sys.stderr)
            for f in critical[:5]:
                print(f"  - {f['reason']}", file=sys.stderr)
        elif high:
            print(f"[SECURITY-WARN] {len(high)} high-severity finding(s) in Bash output:", file=sys.stderr)
            for f in high[:3]:
                print(f"  - {f['reason']}", file=sys.stderr)
        elif sensitive:
            print(f"[SECURITY-INFO] Sensitive data may be exposed in output ({len(sensitive)} pattern(s))", file=sys.stderr)
        elif suspicious:
            print(f"[SECURITY-INFO] Suspicious patterns in command output ({len(suspicious)} pattern(s))", file=sys.stderr)

        # In strict mode, add warning to output
        if mode == "strict" and (critical or high):
            severity_label = "CRITICAL" if critical else "WARNING"
            output = {
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "warningMessage": f"[SECURITY-{severity_label}] Command output contains sensitive data or suspicious patterns. Review output carefully before proceeding."
                }
            }
            print(json.dumps(output))

    # Always output JSON and exit 0 - PostToolUse can't block, only inform
    if not findings or mode != "strict" or not (critical or high):
        print("{}")
    sys.exit(0)


if __name__ == "__main__":
    main()
