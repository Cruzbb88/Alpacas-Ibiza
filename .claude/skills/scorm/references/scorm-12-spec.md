# SCORM 1.2 API Quick Reference

> Complete reference for SCORM 1.2 Runtime Environment (RTE) API.
> Used by L1 validate (SCORM API checks) and L3 debug (flow tracing).

## API Functions

All functions are methods on the API object discovered via `window.parent.API` (or `window.API`).
All parameters and return values are **strings**.

### LMSInitialize(param: "")
Start a SCORM communication session.
- **param**: Always empty string `""`
- **Returns**: `"true"` on success, `"false"` on failure
- **When**: Call once at content load time
- **Errors**: 101 (General Exception) if called before LMS is ready
- **Note**: Use retry pattern (3 attempts, 500ms delay) for timing issues

### LMSFinish(param: "")
End the SCORM communication session.
- **param**: Always empty string `""`
- **Returns**: `"true"` on success, `"false"` on failure
- **When**: Call when learner exits content (unmount, close, navigate away)
- **CRITICAL**: Call `LMSCommit("")` before `LMSFinish("")` to persist pending data

### LMSGetValue(element: string)
Read a data model element from the LMS.
- **element**: CMI data model element path (e.g., `"cmi.core.student_id"`)
- **Returns**: Element value as string, or `""` on error
- **When**: After successful `LMSInitialize`
- **Errors**: 201 (Invalid argument), 301 (Not initialized)

### LMSSetValue(element: string, value: string)
Write a data model element to the LMS.
- **element**: CMI data model element path
- **value**: New value as string
- **Returns**: `"true"` on success, `"false"` on failure
- **When**: After successful `LMSInitialize`
- **Errors**: 201 (Invalid argument), 301 (Not initialized), 403 (Read-only element)

### LMSCommit(param: "")
Flush pending data to the LMS database.
- **param**: Always empty string `""`
- **Returns**: `"true"` on success, `"false"` on failure
- **When**: After `LMSSetValue` calls, before `LMSFinish`
- **Note**: Some LMS auto-commit, but don't rely on this

### LMSGetLastError()
Get the error code from the last API call.
- **Returns**: Error code as string (e.g., `"0"`, `"101"`, `"301"`)
- **When**: After any API call returns `"false"`

### LMSGetErrorString(errorCode: string)
Get human-readable description of an error code.
- **errorCode**: Error code string from `LMSGetLastError()`
- **Returns**: Description string (e.g., `"General Exception"`)

### LMSGetDiagnostic(errorCode: string)
Get detailed diagnostic information about an error.
- **errorCode**: Error code string
- **Returns**: LMS-specific diagnostic info

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | No Error | Operation succeeded |
| 101 | General Exception | Unspecified error (often timing-related) |
| 201 | Invalid Argument | Bad element name or value |
| 202 | Element Cannot Have Children | Tried to access child of a leaf element |
| 203 | Element Not an Array | Tried to use array syntax on non-array element |
| 301 | Not Initialized | API call before LMSInitialize |
| 401 | Not Implemented | LMS doesn't support this element |
| 403 | Element Is Read Only | Tried to LMSSetValue on a read-only element |
| 404 | Element Is Write Only | Tried to LMSGetValue on a write-only element |
| 405 | Incorrect Data Type | Value doesn't match element's expected type |

## Data Model Elements

### Core Student Info (Read-Only)

| Element | Type | Description |
|---------|------|-------------|
| `cmi.core.student_id` | R | Learner identifier (TalentLMS: numeric string) |
| `cmi.core.student_name` | R | Learner name (TalentLMS: "Last, First") |
| `cmi.core.credit` | R | `"credit"` or `"no-credit"` |
| `cmi.core.entry` | R | `"ab-initio"` (first time) or `"resume"` |
| `cmi.core.total_time` | R | Cumulative time across sessions |
| `cmi.core.lesson_mode` | R | `"browse"`, `"normal"`, or `"review"` |
| `cmi.launch_data` | R | Launch data from manifest |

### Core Progress (Read-Write)

