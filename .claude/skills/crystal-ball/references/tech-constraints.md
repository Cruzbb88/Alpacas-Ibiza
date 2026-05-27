# Technology Constraint Database

Last updated: 2026-04-07
This file grows automatically as Crystal Ball discovers new constraints during audits.

## How This Works

- Crystal Ball cross-checks designs against these constraints on every run
- New constraints discovered during sessions get appended with date and source
- Format: `- **[Constraint]**: [Limit/Detail] — [Source/Date discovered]`

---

## SCORM 1.2
- **cmi.comments_from_lms**: 4096 character maximum
- **cmi.core.lesson_status**: Only values: passed, completed, failed, incomplete, browsed, not attempted
- **XML entities**: Must escape `&` as `&amp;` in imsmanifest.xml (Q&A → Q&amp;A)
- **No cross-origin**: No native cross-origin communication — CORS headers must be set on backend
- **Initialize timing**: SCORM API may not be ready immediately — retry with delay recommended

## Vercel (Serverless)
- **Hobby plan timeout**: 60s lambda timeout (Pro plan: 300s)
- **500 crash CORS**: When Python crashes, Vercel returns generic 500 WITHOUT CORS headers — browser reports as CORS error. Fix: vercel.json headers config
- **No persistent state**: Serverless functions have no persistent in-memory state between invocations — use JWT tokens, not in-memory sessions
- **Config format**: Use `rewrites` not legacy `builds` in vercel.json — avoids issubclass() runtime bug
- **Monorepo deploy**: Deploy from monorepo root, NOT subdirectory — Root Directory setting doubles path

## Airtable
- **Long text limit**: 100,000 characters per field
- **Rate limit**: 5 requests/second per base
- **Single select API**: Cannot create new single-select options via API — must pre-configure in UI
- **filterByFormula**: More reliable than client-side filtering or n8n IF nodes
- **Trigger polling**: Airtable Trigger nodes are polling-based — no real advantage over Schedule Trigger

## n8n
- **Error routing conflict**: Don't mix `onError=continueErrorOutput` with upstream `continueOnFail` — error JSON from upstream causes false error routing
- **IF node v2.2**: `typeValidation=strict` unreliable with Airtable output — use filterByFormula instead
- **Credential access**: Workflow must be in correct project for credential access
- **Paired item errors**: Common with Merge nodes — use paired item workaround or avoid complex merge chains

## TalentLMS
- **No unit body API**: API cannot return unit body content — must store instructions in secondary system
- **SCORM sizing**: 1000x900px recommended for embedded iframes, scrolling enabled
- **Assignment type**: Identifiable via API (`type='Assignment'`) — useful for type detection

## Supabase
- **RLS explicit**: Row Level Security must be explicitly enabled per table (not default)
- **service_role bypass**: `service_role` key bypasses ALL RLS policies — use only for admin operations
- **File field naming**: Convention: `file_` prefix (file_storage_key, file_mime, file_size_bytes, file_sha256, file_uploaded_at)
- **Bucket visibility**: Storage buckets may need public access for client-side downloads

## ElevenLabs
- **Agent config**: Conversational AI requires specific widget configuration per agent
- **Agent ID matching**: Agent ID must match registered agent — no wildcard
- **Config fallback**: When exact course_id match fails, fall back to any active config

## FastAPI / Python
- **Pydantic coercion**: Integer student_id from LMS needs field_validator for str coercion
- **BackgroundTasks**: Use for fire-and-forget operations (webhooks) — runs after response is sent
- **UUID validation**: Always validate UUID format before database queries to prevent 500 errors

## Next.js 14+ (App Router)
- **API route body size**: Default 4MB max body size for API routes — configure `experimental.serverActions.bodySizeLimit` for large file uploads — discovered 2026-02-16
- **Fetch caching defaults**: App Router aggressively caches fetch() by default — set `revalidate: 0` or `cache: 'no-store'` for real-time data (compliance status, audit results) — discovered 2026-02-16
- **Middleware Edge Runtime**: Middleware runs in Edge Runtime — cannot use Node.js-only APIs (fs, crypto.createHash, etc.) — discovered 2026-02-16
- **Server Component restrictions**: Cannot use useState, useEffect, onClick in Server Components — client interactivity requires 'use client' directive — discovered 2026-02-16
- **Server Actions body size**: Default 1MB limit for Server Action payloads — must configure `serverActions.bodySizeLimit` in next.config for large Excel uploads — discovered 2026-02-16

## Turborepo
- **Build timeout interaction**: Turborepo builds with 7+ packages can exceed Railway's 20-minute build timeout — use remote caching to mitigate — discovered 2026-02-16
- **Env var cache invalidation**: Environment variables must be declared in `turbo.json` `env` array — unlisted env vars won't invalidate cached builds when changed — discovered 2026-02-16

