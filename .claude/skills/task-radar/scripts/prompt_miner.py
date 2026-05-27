# /// script
# dependencies = []
# ///
"""
Prompt Miner — Extract user intents from Claude Code transcript JSONL files.

Scans transcripts for Tony's stated intentions (e.g., "I want to...", "we should...")
that may have been buried under other work. Distinguishes actual user voice from
copy-pasted content using heuristic scoring.

Usage:
    python prompt_miner.py --project-path "D:/Workshop"
    python prompt_miner.py --project-path "D:/Workshop" --days 14
    python prompt_miner.py --project-path "D:/Workshop" --existing-items items.json
"""

import argparse
import glob
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path


# Intent extraction patterns — ordered by confidence
INTENT_PATTERNS = [
    # High confidence (0.9) — explicit intent statements
    (r"\bi (?:want|wanna|need|gotta) to\b", 0.9),
    (r"\bi(?:'d| would) (?:like|love) to\b", 0.9),
    (r"\bwe (?:should|need to|gotta|have to)\b", 0.9),
    (r"\bremind me to\b", 0.95),
    (r"\bdon(?:'t|t) let me forget\b", 0.95),
    (r"\bnote to self\b", 0.95),
    (r"\bTODO:\b", 0.9),
    (r"\bFIXME:\b", 0.9),
    # Medium confidence (0.7) — sequential/future intent
    (r"\bafter this[,;]?\s", 0.7),
    (r"\bnext up\b", 0.7),
    (r"\bthen we (?:can|should|need to)\b", 0.7),
    (r"\bi also need\b", 0.8),
    (r"\bone more thing\b", 0.7),
    (r"\blet(?:'s|s) circle back to\b", 0.8),
    (r"\bwe still need to\b", 0.8),
    (r"\bi(?:'ll| will) (?:need to|have to|want to)\b", 0.7),
    (r"\bmake sure (?:that )?(?:i|we)\b", 0.7),
]

# Words that indicate technical/project context (not pizza orders)
TECH_CONTEXT_WORDS = {
    "build", "deploy", "test", "fix", "run", "create", "update", "implement",
    "refactor", "migrate", "configure", "setup", "install", "push", "commit",
    "merge", "branch", "spec", "skill", "command", "script", "pipeline",
    "api", "endpoint", "database", "schema", "migration", "component",
    "module", "service", "server", "client", "frontend", "backend",
    "supabase", "cortex", "airtable", "n8n", "playwright", "chromium",
    "self-heal", "e2e", "adw", "brainstorm", "roadmap", "report",
}


def compute_voice_confidence(text: str) -> float:
    """Score how likely this text is Tony's actual words vs copy-paste."""
    score = 0.5  # neutral start
    words = text.split()
    word_count = len(words)

    if word_count == 0:
        return 0.0

    # Short messages are more likely to be user voice
    if word_count < 50:
        score += 0.2
    elif word_count > 500:
        score -= 0.3

    # Code blocks = pasted content
    code_block_count = text.count("```")
    if code_block_count >= 2:
        score -= 0.3

    # Contractions = conversational = Tony
    contractions = len(re.findall(
        r"\b(?:i'm|i've|i'll|i'd|don't|doesn't|didn't|can't|won't|"
        r"couldn't|shouldn't|wouldn't|we're|we've|we'll|that's|it's|"
        r"there's|here's|what's|who's|let's|y'all|gonna|wanna|gotta)\b",
        text, re.IGNORECASE
    ))
    if contractions >= 2:
        score += 0.15

    # First person = user voice
    first_person = len(re.findall(r"\b(?:I|my|me|we|our|us)\b", text))
    if first_person >= 3:
        score += 0.1

    # Casual language markers
    casual_markers = len(re.findall(
        r"\b(?:yeah|yep|nah|okay|ok|cool|shit|fuck|damn|dude|"
        r"basically|honestly|actually|kinda|sorta|stuff|whatever|"
        r"btw|fyi|imo|tbh|lol|haha)\b",
        text, re.IGNORECASE
    ))
    if casual_markers >= 1:
        score += 0.15

    # Headers and formal structure = pasted document
    header_count = len(re.findall(r"^#{1,6}\s", text, re.MULTILINE))
    if header_count >= 3:
        score -= 0.2

    # Quoted blocks = reference material
    quote_count = len(re.findall(r"^>\s", text, re.MULTILINE))
    if quote_count >= 2:
        score -= 0.15

    # URLs suggest reference/paste
    url_count = len(re.findall(r"https?://", text))
    if url_count >= 3:
        score -= 0.1

    return max(0.0, min(1.0, score))


def has_tech_context(text: str, window: int = 100) -> bool:
    """Check if the text around an intent match is about technical/project work."""
    text_lower = text.lower()
    matches = sum(1 for w in TECH_CONTEXT_WORDS if w in text_lower)
    return matches >= 1


def extract_sentence_around(text: str, match_start: int, match_end: int) -> str:
    """Extract the sentence containing the match."""
    # Find sentence boundaries
    start = max(0, text.rfind(".", 0, match_start) + 1)
    end = text.find(".", match_end)
    if end == -1:
        end = min(len(text), match_end + 200)
    else:
        end = min(end + 1, match_end + 300)

    sentence = text[start:end].strip()
    # Cap length
    if len(sentence) > 300:
        sentence = sentence[:300] + "..."
    return sentence


