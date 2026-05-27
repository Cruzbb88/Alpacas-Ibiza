# Isolation Patterns Reference

Boundary drawing strategies, dependency analysis, scope creep prevention, and Mermaid templates for L2 80/20 Isolation.

---

## Import/Export Graph Tracing

### JavaScript / TypeScript

```bash
# Find all imports in a file
grep -n "import.*from\|require(" src/auth/session.ts

# Find all files that import a specific file
grep -rn "import.*session\|require.*session" --include="*.{ts,tsx,js,jsx}" src/

# Build a full import graph (simplified)
for f in $(find src -name "*.ts" -o -name "*.tsx" | head -100); do
  echo "=== $f ==="
  grep "import.*from\|require(" "$f" 2>/dev/null
done
```

### Python

```bash
# Find all imports in a file
grep -n "^import\|^from.*import" src/auth/session.py

# Find all files that import a specific module
module="session"
grep -rn "import.*${module}\|from.*${module}" --include="*.py" src/

# Build import graph
for f in $(find src -name "*.py" | head -100); do
  echo "=== $f ==="
  grep "^import\|^from.*import" "$f" 2>/dev/null
done
```

### Go

```bash
# Find all imports in a file
grep -A 20 "^import" cmd/server/main.go | grep '"'

# Find all files that import a specific package
grep -rn "\"project/pkg/auth\"" --include="*.go" .
```

### Dependency Direction Classification

For each dependency crossing the zone boundary:

| Direction | Meaning | Risk Level |
|-----------|---------|------------|
| **Internal** | Both files in zone | None -- contained |
| **Inward** | Outside -> Zone | Low -- external file calls zone API (must preserve interface) |
| **Outward** | Zone -> Outside | Low -- zone consumes external API (acceptable) |
| **Bidirectional** | Both directions | HIGH -- entangled, hard to isolate |

---

## Boundary Drawing Heuristics

### Natural Boundaries (prefer these)

1. **Module/package boundaries** -- If the pain cluster aligns with an existing module boundary (e.g., `src/auth/`), use that. These are the easiest zones to isolate.

2. **Directory boundaries** -- Files in the same directory that share a responsibility. The directory itself becomes the zone.

3. **Service boundaries** -- In microservice or modular architectures, individual services are natural reload zones.

4. **Layer boundaries** -- Data access layer, business logic layer, presentation layer. If pain is concentrated in one layer, that layer is the zone.

### Forced Boundaries (when natural ones don't exist)

When pain files are scattered across the codebase without natural clustering:

1. **Cluster by dependency** -- Group pain files that depend heavily on each other, even if in different directories
2. **Cluster by domain** -- Group pain files that handle the same domain concept (e.g., all "user auth" files regardless of directory)
3. **Minimum viable zone** -- The smallest set of files that can be rebuilt together without requiring changes to outside files

### When to Expand the Zone

Add a non-pain file to the zone ONLY if:
- It is tightly coupled to a pain file (bidirectional dependency)
- AND removing it from the zone would create an interface that is harder to preserve than rebuilding it
- AND it is a small file (< 200 lines)

**NEVER expand the zone for convenience.** The zone should be uncomfortable -- that discomfort is what prevents scope creep.

### When to Shrink the Zone

Remove a pain file from the zone if:
- It has many external dependents (high fan-in) AND low internal connections
- Rebuilding it would require changing too many external files
- It can be improved incrementally with /refactor instead

---

## 80/20 Cut Point Algorithm

### Step-by-Step

```
1. files = sort_by_pain_score(all_files, descending)
2. total_pain = sum(f.pain_score for f in files)
3. cumulative = 0
4. cut_index = 0
5. for i, file in enumerate(files):
       cumulative += file.pain_score
       if cumulative >= total_pain * 0.80:
           cut_index = i
           break
6. reload_candidates = files[0:cut_index+1]
```

### Finding Natural Breaks

After computing the initial 80/20 cut, look for natural breaks:

```
# Check for score drops between consecutive files
for i in range(len(sorted_files) - 1):
    gap = sorted_files[i].pain - sorted_files[i+1].pain
    if gap > 15:  # Significant drop
        # This is a natural break point
        # Consider using this as the cut instead of strict 80/20
```

A gap of > 15 points between consecutive files is a natural cluster boundary. Prefer these over the strict 80% cumulative cut.

### Zone Size Limits

| Zone Size (% of codebase) | Assessment |
|---------------------------|------------|
| < 10% | Excellent -- small, focused zone |
| 10-20% | Good -- manageable rebuild |
| 20-30% | Caution -- large zone, consider splitting |
| 30-40% | Warning -- zone may be too large, L2 score penalized |
| > 40% | Too large -- recommend /refactor instead |

---

## Scope Creep Warning Signs

### During Analysis

- **Zone exceeds 40% of codebase** -- The pain is too distributed for partial rebuild
- **Circular dependencies at boundary** -- Zone and outside files form cycles
- **Shared mutable state** -- Zone files and outside files read/write the same global state
- **Database schema coupling** -- Zone files and outside files depend on the same tables in incompatible ways

### During Execution

