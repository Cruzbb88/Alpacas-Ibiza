# DE-001 — FareHarbor Bookings Export Script
**Project:** alpaca-farm-redesign (alpacasibiza)
**Date:** 2026-05-26
**Status:** TEMPLATE — untested, owner must fill in selectors before use
**Run type:** DEGRADED (no admin access; DOM structure unverified)

---

## What this script does

Iterates every visible booking row on the FareHarbor admin Bookings list page, extracts six fields per row (date, guest name, item/tour name, party size, status, total), then simultaneously downloads a CSV file and copies a JSON array to the clipboard. Includes a pagination stub.

---

## Before you run: fill in these 5 TODO markers

| # | Marker | What to put there |
|---|--------|-------------------|
| 1 | `TODO_ROW_SELECTOR` | CSS selector for each booking row (`<tr>`, `<li>`, or `<div>`) |
| 2 | `TODO_DATE_SELECTOR` | Selector for the date cell **relative to the row** |
| 3 | `TODO_GUEST_SELECTOR` | Selector for the guest name cell relative to the row |
| 4 | `TODO_ITEM_SELECTOR` | Selector for the tour/item name cell relative to the row |
| 5 | `TODO_NEXT_PAGE_SELECTOR` | Selector for the "Next page" button/link |

How to find them: Open the Bookings list → right-click a booking row → **Inspect** → note the element tag and class names. Repeat for each cell. Most FareHarbor tables use `<tr class="booking-row ...">` but this is unverified.

---

## Owner instructions

1. Log into FareHarbor admin (your usual login at `https://fareharbor.com/alpacasibiza/dashboard/` — exact URL may differ; check your bookmark).
2. Navigate to **Bookings** (or **Reports → Bookings**).
3. Make sure all the bookings you want exported are visible (apply any date filters first).
4. Open browser DevTools: press **F12** → click the **Console** tab.
5. Right-click any booking row → **Inspect Element** — note the class names on the row `<tr>` and on each data cell.
6. In the script below, replace every `'TODO_...'` string with the real class selectors you just found.
7. Paste the entire script into the Console and press **Enter**.
8. Watch the console log lines — they tell you what's happening.
9. A CSV file named `fareharbor-bookings-YYYY-MM-DD.csv` will download automatically.
10. JSON data is copied to your clipboard — paste into a text file or spreadsheet as needed.

---

## Script

