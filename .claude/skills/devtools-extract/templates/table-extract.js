// Table Data Extractor Template
// Extracts tabular data to CSV format
(function extractTable() {
    const CONFIG = {
        TABLE_SELECTOR: 'table, [role="table"], .data-table',
        HEADER_SELECTOR: 'th, [role="columnheader"]',
        ROW_SELECTOR: 'tbody tr, [role="row"]',
        CELL_SELECTOR: 'td, [role="cell"]',
        DELIMITER: ',',
        OUTPUT: 'csv' // 'csv' or 'json'
    };

    console.clear();
    console.log('Table Data Extractor');

    const tables = document.querySelectorAll(CONFIG.TABLE_SELECTOR);
    if (tables.length === 0) {
        console.log('No tables found on page');
        return;
    }

    console.log(`Found ${tables.length} table(s)`);

    const results = [];

    tables.forEach((table, tableIndex) => {
        // Extract headers
        const headers = [];
        table.querySelectorAll(CONFIG.HEADER_SELECTOR).forEach(th => {
            headers.push(th.textContent.trim());
        });

        // Extract rows
        const rows = [];
        table.querySelectorAll(CONFIG.ROW_SELECTOR).forEach(tr => {
            const cells = [];
            tr.querySelectorAll(CONFIG.CELL_SELECTOR).forEach(td => {
                cells.push(td.textContent.trim());
            });
            if (cells.length > 0) {
                rows.push(cells);
            }
        });

        results.push({ headers, rows, tableIndex });
        console.log(`Table ${tableIndex + 1}: ${headers.length} columns, ${rows.length} rows`);
    });

    // Format output
    let output = '';
    if (CONFIG.OUTPUT === 'csv') {
        results.forEach(({ headers, rows, tableIndex }) => {
            if (results.length > 1) {
                output += `--- Table ${tableIndex + 1} ---\n`;
            }
            if (headers.length > 0) {
                output += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(CONFIG.DELIMITER) + '\n';
            }
            rows.forEach(row => {
                output += row.map(c => `"${c.replace(/"/g, '""')}"`).join(CONFIG.DELIMITER) + '\n';
            });
            output += '\n';
        });
    } else {
        output = JSON.stringify(results.map(({ headers, rows }) => ({
            headers,
            data: rows.map(row => {
                const obj = {};
                headers.forEach((h, i) => { obj[h] = row[i] || ''; });
                return obj;
            })
        })), null, 2);
    }

    navigator.clipboard.writeText(output);
    console.log('\nData copied to clipboard!');
    console.log(`Total: ${results.reduce((sum, r) => sum + r.rows.length, 0)} rows extracted`);

    return output;
})();
