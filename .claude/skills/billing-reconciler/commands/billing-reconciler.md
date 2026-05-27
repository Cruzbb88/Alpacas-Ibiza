# Billing Reconciler Command

Reconcile time tracking data against project budgets and generate invoice-ready billing reports.

---

## Step 0: Parse Arguments

Parse `$ARGUMENTS` for:

1. **--client**: Client name filter (optional — if omitted, show all clients)
2. **--period**: `week` (default), `month`, or `custom`
3. **--start**: Start date `YYYY-MM-DD` (required if `--period custom`)
4. **--end**: End date `YYYY-MM-DD` (required if `--period custom`)
5. **--mode**: `quick`, `standard` (default), or `deep`

### Date Range Resolution

Calculate date range based on `--period`:

```bash
python3 -c "
import datetime, json
period = 'week'  # replace with parsed --period
today = datetime.date.today()
if period == 'week':
    start = today - datetime.timedelta(days=today.weekday())
    end = today
elif period == 'month':
    start = today.replace(day=1)
    end = today
else:
    start = datetime.date.fromisoformat('REPLACE_START')
    end = datetime.date.fromisoformat('REPLACE_END')
print(json.dumps({'start': str(start), 'end': str(end)}))
"
```

---

## Step 1: Load Configuration

Read billing rates from `~/.claude/config/billing-rates.json`.

If the file does NOT exist:
1. Create it with the template structure:
```json
{
  "default_rate": 150,
  "currency": "USD",
  "billing_cycle_start_day": 1,
  "clients": {
    "example-client": {
      "rate": 100,
      "currency": "USD",
      "budget_monthly": 5000,
      "billable": true
    }
  },
  "non_billable_projects": ["internal-tooling", "admin"]
}
```
2. Inform the user: "Created billing rates template at `~/.claude/config/billing-rates.json`. Please fill in your actual client rates and run again."
3. STOP execution.

If the file exists, load it and validate required fields exist.

---

## Layer 1: Quick Snapshot (always runs)

L1 provides a fast overview of hours per project for the selected period.

### Step 1.1: Query Time Data from Cortex

```
cortex_get_timeline: start={start_date}, end={end_date}
cortex_recall: "time sessions {start_date} to {end_date}"
cortex_global_search: "session time project hours"
```

Collect all session/activity data for the period. Extract:
- Session start/end timestamps
- Project name or tag
- Activity descriptions
- Whether a handoff entry exists for the session

### Step 1.2: Aggregate Hours via Python

**CRITICAL: ALL math must be done via Python in bash. Never calculate hours, totals, or percentages using LLM reasoning.**

```bash
python3 -c "
import json, sys

# Input: list of sessions as JSON (pipe from previous step or read from temp file)
sessions = json.loads('''SESSIONS_JSON_HERE''')

projects = {}
unbilled_count = 0
total_sessions = 0

for s in sessions:
    proj = s.get('project', 'untagged')
    hours = float(s.get('hours', 0))
    has_handoff = s.get('has_handoff', False)

    if proj not in projects:
        projects[proj] = {'hours': 0.0, 'sessions': 0, 'unbilled': 0}

    projects[proj]['hours'] += hours
    projects[proj]['sessions'] += 1
    total_sessions += 1

    if not has_handoff:
        projects[proj]['unbilled'] += 1
        unbilled_count += 1

total_hours = sum(p['hours'] for p in projects.values())

print('| Project | Hours | Sessions | Unbilled |')
print('|---------|-------|----------|----------|')
for name, data in sorted(projects.items(), key=lambda x: -x[1]['hours']):
    print(f'| {name} | {data[\"hours\"]:.1f} | {data[\"sessions\"]} | {data[\"unbilled\"]} |')
print(f'|---------|-------|----------|----------|')
print(f'| **TOTAL** | **{total_hours:.1f}** | **{total_sessions}** | **{unbilled_count}** |')
"
```

### Step 1.3: Output Quick Snapshot

