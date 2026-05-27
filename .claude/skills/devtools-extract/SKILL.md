---
name: devtools-extract
description: Generate DevTools console scripts for extracting data from authenticated websites. Use when user needs to extract content from logged-in SaaS platforms (TalentLMS, Skool, Udemy, etc.), scrape course content, download files in bulk, or analyze page structure. Outputs ready-to-paste JavaScript for browser console.
---

# DevTools Extract

Generate DevTools console scripts for extracting data from authenticated websites.

## Quick Start

Describe what you want to extract:
```
/devtools-extract Extract all PDF and PowerPoint files from this course page
```

## Script Types

### 1. Bulk File Download
For downloading multiple files (PDFs, PPTs, videos, etc.)
- Template: templates/bulk-download.js
- Customize: file extensions, wait times, selectors

### 2. Text Content Extraction
For extracting text from course pages, articles, prompts
- Template: templates/text-extract.js
- Outputs: plain text or markdown

### 3. Table Extraction
For extracting tabular data to CSV
- Template: templates/table-extract.js
- Auto-detects table structure

### 4. List/Navigation Extraction
For extracting sidebar items, menu structures
- Template: templates/list-extract.js
- Captures hierarchy

### 5. Page Diagnostic
For analyzing page structure before extraction
- Template: templates/sidebar-diagnostic.js
- Shows all clickable elements

## Workflow

1. **Describe target**: What data to extract, from what type of site
2. **Generate script**: Claude creates customized DevTools script
3. **User copies script**: Copy the generated JavaScript
4. **Open target page**: Navigate to the authenticated page in browser
5. **Open DevTools**: F12 -> Console tab
6. **Paste and run**: Paste script, press Enter
7. **Data extracted**: Console shows results or files download

## Customization Points

Each generated script includes CONFIG object at top:
- `SELECTORS`: CSS selectors for target elements
- `WAIT_TIMES`: Delays for dynamic content
- `FILE_EXTENSIONS`: For file downloads
- `OUTPUT_FORMAT`: text, markdown, json, csv

## Reference: Common Selectors

See [references/script-patterns.md](references/script-patterns.md) for:
- LMS platforms (TalentLMS, Udemy, Skool)
- SaaS dashboards
- Documentation sites
- E-commerce product pages
