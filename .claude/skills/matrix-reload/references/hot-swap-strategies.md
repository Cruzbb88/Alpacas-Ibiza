# Hot Swap Strategies Reference

Transition strategies, feature flag patterns, rollback templates, and scope enforcement for L5 Hot Swap Plan with Rollback.

---

## Core Principles

1. **NEVER big-bang cutover** -- Always transition incrementally
2. **Every step has a rollback** -- If a step has no obvious rollback, redesign the step
3. **Rollback must be faster than the forward step** -- If deploying takes 1 hour, rollback should take 5 minutes
4. **Feature flags over branch-based swaps** -- Flags allow instant rollback without redeployment
5. **Scope check on every step** -- "Does this step modify anything outside the reload zone? If yes, STOP."

---

## Feature Flag Patterns

### JavaScript / TypeScript

```typescript
// Simple feature flag (environment variable)
const USE_NEW_AUTH = process.env.FEATURE_NEW_AUTH === 'true';

// In code
if (USE_NEW_AUTH) {
  return newAuth.validateSession(token);
} else {
  return oldAuth.validateSession(token);
}

// Cleanup after full migration
// Remove the flag and the old code path
```

### React

```typescript
// Feature flag context
const FeatureFlagContext = createContext<Record<string, boolean>>({});

// Feature flag wrapper component
function FeatureFlag({ flag, children, fallback }: {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const flags = useContext(FeatureFlagContext);
  return flags[flag] ? <>{children}</> : <>{fallback}</>;
}

// Usage
<FeatureFlag flag="newAuth" fallback={<OldLoginForm />}>
  <NewLoginForm />
</FeatureFlag>
```

### Express / Node.js Middleware

```typescript
// Middleware toggle
function authMiddleware(req, res, next) {
  if (process.env.FEATURE_NEW_AUTH === 'true') {
    return newAuthMiddleware(req, res, next);
  }
  return oldAuthMiddleware(req, res, next);
}

// Route-level toggle
app.post('/api/auth/validate',
  featureFlag('newAuth')
    ? newAuthController.validate
    : oldAuthController.validate
);
```

### Python / Django

```python
# Settings-based flag
NEW_AUTH_ENABLED = os.environ.get('FEATURE_NEW_AUTH', 'false') == 'true'

# In view
def validate_session(request):
    if settings.NEW_AUTH_ENABLED:
        return new_auth.validate(request)
    return old_auth.validate(request)

# Django middleware toggle
class AuthMiddleware:
    def __call__(self, request):
        if settings.NEW_AUTH_ENABLED:
            return self.new_auth_flow(request)
        return self.old_auth_flow(request)
```

### Python / Flask

```python
# Config-based flag
app.config['FEATURE_NEW_AUTH'] = os.environ.get('FEATURE_NEW_AUTH', 'false') == 'true'

# In route
@app.route('/auth/validate', methods=['POST'])
def validate():
    if current_app.config['FEATURE_NEW_AUTH']:
        return new_validate()
    return old_validate()
```

### Go

```go
// Environment-based flag
var useNewAuth = os.Getenv("FEATURE_NEW_AUTH") == "true"

// In handler
func ValidateHandler(w http.ResponseWriter, r *http.Request) {
    if useNewAuth {
        newauth.Validate(w, r)
    } else {
        oldauth.Validate(w, r)
    }
}
```

---

## Parallel Running Strategies

### Shadow Mode

Run both old and new code simultaneously. Use old code's output. Compare results for verification.

```
Request -> Old Code -> Response (used)
       \-> New Code -> Result (logged, compared)
```

**When to use:** High-risk interfaces with complex behavior. Need confidence before switching.

**Implementation:**
```typescript
async function validateSession(token: string) {
  const oldResult = await oldAuth.validateSession(token);

  // Shadow: run new code but don't use its result
  try {
    const newResult = await newAuth.validateSession(token);
    if (JSON.stringify(oldResult) !== JSON.stringify(newResult)) {
      logger.warn('Shadow mismatch', { old: oldResult, new: newResult, token: token.slice(0, 8) });
    }
  } catch (err) {
    logger.error('Shadow error in new auth', { error: err });
  }

  return oldResult; // Always return old result during shadow phase
}
```

**Rollback:** Remove shadow code. No user impact since old code was always used.

### Canary Deployment (Code-Level)

Route a percentage of traffic to new code, rest to old.

```typescript
function validateSession(token: string) {
  const canaryPercentage = parseInt(process.env.NEW_AUTH_CANARY_PCT || '0');
  const roll = Math.random() * 100;

  if (roll < canaryPercentage) {
    return newAuth.validateSession(token);
  }
  return oldAuth.validateSession(token);
}
```

**Rollback:** Set canary percentage to 0.

**Progression:**
1. 0% (off)
2. 1% (smoke test)
3. 5% (early validation)
4. 25% (confidence building)
5. 50% (half traffic)
6. 100% (full migration)

### Strangler Fig Pattern

Gradually replace old code by routing one feature/endpoint at a time.

```
Phase 1: /api/auth/validate -> NEW, everything else -> OLD
Phase 2: /api/auth/validate + /api/auth/refresh -> NEW
Phase 3: /api/auth/* -> NEW
Phase 4: Remove OLD
```

**Best for:** API endpoints, route handlers, service layers with multiple entry points.

**Rollback:** Re-route affected endpoints back to old implementation.

---

## Rollback Plan Templates

### Feature Flag Rollback