Display:
```markdown
## Billing Quick Snapshot
**Period:** {start_date} to {end_date}

| Project | Hours | Sessions | Unbilled |
|---------|-------|----------|----------|
| {project} | {hours} | {sessions} | {unbilled} |
| **TOTAL** | **{total}** | **{total_sessions}** | **{unbilled_total}** |

> {unbilled_count} sessions without handoff entries detected.
```

**If mode is `quick`**: Output the snapshot and STOP. Do not continue to L2.

---

## Layer 2: Reconciliation (standard mode)

L2 cross-references time data against project scopes, flags overruns, and calculates billable amounts.

### Step 2.1: Load Billing Rates

Read `~/.claude/config/billing-rates.json` and match each project to a client rate.

Matching logic:
1. If `--client` was specified, filter to that client only
2. Match project names to client keys (case-insensitive, partial match OK)
3. Projects matching `non_billable_projects` list are flagged as non-billable
4. Projects with no client match use `default_rate`

### Step 2.2: Calculate Billable Amounts via Python

**CRITICAL: ALL math via Python in bash.**

```bash
python3 -c "
import json

# Input data
projects = json.loads('''PROJECTS_JSON''')
rates = json.loads('''RATES_JSON''')
default_rate = rates.get('default_rate', 150)
non_billable = rates.get('non_billable_projects', [])

results = []
total_billable = 0.0
total_hours = 0.0
overruns = []

for proj_name, proj_data in projects.items():
    hours = proj_data['hours']
    total_hours += hours

    # Check if non-billable
    is_non_billable = any(nb.lower() in proj_name.lower() for nb in non_billable)
    if is_non_billable:
        results.append({
            'project': proj_name,
            'hours': hours,
            'rate': 0,
            'amount': 0,
            'status': 'NON-BILLABLE',
            'budget_pct': '-'
        })
        continue

    # Find matching client rate
    rate = default_rate
    currency = rates.get('currency', 'USD')
    budget = None
    for client_name, client_data in rates.get('clients', {}).items():
        if client_name.startswith('_'):
            continue
        if client_name.lower() in proj_name.lower() or proj_name.lower() in client_name.lower():
            rate = client_data.get('rate', default_rate)
            currency = client_data.get('currency', currency)
            budget = client_data.get('budget_monthly')
            break

    amount = hours * rate
    total_billable += amount

    # Budget check
    budget_pct = '-'
    status = 'OK'
    if budget and budget > 0:
        budget_pct = (amount / budget) * 100
        if budget_pct > 100:
            status = 'OVERRUN'
            overruns.append({'project': proj_name, 'pct': budget_pct - 100, 'amount_over': amount - budget})
        elif budget_pct > 80:
            status = 'WARNING'
        budget_pct = f'{budget_pct:.0f}%'

    results.append({
        'project': proj_name,
        'hours': hours,
        'rate': rate,
        'amount': amount,
        'currency': currency,
        'status': status,
        'budget_pct': budget_pct
    })

# Print reconciliation table
print('| Project | Hours | Rate | Amount | Budget Used | Status |')
print('|---------|-------|------|--------|-------------|--------|')
for r in sorted(results, key=lambda x: -x['amount']):
    curr = r.get('currency', 'USD')
    sym = '$' if curr == 'USD' else curr + ' '
    amt = f'{sym}{r[\"amount\"]:,.2f}' if r['amount'] > 0 else '-'
    print(f'| {r[\"project\"]} | {r[\"hours\"]:.1f} | {sym}{r[\"rate\"]} | {amt} | {r[\"budget_pct\"]} | {r[\"status\"]} |')

print()
print(f'**Total Billable: \${total_billable:,.2f}**')
print(f'**Total Hours: {total_hours:.1f}**')

if overruns:
    print()
    print('### Budget Overruns')
    for o in overruns:
        print(f'- **{o[\"project\"]}**: {o[\"pct\"]:.1f}% over budget (\${o[\"amount_over\"]:,.2f} excess)')
"
```

### Step 2.3: Detect Unbilled Time

Identify sessions that:
1. Have no handoff entry (potential missed billing)
2. Have no project tag (unallocated time)
3. Have a project tag but the project is not in billing config (unknown client)

