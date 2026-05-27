# SCORM Issue Knowledge Base

> 32 documented issues across 6 categories. Compiled from 9 internal build sessions + community research.
> Use Grep to search this file — do NOT load the entire file into context.
> Search pattern: `Grep pattern="KEYWORD" path="references/issue-kb.md" output_mode="content" -C=5`

## Issue Index

| ID | Title | Category | Severity |
|----|-------|----------|----------|
| SCORM-PKG-001 | XML Entity Escaping in Manifest Titles | Packaging | Critical |
| SCORM-PKG-002 | imsmanifest.xml Must Be at ZIP Root | Packaging | Critical |
| SCORM-PKG-003 | File Path Case Sensitivity | Packaging | Medium |
| SCORM-PKG-004 | Missing Required Manifest Elements | Packaging | High |
| SCORM-COR-001 | Vercel 500 Masquerades as CORS Error | CORS/Deploy | Critical |
| SCORM-COR-002 | CORS Middleware Must Allow All Origins | CORS/Deploy | Critical |
| SCORM-COR-003 | Vercel.json Belt-and-Suspenders Headers | CORS/Deploy | High |
| SCORM-COR-004 | Cross-Origin Iframe Embedding Blocked | CORS/Deploy | High |
| SCORM-COR-005 | Vercel Env Var Trailing Newline | CORS/Deploy | Medium |
| SCORM-API-001 | LMSInitialize Timing / Error 101 | SCORM API | Critical |
| SCORM-API-002 | suspend_data 4096 Character Limit | SCORM API | High |
| SCORM-API-003 | Must Commit Before Finish | SCORM API | High |
| SCORM-API-004 | API Discovery Window Chain Walking | SCORM API | Medium |
| SCORM-BKN-001 | n8n Callback URL Expression Error | Backend/n8n | Critical |
| SCORM-BKN-002 | feedback_html Max Length Too Short | Backend/n8n | High |
| SCORM-BKN-003 | Default course_id Placeholder Breaks Lookup | Backend/n8n | High |
| SCORM-BKN-004 | Supabase Column Name Mismatches | Backend/n8n | Medium |
| SCORM-BKN-005 | Vercel BackgroundTasks Do Not Work | Backend/n8n | Critical |
| SCORM-BKN-006 | n8n IF Node typeValidation Unreliable | Backend/n8n | Medium |
| SCORM-FEA-001 | JWT Token Scoped to Submission ID | Frontend/Auth | Medium |
| SCORM-FEA-002 | Voice Tutor Config Fallback Blank Page | Frontend/Auth | High |
| SCORM-FEA-003 | Polling Backoff State Management | Frontend/Auth | Medium |
| SCORM-FEA-004 | Unit Type Routing Default Fallback | Frontend/Auth | Low |
| SCORM-CMY-001 | Manifest Schema Version Mismatch | Community | High |
| SCORM-CMY-002 | JavaScript API Method Names Are Case-Sensitive | Community | High |
| SCORM-CMY-003 | Missing adlcp Namespace in Manifest | Community | Critical |
| SCORM-CMY-004 | Non-ASCII Characters in Manifest | Community | Medium |
| SCORM-CMY-005 | Popup Blocker Prevents API Discovery | Community | Medium |
| SCORM-CMY-006 | Session Time Format HHHH:MM:SS.SS | Community | Medium |
| SCORM-CMY-007 | Score Range Validation 0-100 | Community | High |
| SCORM-CMY-008 | Multiple SCO API Handle Isolation | Community | Medium |
| SCORM-CMY-009 | LMS Status Value Interpretation Varies | Community | High |

---

## Packaging (PKG)

### SCORM-PKG-001: XML Entity Escaping in Manifest Titles

**Category:** Packaging
**Severity:** Critical
**Source:** Internal (Session: SCORM Cloud testing, Feb 11)

**Symptoms:**
- SCORM Cloud import fails with XML parse error
- LMS rejects ZIP upload with "invalid manifest" error
- Build succeeds locally but fails on LMS import

**Root Cause:**
Bare `&` characters in `<title>` elements cause XML parsing failure. Common in unit names like "Q&A" which must be written as "Q&amp;A" in XML. The build-scorm.ts `generateManifest()` function uses string interpolation for titles without XML-escaping.

**Fix:**
1. In `build-scorm.ts`, ensure all title values are XML-entity-escaped before insertion:
   ```typescript
   const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
   // In generateManifest():
   title: escapeXml(unit.title)
   ```
2. If manually editing imsmanifest.xml: replace `&` with `&amp;`, `<` with `&lt;`, `>` with `&gt;`

**Prevention:**
- L1 validate checks for unescaped `&` in manifest titles
- Use title values without special XML characters when possible
- Template includes escaping by default

**Related:** SCORM-CMY-004

---

### SCORM-PKG-002: imsmanifest.xml Must Be at ZIP Root

**Category:** Packaging
**Severity:** Critical
**Source:** Both (Internal build + community reports)