def extract_user_text(content) -> str:
    """Extract text from a user message content field (string or array)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(item.get("text", ""))
            elif isinstance(item, str):
                parts.append(item)
        return " ".join(parts)
    return ""


def mine_transcript(filepath: str, min_voice_confidence: float = 0.4) -> list:
    """Mine a single transcript JSONL file for user intents."""
    intents = []
    line_num = 0

    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line_num += 1
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                # Only user messages
                if entry.get("type") != "user":
                    continue

                text = extract_user_text(entry.get("message", {}).get("content", ""))
                if not text or len(text) < 10:
                    continue

                voice_conf = compute_voice_confidence(text)
                if voice_conf < min_voice_confidence:
                    continue

                # Strip code blocks before intent search
                text_no_code = re.sub(r"```[\s\S]*?```", " ", text)
                text_no_code = re.sub(r"`[^`]+`", " ", text_no_code)

                # Search for intent patterns
                for pattern, base_confidence in INTENT_PATTERNS:
                    for match in re.finditer(pattern, text_no_code, re.IGNORECASE):
                        sentence = extract_sentence_around(
                            text_no_code, match.start(), match.end()
                        )

                        # Must be in technical context
                        if not has_tech_context(sentence):
                            continue

                        intent_conf = base_confidence * voice_conf
                        if intent_conf < 0.3:
                            continue

                        intents.append({
                            "text": sentence,
                            "pattern_matched": pattern,
                            "source_file": os.path.basename(filepath),
                            "line": line_num,
                            "voice_confidence": round(voice_conf, 2),
                            "intent_confidence": round(intent_conf, 2),
                            "already_tracked": False,
                        })

    except (OSError, IOError) as e:
        print(f"Warning: Could not read {filepath}: {e}", file=sys.stderr)

    return intents


def deduplicate_intents(intents: list, existing_items: list = None) -> list:
    """Remove duplicate intents and mark already-tracked ones."""
    seen_texts = set()
    unique = []

    # Build set of existing item titles for cross-reference
    existing_titles = set()
    if existing_items:
        for item in existing_items:
            title = item.get("title", "").lower()
            if title:
                existing_titles.add(title)

    for intent in intents:
        # Normalize for dedup
        normalized = re.sub(r"\s+", " ", intent["text"].lower().strip())
        if len(normalized) < 15:
            continue

        # Simple similarity: check if first 50 chars overlap
        key = normalized[:80]
        if key in seen_texts:
            continue
        seen_texts.add(key)

        # Check against existing tracked items
        for title in existing_titles:
            # If the intent text substantially overlaps with an existing item
            if title in normalized or normalized[:50] in title:
                intent["already_tracked"] = True
                break

        unique.append(intent)

    return unique


def find_transcripts(project_path: str, days: int = 30) -> list:
    """Find transcript JSONL files for the given project."""
    projects_dir = os.path.expanduser("~/.claude/projects")
    if not os.path.isdir(projects_dir):
        return []

    # Normalize project path for matching
    norm_path = project_path.replace("\\", "/").rstrip("/").lower()

    transcripts = []
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    for proj_dir in glob.glob(os.path.join(projects_dir, "*")):
        if not os.path.isdir(proj_dir):
            continue

        # Check if this project dir matches by looking for project path indicators
        # Claude Code uses hashed directory names, so we check all and filter by recency
        for tf in glob.glob(os.path.join(proj_dir, "*.jsonl")):
            try:
                mtime = datetime.fromtimestamp(
                    os.path.getmtime(tf), tz=timezone.utc
                )
                if mtime >= cutoff:
                    transcripts.append(tf)
            except OSError:
                continue

    return sorted(transcripts, key=os.path.getmtime, reverse=True)


def main():
    parser = argparse.ArgumentParser(description="Mine transcripts for user intents")
    parser.add_argument("--project-path", required=True, help="Project directory path")
    parser.add_argument("--days", type=int, default=30, help="Look back N days (default: 30)")
    parser.add_argument("--min-confidence", type=float, default=0.4, help="Min voice confidence (default: 0.4)")
    parser.add_argument("--existing-items", help="JSON file of existing tracked items for dedup")
    parser.add_argument("--max-intents", type=int, default=50, help="Max intents to return (default: 50)")
    args = parser.parse_args()

    # Find transcript files
    transcripts = find_transcripts(args.project_path, args.days)
    if not transcripts:
        json.dump({"intents": [], "transcripts_scanned": 0, "error": None}, sys.stdout)
        return

    # Load existing items for dedup
    existing = []
    if args.existing_items and os.path.isfile(args.existing_items):
        try:
            with open(args.existing_items, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except (json.JSONDecodeError, OSError):
            pass

    # Mine all transcripts
    all_intents = []
    for tf in transcripts:
        all_intents.extend(mine_transcript(tf, args.min_confidence))

    # Deduplicate
    unique_intents = deduplicate_intents(all_intents, existing)

    # Sort by confidence descending
    unique_intents.sort(key=lambda x: x["intent_confidence"], reverse=True)

    # Cap at max
    unique_intents = unique_intents[:args.max_intents]

    # Filter out already tracked
    new_intents = [i for i in unique_intents if not i["already_tracked"]]

    result = {
        "intents": new_intents,
        "total_found": len(all_intents),
        "after_dedup": len(unique_intents),
        "new_untracked": len(new_intents),
        "transcripts_scanned": len(transcripts),
        "error": None,
    }

    json.dump(result, sys.stdout, indent=2)


if __name__ == "__main__":
    main()
