---
name: site-assets
description: Extract brand colors, logos, images, and fonts from any website URL. Use when user needs assets for Remotion video projects, design mockups, competitive analysis, or brand audits. Outputs organized asset list with download links and color codes.
---

# Site Assets Extractor

Extract brand colors, logos, images, and fonts from any website.

## Quick Start

```
/site-assets https://example.com
```

## Output

Returns structured asset data:
- **Colors**: Primary palette and full color list (hex codes)
- **Logos**: Logo images with context (header, footer, etc.)
- **Images**: Key images over 50px (excludes tiny icons)
- **Fonts**: Font families used on the site

## Usage for Remotion

After extraction, use assets in Remotion projects:

```typescript
// In your Remotion composition
const brandColors = {
  primary: '#extracted-color',
  secondary: '#extracted-color'
};

const logoUrl = 'extracted-logo-url';
```

## Extraction Methods

### Method 1: DevTools Script (Recommended)
1. Navigate to target website
2. Open DevTools (F12) -> Console
3. Run: `scripts/extract_assets.js`
4. Results copied to clipboard

### Method 2: Claude Fetch (Public Sites)
For public sites, Claude can fetch and analyze directly using WebFetch.

## Color Conversion

Extracted colors are in RGB format. Convert to hex:
- `rgb(255, 87, 51)` -> `#FF5733`

The script includes common color conversions in output.

## Reference

See [references/color-extraction.md](references/color-extraction.md) for advanced color analysis techniques.
