# LMS Reference: TalentLMS

> TalentLMS-specific knowledge for SCORM validation and debugging.
> Used by L1 validate (Check 6) and L3 debug for LMS-specific context.

## Quick Facts

| Property | Value |
|----------|-------|
| **SCORM Version** | 1.2 only (no SCORM 2004, no xAPI, no cmi5) |
| **Content Sizing** | 1000x900px recommended (iframe dimensions) |
| **Scrolling** | Enabled — content can exceed iframe height |
| **Upload Format** | ZIP file upload via admin UI (no API upload) |
| **Max Package Size** | No documented limit (tested up to ~5MB per unit) |
| **Launch Mode** | Iframe (embedded in course page) |
| **Student ID Format** | Numeric string (e.g., "42") via `cmi.core.student_id` |
| **Student Name** | "Last, First" format via `cmi.core.student_name` |
| **API Object** | Found on `window.parent.API` (1-2 levels up) |

## Validation Rules (Used by L1 Check 6)

1. Window dimensions should target 1000x900px — content renders inside a fixed iframe
2. SCORM packages must be valid SCORM 1.2 (not 2004, not xAPI)
3. `imsmanifest.xml` must be at ZIP root level
4. Entity escaping required in XML titles (`&` -> `&amp;`)
5. `adlcp:scormtype="sco"` required on resource elements
6. Score values must be integers between 0-100

## API Limitations

- **Cannot return unit body content** — TalentLMS API does not expose the HTML body of SCORM units. Assignment instructions must be maintained in BOTH TalentLMS (student display) and Airtable (grading context) separately.
- **No programmatic SCORM upload** — ZIPs must be uploaded manually through the admin UI. No API endpoint for SCORM package upload exists.
- **Course ID not passed to SCORM** — TalentLMS does not automatically pass its course ID to SCORM content. Must be embedded in the URL query string at build time (`?course_id=xxx`).
- **No unit_id in SCORM context** — The unit identifier is not available via standard SCORM CMI data model. Must be passed via URL query param.

## Known Quirks

### 1. Student ID is Numeric String
TalentLMS returns numeric user IDs (e.g., `"42"`) for `cmi.core.student_id`, not email addresses or UUIDs. Backend code that expects UUID format will fail. Always coerce to string.

### 2. Lesson Status Handling
TalentLMS supports all SCORM 1.2 status values but reports them differently in the gradebook:
- `passed` — Shows as "Passed" with a green indicator, score visible
- `failed` — Shows as "Failed" with a red indicator, score visible
- `completed` — Shows as "Completed" but may show 0% in some report views
- **Recommendation:** Use `passed`/`failed` for graded units, `completed` for non-graded

### 3. suspend_data Persistence
TalentLMS correctly persists `cmi.suspend_data` between sessions. The 4096-char limit is enforced. Data survives browser close and re-open.

### 4. Session Timeout
TalentLMS has a configurable session timeout (default: varies by plan). If a student leaves the SCORM content open but idle, the session may expire. On return, `LMSInitialize` should be called again.

### 5. Score Rounding
TalentLMS displays scores as integers in the gradebook. If you set `cmi.core.score.raw` to `85.7`, it will display as `86`. Always round before writing to avoid confusion.

### 6. Multiple Attempts
TalentLMS supports multiple attempts for SCORM content. Each launch creates a new attempt. The "highest score" or "last attempt" policy is configurable per course.

### 7. Completion Status vs Score
Setting `cmi.core.lesson_status` to `completed` without setting a score results in 0% in some TalentLMS report views. For graded units, always set both score and `passed`/`failed` status.

## Testing Patterns

### SCORM Cloud (Primary Test Environment)
1. Go to https://cloud.scorm.com
2. Create a new application
3. Import ZIP via "Add Content"
4. Launch and test — SCORM Cloud shows detailed API call logs
5. Check the "Activity Details" tab for CMI data values

### TalentLMS Sandbox Import
1. Log in to TalentLMS admin
2. Navigate to a test course
3. Add a new unit > SCORM type
4. Upload ZIP file
5. Set iframe dimensions to 1000x900
6. Preview as a test student

### Browser DevTools Debugging
1. Open browser DevTools (F12)
2. In Console, check: `window.parent.API` — should show the SCORM API object
3. Monitor network tab for API calls to backend
4. Check for CORS errors in Console
5. Use Application tab > Session Storage for suspend_data inspection

### Debugging SCORM API Calls
Run these in the browser console while SCORM content is loaded:
```javascript
// Check if API is available
console.log('API:', window.parent.API);

// Read current values
console.log('student_id:', window.parent.API.LMSGetValue('cmi.core.student_id'));
console.log('student_name:', window.parent.API.LMSGetValue('cmi.core.student_name'));
console.log('lesson_status:', window.parent.API.LMSGetValue('cmi.core.lesson_status'));
console.log('score.raw:', window.parent.API.LMSGetValue('cmi.core.score.raw'));
console.log('suspend_data:', window.parent.API.LMSGetValue('cmi.suspend_data'));

// Check last error
console.log('last_error:', window.parent.API.LMSGetLastError());
```

## Error Scenarios

| Scenario | Symptom | Resolution |
|----------|---------|------------|
| Missing CORS headers | Blank iframe, CORS error in console | Set CORS_ORIGINS=* on backend, add vercel.json headers |
| API not found | "No LMS API found" in console | Check iframe nesting, verify API discovery walks parent chain |
| Score not persisting | Gradebook shows 0% | Call LMSCommit() before LMSFinish() |
| Blank page on voice tutor | No error, no content | Check voice config fallback — course_id mismatch |
| 500 looks like CORS | CORS error but curl shows 500 | Python crash masquerade — check vercel.json headers |
| suspend_data lost | Resume shows fresh state | Check data < 4096 chars, verify LMSCommit called |