**Symptoms:**
- LMS shows "No manifest found" or "Invalid SCORM package"
- ZIP uploads successfully but content never launches
- SCORM Cloud shows "No launchable content"

**Root Cause:**
The `imsmanifest.xml` file must be at the root level of the ZIP archive, not nested inside a subdirectory. Common mistake: zipping a folder (creating `folder/imsmanifest.xml`) instead of zipping the contents (creating `imsmanifest.xml` at root).

**Fix:**
1. Verify ZIP structure: `unzip -l package.zip | head -20`
2. First entry must be `imsmanifest.xml` (not `dist/imsmanifest.xml` or `build/imsmanifest.xml`)
3. In build-scorm.ts, files are added relative to the dist directory:
   ```typescript
   addDirToZip(zip, DIST, DIST); // baseDir = DIST ensures root-level paths
   ```

**Prevention:**
- L1 validate checks ZIP structure
- build-scorm.ts uses `relative(baseDir, filePath)` to ensure root-level paths

**Related:** SCORM-PKG-004

---

### SCORM-PKG-003: File Path Case Sensitivity

**Category:** Packaging
**Severity:** Medium
**Source:** External (community)

**Symptoms:**
- Content works on Windows/macOS but fails on Linux-based LMS servers
- 404 errors for assets (CSS, JS, images) after LMS upload
- Manifest references `Index.html` but file is `index.html`

**Root Cause:**
Windows and macOS file systems are case-insensitive, but most LMS servers run Linux (case-sensitive). If the `href` in imsmanifest.xml uses different casing than the actual filename, the LMS cannot find the file.

**Fix:**
1. Ensure all filenames in the ZIP are lowercase
2. Match the `href` attribute in imsmanifest.xml exactly to the filename
3. Verify: `unzip -l package.zip | grep -i index.html`

**Prevention:**
- Use lowercase for all file and directory names in SCORM packages
- build-scorm.ts preserves Vite's output casing (already lowercase)

---

### SCORM-PKG-004: Missing Required Manifest Elements

**Category:** Packaging
**Severity:** High
**Source:** External (community)

**Symptoms:**
- LMS reports "Invalid SCORM package" or "Unsupported SCORM version"
- Package imports but shows no launchable content
- Metadata section warnings in SCORM Cloud debug log

**Root Cause:**
SCORM 1.2 manifests require specific elements: `<metadata>` with `<schema>ADL SCORM</schema>` and `<schemaversion>1.2</schemaversion>`, at least one `<organization>` with one `<item>`, and at least one `<resource>` with `type="webcontent"` and `adlcp:scormtype="sco"`.

**Fix:**
1. Ensure manifest has all required elements (see scorm-12-spec.md for full template)
2. Verify `adlcp:scormtype="sco"` on the resource element (not "asset")
3. Ensure the `identifierref` on `<item>` matches the `identifier` on `<resource>`

**Prevention:**
- Use the imsmanifest-entry.xml template which includes all required elements
- L1 validate checks for required elements

**Related:** SCORM-CMY-003

---

## CORS/Deploy (COR)

### SCORM-COR-001: Vercel 500 Masquerades as CORS Error

**Category:** CORS/Deploy
**Severity:** Critical
**Source:** Internal (Session: SCORM Cloud testing, Feb 11)

**Symptoms:**
- Browser console shows CORS error on API calls
- Backend logs show Python crash (unhandled exception)
- `curl` to the same endpoint returns 500 with stack trace
- Frontend shows generic "Network Error" or "CORS policy" message

**Root Cause:**
When Python crashes on Vercel serverless, Vercel returns its own generic 500 response WITHOUT any Python middleware headers (including CORS). The browser sees a response missing `Access-Control-Allow-Origin` and reports it as a CORS violation, completely masking the real 500 error.

**Fix:**
1. Add CORS headers to `vercel.json` for ALL response codes:
   ```json
   {
     "headers": [
       {
         "source": "/api/(.*)",
         "headers": [
           { "key": "Access-Control-Allow-Origin", "value": "*" },
           { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" },
           { "key": "Access-Control-Allow-Headers", "value": "Content-Type,Authorization,X-API-Key" }
         ]
       }
     ]
   }
   ```
2. Also keep CORSMiddleware in Python as the primary CORS handler for successful responses
3. Debug by testing with `curl` directly — bypasses browser CORS enforcement

**Prevention:**
- Always configure vercel.json headers (belt-and-suspenders with Python middleware)
- Wrap all route handlers in try/except that returns HTTPException (which includes CORS headers)
- Test error paths by forcing 500 responses

**Related:** SCORM-COR-002, SCORM-COR-003

---

### SCORM-COR-002: CORS Middleware Must Allow All Origins

**Category:** CORS/Deploy
**Severity:** Critical
**Source:** Internal (Session: SCORM Cloud testing, Feb 11)

**Symptoms:**
- SCORM content works on localhost but fails in LMS
- SCORM Cloud (cloud.scorm.com) blocked by CORS
- TalentLMS iframe shows blank page with CORS errors in console