| Element | Type | Description | Values |
|---------|------|-------------|--------|
| `cmi.core.lesson_status` | RW | Completion/pass status | `not attempted`, `incomplete`, `completed`, `passed`, `failed` |
| `cmi.core.lesson_location` | RW | Bookmark (max 255 chars) | Free-form string |
| `cmi.core.exit` | W | Exit behavior | `""`, `"suspend"`, `"logout"` |
| `cmi.core.session_time` | W | Current session duration | `HHHH:MM:SS.SS` format |

### Score Elements (Read-Write)

| Element | Type | Description | Range |
|---------|------|-------------|-------|
| `cmi.core.score.raw` | RW | Raw score | 0-100 (integer recommended) |
| `cmi.core.score.min` | RW | Minimum possible score | Usually 0 |
| `cmi.core.score.max` | RW | Maximum possible score | Usually 100 |

### Suspend Data (Read-Write)

| Element | Type | Description | Limit |
|---------|------|-------------|-------|
| `cmi.suspend_data` | RW | Free-form persistence data | **4096 chars max** |

### Comments (Read-Write)

| Element | Type | Description |
|---------|------|-------------|
| `cmi.comments` | RW | Learner comments (free text) |
| `cmi.comments_from_lms` | R | LMS/instructor comments |

### Objectives (Array)

| Element | Type | Description |
|---------|------|-------------|
| `cmi.objectives._count` | R | Number of objectives |
| `cmi.objectives.n.id` | RW | Objective identifier |
| `cmi.objectives.n.score.raw` | RW | Objective score |
| `cmi.objectives.n.score.min` | RW | Min score |
| `cmi.objectives.n.score.max` | RW | Max score |
| `cmi.objectives.n.status` | RW | `passed`, `completed`, `failed`, `incomplete`, `browsed`, `not attempted` |

### Interactions (Array, Write-Only)

| Element | Type | Description |
|---------|------|-------------|
| `cmi.interactions._count` | R | Number of interactions |
| `cmi.interactions.n.id` | W | Interaction identifier |
| `cmi.interactions.n.type` | W | `true-false`, `choice`, `fill-in`, `matching`, `performance`, `sequencing`, `likert`, `numeric` |
| `cmi.interactions.n.time` | W | Timestamp (HH:MM:SS) |
| `cmi.interactions.n.weighting` | W | Weight |
| `cmi.interactions.n.student_response` | W | Learner's response |
| `cmi.interactions.n.result` | W | `correct`, `wrong`, `unanticipated`, `neutral`, or numeric |
| `cmi.interactions.n.latency` | W | Response time (HHHH:MM:SS.SS) |

## Call Sequence

```
Content Load
    |
    v
LMSInitialize("")         -- Start session
    |
    v
LMSGetValue("cmi.core.student_id")     -- Read student info
LMSGetValue("cmi.core.student_name")
LMSGetValue("cmi.suspend_data")        -- Resume state if any
    |
    v
[... Learner interacts with content ...]
    |
    v
LMSSetValue("cmi.core.score.raw", "85")      -- Set score
LMSSetValue("cmi.core.score.min", "0")
LMSSetValue("cmi.core.score.max", "100")
LMSSetValue("cmi.core.lesson_status", "passed")  -- Set status
LMSSetValue("cmi.suspend_data", "{json}")     -- Save state
    |
    v
LMSCommit("")              -- Flush to LMS database
    |
    v
LMSFinish("")              -- End session
```

## Manifest Template (SCORM 1.2)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="course-identifier"
  version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                       http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                       http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org-1">
    <organization identifier="org-1">
      <title>Course Title Here</title>
      <item identifier="item-1" identifierref="resource-1">
        <title>Unit Title Here</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource-1" type="webcontent" adlcp:scormtype="sco"
              href="index.html?unit_type=unit_type_here">
      <file href="index.html" />
    </resource>
  </resources>
</manifest>
```

## Status Decision Tree

```
Is the unit graded?
  |
  +-- YES: Does the student pass?
  |         |
  |         +-- YES: setStatus('passed') + setScore(grade, 0, 100)
  |         |
  |         +-- NO:  setStatus('failed') + setScore(grade, 0, 100)
  |
  +-- NO:  setCompletionStatus('completed')
           (no score needed)
```
