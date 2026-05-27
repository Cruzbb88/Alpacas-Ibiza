# yt-dlp Reference for Transcript Extraction

## Installation

```bash
pip install yt-dlp
```

## Key Options Used

### Video Info (No Download)
```bash
yt-dlp --dump-json --skip-download URL
```
Returns JSON with: title, duration, channel, description, upload_date, view_count, etc.

### Subtitle/Transcript Download
```bash
yt-dlp --write-auto-sub --sub-lang en --skip-download --sub-format vtt -o "output" URL
```

Options:
- `--write-auto-sub`: Download auto-generated subtitles
- `--write-sub`: Download manual subtitles (preferred when available)
- `--sub-lang en`: Language code (en, es, fr, etc.)
- `--sub-format vtt`: Format (vtt, srt, ass)
- `--skip-download`: Don't download video
- `-o "template"`: Output filename template

### Playlist Handling
```bash
# Get all video URLs from playlist
yt-dlp --flat-playlist --dump-json "PLAYLIST_URL"

# Download transcripts for entire playlist
yt-dlp --write-auto-sub --sub-lang en --skip-download --sub-format vtt "PLAYLIST_URL"
```

### Available Subtitle Languages
```bash
yt-dlp --list-subs URL
```

## VTT Format Structure

```
WEBVTT

00:00:00.000 --> 00:00:03.000
First line of text

00:00:03.000 --> 00:00:06.000
Second line of text
```

VTT files often contain:
- Duplicate lines (for smooth scrolling display)
- HTML tags (`<c>`, `<b>`, etc.)
- Timing metadata
- Position/alignment info

The `clean_vtt()` function in extract_transcripts.py handles all of these.

## Common Issues

| Issue | Solution |
|-------|----------|
| No subtitles available | Try `--write-auto-sub` (auto-generated) |
| Wrong language | Check available with `--list-subs` |
| Rate limiting | Add `--sleep-interval 2` between requests |
| Geo-blocked | Use `--geo-bypass` flag |
| Age-restricted | May need cookies: `--cookies cookies.txt` |