## Drizzle ORM
- **pgvector minimum version**: Drizzle ORM requires `>= 0.30.0` for native `vector()` column type support — discovered 2026-02-16
- **Push vs Migrate**: `drizzle-kit push` applies schema changes directly without creating migration files — no rollback possible. Use `drizzle-kit generate` + `drizzle-kit migrate` for production — discovered 2026-02-16
- **JSONB restructuring**: Changing JSONB Zod schemas does NOT migrate existing data — old rows retain old structure. Must write explicit data migration scripts — discovered 2026-02-16

## PostgreSQL 16 + pgvector
- **Vector index required**: Without HNSW or IVFFlat index, pgvector does sequential scan — O(n) per query. For 1000+ products with 1536-dim vectors, queries take seconds — discovered 2026-02-16
- **HNSW vs IVFFlat**: HNSW uses 2.8x more space than IVFFlat (e.g., 729MB vs 257MB) but higher recall. Set `maintenance_work_mem` to match Docker `--shm-size` for parallel HNSW builds — discovered 2026-02-16
- **Max vector dimensions**: 16,000 (pgvector hard limit) — discovered 2026-02-16
- **Chinese full-text search**: Default PostgreSQL text search does NOT support CJK. Requires `zhparser` extension (SCWS-based) or `pg_cjk_parser` (2-gram). Cannot retroactively change `LC_CTYPE` without DB rebuild — discovered 2026-02-16
- **pg_trgm CJK limitation**: pg_trgm does NOT support CJK — requires `LC_CTYPE != C` which cannot be changed post-initdb — discovered 2026-02-16
- **JSONB TOAST performance cliff**: JSONB values >2KB are TOASTed — 2-10x slower access than inline storage. Product specs with 166 fields likely exceed 2KB — discovered 2026-02-16
- **JSONB GIN index**: JSONB columns queried by nested keys need GIN indexes — without them, full sequential scan per query — discovered 2026-02-16
- **Max connections default**: Default `max_connections = 100` — shared across web app, BullMQ workers, N8N, and admin tools — discovered 2026-02-16

## Cloudflare R2
- **China GFW BLOCKED**: Cloudflare IPs actively blocked by Great Firewall — NOT just degraded. Google Trust Services certs also blocked. Enterprise workaround requires ICP license + JD Cloud partnership — discovered 2026-02-16
- **CORS for browser uploads**: R2 buckets need explicit CORS rules for direct browser uploads — not configured by default — discovered 2026-02-16
- **Max single PUT**: 5GB max per single PUT request — multipart upload required for larger files — discovered 2026-02-16
- **No event notifications**: R2 has limited event notification support unlike S3 — cannot trigger Lambda/webhook on upload completion — discovered 2026-02-16

## Redis + BullMQ
- **No default persistence**: Redis default has no persistence — restart loses all data including queued BullMQ jobs. Enable AOF (`appendonly yes`) or RDB snapshots — discovered 2026-02-16
- **Default maxmemory=0**: Redis default maxmemory is unlimited — production without limits can OOM the host — discovered 2026-02-16
- **maxmemory-policy MUST be noeviction**: BullMQ requires `noeviction` policy — other policies silently drop job data causing phantom failures — discovered 2026-02-16
- **BullMQ concurrency**: Default is CPU core count, but for I/O-heavy jobs (AI calls, Excel parsing) set 100-300. Each Worker needs 2 Redis connections (normal + blocking) — discovered 2026-02-16
- **China Redis latency**: Redis in Singapore + clients in Shanghai = ~30ms per operation — BullMQ's chatty protocol (multiple Redis commands per job lifecycle) amplifies this — discovered 2026-02-16

## Auth.js v5 (NextAuth)
- **JWT cookie size limit**: Browser cookies have ~4KB limit — JWT sessions with many custom claims can exceed this — discovered 2026-02-16
- **Magic link China delivery**: Email magic links to Chinese email providers (QQ, 163, Sina) have low delivery rates — plan WeChat login as fallback — discovered 2026-02-16
- **Session rotation**: Auth.js v5 session callbacks must explicitly return the full token — omitting fields silently drops them — discovered 2026-02-16

## Railway
- **Build timeout**: 20-minute build timeout by default — Turborepo monorepos with multiple packages can approach this — discovered 2026-02-16
- **Ephemeral filesystem**: Filesystem writes are lost on redeploy — temp file processing (Excel, PDF) must complete within request lifecycle — discovered 2026-02-16
- **PostgreSQL connection pooling**: Railway managed PostgreSQL has default pool limits — configure connection pooling for multi-service access — discovered 2026-02-16

