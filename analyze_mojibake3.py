
import json, re, collections

files = ['en.json','de.json','es.json','fr.json','it.json','nl.json']

# Mojibake decode: the file contains Unicode chars that are actually
# the result of reading UTF-8 bytes as CP1252 (Windows-1252)
#
# The pattern: U+00E2 U+20AC U+201D = â€" (3 Unicode chars, originally E2 80 94 = em-dash U+2014)
# Let's verify by encoding each char to CP1252 byte, then decoding the byte sequence as UTF-8

def decode_mojibake_cp1252(s):
    """Try to decode a string that was mis-encoded: UTF-8 bytes read as CP1252"""
    try:
        return s.encode('cp1252').decode('utf-8')
    except:
        return None

# Catalog all distinct â-sequences in the files
sequences_found = collections.Counter()
occurrences = collections.defaultdict(list)  # seq -> [(file, line, key_context)]

for fname in files:
    with open(f'translations/{fname}', 'r', encoding='utf-8') as f:
        text = f.read()

    lines = text.split('\n')
    for lineno, line in enumerate(lines, 1):
        # Find all occurrences of U+00E2 (â) which signals mojibake
        i = 0
        while i < len(line):
            if ord(line[i]) == 0x00E2:
                # Extract the sequence: â + next chars until we hit ASCII
                j = i
                seq_chars = []
                while j < len(line) and (ord(line[j]) > 127 or ord(line[j]) == 0x20):
                    seq_chars.append(line[j])
                    j += 1
                    if len(seq_chars) > 6:  # max sequence length
                        break

                # Try various lengths
                for end in range(2, len(seq_chars)+1):
                    candidate = ''.join(seq_chars[:end])
                    fixed = decode_mojibake_cp1252(candidate)
                    if fixed and len(fixed) == 1:  # single char recovery = good
                        sequences_found[candidate] += 1
                        occurrences[candidate].append((fname, lineno, line[:60]))
                        break
            i += 1

print("DISTINCT MOJIBAKE SEQUENCES FOUND:")
print("=" * 80)
for seq, count in sorted(sequences_found.items(), key=lambda x: -x[1]):
    fixed = decode_mojibake_cp1252(seq)
    codepoints_in = [f'U+{ord(c):04X}' for c in seq]
    if fixed:
        codepoints_out = [f'U+{ord(c):04X}' for c in fixed]
        print(f"\nSequence: {repr(seq)}")
        print(f"  Codepoints (bad): {codepoints_in}")
        print(f"  Correct char:     {repr(fixed)} -> {codepoints_out}")
        print(f"  Count: {count}")
        sample = occurrences[seq][0]
        print(f"  Sample: {sample[0]}:{sample[1]}")