```bash
python3 -c "
import json

sessions = json.loads('''SESSIONS_JSON''')
unbilled = [s for s in sessions if not s.get('has_handoff', False)]
untagged = [s for s in sessions if not s.get('project')]
unknown = [s for s in sessions if s.get('project') and s.get('client_unknown', False)]

print(f'Unbilled sessions (no handoff): {len(unbilled)}')
print(f'Untagged sessions (no project): {len(untagged)}')
print(f'Unknown client sessions: {len(unknown)}')

if unbilled:
    print()
    print('| Date | Duration | Description |')
    print('|------|----------|-------------|')
    for s in unbilled[:10]:
        print(f'| {s.get(\"date\", \"?\")} | {s.get(\"hours\", 0):.1f}h | {s.get(\"description\", \"No description\")[:50]} |')
    if len(unbilled) > 10:
        print(f'| ... | ... | +{len(unbilled)-10} more sessions |')
"
```

### Step 2.4: Rate Discrepancy Check

Flag sessions where hours were tracked at a rate different from the client's configured rate:

```bash
python3 -c "
import json

sessions = json.loads('''SESSIONS_JSON''')
rates = json.loads('''RATES_JSON''')
discrepancies = []

for s in sessions:
    if s.get('billed_rate') and s.get('client'):
        expected = rates.get('clients', {}).get(s['client'], {}).get('rate', rates.get('default_rate', 150))
        if abs(s['billed_rate'] - expected) > 0.01:
            discrepancies.append({
                'date': s.get('date', '?'),
                'client': s['client'],
                'expected': expected,
                'actual': s['billed_rate'],
                'hours': s.get('hours', 0)
            })

if discrepancies:
    print('### Rate Discrepancies')
    print('| Date | Client | Expected Rate | Actual Rate | Hours | Impact |')
    print('|------|--------|---------------|-------------|-------|--------|')
    for d in discrepancies:
        impact = (d['actual'] - d['expected']) * d['hours']
        sign = '+' if impact > 0 else ''
        print(f'| {d[\"date\"]} | {d[\"client\"]} | \${d[\"expected\"]} | \${d[\"actual\"]} | {d[\"hours\"]:.1f} | {sign}\${impact:,.2f} |')
else:
    print('No rate discrepancies found.')
"
```

### Step 2.5: Calculate Reconciliation Score via Python

```bash
python3 -c "
import json

# Scoring inputs
total_sessions = TOTAL_SESSIONS
unbilled_sessions = UNBILLED_COUNT
overrun_count = OVERRUN_COUNT
discrepancy_count = DISCREPANCY_COUNT
untagged_count = UNTAGGED_COUNT

# L1 Score: Coverage (what % of sessions are properly tracked)
coverage_pct = ((total_sessions - unbilled_sessions - untagged_count) / max(total_sessions, 1)) * 100
l1_score = min(100, max(0, int(coverage_pct)))

# L2 Score: Financial health (penalize overruns and discrepancies)
l2_score = 100
l2_score -= overrun_count * 15  # -15 per budget overrun
l2_score -= discrepancy_count * 10  # -10 per rate discrepancy
l2_score -= int(unbilled_sessions * 2)  # -2 per unbilled session
l2_score = min(100, max(0, l2_score))

# Composite (L1: 40%, L2: 60%)
composite = int(l1_score * 0.4 + l2_score * 0.6)

print(json.dumps({
    'l1_score': l1_score,
    'l2_score': l2_score,
    'composite': composite
}))
"
```

### Step 2.6: Save Standard Report

Save the reconciliation report to `~/.claude/reports/billing/`:

**Report numbering via Python:**
```bash
python3 -c "
import glob, re, datetime

files = glob.glob('/c/Users/Tony/.claude/reports/billing/br-*.md')
numbers = []
for f in files:
    m = re.search(r'br-(\d+)-', f)
    if m:
        numbers.append(int(m.group(1)))
next_num = max(numbers, default=0) + 1
date = datetime.date.today().isoformat()
filename = f'br-{next_num:03d}-{date}.md'
print(filename)
"
```

