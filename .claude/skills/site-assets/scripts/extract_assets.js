// Site Assets Extractor
// Run in DevTools console on target website
(function extractSiteAssets() {
    console.clear();
    console.log('Site Assets Extractor');

    const assets = {
        colors: new Set(),
        images: [],
        logos: [],
        fonts: new Set()
    };

    // Helper: RGB to Hex
    function rgbToHex(rgb) {
        const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return rgb;
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`.toUpperCase();
    }

    // Extract colors from computed styles
    const elements = document.querySelectorAll('*');
    const colorMap = new Map(); // hex -> count
    elements.forEach(el => {
        const style = getComputedStyle(el);
        ['backgroundColor', 'color', 'borderColor'].forEach(prop => {
            const color = style[prop];
            if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
                const hex = rgbToHex(color);
                if (hex !== '#000000' && hex !== '#FFFFFF') {
                    colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
                }
                assets.colors.add(hex);
            }
        });
        // Extract fonts
        if (style.fontFamily) {
            assets.fonts.add(style.fontFamily.split(',')[0].trim().replace(/['"]/g, ''));
        }
    });

    // Sort colors by frequency (most used = likely primary)
    const sortedColors = [...colorMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([hex]) => hex);

    // Extract images
    document.querySelectorAll('img').forEach(img => {
        if (img.src && img.width > 50) {
            assets.images.push({
                src: img.src,
                alt: img.alt || 'No alt text',
                width: img.width,
                height: img.height,
                isLogo: /logo/i.test(img.src) || /logo/i.test(img.alt) || /logo/i.test(img.className)
            });
        }
    });

    // Find logos specifically
    const logoSelectors = '[class*="logo"], [id*="logo"], header img, .brand img, .navbar-brand img';
    document.querySelectorAll(logoSelectors).forEach(el => {
        if (el.src) {
            assets.logos.push({
                src: el.src,
                context: el.closest('header, nav, .navbar') ? 'header' : 'page'
            });
        }
    });

    // Extract background images from CSS
    elements.forEach(el => {
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
            const match = bg.match(/url\(["']?(.+?)["']?\)/);
            if (match) {
                assets.images.push({
                    src: match[1],
                    alt: 'Background image',
                    type: 'background'
                });
            }
        }
    });

    // Format output
    const output = {
        url: window.location.href,
        title: document.title,
        colors: {
            primary: sortedColors.slice(0, 5),
            all: [...assets.colors]
        },
        logos: assets.logos,
        images: assets.images.filter(img => !img.isLogo).slice(0, 20),
        fonts: [...assets.fonts].slice(0, 10)
    };

    console.log('Extraction Results:');
    console.log(JSON.stringify(output, null, 2));

    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(output, null, 2));
    console.log('\nResults copied to clipboard!');

    return output;
})();
