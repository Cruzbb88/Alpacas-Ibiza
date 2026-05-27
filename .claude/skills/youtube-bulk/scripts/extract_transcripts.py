#!/usr/bin/env python3
"""
YouTube Bulk Transcript Extractor
Extracts transcripts from multiple YouTube URLs using yt-dlp
"""

import subprocess
import sys
import json
import re
from pathlib import Path
from datetime import datetime


def extract_video_id(url: str) -> str:
    """Extract video ID from various YouTube URL formats"""
    patterns = [
        r'(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'(?:embed/)([a-zA-Z0-9_-]{11})',
        r'^([a-zA-Z0-9_-]{11})$'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_transcript(url: str) -> dict:
    """Extract transcript and metadata from a YouTube video"""
    video_id = extract_video_id(url)
    if not video_id:
        return {"error": f"Could not extract video ID from: {url}"}

    try:
        # Get video info
        info_cmd = [
            "yt-dlp",
            "--dump-json",
            "--skip-download",
            f"https://www.youtube.com/watch?v={video_id}"
        ]
        result = subprocess.run(info_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            return {"error": f"Failed to get video info: {result.stderr}"}

        info = json.loads(result.stdout)

        # Get transcript
        transcript_cmd = [
            "yt-dlp",
            "--write-auto-sub",
            "--sub-lang", "en",
            "--skip-download",
            "--sub-format", "vtt",
            "-o", f"temp_{video_id}",
            f"https://www.youtube.com/watch?v={video_id}"
        ]
        subprocess.run(transcript_cmd, capture_output=True, text=True)

        # Read and clean transcript
        vtt_file = Path(f"temp_{video_id}.en.vtt")
        transcript_text = ""
        if vtt_file.exists():
            transcript_text = clean_vtt(vtt_file.read_text())
            vtt_file.unlink()  # Clean up

        return {
            "video_id": video_id,
            "title": info.get("title", "Unknown"),
            "duration": info.get("duration_string", "Unknown"),
            "channel": info.get("channel", "Unknown"),
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "transcript": transcript_text
        }
    except Exception as e:
        return {"error": str(e)}


def clean_vtt(vtt_content: str) -> str:
    """Clean VTT subtitle file to plain text"""
    lines = vtt_content.split('\n')
    text_lines = []
    seen = set()

    for line in lines:
        # Skip VTT headers and timestamps
        if line.startswith('WEBVTT') or '-->' in line or line.strip() == '':
            continue
        # Skip timing lines
        if re.match(r'^\d{2}:\d{2}', line):
            continue
        # Remove HTML tags
        clean = re.sub(r'<[^>]+>', '', line).strip()
        # Deduplicate (VTT often has repeated lines)
        if clean and clean not in seen:
            seen.add(clean)
            text_lines.append(clean)

    return ' '.join(text_lines)


def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_transcripts.py <url1> [url2] [url3] ...")
        print("       python extract_transcripts.py --file urls.txt")
        sys.exit(1)

    urls = []
    if sys.argv[1] == "--file":
        with open(sys.argv[2]) as f:
            urls = [line.strip() for line in f if line.strip()]
    else:
        urls = sys.argv[1:]

    results = []
    for i, url in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}] Processing: {url}", file=sys.stderr)
        result = get_transcript(url)
        results.append(result)

    # Output as JSON
    output = {
        "extraction_date": datetime.now().isoformat(),
        "total_videos": len(results),
        "successful": len([r for r in results if "error" not in r]),
        "videos": results
    }

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
