# Config Discovery Patterns

Reference for Step 0 (Config Discovery). Use these patterns to categorize existing YAML configs in any project.

## Pattern Types

### 1. Navigation Config (Multi-file Merge)

**Signals:** `items[]`, `sections[]`, `visible_to`, `feature_flag`, `continuum`, `collapsed_by_default`
**Glob:** `config/navigation/*.yaml`, `config/sidebar*.yaml`
**Loader pattern:** Single loader merges multiple YAML files, applies defaults from `_base.yaml`, resolves icons, filters by role/feature-flag
**Extension method:** Add a new YAML file following the existing section schema. The loader auto-discovers new files.
**Example:** Surity Process Catalogue has 9 nav YAMLs merged by `nav-config.ts`

### 2. Module-as-Config (Universal Renderer)

**Signals:** `schema_version`, `module`, `data_source`, `data_table`, `columns[]`, `page_type`, `permissions`
**Glob:** `config/modules/*.yaml`
**Loader pattern:** webpack `require.context` or static require map. Universal `DataTablePage` component reads any module YAML and renders a full data table page.
**Extension method:** Drop a new `config/modules/{name}.yaml` file. Zero code needed -- the universal renderer handles everything.
**Example:** Surity has 5 module YAMLs (POs, evaluations, surveys, reference-data, range-proposal)

### 3. Template/Variant Config (Per-Entity Files)

**Signals:** Subdirectories with multiple YAML files following the same schema (e.g., `templates/`, `audiences/`, `clients/`)
**Glob:** `config/{category}/{variant}.yaml`, `config/{category}/*/*.yaml`
**Loader pattern:** Static require map or `require.context` with memoized accessors. TypeScript types enforce schema.
**Extension method:** Add a new YAML file in the appropriate subdirectory following the existing schema.
**Example:** CPA has 4 template YAMLs, 3 audience YAMLs, 2 gamification YAMLs, 2 scan YAMLs

### 4. Feature Flags / Routing Config

**Signals:** `published`, `wip`, `target_release`, `presets`, `roles[]`, `hidden_items[]`
**Glob:** `config/routing/*.yaml`, `config/feature*.yaml`
**Loader pattern:** Read at build time, consumed by nav-config or middleware for route gating
**Extension method:** Add entries to existing YAML file (not new files)
**Example:** `feature-flags.yaml` with per-page publish state, `decision-trees.yaml` with role presets

### 5. Standalone Config

**Signals:** Unique structure, dedicated loader file, doesn't fit patterns 1-4
**Glob:** `config/*.yaml` (root-level), `*.yaml` (project root)
**Loader pattern:** Dedicated `{name}-config.ts` file with custom parsing
**Extension method:** Varies -- may need new entries or schema extension depending on the config
**Examples:** `chat-modes.yaml`, `knowledge-base.yaml`, `converters.yaml`, `brand-config.yaml`

### 6. Page Template System (Layout-as-Config)

**Signals:** `page_type`, `PageShell`, `PageHeader`, `DashboardPage`, `CanvasPage`, `UniversalPageRenderer`, `layout`, `breadcrumbs`
**Glob:** `config/modules/*.yaml` (module configs drive page rendering), `config/page-template-audit.yaml` (audit data)
**Component paths:**
- `src/components/layout/PageShell.tsx` — layout wrapper (max-width, padding)
- `src/components/layout/PageHeader.tsx` — breadcrumbs + title + action slot
- `src/lib/module-renderer/UniversalPageRenderer.tsx` — dispatches to template by `page_type`
- `src/lib/module-renderer/DashboardPage.tsx` — stats cards + card grid
- `src/lib/module-renderer/CanvasPage.tsx` — interactive workspace with toolbar
- `src/lib/module-renderer/DataTablePage.tsx` — sortable/filterable data table

**Supported page_type values:** `data-table`, `dashboard`, `canvas`
**TODO page_type values:** `detail-view`, `form`

**Loader pattern:** `UniversalPageRenderer` loads module config by `moduleId`, reads `page_type` field, dispatches to the matching template component wrapped in `PageShell`.

**Extension method:** 
- For existing template types: Drop a new `config/modules/{name}.yaml` with `page_type` field. Zero page code needed — the universal renderer handles everything.
- For new template types: Create a new template component in `src/lib/module-renderer/`, add a case to `UniversalPageRenderer`, then drop YAML configs.

**Audit data:** If `config/page-template-audit.yaml` exists, read it for:
- `summary.by_pattern` — how many pages use templates vs raw layouts
- `summary.by_target_template` — what template types are needed
- `migration_batches` — grouped pages ready for migration
- `pages[]` — full inventory with route, current pattern, target template, complexity

**Migration check:** When ANY generator is being designed that creates new pages:
1. Check if page template audit exists (`config/page-template-audit.yaml`)
2. Check template components exist (glob for PageShell, UniversalPageRenderer)
3. If yes: ALL new pages MUST use the template system — include `page_type` in the module YAML config, import `UniversalPageRenderer`, never create raw div layouts
4. If the needed `page_type` doesn't exist yet (e.g., `detail-view`, `form`): design the new template component as part of the generator output
5. Flag any generator design that creates pages without using the template system

**Cross-reference with Pattern 2 (Module-as-Config):** Page templates and module configs are deeply linked. A module YAML config defines WHAT to render (columns, data source, permissions). The page template defines HOW to render it (layout, stats cards, canvas tools). Both must exist for a config-driven page.

## Config Loaders

When discovering loaders, look for:

| Pattern | Language | How to Identify |
|---------|----------|-----------------|
| webpack require | TypeScript | `require("../../config/{name}.yaml")` |
| require.context | TypeScript | `require.context("../../config/", true, /\.yaml$/)` |
| fs.readFileSync | Node.js | `fs.readFileSync(path, 'utf8')` + `yaml.parse()` |
| PyYAML | Python | `yaml.safe_load(open(path))` |
| Dynamic import | TypeScript | `import("../../config/{name}.yaml")` |

## Cross-Reference Decision Tree

When a spec or generator needs config, follow this decision tree:

```
Does an existing config pattern handle this type of data?
  |
  +-- YES: Can the existing schema accommodate the new data?
  |     |
  |     +-- YES: EXTEND -- add entries/files to existing config
  |     |
  |     +-- NO: Can the schema be safely extended (backward-compatible)?
  |           |
  |           +-- YES: EXTEND schema + add data
  |           |
  |           +-- NO: NEW config pattern (justify why)
  |
  +-- NO: Is this a one-off config or will it be reused?
        |
        +-- ONE-OFF: Consider hardcoding (if <3 items) or standalone config
        |
        +-- REUSABLE: NEW config pattern with generator
```