## ExcelJS
- **Memory for large files**: ExcelJS loads entire workbook into memory — 100MB file requires 500MB+ RAM. Use streaming API (`WorkbookReader`/`WorkbookWriter`) for files >10MB or >10,000 rows. Call `row.commit()` when writing to prevent memory buildup — discovered 2026-02-16
- **Formula evaluation NOT supported**: ExcelJS cannot calculate formulas at all. Must provide both formula AND pre-calculated result: `{ formula: 'A1+A2', result: 7 }`. Use external libs (HyperFormula, fast-formula-parser) if evaluation needed — discovered 2026-02-16

## Claude API (Anthropic)
- **max_tokens config**: `max_tokens` is per-request, not global — must be set appropriately for each use case (4096 for extraction, 8192+ for compliance reports) — discovered 2026-02-16
- **Rate limits**: Token-based rate limiting per organization — batch operations (200+ artwork checks) need request queuing — discovered 2026-02-16
- **China API latency**: Claude API hosted in US — operations from Shanghai add 200-400ms round-trip — discovered 2026-02-16
- **Vision image size**: Claude Vision has max image size limits — artwork PDFs must be resized/compressed before sending — discovered 2026-02-16

## Docker
- **N8N memory**: N8N idle baseline ~100MB. Production recommendation: 8GB RAM, 4 CPU cores minimum. Docker Compose limits: 4GB memory, 2.0 CPU (reserves: 2GB, 1.0 CPU). Set `NODE_OPTIONS=--max-old-space-size=SIZE` for larger heap — discovered 2026-02-16
- **Restart policy**: Docker Compose services need `restart: always` for production — container crashes require manual restart without it — discovered 2026-02-16

## Environment / General
- **JWT for serverless**: Use signed JWT tokens, not in-memory session stores
- **Env var whitespace**: Trailing whitespace/newlines in environment variables cause silent bugs
- **SQLite WAL mode**: Required for concurrent access in Omni-Cortex databases
- **Windows paths**: Require backslashes (`D:\path`), must be quoted in bash (`"D:\path"`)

## N8N (Extended)
- **Webhook HTTP 200 false positive**: N8N returns HTTP 200 even when target workflows are not found or disabled — implement webhook health checks and response validation — discovered 2026-02-18
- **Webhook secret scope**: Single shared secret (`X-Webhook-Secret`) for all endpoints provides no per-workflow scoping or rotation mechanism — discovered 2026-02-18

## China Infrastructure (Cross-Cutting)
- **Service co-location required**: N8N + Redis + PostgreSQL must be co-located within China for acceptable latency. Running any service in Singapore adds 30ms+ per operation, compounded by chatty protocols (BullMQ, N8N webhooks) — discovered 2026-02-18
- **Cloudflare R2 alternative required**: Alibaba OSS or Tencent COS needed as R2 is blocked by GFW — discovered 2026-02-18
- **LLM provider alternative required**: Claude API unavailable from mainland China — Baidu ERNIE, Alibaba Qwen, or Moonshot needed as fallback — discovered 2026-02-18
- **Auth provider alternative required**: Email magic links have low delivery to Chinese email providers (QQ, 163, Sina) — WeChat login needed — discovered 2026-02-18

---

## Python / Automation
- **Checkpoint file persistence**: Railway/Render have ephemeral filesystems — checkpoint/resume JSON files lost on redeploy. Must use PostgreSQL or external storage for state persistence — discovered 2026-03-06
- **asyncio Semaphore tuning**: Semaphore limit must match external API rate limits — too high causes 429s, too low underutilizes. Tune per provider — discovered 2026-03-06
- **SIGTERM handler variance**: Railway sends SIGTERM with 10s grace period. Render sends SIGTERM with 30s. Graceful shutdown handler must accommodate both — discovered 2026-03-06
- **openpyxl memory**: Loads entire workbook into memory. Use `read_only=True` for reading large files, `write_only=True` for generation — discovered 2026-03-06
- **ReportLab CMYK**: Supports CMYK natively but hex-to-CMYK conversion requires ICC profiles for print color accuracy — discovered 2026-03-06
- **psycopg2 connection pool**: Default connect timeout is infinite. FastAPI apps without connection pooler can exhaust Supabase connection limit — discovered 2026-03-06

## MiniMax API
- **Rate limit undocumented**: MiniMax M2.5 rate limits not published. At 1000+ compliance checks/day, may hit undocumented limits — discovered 2026-03-06
- **Content safety filtering**: Chinese AI providers must comply with content regulations. Compliance terminology ("violation", "penalty") may trigger false positives — discovered 2026-03-06

