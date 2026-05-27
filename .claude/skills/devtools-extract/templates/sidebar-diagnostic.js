// Page Diagnostic Template
// Analyzes page structure before extraction - shows all interactive elements
(function pageDiagnostic() {
    console.clear();
    console.log('Page Structure Diagnostic');
    console.log('='.repeat(50));

    // 1. Page info
    console.log('\n--- Page Info ---');
    console.log(`Title: ${document.title}`);
    console.log(`URL: ${window.location.href}`);
    console.log(`DOM Elements: ${document.querySelectorAll('*').length}`);

    // 2. Content areas
    console.log('\n--- Content Areas ---');
    const contentSelectors = ['main', 'article', '.content', '[class*="content"]', '#content', '.page-content'];
    contentSelectors.forEach(sel => {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
            console.log(`  ${sel}: ${els.length} element(s)`);
        }
    });

    // 3. Navigation elements
    console.log('\n--- Navigation ---');
    const navSelectors = ['nav', '.sidebar', 'aside', '[class*="menu"]', '[class*="nav"]', '.breadcrumb'];
    navSelectors.forEach(sel => {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
            console.log(`  ${sel}: ${els.length} element(s)`);
        }
    });

    // 4. Interactive elements
    console.log('\n--- Interactive Elements ---');
    console.log(`  Links: ${document.querySelectorAll('a[href]').length}`);
    console.log(`  Buttons: ${document.querySelectorAll('button').length}`);
    console.log(`  Inputs: ${document.querySelectorAll('input, textarea, select').length}`);
    console.log(`  Forms: ${document.querySelectorAll('form').length}`);

    // 5. Data structures
    console.log('\n--- Data Structures ---');
    console.log(`  Tables: ${document.querySelectorAll('table').length}`);
    console.log(`  Lists (ul/ol): ${document.querySelectorAll('ul, ol').length}`);
    console.log(`  Images: ${document.querySelectorAll('img').length}`);
    console.log(`  Videos: ${document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length}`);
    console.log(`  Downloads: ${document.querySelectorAll('a[download], a[href$=".pdf"], a[href$=".pptx"], a[href$=".docx"]').length}`);

    // 6. Clickable elements with text
    console.log('\n--- Buttons (text) ---');
    document.querySelectorAll('button').forEach((btn, i) => {
        const text = btn.textContent.trim().substring(0, 60);
        if (text) console.log(`  ${i+1}. "${text}" [${btn.className.substring(0, 40)}]`);
    });

    // 7. File links
    const fileLinks = [...document.querySelectorAll('a[href]')].filter(a =>
        /\.(pdf|pptx?|docx?|xlsx?|csv|mp4|mp3|zip)(\?|$)/i.test(a.href)
    );
    if (fileLinks.length > 0) {
        console.log('\n--- File Links ---');
        fileLinks.forEach((a, i) => {
            const ext = a.href.match(/\.(\w+)(\?|$)/)?.[1] || '?';
            console.log(`  ${i+1}. [${ext.toUpperCase()}] ${a.textContent.trim().substring(0, 50)} - ${a.href.substring(0, 80)}`);
        });
    }

    // 8. Iframes
    const iframes = document.querySelectorAll('iframe');
    if (iframes.length > 0) {
        console.log('\n--- Iframes ---');
        iframes.forEach((iframe, i) => {
            console.log(`  ${i+1}. src: ${(iframe.src || 'about:blank').substring(0, 80)}`);
        });
    }

    console.log('\n' + '='.repeat(50));
    console.log('Diagnostic complete. Use results to customize extraction scripts.');
})();