**Root Cause:**
Backend originally restricted `CORS_ORIGINS` to localhost only. SCORM content is embedded in cross-origin iframes by LMS platforms (cloud.scorm.com, talentlms.com, etc.), each with different origins. Since we cannot predict all LMS domains, origins must be set to `*`.

**Fix:**
1. Set `CORS_ORIGINS=*` in Vercel environment variables
2. Configure CORSMiddleware with `allow_origins=["*"]`:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],
       allow_credentials=False,  # Must be False when origins is *
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```
3. Note: `allow_credentials=True` is incompatible with `allow_origins=["*"]`

**Prevention:**
- Default new backends to `CORS_ORIGINS=*` when building SCORM apps
- Test in SCORM Cloud before deploying to TalentLMS

**Related:** SCORM-COR-001, SCORM-COR-004

---

### SCORM-COR-003: Vercel.json Belt-and-Suspenders Headers

**Category:** CORS/Deploy
**Severity:** High
**Source:** Internal (Session: SCORM Cloud testing, Feb 11)

**Symptoms:**
- Intermittent CORS errors on error responses
- OPTIONS preflight succeeds but actual request fails on 500
- Python middleware headers missing on crash responses

**Root Cause:**
Python CORSMiddleware only adds headers when Python actually processes the request. If the application crashes before the middleware runs (import errors, syntax errors, memory limits), Vercel returns a bare 500 with no CORS headers. The vercel.json headers config acts as a fallback that Vercel applies at the edge, regardless of Python execution.

**Fix:**
Add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type,Authorization,X-API-Key" }
      ]
    }
  ]
}
```

**Prevention:**
- Include vercel.json CORS headers in every Vercel-deployed backend
- This is not a replacement for CORSMiddleware — both are needed

**Related:** SCORM-COR-001

---

### SCORM-COR-004: Cross-Origin Iframe Embedding Blocked

**Category:** CORS/Deploy
**Severity:** High
**Source:** Both (Internal + community)

**Symptoms:**
- SCORM content loads in browser directly but shows blank in LMS iframe
- Console shows `X-Frame-Options` or `Content-Security-Policy` errors
- LMS shows "Refused to display in a frame"

**Root Cause:**
Some hosting configurations include `X-Frame-Options: DENY` or `SAMEORIGIN` headers, preventing the content from being embedded in LMS iframes. SCORM content MUST be embeddable in cross-origin iframes.

**Fix:**
1. Remove `X-Frame-Options` header from server config
2. Or set it to `ALLOW-FROM` with the LMS domain (deprecated in modern browsers)
3. Use `Content-Security-Policy: frame-ancestors *` instead (modern approach)
4. In Vercel, ensure no framework plugin adds X-Frame-Options

**Prevention:**
- Never set X-Frame-Options on SCORM content servers
- Test embedding in an iframe from a different domain before LMS deployment

**Related:** SCORM-COR-002

---

### SCORM-COR-005: Vercel Env Var Trailing Newline

**Category:** CORS/Deploy
**Severity:** Medium
**Source:** Internal (Feb 11)

**Symptoms:**
- httpx throws "Invalid non-printable ASCII character" error
- URLs work when pasted in browser but fail in Python
- Vercel env var looks correct in dashboard but has invisible `\n`

**Root Cause:**
Using `echo "value" | vercel env add` appends a trailing newline character (`\n`) to the value. This invisible character causes URL parsing to fail in httpx and similar HTTP clients.

**Fix:**
1. Use `printf` instead of `echo`:
   ```bash
   printf '%s' 'https://your-url.com' | vercel env add VAR_NAME production
   ```
2. If already set, delete and re-add:
   ```bash
   vercel env rm VAR_NAME production
   printf '%s' 'correct-value' | vercel env add VAR_NAME production
   ```
3. Verify with: `vercel env pull .env.vercel && cat -A .env.vercel | grep VAR_NAME`

**Prevention:**
- Always use `printf '%s'` for Vercel env vars in scripts
- After setting, pull and inspect with `cat -A` to see invisible characters

---

## SCORM API (API)

### SCORM-API-001: LMSInitialize Timing / Error 101

**Category:** SCORM API
**Severity:** Critical
**Source:** Both (Internal session Feb 11 + community)

**Symptoms:**
- `LMSInitialize("")` returns `"false"`
- `LMSGetLastError()` returns `"101"` (General Exception)
- Content shows blank or "Initialization failed" error
- Works on second page load (race condition)

**Root Cause:**
Some LMS platforms load the SCORM API object before it is ready to accept calls. The API handle is discoverable via `window.parent.API`, but calling `LMSInitialize` immediately fails because the LMS runtime hasn't finished its own initialization. This is a race condition between content loading and LMS readiness.