## ERNIE / Baidu
- **erniebot SDK required**: ERNIE 4.5 Thinking cannot be accessed via OpenRouter from China (GFW blocked). Must use `erniebot` Python package with Baidu direct API — discovered 2026-03-06
- **Baidu auth differs from OpenAI**: Uses access_key + secret_key, NOT OpenAI-compatible SDK format. Routing layer must handle this divergence — discovered 2026-03-06

## Zustand / Client State
- **Hydration on hard navigation**: `page.goto()` loses Zustand persisted state. Sidebar click navigation works. Root cause: persist middleware may need `partialize` or custom storage adapter. Affects e2e testing, not production — discovered 2026-03-14

## ADW Pipeline Operations
- **Max 2 concurrent pipelines**: API concurrency bottleneck limits parallel ADW runs. Worktrees unreliable for ADW operations — discovered 2026-03-14
- **Phase-bridge subprocess isolation**: ADW phases must use CLI subprocess calls (not in-process) to prevent state contamination between build/test/deploy phases — discovered 2026-03-14

## Security / SQL Injection
- **Dynamic column whitelist validation**: Endpoints accepting user-specified column names for dynamic SQL queries MUST validate against an explicit whitelist. AWCL and brand_rules endpoints identified as vulnerable — discovered 2026-03-14
- **Proxy trust middleware**: FastAPI behind Railway proxy must use `TrustedHostMiddleware` to prevent host header injection. Without it, `request.url` can be spoofed — discovered 2026-03-14

## Fumasoft ERP Integration
- **Excel template versioning**: Fumasoft ERP uses versioned Excel templates (current: v260115). No mechanism to detect template version changes. If Fumasoft updates templates, export scripts break silently — discovered 2026-03-15

## Bunnings SAP Hybris Bulk Export
- **MEDIA folder structure standardized**: All categories use identical subfolder hierarchy (KEY_IMAGE/, ADDITIONAL_IMAGE/, DOCUMENTS/*, SIZE_GUIDES/) per item number — discovered 2026-03-19
- **Excel header rows variable**: Rows 1-3 contain headers/formulas/API codes; data starts row 4. Header detection must scan for "Item Number" text, not assume fixed row — discovered 2026-03-19
- **300 columns per export**: Bulk Export Excel has ~300 columns. openpyxl loads all into memory — use read_only=True for large exports — discovered 2026-03-19
- **Vendor image naming inconsistent**: Typos common ("ADDTIONAL" vs "ADDITIONAL"), mixed case extensions (.JPG/.jpg), spaces in filenames. Scripts must normalize before matching — discovered 2026-03-19
- **ctypes shell32 Windows-only**: `SHFileOperationW` recycle bin deletion only works on Windows — use shutil.rmtree for cross-platform, or platform-detect — discovered 2026-03-19

## FastAPI / API Design (Extended)
- **Per_page backend/frontend sync**: When frontend changes page size (e.g., 25 -> 500), backend `Query(le=N)` must also be updated. Mismatch causes silent truncation -- discovered 2026-04-04
- **Client-side pagination memory**: Loading 500+ rows client-side acceptable for demos but degrades at 2000+ rows. Server-side cursor-based pagination needed before production scale -- discovered 2026-04-04

## Alembic Migrations
- **Parallel merge collision**: ADW parallel pipelines create competing migration heads. Each parallel batch requires post-merge `alembic merge heads`. Risk recurs with every parallel ADW batch -- discovered 2026-04-04

## Plaid API
- **Identity/Auth products**: Ineligible for personal finance use case. Plaid denied access for Axiom (Client ID: 69bf5178e8402b000cb6558d). Only Transactions, Balance, Assets, Statements, Investments approved. -- discovered 2026-04-07
- **Transaction sync cursor persistence**: `transactions/sync` cursor must be persisted per-item (per Plaid access token). Losing cursor forces full re-sync of up to 2 years of transactions. -- discovered 2026-04-07
- **Transaction amount sign convention**: Plaid returns positive = debit (money out), negative = credit (money in). Must invert for user-facing display. Cross-cuts all financial widgets. -- discovered 2026-04-07

## Prophet (Time Series)
- **cmdstan dependency**: Prophet requires cmdstan (~200MB). May exceed Railway free tier 512MB RAM limit when combined with FastAPI + other services. Consider lightweight ARIMA or pre-computed batch jobs as alternative. -- discovered 2026-04-07

## Adding New Constraints

When Crystal Ball discovers a new constraint during an audit:
1. Categorize under the appropriate technology heading
2. Use format: `- **[Constraint]**: [Detail] — discovered [YYYY-MM-DD]`
3. If the technology heading doesn't exist, create it
