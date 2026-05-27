# Page Template System Reference

## Template Components

| Component | Path | Props | Use For |
|-----------|------|-------|---------|
| PageShell | `src/components/layout/PageShell.tsx` | children, layout, className | Layout wrapper (max-width, padding) |
| PageHeader | `src/components/layout/PageHeader.tsx` | title, subtitle, icon, actions, breadcrumbOverrides, hideBreadcrumbs | Unified header + breadcrumbs |
| UniversalPageRenderer | `src/lib/module-renderer/UniversalPageRenderer.tsx` | moduleId, config, callbacks, detailPanel, createDialog | Top-level dispatcher |
| DashboardPage | `src/lib/module-renderer/DashboardPage.tsx` | config (ModuleConfig) | Stats cards + card grids |
| CanvasPage | `src/lib/module-renderer/CanvasPage.tsx` | config, children, renderCanvas | Interactive workspaces with toolbar |
| DataTablePage | `src/lib/module-renderer/DataTablePage.tsx` | config (ModuleConfig) | Sortable/filterable data tables |

## Supported page_type Values

| Type | Status | Template | Use When |
|------|--------|----------|----------|
| `data-table` | LIVE | DataTablePage | List views, CRUD tables, filterable lists |
| `dashboard` | LIVE | DashboardPage | Overview pages with stats cards and card grids |
| `canvas` | LIVE | CanvasPage | Interactive workspaces, drag-drop, zoom/pan |
| `detail-view` | TODO | (not built) | Entity detail pages with [id] routes |
| `form` | TODO | (not built) | Create/edit forms |

## Module YAML Config Convention

New pages MUST have a corresponding YAML config at `config/modules/{name}.yaml`:

```yaml
schema_version: "1.0"
module: inventory-stock
page_type: data-table
title: Inventory Stock
description: Stock levels and forward look analysis

permissions:
  view: [admin, user]
  edit: [admin]

layout:
  max_width: full
  padding: default

data_source:
  endpoint: /api/v1/inventory/stock
  method: GET

data_table:
  columns:
    - key: sku
      label: SKU
      sortable: true
    - key: description
      label: Description
```

## How to Create a Template-Powered Page

1. Create `config/modules/{name}.yaml` with page_type and data config
2. Create `src/app/(authenticated)/{route}/page.tsx`:
   ```tsx
   import { UniversalPageRenderer } from '@/lib/module-renderer/UniversalPageRenderer';
   export default function PageName() {
     return <UniversalPageRenderer moduleId="{name}" />;
   }
   ```
3. Add navigation entry to `config/sidebar-nav.yaml` (if needed)

## Audit Data

If `config/page-template-audit.yaml` exists, read it for:
- Current page inventory (108 pages as of 2026-03-31)
- Which pages are template-powered vs raw layout
- Target template assignments per page
- Migration batch groupings

## NEVER Create Raw Layouts

When a spec requires new pages, NEVER create:
- Raw `<div className="p-6">` layouts
- Manual breadcrumb implementations
- Hand-rolled page headers
- Custom padding/width management

ALWAYS use PageShell + PageHeader + the appropriate template type.
