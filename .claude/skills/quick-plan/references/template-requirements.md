# Page Template Acceptance Criteria

When a spec describes new pages (routes, views, screens), include these acceptance criteria in the spec's Acceptance Criteria section. This ensures all new pages use the established page template system rather than ad-hoc layouts.

## Required Acceptance Criteria Block

Copy this block into any spec that creates new pages:

```markdown
### Page Template Compliance

- [ ] Every new page uses `PageShell` as its outermost layout wrapper
- [ ] Every new page includes `PageHeader` with appropriate title, subtitle, and breadcrumbs
- [ ] Data-heavy pages use `UniversalPageRenderer` with a `moduleId` prop
- [ ] A `config/modules/{module-name}.yaml` file exists for each new page with:
  - `page_type` set to one of: `data-table`, `dashboard`, `canvas`, `detail-view`, `form`
  - `title`, `subtitle`, and `icon` fields populated
  - `data` section with appropriate source and columns (for data-table type)
  - `features` section enabling/disabling search, filters, export, etc.
- [ ] No raw `<div className="p-6">` or equivalent ad-hoc page layouts exist
- [ ] New page is registered in `config/page-template-audit.yaml` inventory
- [ ] Page renders correctly via `UniversalPageRenderer` at the assigned route
```

## When to Apply

Apply this block when the spec includes ANY of:
- New route/page in `app/` directory
- New module or section in the application
- New dashboard or data view
- New form page or detail view

## When to Skip

Skip this block when the spec:
- Only modifies existing pages (no new routes)
- Is backend-only (API, database, scripts)
- Is config/docs only
- Creates components that are NOT full pages (modals, sidebars, widgets)

## Reference Files

- `config/page-template-audit.yaml` -- inventory of all existing pages and their template status
- `config/modules/*.yaml` -- per-module YAML configs consumed by UniversalPageRenderer
- `components/templates/PageShell.tsx` -- outermost layout wrapper
- `components/templates/PageHeader.tsx` -- standardized page header
- `components/templates/UniversalPageRenderer.tsx` -- config-driven page renderer

## Supported Page Types

| Type | Description | Key Config Fields |
|------|-------------|-------------------|
| `data-table` | Tabular data with sorting, filtering, pagination | `columns`, `data.source`, `features.search` |
| `dashboard` | Widget-based overview with charts and KPIs | `widgets`, `layout.grid` |
| `canvas` | Interactive workspace (e.g., workflow editor) | `canvas.tools`, `canvas.zoom` |
| `detail-view` | Single-record detail with sections | `sections`, `data.source` |
| `form` | Input form with validation (TODO -- not yet live) | `fields`, `validation`, `submit` |
