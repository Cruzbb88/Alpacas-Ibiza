# Domain Discovery Reference

Heuristics for detecting business domains within a project for L4 filtering.

## Domain Detection Strategy

When `--domain <name>` is provided, scan for domain indicators in this order:

### 1. Directory Structure

```
Glob: {cwd}/src/{domain}*/**
Glob: {cwd}/packages/{domain}*/**
Glob: {cwd}/apps/{domain}*/**
Glob: {cwd}/modules/{domain}*/**
```

Match is case-insensitive. Partial matches count (e.g., `--domain sales` matches `src/sales-dashboard/`).

### 2. Spec Files

```
Grep specs/todo/*.md for domain name in title or overview section
Grep specs/done/**/*.md for domain name
```

### 3. CLAUDE.md Sections

```
Grep CLAUDE.md for domain name in section headers or key instructions
```

### 4. Config Files

```
Check package.json workspaces for domain-prefixed packages
Check monorepo configs (nx.json, turbo.json) for domain scoping
```

## Domain Hierarchy

```
Whole Business (no --domain flag)
+-- Domain A (--domain sales)
+-- Domain B (--domain operations)
+-- Domain C (--domain hr)
+-- Combined  (--domain "sales,operations")
```

## Filtering Rules

When a domain filter is active:
1. L2 reclassifies capabilities against domain context only
2. Skills irrelevant to the domain: DEMOTE to Optional regardless of project-level classification
3. Skills specifically relevant to the domain: may PROMOTE (Optional -> Recommended, Recommended -> Essential)
4. Pre-filled arguments target domain-specific files and directories

## Domain-Specific Roadmap Naming

| Scope | Filename |
|-------|----------|
| Whole project | `ROADMAP-skill-execution.md` |
| Single domain | `ROADMAP-skill-execution-{domain}.md` |
| Combined domains | `ROADMAP-skill-execution-{domain1}-{domain2}.md` |

## Reclassification Examples

| Skill | Global | Sales Domain | HR Domain |
|-------|--------|-------------|-----------|
| proposal-builder | Recommended | Essential | Optional |
| sop-gen | Recommended | Optional | Essential |
| data-pipeline | Essential | Essential | Optional |
| security | Recommended | Recommended | Recommended |