**Fix:**
Use `initializeAsync()` with retry pattern:
```typescript
async initializeAsync(maxRetries = 3, delayMs = 500): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (attempt > 1) await new Promise(r => setTimeout(r, delayMs));
    this.api = findAPI(window);
    if (!this.api) { if (attempt < maxRetries) continue; /* fallback to mock */ }
    const result = this.api.LMSInitialize('');
    if (result === 'true') return true;
  }
  return false;
}
```

**Prevention:**
- Always use `initializeAsync()` instead of `initialize()` for production SCORM
- Set retry count to 3 minimum, delay to 500ms
- Log retry attempts for debugging

**Related:** SCORM-API-004

---

### SCORM-API-002: suspend_data 4096 Character Limit

**Category:** SCORM API
**Severity:** High
**Source:** Both (Internal + SCORM 1.2 spec)

**Symptoms:**
- `LMSSetValue('cmi.suspend_data', data)` returns `"false"`
- Resume state lost between sessions
- Data silently truncated by some LMS implementations

**Root Cause:**
SCORM 1.2 specification limits `cmi.suspend_data` to 4096 characters. Some LMS enforce this strictly (reject writes), others truncate silently. Storing JSON objects, base64 data, or verbose state easily exceeds this limit.

**Fix:**
1. Add size check before writing:
   ```typescript
   setSuspendData(data: string): boolean {
     if (data.length > 4096) {
       console.warn('[SCORM] suspend_data exceeds 4096 char limit. Truncating.');
       data = data.substring(0, 4096);
     }
     return this.setValue('cmi.suspend_data', data);
   }
   ```
2. Minimize stored data — use IDs instead of full objects
3. Use compression (LZString) if data is naturally large

**Prevention:**
- Keep suspend_data minimal: `{ submission_id, attempt_no, v }` (ESEI pattern)
- Monitor size in development console
- scorm-api.ts already includes the 4096-char guard

**Related:** SCORM-CMY-006

---

### SCORM-API-003: Must Commit Before Finish

**Category:** SCORM API
**Severity:** High
**Source:** External (community best practice)

**Symptoms:**
- Score and status not persisted in LMS after completion
- LMS shows "not attempted" despite student completing the content
- Data visible during session but lost after close

**Root Cause:**
`LMSSetValue()` writes data to a local buffer. `LMSCommit("")` flushes that buffer to the LMS database. `LMSFinish("")` ends the session. If you call `LMSFinish` without first calling `LMSCommit`, pending data may be lost. Some LMS auto-commit on finish, but this is not guaranteed by the spec.

**Fix:**
Always call commit before finish:
```typescript
scorm.setScore(grade, 0, 100);
scorm.setStatus('passed');
scorm.commit();  // Flush to LMS
scorm.finish();  // End session
```

**Prevention:**
- Template pattern: commit-then-finish is enforced in all ESEI units
- Never call `LMSFinish` without a preceding `LMSCommit`

**Related:** SCORM-API-001

---

### SCORM-API-004: API Discovery Window Chain Walking

**Category:** SCORM API
**Severity:** Medium
**Source:** Both (Internal implementation + community)

**Symptoms:**
- `window.API` is undefined
- Content works in some LMS but not others
- SCORM API handle found in SCORM Cloud but not in TalentLMS (or vice versa)

**Root Cause:**
Different LMS platforms place the SCORM API object at different levels of the iframe hierarchy. Some put it on the direct parent, others on the top window, and some use popup windows (opener). The discovery algorithm must walk up the `window.parent` chain (up to 10 levels) AND check `window.opener`.

**Fix:**
Use the standard discovery pattern from scorm-api.ts:
```typescript
function findAPI(win: Window): SCORM12API | null {
  let currentWindow = win;
  let attempts = 0;
  if ((currentWindow as any).API) return (currentWindow as any).API;
  while (currentWindow.parent && currentWindow.parent !== currentWindow && attempts < 10) {
    attempts++;
    currentWindow = currentWindow.parent;
    if ((currentWindow as any).API) return (currentWindow as any).API;
  }
  if (win.opener) {
    const openerAPI = findAPI(win.opener);
    if (openerAPI) return openerAPI;
  }
  return null;
}
```

**Prevention:**
- Always use the shared `scorm-api.ts` wrapper — never access `window.API` directly
- The 10-level limit prevents infinite loops in weird iframe configurations

**Related:** SCORM-API-001, SCORM-CMY-005

---

## Backend/n8n (BKN)

### SCORM-BKN-001: n8n Callback URL Expression Error

**Category:** Backend/n8n
**Severity:** Critical
**Source:** Internal (Session: Feb 13, grading pipeline debugging)

**Symptoms:**
- n8n grading workflow completes but Supabase submissions table never updates
- Backend logs show 400 error: "Invalid submission_id format"
- n8n execution shows URL ending in `/submissions/undefined/grade`

**Root Cause:**
The n8n "Update Backend" HTTP Request node used `$json.submission_id` in the URL expression. After the Airtable Update node, `$json` contains the Airtable output format `{id, createdTime, fields: {...}}` — where `submission_id` is nested under `.fields`. JavaScript string concatenation silently converts `undefined` to the string `"undefined"`, creating URL `/submissions/undefined/grade`.

