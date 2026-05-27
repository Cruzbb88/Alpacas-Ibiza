---
name: youtube-bulk
description: Bulk YouTube transcript extraction with optional golden nuggets analysis. Use when extracting transcripts from multiple YouTube videos, processing playlists, or combining video content for research. Supports --transcript-only flag for raw transcripts without analysis.
argument-hint: "<url> [url2 url3...] [--transcript-only]"
---

# YouTube Bulk Extractor

Extract transcripts from multiple YouTube videos efficiently.

## Quick Start

### Single Video
```
/youtube-bulk https://www.youtube.com/watch?v=VIDEO_ID
```

### Multiple Videos
```
/youtube-bulk URL1 URL2 URL3
```

### Playlist
```
/youtube-bulk https://www.youtube.com/playlist?list=PLAYLIST_ID
```

### Transcript Only (no golden nuggets)
```
/youtube-bulk --transcript-only URL1 URL2
```

## Workflow

1. **Extract**: Run `scripts/extract_transcripts.py` with URLs
2. **Combine**: Merge transcripts into single markdown file
3. **Process** (unless --transcript-only): Run through video-transcript-extractor for golden nuggets
4. **Output**: Save to specified location or current directory

## Output Format

### Transcript Only Mode
Creates `transcripts-YYYY-MM-DD.md`:
```markdown
# YouTube Transcripts - [Date]

## Video 1: [Title]
**Channel:** [Channel] | **Duration:** [Duration]
**URL:** [URL]

[Transcript text...]

---

## Video 2: [Title]
...
```

### Full Mode (with Golden Nuggets)
Creates `extraction-YYYY-MM-DD.md` using video-transcript-extractor template.

## Integration with video-transcript-extractor

When not using --transcript-only, automatically invoke video-transcript-extractor skill for:
- Golden nuggets extraction
- Workflow identification
- Command/code extraction
- Timestamp indexing

See: C:\Users\Tony\.claude\skills\video-transcript-extractor\templates\

## Dependency

Requires `yt-dlp`:
```bash
pip install yt-dlp
```

## Reference

See [references/yt-dlp-options.md](references/yt-dlp-options.md) for detailed yt-dlp options and troubleshooting.