**Report format:**
```yaml
---
report_number: {NNN}
date: "{YYYY-MM-DD}"
mode: "{mode}"
period_start: "{start_date}"
period_end: "{end_date}"
total_hours: {N}
total_billable: {N}
unbilled_sessions: {N}
overrun_count: {N}
layer_1_score: {N}
layer_2_score: {N}
layer_3_score: "N/A"
composite_score: {N}
previous_composite: {N_or_null}
score_delta: "{+/-N_or_dash}"
trend: "{improving|declining|stable|first_run|insufficient_data}"
---

# Billing Reconciliation Report #{NNN}

## Period: {start_date} to {end_date}
## Generated: {date}

{full reconciliation output from L1 + L2}
```

Write the report using the Write tool.

**If mode is `standard`**: Output the report summary and STOP. Do not continue to L3.

---

## Layer 3: Invoice Report (deep mode)

L3 generates a client-ready billing report suitable for attaching to invoices.

### Step 3.1: Generate Client Invoice Summary

For each client with billable hours, generate a formatted invoice summary:

```bash
python3 -c "
import json, datetime

client_data = json.loads('''CLIENT_DATA_JSON''')
today = datetime.date.today()

for client_name, data in client_data.items():
    if not data.get('billable', True):
        continue

    hours = data['hours']
    rate = data['rate']
    amount = hours * rate
    currency = data.get('currency', 'USD')
    sym = '$' if currency == 'USD' else currency + ' '

    print(f'## Invoice Summary: {client_name.title()}')
    print(f'**Period:** {data[\"period_start\"]} to {data[\"period_end\"]}')
    print(f'**Date:** {today}')
    print()
    print('| Description | Hours | Rate | Amount |')
    print('|-------------|-------|------|--------|')

    # Break down by project/task if available
    for task in data.get('tasks', [{'desc': 'Consulting services', 'hours': hours}]):
        task_amt = task['hours'] * rate
        print(f'| {task[\"desc\"]} | {task[\"hours\"]:.1f} | {sym}{rate}/hr | {sym}{task_amt:,.2f} |')

    print(f'| **Total** | **{hours:.1f}** | | **{sym}{amount:,.2f}** |')
    print()
"
```

### Step 3.2: Pre-Invoice Audit Checklist

Run audit checks via Python:

```bash
python3 -c "
import json

audit_data = json.loads('''AUDIT_JSON''')

checks = [
    ('All sessions have project tags', audit_data.get('untagged', 0) == 0),
    ('All sessions have handoff entries', audit_data.get('unbilled', 0) == 0),
    ('No budget overruns', audit_data.get('overruns', 0) == 0),
    ('No rate discrepancies', audit_data.get('discrepancies', 0) == 0),
    ('All hours allocated to known clients', audit_data.get('unknown_client', 0) == 0),
    ('Period is complete (no gaps in days)', audit_data.get('gap_days', 0) == 0),
]

print('### Pre-Invoice Audit')
print()
all_pass = True
for label, passed in checks:
    icon = 'PASS' if passed else 'FAIL'
    if not passed:
        all_pass = False
    print(f'- [{icon}] {label}')

print()
if all_pass:
    print('**Audit Status: CLEAN** - Ready for invoicing.')
else:
    fail_count = sum(1 for _, p in checks if not p)
    print(f'**Audit Status: {fail_count} ISSUE(S)** - Review flagged items before invoicing.')
"
```

### Step 3.3: Calculate L3 Score

```bash
python3 -c "
import json

audit_results = json.loads('''AUDIT_RESULTS_JSON''')

# L3 Score: Invoice readiness
total_checks = audit_results['total_checks']
passed_checks = audit_results['passed_checks']

l3_score = int((passed_checks / max(total_checks, 1)) * 100)
print(json.dumps({'l3_score': l3_score}))
"
```

### Step 3.4: Composite Score with All 3 Layers

