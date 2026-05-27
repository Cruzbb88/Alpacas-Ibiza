# DevTools Script Patterns Reference

Common CSS selectors and patterns for different website types.

## LMS Platforms

### TalentLMS
```javascript
// Course content
CONTENT_SELECTOR: '.tl-content, .tl-unit-content'
FILE_ROWS: '.tl-files-table tr'
DOWNLOAD_BTN: '.tl-download-btn'
SIDEBAR_NAV: '.tl-unit-sidebar li'
```

### Udemy
```javascript
// Course curriculum
CONTENT_SELECTOR: '[data-purpose="curriculum-section-container"]'
LESSON_LIST: '[data-purpose="section-panel"]'
VIDEO_TITLE: '[data-purpose="item-title"]'
SIDEBAR_NAV: '.ud-side-nav'
```

### Skool
```javascript
// Community/course content
CONTENT_SELECTOR: '.classroom-content, .post-content'
MODULE_LIST: '.module-list .module-item'
LESSON_CONTENT: '.lesson-content'
SIDEBAR_NAV: '.classroom-sidebar'
```

## SaaS Dashboards

### Generic Dashboard
```javascript
// Data tables
TABLE: '[class*="table"], [role="grid"]'
HEADER: 'th, [role="columnheader"]'
ROW: 'tbody tr, [role="row"]'
CELL: 'td, [role="cell"], [role="gridcell"]'
```

### Generic Sidebar
```javascript
// Navigation
SIDEBAR: 'nav, aside, [class*="sidebar"], [class*="drawer"]'
MENU_ITEM: 'li a, [role="menuitem"], [class*="nav-item"]'
ACTIVE_ITEM: '.active, [aria-current="page"], [class*="selected"]'
```

## Documentation Sites

### Generic Docs
```javascript
// Content
CONTENT: 'main article, .markdown-body, .documentation-content, .prose'
CODE_BLOCKS: 'pre code, .highlight code'
HEADINGS: 'h1, h2, h3, h4'
TOC: '.table-of-contents, [class*="toc"], nav[aria-label="Table of contents"]'
```

## Script Patterns

### Wait for Dynamic Content
```javascript
// Wait for element to appear
async function waitFor(selector, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const el = document.querySelector(selector);
        if (el) return el;
        await new Promise(r => setTimeout(r, 100));
    }
    return null;
}
```

### Scroll to Load All Content
```javascript
// Infinite scroll loader
async function scrollToBottom() {
    let lastHeight = 0;
    while (true) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(r => setTimeout(r, 1500));
        if (document.body.scrollHeight === lastHeight) break;
        lastHeight = document.body.scrollHeight;
    }
    window.scrollTo(0, 0);
}
```

### Paginate Through Results
```javascript
// Click through pages
async function getAllPages(nextBtnSelector) {
    const allData = [];
    while (true) {
        // Extract current page data
        allData.push(/* ... extract data ... */);

        const nextBtn = document.querySelector(nextBtnSelector);
        if (!nextBtn || nextBtn.disabled) break;
        nextBtn.click();
        await new Promise(r => setTimeout(r, 1500));
    }
    return allData;
}
```

### Download File via Blob
```javascript
// Force download any URL
function downloadFile(url, filename) {
    fetch(url)
        .then(r => r.blob())
        .then(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
        });
}
```
