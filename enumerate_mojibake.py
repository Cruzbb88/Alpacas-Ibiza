
import json, sys, collections

files = ['en.json','de.json','es.json','fr.json','it.json','nl.json']

# Confirmed mojibake map (bad unicode sequence -> correct char)
MOJIBAKE_MAP = {
    'â€”': '—',  # em-dash
    'â€“': '–',  # en-dash
    'â€¦': '…',  # ellipsis
    'â†’': '→',  # right arrow
    'â€™': '’',  # right single quote
    'â€œ': '“',  # left double quote
}

def find_in_json(obj, path=''):
    """Recursively find all keys with mojibake values"""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from find_in_json(v, f'{path}.{k}' if path else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from find_in_json(v, f'{path}[{i}]')
    elif isinstance(obj, str):
        for bad_seq, correct in MOJIBAKE_MAP.items():
            if bad_seq in obj:
                count = obj.count(bad_seq)
                yield (path, bad_seq, correct, count, obj[:80])

sys.stdout.reconfigure(encoding='utf-8')

print("ALL MOJIBAKE OCCURRENCES BY FILE AND KEY")
print("=" * 80)

total = 0
by_file = collections.defaultdict(list)

for fname in files:
    with open(f'translations/{fname}', 'r', encoding='utf-8') as f:
        data = json.load(f)

    findings = list(find_in_json(data))
    by_file[fname] = findings
    total += len(findings)

for fname in files:
    findings = by_file[fname]
    if not findings:
        continue
    print(f"\n{'='*60}")
    print(f"FILE: {fname} ({len(findings)} keys affected)")
    print(f"{'='*60}")
    for key, bad, correct, count, snippet in findings:
        print(f"  key: {key}")
        print(f"    bad sequence: {bad!r} (U+{ord(bad[0]):04X} U+{ord(bad[1]):04X} U+{ord(bad[2]):04X})")
        print(f"    correct char: {correct!r} (U+{ord(correct):04X})")
        if count > 1:
            print(f"    occurrences: {count}")
        print(f"    snippet: {snippet!r}")
        print()

print(f"\nTOTAL: {total} key/sequence pairs across all files")

# Summary table
print("\nSUMMARY: Sequence -> Correct char -> count per file")
seq_totals = collections.Counter()
for fname in files:
    for key, bad, correct, count, snippet in by_file[fname]:
        seq_totals[(bad, correct)] += count

for (bad, correct), count in sorted(seq_totals.items(), key=lambda x: -x[1]):
    bad_cps = ' '.join(f'U+{ord(c):04X}' for c in bad)
    print(f"  {bad!r} ({bad_cps}) -> {correct!r} (U+{ord(correct):04X}) : {count} total")