**Fix:**
Change the n8n URL expression to reference the earlier node that has the raw submission_id:
```
{{ $('Prepare Results').item.json.submission_id }}
```
Or use the fields path: `{{ $json.fields.submission_id }}`

Also add UUID validation in the backend:
```python
def _validate_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False
```

**Prevention:**
- Always verify n8n data context after Airtable nodes — output format wraps everything in `.fields`
- Add UUID validation guards on all Supabase query endpoints
- Test callback URLs with curl before deploying n8n changes

**Related:** SCORM-BKN-004

---

### SCORM-BKN-002: feedback_html Max Length Too Short

**Category:** Backend/n8n
**Severity:** High
**Source:** Internal (Session: Feb 13)

**Symptoms:**
- n8n grading callback returns 422 Validation Error
- Error message: "ensure this value has at most 4000 characters"
- Grading works for short feedback but fails for detailed AI-generated HTML

**Root Cause:**
The Pydantic `GradeRequest` model had `max_length=4000` on the `feedback_html` field. n8n's AI grading prompt generates detailed HTML feedback that routinely exceeds 4000 characters (often 5000-8000 chars). Supabase stores this as TEXT (unlimited), so the constraint was only at the API validation layer.

**Fix:**
Bump the max_length in `schemas.py`:
```python
feedback_html: str = Field(default="", max_length=10000)
```

**Prevention:**
- Set generous max_length values for AI-generated content fields
- Monitor actual content sizes via Supabase queries
- Supabase TEXT column has no practical limit

---

### SCORM-BKN-003: Default course_id Placeholder Breaks Lookup

**Category:** Backend/n8n
**Severity:** High
**Source:** Internal (Session: SCORM Cloud testing)

**Symptoms:**
- n8n grading runs but AI grades without course context (generic feedback)
- Airtable Course_Master lookup returns empty results
- Submission has `course_id: "default_course"` and `unit_id: "default_unit"`

**Root Cause:**
SCORM frontend sends placeholder IDs (`default_course`, `default_unit`) when the URL query parameters are not set. These placeholder IDs don't match any real course in Airtable Course_Master, so the n8n Airtable lookup node returns no results and the AI grades without course content context.

**Fix:**
1. Pass real course_id via SCORM URL: `index.html?unit_type=assignment&course_id=REAL_ID`
2. Use `--course-id` flag in build-scorm.ts: `npx tsx build-scorm.ts --course-id abc123`
3. Backend can fallback to any active course config (like voice tutor pattern)

**Prevention:**
- Always build SCORM ZIPs with `--course-id` flag for production
- Add validation in backend: warn when default_course/default_unit is received
- Consider making course_id required in the launch endpoint

**Related:** SCORM-FEA-002

---

### SCORM-BKN-004: Supabase Column Name Mismatches

**Category:** Backend/n8n
**Severity:** Medium
**Source:** Internal (multiple sessions)

**Symptoms:**
- Supabase query fails with "column does not exist" error
- Backend returns 500 on insert/update operations
- SQL error referencing a column name that doesn't match the schema

**Root Cause:**
Column names in the code don't match the actual Supabase schema. Common mismatches: `grading_run_id` (exists), `airtable_record_id` (does not exist), `rubric` (defaults to `[]` not null). File-related fields use the `file_` prefix convention (e.g., `file_storage_key` not `storage_key`).

**Fix:**
1. Check actual schema: `supabase.table('submissions').select('*').limit(1).execute()`
2. Use the correct column names from the migration files
3. For `rubric`, use `[]` not `None` when clearing:
   ```python
   rubric=data.rubric_json or []  # Not None
   ```

**Prevention:**
- Reference migration SQL files for authoritative column names
- Use Supabase dashboard to verify schema before coding
- Follow the `file_` prefix convention for all file metadata columns

**Related:** SCORM-BKN-001

---

### SCORM-BKN-005: Vercel BackgroundTasks Do Not Work

**Category:** Backend/n8n
**Severity:** Critical
**Source:** Internal (Session: backend deployment)

**Symptoms:**
- BackgroundTask function never executes
- Webhook notifications not sent after response
- No errors — tasks simply vanish silently

**Root Cause:**
FastAPI `BackgroundTasks` rely on the process staying alive after the response is sent. Vercel serverless functions freeze the lambda immediately after the response, killing any pending background tasks. This is fundamental to how serverless works.

**Fix:**
Execute tasks inline before returning the response:
```python
# BAD: background_tasks.add_task(send_webhook, data)
# GOOD: await send_webhook(data)
```
If the task is slow, move it to an external queue (n8n webhook, Supabase Edge Function, or async trigger).

**Prevention:**
- Never use FastAPI BackgroundTasks on Vercel
- For async work, use n8n webhooks or Supabase Edge Functions
- Comment in codebase: `# NOTE: No BackgroundTasks on Vercel serverless`

