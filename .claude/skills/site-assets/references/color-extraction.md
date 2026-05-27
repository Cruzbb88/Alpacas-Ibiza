# Color Extraction Reference

## Color Formats

### RGB to Hex Conversion
```
rgb(255, 87, 51)  -> #FF5733
rgb(0, 123, 255)  -> #007BFF
rgba(0,0,0,0.5)   -> #000000 (with 50% opacity)
```

### Common Brand Color Locations

1. **CSS Custom Properties** (most reliable):
   ```javascript
   // Check :root for CSS variables
   const rootStyles = getComputedStyle(document.documentElement);
   // Common naming patterns:
   rootStyles.getPropertyValue('--primary-color');
   rootStyles.getPropertyValue('--brand-color');
   rootStyles.getPropertyValue('--color-primary');
   rootStyles.getPropertyValue('--accent');
   ```

2. **Meta Tags**:
   ```javascript
   document.querySelector('meta[name="theme-color"]')?.content;
   document.querySelector('meta[name="msapplication-TileColor"]')?.content;
   ```

3. **Favicon / Manifest**:
   ```javascript
   // Web manifest often has theme_color
   const manifest = document.querySelector('link[rel="manifest"]');
   // fetch and parse manifest.json for theme_color, background_color
   ```

## Identifying Primary Colors

### Frequency-Based (Default)
Colors used most frequently across elements are likely brand colors.
The extract_assets.js script sorts by frequency automatically.

### Semantic-Based
Look for colors in:
- Header/navbar backgrounds
- Link colors
- Button backgrounds
- Logo-adjacent elements
- CTA (Call to Action) buttons

### CSS Variable-Based (Most Accurate)
```javascript
// Extract all CSS custom properties
const allCSS = [...document.styleSheets]
    .flatMap(sheet => {
        try { return [...sheet.cssRules]; } catch { return []; }
    })
    .filter(rule => rule.selectorText === ':root')
    .flatMap(rule => [...rule.style])
    .filter(prop => prop.startsWith('--'))
    .map(prop => ({
        name: prop,
        value: getComputedStyle(document.documentElement).getPropertyValue(prop).trim()
    }))
    .filter(({ value }) => /^#|^rgb|^hsl/.test(value));
```

## Font Identification

### Common Font Stack Patterns
- **Sans-serif**: Inter, Roboto, Open Sans, Helvetica, Arial
- **Serif**: Georgia, Merriweather, Playfair Display
- **Monospace**: JetBrains Mono, Fira Code, Consolas
- **Display**: Montserrat, Oswald, Poppins

### Extracting Google Fonts
```javascript
// Check for Google Fonts links
[...document.querySelectorAll('link[href*="fonts.googleapis.com"]')]
    .map(link => link.href);
```

## Logo Detection Strategies

1. **Class/ID matching**: `[class*="logo"]`, `[id*="logo"]`
2. **SVG logos**: `header svg`, `.logo svg`
3. **Favicon**: `link[rel="icon"]`, `link[rel="shortcut icon"]`
4. **Open Graph image**: `meta[property="og:image"]`
5. **Apple touch icon**: `link[rel="apple-touch-icon"]`
