// List/Navigation Extractor Template
// Extracts sidebar items, menu structures, and hierarchical lists
(function extractList() {
    const CONFIG = {
        LIST_SELECTOR: 'nav ul, .sidebar ul, aside ul, [class*="menu"] ul, [class*="nav"] ul, ol, ul',
        LINK_SELECTOR: 'a',
        OUTPUT_FORMAT: 'markdown', // 'markdown', 'json', or 'text'
        MAX_DEPTH: 5,
        INCLUDE_URLS: true
    };

    console.clear();
    console.log('List/Navigation Extractor');

    function extractListItems(element, depth = 0) {
        if (depth >= CONFIG.MAX_DEPTH) return [];

        const items = [];
        const children = element.children;

        for (const child of children) {
            if (child.tagName === 'LI') {
                const link = child.querySelector(CONFIG.LINK_SELECTOR);
                const item = {
                    text: (link || child).textContent.trim().split('\n')[0].trim(),
                    url: link ? link.href : null,
                    depth: depth
                };

                // Check for nested lists
                const nestedList = child.querySelector('ul, ol');
                if (nestedList) {
                    item.children = extractListItems(nestedList, depth + 1);
                    // Clean text to exclude nested items
                    const directText = [...child.childNodes]
                        .filter(n => n.nodeType === 3 || (n.tagName === 'A'))
                        .map(n => n.textContent.trim())
                        .join(' ')
                        .trim();
                    if (directText) item.text = directText;
                }

                if (item.text) items.push(item);
            }
        }
        return items;
    }

    const lists = document.querySelectorAll(CONFIG.LIST_SELECTOR);
    const allItems = [];

    // Deduplicate by finding top-level lists only
    const topLevelLists = [...lists].filter(list => {
        return !list.parentElement.closest(CONFIG.LIST_SELECTOR);
    });

    console.log(`Found ${topLevelLists.length} top-level list(s)`);

    topLevelLists.forEach((list, i) => {
        const items = extractListItems(list);
        if (items.length > 0) {
            allItems.push({ listIndex: i, items });
        }
    });

    // Format output
    let output = '';
    if (CONFIG.OUTPUT_FORMAT === 'markdown') {
        function toMarkdown(items, indent = 0) {
            items.forEach(item => {
                const prefix = '  '.repeat(indent) + '- ';
                if (CONFIG.INCLUDE_URLS && item.url) {
                    output += `${prefix}[${item.text}](${item.url})\n`;
                } else {
                    output += `${prefix}${item.text}\n`;
                }
                if (item.children) {
                    toMarkdown(item.children, indent + 1);
                }
            });
        }
        allItems.forEach(({ items }) => toMarkdown(items));
    } else if (CONFIG.OUTPUT_FORMAT === 'json') {
        output = JSON.stringify(allItems, null, 2);
    } else {
        function toText(items, indent = 0) {
            items.forEach(item => {
                output += '  '.repeat(indent) + item.text + '\n';
                if (item.children) toText(item.children, indent + 1);
            });
        }
        allItems.forEach(({ items }) => toText(items));
    }

    navigator.clipboard.writeText(output);
    const totalItems = allItems.reduce((sum, { items }) => {
        function count(arr) { return arr.reduce((s, i) => s + 1 + (i.children ? count(i.children) : 0), 0); }
        return sum + count(items);
    }, 0);

    console.log(`Extracted ${totalItems} items`);
    console.log('Data copied to clipboard!');

    return output;
})();
