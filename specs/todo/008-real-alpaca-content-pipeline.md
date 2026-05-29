---
id: "008"
title: "Real alpaca content pipeline: owner upload flow"
status: "todo"
priority: "high"
created: "2026-05-29"
depends_on: []
blocks: ["AdoptionCertificatePreview real content", "AlpacaCard real content"]
owner: "platform"
---

## Context

`lib/data/alpacas.ts` defines 14 alpacas. Every record has `bio: null` and `image: null`. The site owner (Alpaca Ibiza) holds the actual content — photos and personality copy — but there is no upload path. As a result, `AlpacaCard` renders placeholder silhouettes and `AdoptionCertificatePreview` cannot populate the alpaca section without real data.

The owner is the bottleneck. This spec defines a minimal admin upload flow that puts the owner in control without requiring a developer each time content is updated. Content is staged to a source file for developer review before any public deployment.

---

## Acceptance criteria

### Admin upload page

- [ ] A page exists at `/admin/content/alpacas` accessible only to authenticated admins.
- [ ] The page lists all 14 alpacas from `lib/data/alpacas.ts` with their current content status: "complete" (has both photo + all 4 fields filled), "partial" (some fields present), or "empty" (null everywhere).
- [ ] Each alpaca row has an "Edit" action that opens an inline form or a modal.

### Per-alpaca upload form

- [ ] The form contains exactly these fields:
  - **name** — pre-populated from `lib/data/alpacas.ts`; read-only (names are fixed identifiers).
  - **breed** — text input, max 80 characters.
  - **personality** — textarea, max 200 characters. Prompt shown to owner: "How would you describe this alpaca's personality in 2–3 sentences?"
  - **fun_fact** — text input, max 150 characters. Prompt shown to owner: "One surprising or funny thing about this alpaca."
  - **photo** — file input accepting JPEG and PNG, max 5 MB. Preview rendered inline after selection.
- [ ] All four text fields and the photo are required before the form can be submitted.
- [ ] Photo is validated client-side for file type (JPEG/PNG) and size (≤ 5 MB) before upload begins.

### Staging route

- [ ] On submit, the form calls `POST /api/admin/content-stage` (the existing route).
- [ ] The request body includes: `alpacaId`, `breed`, `personality`, `fun_fact`, and the photo as a multipart file upload.
- [ ] The route writes (or updates) the alpaca's content block into `lib/tenants/alpacasibiza-content.ts` as a named export matching the alpaca ID. Example shape:
  ```ts
  export const alpaca_007: AlpacaContent = {
    breed: "Huacaya",
    personality: "...",
    fun_fact: "...",
    imagePath: "/content/alpacas/alpaca_007.jpg",
  };
  ```
- [ ] The uploaded photo is written to `public/content/alpacas/` with the filename `<alpacaId>.<ext>`.
- [ ] The route returns `{ status: "staged", alpacaId, imagePath }` on success.
- [ ] If the route cannot write the file (permissions error, disk full), it returns HTTP 500 with a human-readable error; no partial writes are left on disk.

### Owner final review gate

- [ ] After staging, the admin page shows a "Pending review" banner for that alpaca. The banner reads: "Content staged. A developer must deploy the updated `alpacasibiza-content.ts` before this appears publicly."
- [ ] There is no auto-deploy step. Public rendering of real content only happens after a developer runs the standard deploy pipeline (which picks up the updated `alpacasibiza-content.ts`).
- [ ] The admin page has a "Preview" link per alpaca that renders `AlpacaCard` and `AdoptionCertificatePreview` using the staged content so the owner can approve before asking for deployment.

### Unblocking downstream components

- [ ] `AlpacaCard` reads from `lib/tenants/alpacasibiza-content.ts` if the matching export exists; falls back to the null-safe placeholder only if the export is absent.
- [ ] `AdoptionCertificatePreview` reads `breed`, `personality`, `fun_fact`, and `imagePath` from the same source for its alpaca section. Once content is staged and deployed, the certificate renders real data with no code changes.
- [ ] All 14 alpacas must have complete content for the "all complete" status indicator to turn green on the admin page.

---

## Implementation notes

- `lib/tenants/alpacasibiza-content.ts` does not need to exist before this feature — the staging route creates it on first write. Subsequent writes update individual named exports without touching others.
- Writing to a TypeScript source file from a route handler is intentional for this project's no-database content model. The file is committed to git by the developer after reviewing staged content.
- The file-write approach means the staging route must run in a Node.js environment (not the Edge runtime). Mark the route with `export const runtime = 'nodejs'` if the project defaults to Edge.
- Photo storage in `public/content/alpacas/` is served statically. If the project moves to a CDN later, the `imagePath` field in `alpacasibiza-content.ts` can be updated to an absolute URL without changing `AlpacaCard` or `AdoptionCertificatePreview`.
- The `AlpacaContent` type should be defined in `lib/data/alpacas.ts` (or a shared types file) so both the staging route and the consuming components share the same shape.

---

## Out of scope

- Bulk upload (all 14 at once). The per-alpaca flow is intentional so the owner reviews each one.
- Video or audio content.
- CMS integration (Contentful, Sanity, etc.). The file-based approach is sufficient for 14 records.
- Internationalisation of the uploaded content at this stage (English-only content is acceptable for launch).
- Public-facing alpaca detail pages (a separate spec if needed).
