# SCORM Command -- Layer Definitions

## Layer 1: Quick Validate (Weight: 30%)

Run these 6 checks sequentially. Each returns PASS, FAIL, or WARN.

### Check 1: imsmanifest.xml

Read `{SCORM_ROOT}/public/imsmanifest.xml`.

- FAIL if file missing
- FAIL if XML is malformed (unclosed tags)
- FAIL if `&` appears unescaped in titles (should be `&amp;`)
- WARN if `identifier` attributes are not unique
- PASS otherwise

### Check 2: SCORM API Wrapper

Read `{SCORM_ROOT}/src/lib/scorm-api.ts` (or `.tsx`).

- FAIL if file missing
- WARN if no `LMSInitialize` call found
- WARN if no retry/polling logic for API discovery
- Check exports: `LMSSetValue`, `LMSGetValue`, `LMSCommit`, `LMSFinish`
- PASS if all exports present

### Check 3: Dependencies

- FAIL if `{SCORM_ROOT}/node_modules/` missing (suggest: `npm install`)
- FAIL if `{SCORM_ROOT}/vite.config.ts` missing
- FAIL if `{SCORM_ROOT}/tsconfig.json` missing
- Check `package.json` for required deps: `jszip`, `vite`, `react`, `typescript`
- WARN for each missing required dep
- PASS if all present

### Check 4: Unit Routing

Read `{SCORM_ROOT}/src/App.tsx` to extract unit type routes.

- Parse the `unitComponents` record or lazy import map
- For each unit type referenced, verify the component file exists in `src/units/` or `src/`
- Read `{SCORM_ROOT}/scripts/build-scorm.ts` and extract the `UNITS` array
- FAIL if a unit in UNITS has no matching component in App.tsx
- WARN if App.tsx has a unit not in UNITS (orphaned component)
- PASS if all match

### Check 5: File Sizes

- Glob `{SCORM_ROOT}/public/**/*` and `{SCORM_ROOT}/src/**/*`
- WARN if any single file > 50MB
- Check `{SCORM_ROOT}/dist/` if it exists: WARN if total size > 200MB
- PASS if all within limits

### Check 6: LMS Reference