---

### SCORM-BKN-006: n8n IF Node typeValidation Unreliable

**Category:** Backend/n8n
**Severity:** Medium
**Source:** Internal (Session: n8n pipeline debugging)

**Symptoms:**
- IF node routes to wrong branch despite condition being met
- `typeValidation=strict` mode fails with Airtable-sourced data
- Items go to "false" branch when they should go to "true"

**Root Cause:**
n8n IF node v2.2 with `typeValidation=strict` performs JavaScript strict type checking. Airtable outputs often return numbers as strings or vice versa, causing type mismatches. For example, checking `status === "submitted"` fails if Airtable returns it as a different type internally.

**Fix:**
Remove the IF node entirely. Use Airtable `filterByFormula` to pre-filter records:
```
filterByFormula: {status} = 'submitted'
```
This is more reliable and reduces n8n node complexity.

**Prevention:**
- Prefer filtering at the data source (Airtable filterByFormula, SQL WHERE) over n8n IF nodes
- If IF node is necessary, use `typeValidation=loose` mode
- Don't mix `onError=continueErrorOutput` with upstream `continueOnFail`

---

## Frontend/Auth (FEA)

### SCORM-FEA-001: JWT Token Scoped to Submission ID

**Category:** Frontend/Auth
**Severity:** Medium
**Source:** Internal (architecture analysis)

**Symptoms:**
- API calls to other submissions return 403
- Cannot access endpoints outside the current submission scope
- Token works for one unit but fails for cross-unit API calls

**Root Cause:**
The SCORM launch endpoint returns a JWT scoped to a specific `submission_id`. This token can only access endpoints related to that submission. Cross-unit features (like portfolio aggregation) need either a broader token or separate authentication.

**Fix:**
For cross-unit features, use the launch endpoint pattern that returns a broader session token:
```python
# Portfolio, Grade Report, Transcript endpoints use student_id scope
session_token = create_session_token(student_id=student_id, scope="read")
```

**Prevention:**
- Design token scopes based on unit needs before building
- Viewer units (pathway, grade report, transcript) use broader tokens
- Assignment units use narrow submission-scoped tokens

**Related:** SCORM-FEA-004

---

### SCORM-FEA-002: Voice Tutor Config Fallback Blank Page

**Category:** Frontend/Auth
**Severity:** High
**Source:** Internal (Session: SCORM Cloud testing, Feb 11)

**Symptoms:**
- Voice tutor unit shows completely blank page
- No error message, no loading indicator
- Console shows successful SCORM init but null config response

**Root Cause:**
Frontend sends `course_id: 'default_course'` (placeholder). Backend queries `voice_tutor_config` table for that exact course_id, gets no results, returns null config. Frontend doesn't handle null config — renders nothing.

**Fix:**
1. Backend falls back to any active config when exact course_id match fails:
   ```python
   config = await get_config(course_id)
   if not config:
       config = await get_any_active_config()  # Fallback
   ```
2. Frontend shows error message when config is null:
   ```tsx
   if (!state.config) {
     return <ErrorMessage text="Voice tutor not configured for this course" />;
   }
   ```

**Prevention:**
- Always handle null/missing config in frontend components
- Backend should provide graceful fallback for missing course-specific configs
- Build ZIPs with `--course-id` to avoid placeholder issues

**Related:** SCORM-BKN-003

---

### SCORM-FEA-003: Polling Backoff State Management

**Category:** Frontend/Auth
**Severity:** Medium
**Source:** Internal (architecture pattern)

**Symptoms:**
- Excessive API calls (hitting rate limits)
- Stale results shown (polling too slowly)
- Memory leaks from uncleared intervals on unmount

**Root Cause:**
Polling for grading results requires careful state management: starting at 3-second intervals, backing off to 10s then 30s, adding jitter to prevent thundering herd, and cleaning up on component unmount. Missing cleanup causes memory leaks; missing backoff causes rate limiting.

**Fix:**
Use the backoff-with-jitter pattern:
```typescript
const delays = [3000, 3000, 3000, 10000, 10000, 30000]; // escalating
const jitter = Math.random() * 1000; // 0-1s jitter
useEffect(() => {
  let timeout: number;
  const poll = async (attempt: number) => {
    const result = await fetchStatus(submissionId);
    if (result.status === 'graded') { setResult(result); return; }
    const delay = delays[Math.min(attempt, delays.length - 1)] + jitter;
    timeout = window.setTimeout(() => poll(attempt + 1), delay);
  };
  poll(0);
  return () => clearTimeout(timeout);
}, [submissionId]);
```

**Prevention:**
- Always clean up timers in useEffect return function
- Use escalating delays: 3s -> 10s -> 30s
- Add random jitter (0-1s) to prevent synchronized polling

---

### SCORM-FEA-004: Unit Type Routing Default Fallback

**Category:** Frontend/Auth
**Severity:** Low
**Source:** Internal (architecture)

