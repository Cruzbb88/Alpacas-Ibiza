
import json, re, collections, sys

files = ['en.json','de.json','es.json','fr.json','it.json','nl.json']

def decode_mojibake_cp1252(s):
    """Try to decode a string that was mis-encoded: UTF-8 bytes read as CP1252"""
    try:
        return s.encode('cp1252').decode('utf-8')
    except:
        return None

# Catalog all distinct sequences
sequences_found = collections.Counter()
occurrences = collections.defaultdict(list)

for fname in files:
    with open(f'translations/{fname}', 'r', encoding='utf-8') as f:
        text = f.read()

    lines = text.split('\n')
    for lineno, line in enumerate(lines, 1):
        i = 0
        while i < len(line):
            if ord(line[i]) == 0x00E2:
                j = i
                seq_chars = []
                while j < len(line) and ord(line[j]) > 127:
                    seq_chars.append(line[j])
                    j += 1
                    if len(seq_chars) > 6:
                        break

                for end in range(2, len(seq_chars)+1):
                    candidate = ''.join(seq_chars[:end])
                    fixed = decode_mojibake_cp1252(candidate)
                    if fixed and len(fixed) == 1:
                        sequences_found[candidate] += 1
                        if len(occurrences[candidate]) < 3:
                            occurrences[candidate].append((fname, lineno))
                        break
            i += 1

sys.stdout.reconfigure(encoding='utf-8')

print("DISTINCT MOJIBAKE SEQUENCES FOUND:")
print("=" * 80)
for seq, count in sorted(sequences_found.items(), key=lambda x: -x[1]):
    fixed = decode_mojibake_cp1252(seq)
    codepoints_in = [f'U+{ord(c):04X}' for c in seq]
    if fixed:
        codepoints_out = [f'U+{ord(c):04X}' for c in fixed]
        print(f"\nSequence in file: {seq!r}")
        print(f"  Bad codepoints:  {' '.join(codepoints_in)}")
        print(f"  Correct char:    {fixed!r}")
        print(f"  Correct cp:      {' '.join(codepoints_out)}")
        print(f"  Count: {count}")
        for occ in occurrences[seq]:
            print(f"  Occurrence: {occ[0]}:{occ[1]}")
