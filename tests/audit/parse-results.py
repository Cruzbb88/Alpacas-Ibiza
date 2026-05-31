#!/usr/bin/env python3
"""Parse axe-core and Lighthouse JSON results and print summary report."""
import json, os, sys
from collections import Counter

BASE = os.path.dirname(__file__)

routes = [
    ("en", "/en"),
    ("en-adopt", "/en/adopt"),
    ("en-alpacas", "/en/alpacas"),
    ("en-tours", "/en/tours"),
    ("de-adopt", "/de/adopt"),
]

# --- AXE ---
all_violations = {}
for slug, route in routes:
    path = os.path.join(BASE, f"axe-{slug}.json")
    if not os.path.exists(path):
        print(f"WARNING: missing {path}", file=sys.stderr)
        continue
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    viols = []
    if isinstance(data, list):
        for r in data:
            viols.extend(r.get("violations", []))
    else:
        viols = data.get("violations", [])

    by_impact = {"critical": 0, "serious": 0, "moderate": 0, "minor": 0}
    for v in viols:
        imp = v.get("impact", "minor")
        by_impact[imp] = by_impact.get(imp, 0) + 1
    all_violations[route] = {"viols": viols, "by_impact": by_impact, "total": len(viols)}

print("\nAXE VIOLATIONS BY ROUTE")
print(f"{'Route':<14} {'Critical':>8} {'Serious':>8} {'Moderate':>9} {'Minor':>6} {'Total':>6}")
print("-" * 56)
for route, d in all_violations.items():
    bi = d["by_impact"]
    print(f"{route:<14} {bi.get('critical',0):>8} {bi.get('serious',0):>8} {bi.get('moderate',0):>9} {bi.get('minor',0):>6} {d['total']:>6}")

issue_counter = Counter()
issue_meta = {}
for route, d in all_violations.items():
    seen = set()
    for v in d["viols"]:
        if v["id"] not in seen:
            issue_counter[v["id"]] += 1
            seen.add(v["id"])
        issue_meta[v["id"]] = (v.get("impact", "?"), v.get("description", "")[:80])

print("\nTOP 5 RECURRING ISSUES (by routes affected):")
for rule_id, count in issue_counter.most_common(5):
    impact, desc = issue_meta[rule_id]
    print(f"  [{impact}] {rule_id} ({count}/5 routes) — {desc}")

# --- LIGHTHOUSE ---
def safe_score(val):
    if val is None:
        return "ERR"
    return str(round(val * 100))

lh_results = {}
for slug, route in routes:
    path = os.path.join(BASE, f"lh-{slug}.json")
    if not os.path.exists(path):
        print(f"WARNING: missing {path}", file=sys.stderr)
        continue
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    cats = data.get("categories", {})
    audits = data.get("audits", {})
    lcp = audits.get("largest-contentful-paint", {})
    tbt = audits.get("total-blocking-time", {})
    cls = audits.get("cumulative-layout-shift", {})
    lh_results[route] = {
        "perf":  safe_score(cats.get("performance", {}).get("score")),
        "a11y":  safe_score(cats.get("accessibility", {}).get("score")),
        "bp":    safe_score(cats.get("best-practices", {}).get("score")),
        "seo":   safe_score(cats.get("seo", {}).get("score")),
        "lcp":   lcp.get("displayValue", "N/A"),
        "tbt":   tbt.get("displayValue", "N/A"),
        "cls":   cls.get("displayValue", "N/A"),
        "lcp_ms": lcp.get("numericValue", 0) or 0,
        "tbt_ms": tbt.get("numericValue", 0) or 0,
        "error": data.get("runtimeError", {}).get("code", "") if data.get("runtimeError") else "",
    }

print("\nLIGHTHOUSE SCORES BY ROUTE")
print(f"{'Route':<14} {'Perf':>5} {'A11y':>5} {'BP':>5} {'SEO':>5}")
print("-" * 36)
for route, d in lh_results.items():
    err = " (ERROR)" if d["error"] else ""
    print(f"{route:<14} {d['perf']:>5} {d['a11y']:>5} {d['bp']:>5} {d['seo']:>5}{err}")

print("\nKEY METRICS PER ROUTE (LCP / TBT / CLS):")
for route, d in lh_results.items():
    if d["error"]:
        print(f"  {route:<14} FAILED: {d['error']}")
    else:
        print(f"  {route:<14} LCP={d['lcp']:>9}  TBT={d['tbt']:>9}  CLS={d['cls']}")

valid = {r: d for r, d in lh_results.items() if not d["error"]}
if valid:
    worst_lcp = max(valid.items(), key=lambda x: x[1]["lcp_ms"])
    worst_tbt = max(valid.items(), key=lambda x: x[1]["tbt_ms"])
    print(f"\nWORST LCP: {worst_lcp[0]} = {worst_lcp[1]['lcp']}")
    print(f"WORST TBT: {worst_tbt[0]} = {worst_tbt[1]['tbt']}")

# Top opportunities from /en/tours
tours_path = os.path.join(BASE, "lh-en-tours.json")
if os.path.exists(tours_path):
    with open(tours_path, encoding="utf-8") as f:
        data_tours = json.load(f)
    audits = data_tours.get("audits", {})
    opps = []
    for k, v in audits.items():
        if v.get("details", {}).get("type") == "opportunity" and v.get("score") is not None and v.get("score") < 1:
            savings = v.get("details", {}).get("overallSavingsMs", 0) or v.get("numericValue", 0) or 0
            opps.append((savings, v.get("title", k), v.get("displayValue", "")))
    opps.sort(reverse=True)
    print("\nTOP 3 PERFORMANCE OPPORTUNITIES (/en/tours):")
    for savings, title, display in opps[:3]:
        print(f"  {title}: {display} (~{savings:.0f}ms savings)")