**Symptoms:**
- Wrong unit renders when URL has no `unit_type` param
- Assignment app shows when expecting a different unit type
- Typo in unit_type causes fallback to assignment

**Root Cause:**
`getUnitTypeFromUrl()` returns `'assignment'` as the default when no `unit_type` query parameter is present or when the value doesn't match any known unit type. This is by design (backward compatibility), but can cause confusion during development.

**Fix:**
This is expected behavior. For debugging, check the URL:
```typescript
const params = new URLSearchParams(window.location.search);
console.log('unit_type:', params.get('unit_type'));
```

**Prevention:**
- Always include `unit_type` in imsmanifest.xml href
- Verify unit_type values match the `UnitType` union in types.ts
- build-scorm.ts automatically sets the correct unit_type in each ZIP's manifest

---

## Community (CMY)

### SCORM-CMY-001: Manifest Schema Version Mismatch

**Category:** Community
**Severity:** High
**Source:** External (community forums, common mistake)

**Symptoms:**
- LMS rejects package with "unsupported version" error
- SCORM Cloud shows "SCORM 2004 detected" for a 1.2 package
- Manifest validates but content doesn't launch

**Root Cause:**
Using SCORM 2004 XML namespace URIs or schema versions in a SCORM 1.2 manifest. The `<schemaversion>` must be `1.2` (not `1.3`, `2004 3rd Edition`, etc.) and the namespace must be `http://www.imsproject.org/xsd/imscp_rootv1p1p2`.

**Fix:**
Use the correct SCORM 1.2 manifest header:
```xml
<manifest xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
```

**Prevention:**
- Use the imsmanifest-entry.xml template (has correct SCORM 1.2 headers)
- Don't copy manifest templates from SCORM 2004 examples

**Related:** SCORM-PKG-004

---

### SCORM-CMY-002: JavaScript API Method Names Are Case-Sensitive

**Category:** Community
**Severity:** High
**Source:** External (community, frequent beginner mistake)

**Symptoms:**
- `lmsinitialize("")` returns undefined or throws TypeError
- API object exists but method calls fail
- Works in some LMS but not others

**Root Cause:**
SCORM 1.2 API method names are case-sensitive: `LMSInitialize`, `LMSGetValue`, `LMSSetValue`, `LMSCommit`, `LMSFinish`. Using lowercase (`lmsinitialize`) or camelCase (`lmsInitialize`) will fail.

**Fix:**
Use the exact method names:
- `LMSInitialize("")`
- `LMSFinish("")`
- `LMSGetValue(element)`
- `LMSSetValue(element, value)`
- `LMSCommit("")`
- `LMSGetLastError()`
- `LMSGetErrorString(errorCode)`
- `LMSGetDiagnostic(errorCode)`

**Prevention:**
- Use the `scorm-api.ts` wrapper which has the correct method names
- Never call the LMS API directly — always go through the wrapper

---

### SCORM-CMY-003: Missing adlcp Namespace in Manifest

**Category:** Community
**Severity:** Critical
**Source:** External (community)

**Symptoms:**
- LMS ignores the `scormtype` attribute on resources
- Content treated as "asset" instead of "SCO" (no API communication)
- Manifest validates as generic IMS CP but not as SCORM

**Root Cause:**
The `adlcp:scormtype="sco"` attribute requires the `adlcp` namespace declaration on the `<manifest>` element. Without `xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"`, XML parsers ignore the `adlcp:scormtype` attribute.

**Fix:**
Add the namespace to the manifest root element:
```xml
<manifest identifier="my-course"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
```

**Prevention:**
- Use the complete manifest template from scorm-12-spec.md
- L1 validate checks for adlcp namespace presence

**Related:** SCORM-PKG-004, SCORM-CMY-001

---

### SCORM-CMY-004: Non-ASCII Characters in Manifest

**Category:** Community
**Severity:** Medium
**Source:** External (community, i18n issues)

**Symptoms:**
- XML parse error on LMS import
- Special characters (accents, symbols) show as garbage
- Manifest works in some XML parsers but fails in others

**Root Cause:**
Manifest declares `encoding="UTF-8"` but the file is saved in a different encoding (Latin-1, Windows-1252), or non-ASCII characters are not properly XML-escaped. This is common with course titles in non-English languages.

**Fix:**
1. Ensure the file is actually saved as UTF-8 (not UTF-8 with BOM)
2. XML-escape any special characters: `&amp;` for `&`, `&lt;` for `<`, `&gt;` for `>`
3. Accented characters (e, u, etc.) are fine in UTF-8 — just ensure the file encoding matches

**Prevention:**
- build-scorm.ts writes manifests as UTF-8 by default
- Avoid BOM (Byte Order Mark) in manifest files

**Related:** SCORM-PKG-001

---

### SCORM-CMY-005: Popup Blocker Prevents API Discovery

**Category:** Community
**Severity:** Medium
**Source:** External (community)