- **"Just one more file"** -- The most common scope creep pattern. If a file was not in the original zone, it stays OUT unless there is a critical isolation reason.
- **Interface changes** -- If the rebuild requires changing the zone's external interface, the zone boundary is wrong. Redraw it.
- **Test file expansion** -- Tests for zone files are IN the zone. Tests for outside files are OUT. Do not "improve" outside tests while rebuilding.

### The Scope Creep Litmus Test

Before adding anything to the zone, ask:
1. Was this file identified by L1 pain mapping as a hotspot? If no, it stays OUT.
2. Is this file required for the zone to be isolatable? If no, it stays OUT.
3. Can this file be improved with /refactor instead? If yes, it stays OUT.
4. Would adding this file increase zone size by > 5%? If yes, it stays OUT.

**If you pass all 4 checks, you may add the file. Otherwise, STOP.**

---

## Isolability Verdict Criteria

### Isolatable

All of the following must be true:
- Zone size < 30% of codebase
- Fewer than 5 bidirectional dependencies crossing boundary
- No circular dependency chains crossing boundary
- Dependencies predominantly flow inward (outside depends on zone)
- Zone files share a clear domain/responsibility

### Partially Isolatable

Any of the following:
- 5-15 bidirectional dependencies crossing boundary
- Some circular dependencies at boundary (but breakable with interface extraction)
- Zone size 20-35% of codebase
- Mixed dependency flow (some inward, some outward, some bidirectional)

### Too Distributed

Any of the following:
- Zone size > 40% of codebase
- More than 15 bidirectional dependencies crossing boundary
- Unbreakable circular dependency chains crossing boundary
- Pain scores are uniformly distributed (no clear cluster)
- Top pain file is < 2x the median pain score

When verdict is "Too Distributed":
- Explicitly recommend `/refactor` for incremental improvement
- Do NOT proceed with reload planning
- Note which areas might become isolatable after incremental improvement

---

## Mermaid Diagram Templates

### Basic Zone Diagram

```
graph LR
    subgraph RELOAD_ZONE ["Reload Zone (DO NOT exceed)"]
        A[file1.ts<br/>Pain: 87]
        B[file2.ts<br/>Pain: 76]
        C[file3.ts<br/>Pain: 71]
        A --> B
        B --> C
    end

    subgraph OUTSIDE ["Outside Zone (DO NOT TOUCH)"]
        D[external1.ts]
        E[external2.ts]
        F[external3.ts]
    end

    D -->|"interface: funcA()"| A
    E -->|"interface: TypeX"| B
    C -->|"consumes: apiCall()"| F

    style RELOAD_ZONE fill:#ff000020,stroke:#ff0000,stroke-width:3px
    style OUTSIDE fill:#00ff0020,stroke:#00ff00,stroke-width:2px
```

### Zone with Bidirectional Dependencies (Warning)

```
graph LR
    subgraph RELOAD_ZONE ["Reload Zone"]
        A[file1.ts<br/>Pain: 87]
        B[file2.ts<br/>Pain: 76]
    end

    subgraph OUTSIDE ["Outside Zone"]
        C[entangled.ts]
    end

    A -->|"calls"| C
    C -->|"calls back"| A

    linkStyle 0 stroke:#ff0000,stroke-width:2px
    linkStyle 1 stroke:#ff0000,stroke-width:2px

    style RELOAD_ZONE fill:#ff000020,stroke:#ff0000,stroke-width:3px
    style OUTSIDE fill:#00ff0020,stroke:#00ff00,stroke-width:2px
```

### Large Zone with Subgroups

For zones with > 10 files, group by subdirectory:

```
graph TB
    subgraph RELOAD_ZONE ["Reload Zone"]
        subgraph AUTH ["auth/"]
            A[session.ts<br/>87]
            B[tokens.ts<br/>76]
        end
        subgraph DB ["db/"]
            C[queries.ts<br/>81]
            D[migrations.ts<br/>68]
        end
        A --> C
        B --> A
    end

    subgraph OUTSIDE ["Outside Zone"]
        E[api/routes.ts]
        F[middleware/auth.ts]
    end

    F -->|"validateSession"| A
    E -->|"dbQuery"| C

    style RELOAD_ZONE fill:#ff000020,stroke:#ff0000,stroke-width:3px
    style OUTSIDE fill:#00ff0020,stroke:#00ff00,stroke-width:2px
```

---

## When to Abort and Recommend /refactor

Recommend switching to /refactor when:

1. **No clear pain cluster** -- Pain scores are uniformly distributed across the codebase. There is no "20% causing 80%."

2. **Zone too large** -- The reload zone exceeds 40% of the codebase. At that point, you are not doing a partial rebuild; you are doing a full rewrite.

3. **Tight coupling everywhere** -- More than 15 bidirectional dependencies cross the zone boundary. The code is too entangled for clean isolation.

4. **Shared global state** -- Zone files and outside files share mutable global state (singletons, global variables, shared database tables with trigger dependencies). Rebuilding the zone would break the outside.

5. **User preference** -- If the user is uncomfortable with the reload scope, /refactor is always a safe alternative.

**Script for the recommendation:**
```
Based on the analysis, a partial rebuild is not recommended for this codebase.
The pain is too distributed / the zone is too large / coupling is too tight.

Recommendation: Use /refactor for incremental improvement of the highest-pain files.
Start with: {top 3 pain files from L1}

After incremental improvement, re-run /matrix-reload to see if a clean zone emerges.
```