Read the active LMS reference file: `references/lms-talentlms.md` (from this skill's directory).

- If reference file exists, extract LMS-specific validation rules
- For TalentLMS: check that SCORM sizing is 1000x900px (look for window dimensions in the codebase)
- WARN if LMS-specific rules are violated
- PASS if no LMS reference exists (graceful degradation)

### L1 Scoring

```
l1_score = 100
l1_score -= (critical_failures * 10)
l1_score -= (warnings * 5)
Floor at 0.
```

### L1 Output

```
## L1: Quick Validate (Score: {N}/100)

  [PASS] imsmanifest.xml -- well-formed, entities escaped
  [FAIL] SCORM API -- missing LMSCommit export
  [PASS] Dependencies -- all required packages present
  [WARN] Unit routing -- orphaned component: voice-tutor
  [PASS] File sizes -- all within limits
  [PASS] LMS reference -- TalentLMS rules satisfied

Issues: {N} critical, {N} warnings
```

---

## Layer 2: Standard Build (Weight: 30%)

### Pre-Build Gate

L1 score must be >= 60. If below, abort with:
```
Build aborted: L1 score {N}/100 (minimum: 60). Fix the above issues first.
```

### Scaffold Sub-Workflow (scaffold mode only)

If mode is `scaffold`:

1. Read the unit name from arguments
2. Generate a valid `unitType` slug: lowercase, underscores (e.g., "Study Guide" -> "study_guide")
3. Read templates from this skill's `templates/` directory:
   - Read `templates/base-unit.tsx` as the base component template
   - Read `templates/imsmanifest-entry.xml` for manifest snippet
4. Create the component file at `{SCORM_ROOT}/src/units/{unit-type}.tsx`
   - Replace template placeholders: `__UNIT_NAME__`, `__UNIT_TITLE__`
5. Update `{SCORM_ROOT}/src/App.tsx`:
   - Add lazy import: `const NewUnit = lazy(() => import('./units/{unit-type}'));`
   - Add to `unitComponents` record: `{unit_type}: NewUnit,`
   - Add to `UnitType` type union in `src/lib/types.ts`
6. Update `{SCORM_ROOT}/scripts/build-scorm.ts`:
   - Add entry to `UNITS` array with unitType, zipName, title, identifier
7. Display summary of created/modified files
8. Exit (do not run build)

### Build Execution

1. Run: `npx tsx {SCORM_ROOT}/scripts/build-scorm.ts` (or with unit filter)
   - If building specific unit: `npx tsx {SCORM_ROOT}/scripts/build-scorm.ts {unit_type}`
   - Must run from SCORM_ROOT directory
2. Capture stdout/stderr

### Post-Build Verification

For each expected ZIP:
- Verify ZIP file exists in `{SCORM_ROOT}/` and `{MONOREPO_ROOT}/scorm-zips/`
- Check ZIP is non-empty (> 1KB)
- Verify ZIP contains: `index.html`, `imsmanifest.xml`, `assets/` directory

### L2 Scoring

```
l2_score = 100 if build succeeds AND all ZIPs verified
l2_score = 0 if build fails
l2_score -= 10 for each ZIP that fails verification
```

### L2 Output

```
## L2: Standard Build (Score: {N}/100)

Build: {SUCCESS/FAILED}
ZIPs generated: {N}/{total}

  [OK] 01-learning-pathway.zip (2.15 MB)
  [OK] 02-assignment-submission.zip (2.18 MB)
  ...

Copied to: {MONOREPO_ROOT}/scorm-zips/
```

---

## Layer 3: Deep Debug (Weight: 25%)

### Error Input Parsing

Extract the error/symptom from arguments. Accept:
- Quoted error messages: `debug "CORS error on submit"`
- Keywords: `debug cors`, `debug manifest`, `debug jwt`
- Error codes: `debug 500`, `debug 403`

### KB Lookup

Search `references/issue-kb.md` using Grep:

1. **Exact symptom match**: Search for the full error string in the KB
2. **Category match**: Map keywords to categories:
   - cors, 500, vercel, deploy -> CORS/Deploy
   - manifest, xml, zip, package -> Packaging
   - lms, initialize, commit, getvalue -> SCORM API
   - n8n, webhook, grade, callback -> Backend/n8n
   - jwt, auth, token, session -> Frontend/Auth
3. **Keyword match**: Search for individual words from the error

### Match Scoring

```
relevance = 0
relevance += 50 if exact symptom match
relevance += 30 if category match
relevance += 10 per keyword match (max 30)
```

### Diagnosis Output

For each match (top 3):
```
## L3: Deep Debug

### Match 1: [CORS-001] Vercel 500 Masquerades as CORS Error
**Category:** CORS/Deploy
**Relevance:** 80/100

**Symptoms:** Browser console shows CORS error, but real cause is Python crash on Vercel
**Root Cause:** Vercel returns 500 without CORS headers when Python crashes. Browser interprets missing headers as CORS violation.
**Fix:** Add CORS headers to vercel.json for all response codes including errors.
**Prevention:** Always configure vercel.json headers, test error paths.

### Match 2: ...
```

### Flow Tracing (no KB match)

If no KB match found (relevance < 20), run flow tracing:

1. **SCORM API flow**: Read `scorm-api.ts`, trace LMSInitialize -> LMSGetValue -> LMSSetValue -> LMSCommit -> LMSFinish
2. **Auth flow**: Read auth-related files, trace JWT generation -> SCORM session -> API calls
3. **Backend flow**: Read FastAPI routers, trace request -> handler -> Supabase/Airtable
4. **n8n flow**: Check n8n workflow structure if available

Offer to add new issue to KB:
```
No exact match in KB. Would you like to add this as a new issue?
Use: cortex_remember with tags ["scorm-issue", "{category}"]
```

### L3 Scoring

```
l3_score = 100 if exact KB match found
l3_score = 50 if partial match (category only)
l3_score = 25 if flow trace needed (no KB match)
l3_score = N/A if issue-kb.md is placeholder only
```

---

## Layer 4: Full Deploy (Weight: 15%)

### Pre-Deploy Gate

- L1 must have score >= 80 (stricter than build)
- L2 must have score = 100 (build must pass completely)
- If either gate fails, abort deploy with explanation

### Build Freshness

- Compare timestamps: latest source file vs latest ZIP
- If source is newer than ZIP: WARN "ZIPs may be stale -- rebuild recommended"
- User can choose to rebuild or proceed

### Backend Deploy

**CRITICAL: Deploy from MONOREPO_ROOT, NOT scorm-backend/**

1. Confirm with user: "Deploy backend to Vercel production? (vercel --prod from {MONOREPO_ROOT})"
2. If confirmed, run: `vercel --prod` from MONOREPO_ROOT
3. Capture deployment URL

### Post-Deploy Verification

1. `curl -s {DEPLOY_URL}/health` -- verify 200 response
2. Check CORS headers present: `curl -sI {DEPLOY_URL}/api/health | grep -i access-control`
3. Verify deployment URL matches expected domain (scorm-backend-eight.vercel.app)

### SCORM ZIP Readiness

List all ZIPs in `{MONOREPO_ROOT}/scorm-zips/` with sizes:
```
Ready for LMS upload:
  01-learning-pathway.zip (2.15 MB)
  02-assignment-submission.zip (2.18 MB)
  ...
```

### Smoke Test Checklist

Generate manual test checklist:
```
Post-Deploy Smoke Tests:
  [ ] Upload one ZIP to SCORM Cloud -- verify launch
  [ ] Test SCORM API communication (score writes back)
  [ ] Upload to TalentLMS -- verify unit renders at 1000x900
  [ ] Test file upload flow end-to-end
  [ ] Verify n8n grading webhook triggers
```

### L4 Scoring

```
l4_score = 100
l4_score -= 20 if health endpoint fails
l4_score -= 20 if CORS headers missing
l4_score -= 10 if deployment URL mismatch
l4_score -= 10 if ZIPs are stale
Floor at 0.
```

### L4 Output

```
## L4: Full Deploy (Score: {N}/100)

Backend: Deployed to {url}
Health: {PASS/FAIL}
CORS: {PASS/FAIL}
ZIPs: {N} ready for upload
Stale: {YES/NO}

Smoke test checklist generated above.
```

---

## Composite Report (deploy/full modes)

After all layers complete, calculate and display:

```
## SCORM Build Report

**Date:** {YYYY-MM-DD}
**Mode:** {mode}
**Project:** {SCORM_ROOT}

### Scores
| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1: Validate | {N}/100 | 30% | {N} |
| L2: Build | {N}/100 | 30% | {N} |
| L3: Debug | {N}/100 | 25% | {N} |
| L4: Deploy | {N}/100 | 15% | {N} |
| **Composite** | | | **{N}/100** |

### Assessment
{IF composite >= 80}: Build healthy, deployment safe.
{IF 60-79}: Minor issues noted. Review warnings before proceeding.
{IF 40-59}: Significant issues. Fix before deploying to production.
{IF < 40}: Critical issues. Do NOT deploy.

### Actions Taken
- Validated {N} checks ({pass} pass, {fail} fail, {warn} warn)
- Built {N} SCORM ZIPs ({total_size} MB total)
- {N} KB matches found for debug queries
- Backend deployed to {url}
```
