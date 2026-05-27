---
name: file-factory
description: "Unified skill for professional document creation across all Office formats and HTML (PowerPoint, Excel, Word, PDF, HTML). Handles presentations, spreadsheets, documents, PDFs, and self-contained HTML pages with theme support. Use when creating or editing: presentations, slides, decks, pptx, spreadsheets, excel, xlsx, documents, word, docx, pdfs, html, web pages, landing pages, reports, files, or applying themes/styling."
argument-hint: "<what to create> [format: pptx | xlsx | docx | pdf | html]"
tools:
  - mcp__omni-cortex__cortex_global_search
  - Bash
---

# file-factory

Unified skill for professional document creation across all Office formats.

## Pre-Creation Context

Before creating documents:
- Search for similar templates: `cortex_global_search: "{document_type} template"`
- Check for existing themes: `cortex_global_search: "theme {style}"`
- Use recalled patterns for consistency

## Quick Reference

- **PowerPoint/PPTX:** See pptx/PPTX.md
- **Excel/XLSX:** See xlsx/XLSX.md (Coming soon)
- **Word/DOCX:** See docx/DOCX.md - Full documentation with complexity levels
- **PDF:** See pdf/reference.md and pdf/forms.md
- **HTML:** See html/HTML.md - Self-contained HTML pages with 6 complexity levels (static to Three.js)
- **Themes:** See themes/THEMES.md and themes/color-palettes.md
- **Complexity Levels:** See COMPLEXITY_LEVELS.md - Ultra-minimalistic to Ultra-extreme guide
- **Cookbooks:** See cookbook/ for recipe-style guides

## Format Detection

When user mentions:

- **"presentation", "slides", "deck", "pptx", "powerpoint"** → PPTX workflow
- **"spreadsheet", "excel", "xlsx", "data table"** → XLSX workflow
- **"document", "word", "docx", "report"** → DOCX workflow
- **"pdf", "extract", "form", "pdf form"** → PDF workflow
- **"html", "webpage", "web page", "landing page", "one-pager", "static site"** → HTML workflow
- **"theme", "styling", "color scheme", "branding"** → Apply theme to any format

## Trigger Keywords

excel, spreadsheet, xlsx, word, docx, document, presentation,
powerpoint, pptx, pdf, slides, report, create document, edit document,
file creation, theme, styling, professional document, html, webpage,
web page, landing page, one-pager, static site, html file

## Default Settings

**IMPORTANT: Unless the user specifies otherwise, always default to:**
- **Complexity Level:** 4 (Complex) or 5 (Extreme) - information-rich with professional polish
- **Theme:** Light theme with white/light gray backgrounds and dark text
- **Color Palette:** Professional light palette (Primary: #1F4E79, Accent: #059669, Text: #1F2937)

Only use dark themes or Level 1-3 complexity if explicitly requested by the user.

## Workflow Pattern

1. **Detect format** from user request
2. **Read appropriate guide** from subdirectory
3. **Default to Level 4-5 with light theme** (unless user specifies otherwise)
4. **Follow format-specific workflow** as documented
5. **Apply theme** if requested or needed for consistency
6. **Validate output** before returning to user
7. **Apply reading order** if creating multiple documents (see below)

## Multi-Document Suites (Reading Order)

**When creating 3+ related documents on a single topic, ALWAYS add reading order prefixes.**

### Naming Convention

```
{NN}_{Original_Filename}.{ext}

Examples:
01_Vision_Board_Evolution.xlsx
02_Skills_Inventory.xlsx
03_Opportunity_Matrix.xlsx
04_Full_Analysis.md
05_Visual_Summary.pptx
06_Executive_Summary.pdf
```

### Reading Order Logic

Organize documents by information flow - from foundational inputs to final synthesis:

| Order | Document Type | Purpose |
|-------|--------------|---------|
| 01-03 | Data/Input files (xlsx) | Raw data, inventories, matrices |
| 04-05 | Analysis documents (md, xlsx) | Synthesis, deep-dives, comparisons |
| 06-07 | Visual summaries (pptx) | Presentations, visual journeys |
| 08-09 | Executive outputs (pdf) | Summaries, conclusions |
| 10+ | Teaching/Reference (pptx, pdf) | How-to guides, frameworks for others |

### When to Apply Reading Order

**DO add reading order when:**
- Creating a documentation suite (3+ related files)
- Building a multi-file analysis or report
- Creating teaching materials with prerequisites
- Any project where files build on each other

**DON'T add reading order when:**
- Creating a single standalone file
- Creating unrelated files in the same session
- User explicitly requests no numbering

### Implementation

When saving files to the same output directory:

```javascript
// Example: Multi-document suite
const files = [
  { order: 1, name: 'Data_Sources.xlsx', type: 'input' },
  { order: 2, name: 'Analysis_Matrix.xlsx', type: 'input' },
  { order: 3, name: 'Full_Report.md', type: 'analysis' },
  { order: 4, name: 'Presentation.pptx', type: 'visual' },
  { order: 5, name: 'Executive_Summary.pdf', type: 'output' }
];

// Save with order prefix
for (const file of files) {
  const orderedName = `${String(file.order).padStart(2, '0')}_${file.name}`;
  // Save to: 01_Data_Sources.xlsx, 02_Analysis_Matrix.xlsx, etc.
}
```

### Post-Creation Summary

After creating a multi-document suite, provide the user with a reading order table:

```
## Documentation Reading Order

| # | File | Purpose |
|---|------|---------|
| 01 | 01_Data_Sources.xlsx | Baseline data and inputs |
| 02 | 02_Analysis_Matrix.xlsx | Decision framework |
| 03 | 03_Full_Report.md | Comprehensive analysis |
| 04 | 04_Presentation.pptx | Visual summary |
| 05 | 05_Executive_Summary.pdf | Final conclusions |
```

## Available Cookbooks

- **tier-rankings.md** - Create tier-based ranking presentations
- **curriculum-slides.md** - Educational and training content
- More cookbooks will be added as patterns emerge

## Integration Notes

This skill consolidates multiple document creation workflows:
- Replaces standalone pptx, xlsx, docx, pdf skills
- Provides centralized theme management
- Shares common utilities and scripts across formats
- Enables cross-format operations (e.g., Excel data to PowerPoint charts)

## Post-Creation Memory

Store document creation info via CLI (fire-and-forget):
```bash
cortex remember "File-factory: [document type, theme used, key formatting decisions]" \
  --tags file-factory,{output_type},{theme} --importance 60 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- \
  remember "File-factory: [summary]" --tags file-factory,{output_type},{theme} --importance 60
```