```bash
python3 -c "
import json

l1 = L1_SCORE
l2 = L2_SCORE
l3 = L3_SCORE

# Weights: L1=30%, L2=40%, L3=30%
composite = int(l1 * 0.3 + l2 * 0.4 + l3 * 0.3)

interpretation = 'Critical - action required'
if composite >= 80:
    interpretation = 'Excellent'
elif composite >= 60:
    interpretation = 'Good'
elif composite >= 40:
    interpretation = 'Fair - needs attention'

print(json.dumps({
    'l1_score': l1,
    'l2_score': l2,
    'l3_score': l3,
    'composite': composite,
    'interpretation': interpretation
}))
"
```

### Step 3.5: Trend Dashboard

If 2+ previous reports exist in `~/.claude/reports/billing/`, generate a trend comparison:

```bash
python3 -c "
import glob, re, yaml, json

files = sorted(glob.glob('/c/Users/Tony/.claude/reports/billing/br-*.md'))

if len(files) < 2:
    print('Insufficient data for trend analysis (need 2+ reports).')
else:
    print('### Score Trend')
    print('| Run | Date | L1 | L2 | L3 | Composite | Delta |')
    print('|-----|------|----|----|----|-----------|-------|')

    prev_composite = None
    for f in files[-5:]:  # Last 5 reports
        with open(f) as fh:
            content = fh.read()
        # Extract YAML frontmatter
        parts = content.split('---')
        if len(parts) >= 3:
            meta = yaml.safe_load(parts[1])
            num = meta.get('report_number', '?')
            date = meta.get('date', '?')
            l1 = meta.get('layer_1_score', '-')
            l2 = meta.get('layer_2_score', '-')
            l3 = meta.get('layer_3_score', '-')
            comp = meta.get('composite_score', '-')

            delta = '-'
            if prev_composite is not None and comp != '-':
                diff = comp - prev_composite
                delta = f'+{diff}' if diff >= 0 else str(diff)

            print(f'| {num:03d} | {date} | {l1} | {l2} | {l3} | {comp} | {delta} |')
            if comp != '-':
                prev_composite = comp
"
```

### Step 3.6: Save Deep Report

Save the full report (L1 + L2 + L3) to `~/.claude/reports/billing/` using the same numbering pattern as Step 2.6, with the L3 sections appended.

### Step 3.7: Store Summary in Cortex

**IMPORTANT: Never store actual dollar amounts in cortex. Store summaries only.**

```
cortex_remember:
  content: "Billing reconciliation for {period}: {total_hours}h across {project_count} projects. {unbilled_count} unbilled sessions. {overrun_count} overruns. Composite score: {composite}/100 ({interpretation}). Trend: {trend}."
  tags: ["billing", "reconciliation", "{period_tag}"]
```

### Step 3.8: Final Summary Output

```markdown
## Billing Reconciliation Complete

- **Period**: {start_date} to {end_date}
- **Mode**: Deep
- **Total Hours**: {total_hours}
- **Total Billable**: [see report]
- **Unbilled Sessions**: {count}
- **Budget Overruns**: {count}
- **Composite Score**: {composite}/100 ({interpretation})
- **Report**: ~/.claude/reports/billing/{filename}

### Score Breakdown
| Layer | Score | Weight | Contribution |
|-------|-------|--------|-------------|
| L1: Coverage | {l1}/100 | 30% | {l1*0.3:.0f} |
| L2: Financial Health | {l2}/100 | 40% | {l2*0.4:.0f} |
| L3: Invoice Readiness | {l3}/100 | 30% | {l3*0.3:.0f} |
| **Composite** | **{composite}/100** | | **{interpretation}** |
```

---

## Safety Rules

1. **ALL math via Python in bash** -- hours, rates, totals, percentages, budget calculations. This is non-negotiable.
2. **Never store dollar amounts in Cortex.** Store hour counts and score summaries only.
3. **Billing rates are sensitive.** Do not log rate details beyond what is needed for the report.
4. **Time zone handling:** Attribute sessions to the day they started if they cross midnight.
5. **Non-billable projects:** Respect the `non_billable_projects` list and `billable: false` flag.
6. **If billing-rates.json is missing:** Create template and stop -- do not proceed with placeholder rates.
7. **Budget cycle:** Use `billing_cycle_start_day` from config to determine monthly budget period.
8. **Graceful degradation:** If cortex data is sparse, still produce the report with available data. Flag gaps.
