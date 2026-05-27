// Bulk File Downloader Template
// Customize: FILE_EXTENSIONS, DOWNLOAD_WAIT, selectors
(async function bulkDownload() {
    const CONFIG = {
        FILE_EXTENSIONS: /\.(pptx?|pdf|mp4|docx?|xlsx?)/i,
        DOWNLOAD_WAIT: 1500,
        ROW_SELECTOR: 'tr, [role="row"]',
        CELL_SELECTOR: 'td, [role="cell"]',
        DOWNLOAD_BTN_TEXT: 'download'
    };

    console.clear();
    console.log('Bulk File Downloader');

    const rows = document.querySelectorAll(CONFIG.ROW_SELECTOR);
    const fileRows = [];

    rows.forEach(row => {
        if (CONFIG.FILE_EXTENSIONS.test(row.textContent)) {
            const cells = row.querySelectorAll(CONFIG.CELL_SELECTOR);
            if (cells.length > 0) {
                const name = cells[0].textContent.trim();
                if (name && name.length < 200) {
                    fileRows.push({ name, row, cell: cells[0] });
                }
            }
        }
    });

    console.log(`Found ${fileRows.length} files`);
    fileRows.forEach((f, i) => console.log(`  ${i+1}. ${f.name}`));

    if (!confirm(`Download ${fileRows.length} files?`)) return;

    let success = 0, fail = 0;
    for (let i = 0; i < fileRows.length; i++) {
        const file = fileRows[i];
        console.log(`[${i+1}/${fileRows.length}] ${file.name}`);

        try {
            file.row.scrollIntoView({ block: 'center' });
            await new Promise(r => setTimeout(r, 300));
            file.cell.click();
            await new Promise(r => setTimeout(r, CONFIG.DOWNLOAD_WAIT));

            const downloadBtn = [...document.querySelectorAll('button')]
                .find(b => b.textContent.trim().toLowerCase() === CONFIG.DOWNLOAD_BTN_TEXT);

            if (downloadBtn) {
                downloadBtn.click();
                success++;
                await new Promise(r => setTimeout(r, 1000));

                const closeBtn = [...document.querySelectorAll('button')]
                    .find(b => /cancel|×|close/i.test(b.textContent));
                if (closeBtn) closeBtn.click();
            } else {
                fail++;
            }

            await new Promise(r => setTimeout(r, CONFIG.DOWNLOAD_WAIT));
        } catch (e) {
            console.log(`  Error: ${e.message}`);
            fail++;
        }
    }

    console.log(`\nComplete: ${success}/${fileRows.length} downloaded`);
})();