```
Step: Enable new auth via feature flag
Rollback:
  1. Set FEATURE_NEW_AUTH=false in environment
  2. Restart application (or use runtime config reload)
  3. Verify old auth path is active
  Time: < 1 minute (env var change + restart)
```

### Code Deployment Rollback

```
Step: Deploy new auth module
Rollback:
  1. git revert {commit_hash}  OR  deploy previous version tag
  2. Run deployment pipeline
  3. Verify old code is serving
  Time: Matches deployment pipeline duration
```

### Database Migration Rollback

```
Step: Add new columns for redesigned auth
Rollback:
  1. Run reverse migration: ALTER TABLE sessions DROP COLUMN new_field
  2. Verify application works without new columns
  Precondition: Migration must be backwards-compatible (additive only)
  WARNING: If migration drops columns or changes types, it is NOT safely reversible.
           Use a separate migration step with its own rollback.
```

### File Replacement Rollback

```
Step: Replace src/auth/session.ts with new implementation
Rollback:
  1. git checkout HEAD~1 -- src/auth/session.ts
  2. Restart application
  3. Verify old implementation is active
  Time: < 30 seconds
  Precondition: Previous version is in git history
```

---

## Transition Step Template

Each step in the hot swap plan follows this structure:

```markdown
### Step {N}: {Action Title}

**Action:** {What to do}

**Files Modified:**
- {file path} -- {what changes}

**Scope Check:** Does this step modify anything outside the reload zone?
- [ ] All modified files are INSIDE the reload zone
- [ ] No external interfaces are changed
- [ ] No external dependencies are added or removed

**Risk Level:** {low | medium | high}

**Verification:**
1. {How to verify this step succeeded}
2. {What to check before proceeding}

**Rollback:**
1. {Exact action to reverse this step}
2. {How to verify rollback succeeded}
Time: {estimated rollback time}

**Proceed to Step {N+1} only after verification passes.**
```

---

## Scope Enforcement Checklist

For EVERY step in the swap plan, verify:

1. **File scope**: Are all modified files inside the reload zone?
   - List every file this step touches
   - Cross-reference with L2 zone boundary
   - If ANY file is outside the zone: STOP. Redesign the step.

2. **Interface scope**: Does this step change any interface contract?
   - Cross-reference with L3 contract list
   - If ANY contract signature changes: STOP. The rebuild must satisfy existing contracts.

3. **Dependency scope**: Does this step add/remove external dependencies?
   - New imports from outside the zone: acceptable (outward dependency)
   - New exports consumed by outside code: NOT acceptable (changing the contract)
   - Removing exports used by outside code: NOT acceptable (breaking the contract)

4. **Data scope**: Does this step change stored data formats?
   - Database schema changes: must be backwards-compatible
   - File format changes: must be backwards-compatible
   - Cache format changes: must handle both old and new formats during transition

---

## When to Abort a Swap

STOP the hot swap and keep the old zone if:

1. **Contract violations discovered**: The new implementation does not satisfy an L3 contract. Go back to L4 and redesign.

2. **Scope creep detected**: A swap step requires modifying files outside the zone. Either:
   - Redesign the step to stay within scope
   - Expand the zone (requires re-running L2 and L3)
   - Abort the swap entirely

3. **Rollback fails**: If a rollback does not restore the previous state cleanly, the swap plan is unsafe. Redesign the affected steps.

4. **Shadow mode shows divergence**: If shadow mode reveals significant behavioral differences between old and new code, the new implementation needs more work before swapping.

5. **Performance regression**: If the new implementation is significantly slower than the old one, investigate before proceeding.

### Abort Protocol

```
1. Execute rollback for the current step
2. Execute rollback for all completed previous steps (in reverse order)
3. Verify the system is in its pre-swap state
4. Document what went wrong and at which step
5. File a new issue for the failing step
6. Re-run Matrix Reload to reassess (the zone boundary may need adjustment)
```

---

## Incremental Build Strategy

Never build the entire new zone at once. Break it into buildable increments:

### Strategy 1: Bottom-Up (Leaf Modules First)

```
1. Build leaf modules (no internal dependencies)
2. Build modules that depend only on completed leaves
3. Build modules that depend on layer 2
4. Continue until all zone modules are rebuilt
```

**Best for:** Well-layered code with clear dependency direction.

### Strategy 2: Contract-In (Most Critical Interfaces First)

```
1. Identify the highest-criticality contracts (from L3)
2. Build the modules that satisfy those contracts first
3. Verify contract compliance with test stubs
4. Build remaining modules
```

**Best for:** Zones where external consumers cannot tolerate any breakage.

### Strategy 3: Pain-Out (Worst Pain First)

```
1. Rebuild the highest-pain file first (from L1)
2. Feature-flag it alongside the old version
3. Verify via shadow mode
4. Move to next highest-pain file
5. Continue until zone is fully rebuilt
```

**Best for:** When the primary goal is reducing pain quickly.

---

## Swap Completion Checklist

After all swap steps are complete:

1. [ ] All feature flags are set to "new" (100% traffic to new code)
2. [ ] Shadow mode shows 0 divergence for 1+ week
3. [ ] All L3 contract test stubs pass
4. [ ] No errors in logs related to new implementation
5. [ ] Performance metrics match or exceed old implementation
6. [ ] Remove old code from the codebase (do NOT leave dead code)
7. [ ] Remove feature flags (they are now permanent decisions)
8. [ ] Update documentation to reflect new architecture
9. [ ] Run Matrix Reload again to verify pain reduction