```javascript
// =============================================================
// FareHarbor Bookings Export — TEMPLATE v1.0
// Project: alpacasibiza (Flow 1257173)
// Generated: 2026-05-26
// STATUS: TEMPLATE — selectors are placeholders. Fill in before use.
// =============================================================

(async function fhExport() {

  // ------------------------------------------------------------------
  // CONFIG — fill in every TODO before running
  // ------------------------------------------------------------------
  const CONFIG = {
    // TODO_ROW_SELECTOR: CSS selector that matches each booking row.
    // VERIFY: FareHarbor may use <tr class="booking-row"> or a <div data-booking-id>.
    // Example after inspection: '.bookings-table tbody tr'
    ROW_SELECTOR: 'TODO_ROW_SELECTOR',

    // TODO_DATE_SELECTOR: selector for the date cell, relative to each row.
    // Example: 'td.booking-date' or 'td:nth-child(1)'
    DATE_SELECTOR: 'TODO_DATE_SELECTOR',

    // TODO_GUEST_SELECTOR: selector for the guest/customer name cell.
    // Example: 'td.customer-name' or 'td:nth-child(2)'
    GUEST_SELECTOR: 'TODO_GUEST_SELECTOR',

    // TODO_ITEM_SELECTOR: selector for the tour/item name cell.
    // Example: 'td.item-name' or 'td:nth-child(3)'
    ITEM_SELECTOR: 'TODO_ITEM_SELECTOR',

    // Party size, status, and total: adjust nth-child indexes to match column order.
    // VERIFY: column order varies by FareHarbor account configuration.
    PARTY_SIZE_SELECTOR: 'td:nth-child(4)',   // adjust column index
    STATUS_SELECTOR:     'td:nth-child(5)',   // adjust column index
    TOTAL_SELECTOR:      'td:nth-child(6)',   // adjust column index

    // TODO_NEXT_PAGE_SELECTOR: selector for the "Next" pagination button.
    // VERIFY: FareHarbor may use a virtual scroll list — if rows load on scroll,
    // remove the pagination loop entirely and just scroll to bottom first.
    // Example: 'a[aria-label="Next page"]' or '.pagination .next'
    NEXT_PAGE_SELECTOR: 'TODO_NEXT_PAGE_SELECTOR',

    // How long (ms) to wait after clicking Next before scraping the new page.
    PAGE_WAIT_MS: 1500,

    // Set to true to only scrape the current page (skip pagination).
    SINGLE_PAGE_ONLY: false,
  };

  // ------------------------------------------------------------------
  // Guard: abort if selectors were not filled in
  // ------------------------------------------------------------------
  const unfilled = Object.entries(CONFIG)
    .filter(([k, v]) => typeof v === 'string' && v.startsWith('TODO_'))
    .map(([k]) => k);

  if (unfilled.length > 0) {
    console.error(
      '%c[FH Export] STOPPED — fill in these selectors first:',
      'color:red;font-weight:bold'
    );
    unfilled.forEach(k => console.error('  •', k));
    return;
  }

  // ------------------------------------------------------------------
  // Helper: extract text from an element relative to a parent
  // ------------------------------------------------------------------
  function cell(parent, selector) {
    const el = parent.querySelector(selector);
    return el ? el.textContent.trim() : '';
  }

  // ------------------------------------------------------------------
  // Helper: scrape all rows on the current page
  // ------------------------------------------------------------------
  function scrapeCurrentPage() {
    const rows = document.querySelectorAll(CONFIG.ROW_SELECTOR);
    // VERIFY: FareHarbor may inject a header row — filter rows that have no data
    const data = [];
    rows.forEach((row, i) => {
      const date      = cell(row, CONFIG.DATE_SELECTOR);
      const guest     = cell(row, CONFIG.GUEST_SELECTOR);
      const item      = cell(row, CONFIG.ITEM_SELECTOR);
      const partySize = cell(row, CONFIG.PARTY_SIZE_SELECTOR);
      const status    = cell(row, CONFIG.STATUS_SELECTOR);
      const total     = cell(row, CONFIG.TOTAL_SELECTOR);

      // Skip rows where every field is blank (header rows, spacer rows, etc.)
      if (!date && !guest && !item) return;

      data.push({ date, guest, item, partySize, status, total });
    });
    return data;
  }

  // ------------------------------------------------------------------
  // Helper: wait ms
  // ------------------------------------------------------------------
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ------------------------------------------------------------------
  // Main loop — page through results
  // ------------------------------------------------------------------
  console.log('%c[FH Export] Starting…', 'color:#6366f1;font-weight:bold');

  let allBookings = [];
  let pageNum = 1;

  while (true) {
    console.log(`[FH Export] Scraping page ${pageNum}…`);
    const pageData = scrapeCurrentPage();
    console.log(`[FH Export]   → found ${pageData.length} rows`);
    allBookings = allBookings.concat(pageData);

    if (CONFIG.SINGLE_PAGE_ONLY) break;

    // VERIFY: FareHarbor may use a virtual scroll list; pagination may differ.
    // If there is no Next button or it is disabled, stop.
    const nextBtn = document.querySelector(CONFIG.NEXT_PAGE_SELECTOR);
    if (!nextBtn || nextBtn.disabled || nextBtn.getAttribute('aria-disabled') === 'true') {
      console.log('[FH Export] No next page found — done.');
      break;
    }

    nextBtn.click();
    console.log(`[FH Export] Clicked Next, waiting ${CONFIG.PAGE_WAIT_MS}ms…`);
    await wait(CONFIG.PAGE_WAIT_MS);
    pageNum++;

    // Safety valve — stop after 50 pages to avoid infinite loops
    if (pageNum > 50) {
      console.warn('[FH Export] Hit 50-page safety limit. Set SINGLE_PAGE_ONLY=true if needed.');
      break;
    }
  }

  console.log(`[FH Export] Total bookings collected: ${allBookings.length}`);

  if (allBookings.length === 0) {
    console.warn(
      '%c[FH Export] No data found. Most likely cause: wrong ROW_SELECTOR.',
      'color:orange;font-weight:bold'
    );
    return;
  }

  // ------------------------------------------------------------------
  // Output A: CSV download
  // ------------------------------------------------------------------
  const headers = ['Date', 'Guest Name', 'Item / Tour', 'Party Size', 'Status', 'Total'];

  function escCsv(val) {
    const s = String(val ?? '');
    // Wrap in quotes if value contains comma, quote, or newline
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const csvRows = [
    headers.map(escCsv).join(','),
    ...allBookings.map(b =>
      [b.date, b.guest, b.item, b.partySize, b.status, b.total].map(escCsv).join(',')
    )
  ];
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `fareharbor-bookings-${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  console.log(`%c[FH Export] CSV downloaded: fareharbor-bookings-${today}.csv`, 'color:green;font-weight:bold');

  // ------------------------------------------------------------------
  // Output B: JSON to clipboard
  // ------------------------------------------------------------------
  try {
    await navigator.clipboard.writeText(JSON.stringify(allBookings, null, 2));
    console.log('%c[FH Export] JSON copied to clipboard. Paste into a text file.', 'color:green;font-weight:bold');
  } catch (e) {
    // Clipboard may be blocked in some browsers — fall back to console output
    console.warn('[FH Export] Clipboard copy failed. JSON logged below instead:');
    console.log(JSON.stringify(allBookings, null, 2));
  }

  console.log('%c[FH Export] Done.', 'color:#6366f1;font-weight:bold');

})();
```

---

## CAN'T DO WITHOUT HELP

These four things cannot be provided without owner access:

| Item | Why it matters |
|------|---------------|
| **FareHarbor admin URL** | Confirmed pattern is `https://fareharbor.com/alpacasibiza/` but the exact Bookings page path is unknown — could be `/dashboard/bookings/`, `/manage/`, or via a redirect after login. |
| **Login credentials** | Owner-only. Script would never be run with credentials stored anywhere. |
| **Actual DOM selectors** | FareHarbor's admin DOM is not publicly documented and has changed across versions. The `TODO_*` placeholders cannot be resolved without inspecting the live authenticated page. The five selectors listed above are the minimum required. |
| **Whether FareHarbor already has an export button** | FareHarbor Pro accounts have a built-in CSV/Excel export under Reports → Bookings. If that button exists in the owner's plan, this entire script is redundant. **Check this first before running anything.** |

---

## Known risks and caveats

- **Virtual scroll**: FareHarbor's admin may load rows on scroll rather than paginating. If `scrapeCurrentPage()` only returns the visible viewport rows, scroll to the bottom of the list first before running.
- **SPA navigation**: Clicking the Next-page button may not trigger a full DOM update before the script scrapes. Increase `PAGE_WAIT_MS` if rows look duplicated across pages.
- **Column order**: FareHarbor allows custom column configuration per account. The `nth-child` fallback indexes (4, 5, 6) are guesses — verify after inspection.
- **Not tested**: This is a generated template against an unverified DOM. Treat first run as a diagnostic — check the console output before trusting the CSV.