**Symptoms:**
- SCORM API not found in popup/new-window launch mode
- `findAPI(window)` returns null despite LMS having the API
- Content works in iframe mode but fails in popup mode

**Root Cause:**
Some LMS launch SCORM content in a popup window. The API handle is on the `window.opener` (the window that opened the popup). If the browser's popup blocker interferes, `window.opener` may be null or inaccessible due to cross-origin restrictions.

**Fix:**
1. Check `window.opener` in the discovery function (ESEI pattern already does this)
2. If opener is blocked, show user message: "Please allow popups for this site"
3. Some LMS allow configuration to use iframe instead of popup

**Prevention:**
- The `findAPI()` function in scorm-api.ts already checks `window.opener`
- Test in both iframe and popup launch modes during SCORM Cloud validation

**Related:** SCORM-API-004

---

### SCORM-CMY-006: Session Time Format HHHH:MM:SS.SS

**Category:** Community
**Severity:** Medium
**Source:** External (SCORM 1.2 spec / community)

**Symptoms:**
- `LMSSetValue('cmi.core.session_time', time)` returns `"false"`
- Session duration not recorded in LMS
- LMS shows "0:00:00" for session time

**Root Cause:**
SCORM 1.2 requires session_time in `HHHH:MM:SS.SS` format (4-digit hours, 2-digit minutes, 2-digit seconds, optional 2-digit hundredths). Common mistakes: using `HH:MM:SS` (2-digit hours), using milliseconds, or using ISO 8601 duration format.

**Fix:**
Format the time correctly:
```typescript
function formatSessionTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(hours).padStart(4, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
// Example: 3661 seconds -> "0001:01:01"
```

**Prevention:**
- Use a helper function for time formatting
- Test with sessions > 1 hour to catch 2-digit vs 4-digit hour issues

---

### SCORM-CMY-007: Score Range Validation 0-100

**Category:** Community
**Severity:** High
**Source:** External (community / LMS behavior)

**Symptoms:**
- `LMSSetValue('cmi.core.score.raw', score)` returns `"false"`
- LMS rejects score values or shows unexpected results
- Score shows correctly in some LMS but not others

**Root Cause:**
While SCORM 1.2 spec allows `cmi.core.score.raw` to be any number between `cmi.core.score.min` and `cmi.core.score.max`, many LMS implementations only accept integer values between 0 and 100. Floating point scores, negative scores, or scores > 100 may be rejected.

**Fix:**
1. Round scores to integers: `Math.round(score)`
2. Clamp to 0-100 range: `Math.max(0, Math.min(100, score))`
3. Set min/max explicitly:
   ```typescript
   scorm.setScore(Math.round(grade), 0, 100);
   ```

**Prevention:**
- Always round and clamp scores before writing
- scorm-api.ts `setScore()` already rounds: `String(Math.round(raw))`

---

### SCORM-CMY-008: Multiple SCO API Handle Isolation

**Category:** Community
**Severity:** Medium
**Source:** External (community, multi-SCO packages)

**Symptoms:**
- SCO A's data appears in SCO B
- Score from one unit overwrites another
- Only the last-launched SCO's data persists

**Root Cause:**
In multi-SCO packages (multiple items in the manifest), each SCO must independently discover and initialize the API. The LMS creates separate data contexts for each SCO, but if SCOs share JavaScript globals or cache the API handle incorrectly, data can leak between SCOs.

**Fix:**
ESEI uses per-unit ZIPs (single SCO per package), which avoids this entirely. For multi-SCO packages:
1. Each SCO must call `findAPI()` independently
2. Don't cache the API handle in a shared global
3. Always call `LMSFinish()` before launching the next SCO

**Prevention:**
- ESEI pattern: one SCO per ZIP (per-unit ZIPs) eliminates multi-SCO issues
- If multi-SCO is needed, use separate script contexts per SCO

---

### SCORM-CMY-009: LMS Status Value Interpretation Varies

**Category:** Community
**Severity:** High
**Source:** External (community / cross-LMS testing)

**Symptoms:**
- LMS shows "completed" but expected "passed"
- Completion percentage incorrect
- Different behavior between TalentLMS, Moodle, and SCORM Cloud

**Root Cause:**
Different LMS platforms interpret `cmi.core.lesson_status` values differently:
- Some treat `completed` as 100% progress, `passed` as grade achievement
- Some require `passed` for full credit, `completed` alone gives 0 score
- TalentLMS uses both values but reports them differently in gradebooks

**Fix:**
For graded units, set BOTH score and status:
```typescript
scorm.setScore(grade, 0, 100);
scorm.setStatus(grade >= passThreshold ? 'passed' : 'failed');
```
For non-graded units (surveys, viewers):
```typescript
scorm.setCompletionStatus('completed');
// No score needed
```

**Prevention:**
- Graded units: always use `passed`/`failed` (not `completed`)
- Non-graded units: always use `completed`
- Test in multiple LMS platforms to verify behavior

**Related:** SCORM-API-003
