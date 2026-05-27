// Text Content Extractor Template
// Extracts all text from page sections
(function extractText() {
    const CONFIG = {
        CONTENT_SELECTOR: 'main, article, .content, [class*="content"]',
        EXCLUDE_SELECTOR: 'nav, header, footer, aside, .sidebar',
        OUTPUT_FORMAT: 'markdown' // 'text' or 'markdown'
    };

    console.clear();
    console.log('Text Content Extractor');

    const content = document.querySelector(CONFIG.CONTENT_SELECTOR) || document.body;
    const clone = content.cloneNode(true);
    const excluded = clone.querySelectorAll(CONFIG.EXCLUDE_SELECTOR);
    excluded.forEach(el => el.remove());

    let output = '';
    if (CONFIG.OUTPUT_FORMAT === 'markdown') {
        // Convert headings
        clone.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
            const level = parseInt(h.tagName[1]);
            output += '#'.repeat(level) + ' ' + h.textContent.trim() + '\n\n';
        });
        // Convert paragraphs
        clone.querySelectorAll('p').forEach(p => {
            output += p.textContent.trim() + '\n\n';
        });
        // Convert lists
        clone.querySelectorAll('li').forEach(li => {
            output += '- ' + li.textContent.trim() + '\n';
        });
    } else {
        output = clone.innerText;
    }

    navigator.clipboard.writeText(output);
    console.log('Content copied to clipboard!');
    console.log(`${output.length} characters extracted`);

    return output;
})();
