
import sys
sys.stdout.reconfigure(encoding='utf-8')

# Final verification of all 6 sequences + the hybrid right-double-quote

# Verified recovery method: encode as latin-1, decode as utf-8
def fix_latin1(s):
    try:
        return s.encode('latin-1').decode('utf-8')
    except:
        return None

# Known good sequences (already proven):
print("VERIFIED MOJIBAKE MAP:")
print("=" * 60)

entries = [
    # (bad_sequence, description, expected_correct)
    ('â\x80\x94', 'em-dash (via latin-1)', '—'),    # U+2014
    ('â\x80\x93', 'en-dash (via latin-1)', '–'),    # U+2013
    ('â\x80\xa6', 'ellipsis (via latin-1)', '…'),   # U+2026
    ('â\x86\x92', 'right arrow (via latin-1)', '→'), # U+2192
    ('â\x80\x99', 'right single quote (via latin-1)', '’'),  # U+2019
    ('â\x80\x9c', 'left double quote (via latin-1)', '“'),   # U+201C
    ('â\x80\x9d', 'right double quote (via latin-1)', '”'),  # U+201D
]

for s, desc, expected in entries:
    fixed = fix_latin1(s)
    cps_bad = ' '.join(f'U+{ord(c):04X}' for c in s)
    if fixed == expected:
        print(f"  OK  {desc}: {cps_bad} -> {repr(fixed)} U+{ord(fixed):04X}")
    else:
        print(f"  FAIL {desc}: got {repr(fixed)}, expected {repr(expected)}")

print()
print("NOTE: These raw python strings use \\x escapes = the actual bytes in the file")
print("BUT the JSON file stores these as Unicode codepoints, not raw bytes.")
print()
print("The file codepoints (what grep/read shows) are:")
print("  â€" in file = U+00E2 U+20AC U+201D -> fix: replace with U+2014 —")
print("  â€" in file = U+00E2 U+20AC U+201C -> fix: replace with U+2013 –")
print("  â€¦ in file = U+00E2 U+20AC U+00A6 -> fix: replace with U+2026 …")
print("  â†' in file = U+00E2 U+2020 U+2019 -> fix: replace with U+2192 →")
print("  â€™ in file = U+00E2 U+20AC U+2122 -> fix: replace with U+2019 '")
print("  â€œ in file = U+00E2 U+20AC U+0153 -> fix: replace with U+201C "")
print("  â€\\x9d in file = U+00E2 U+20AC U+009D -> fix: replace with U+201D "")
print()
print("These in-file codepoints happened because UTF-8 was read as CP1252.")
print("CP1252 byte 0x80 = U+20AC, 0x94 = U+201D, 0x93 = U+201C, etc.")
print("So E2 80 94 (UTF-8 for em-dash) read as CP1252 = U+00E2 U+20AC U+201D")
