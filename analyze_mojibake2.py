
import re

# Read the file as raw bytes to understand what's actually in it
with open('translations/en.json', 'rb') as f:
    raw = f.read()

# Find all occurrences of the mojibake pattern starting with 0xC3 0xA2 (which is â in UTF-8)
# In the context: â€" appears frequently - let's find all unique â€ sequences

text_utf8 = raw.decode('utf-8')

# Find all sequences matching â followed by non-ASCII
# The pattern â€" in UTF-8 is: C3 A2 E2 80 94 (but let's verify from the file)
# Let's extract a specific line to check
lines = text_utf8.split('\n')
for i, line in enumerate(lines, 1):
    if 'â' in line:
        # Show the characters and their codepoints
        segment_start = line.find('â')
        # Show 10 chars around it
        segment = line[max(0,segment_start-2):segment_start+12]
        codepoints = [f'U+{ord(c):04X}' for c in segment]
        print(f"Line {i}: {repr(segment)}")
        print(f"  Codepoints: {codepoints}")

        # Try to recover
        try:
            recovered = segment.encode('latin-1').decode('utf-8')
            rec_codepoints = [f'U+{ord(c):04X}' for c in recovered]
            print(f"  Recovered: {repr(recovered)} -> {rec_codepoints}")
        except Exception as e:
            print(f"  Recovery error: {e}")
        print()
        if i > 100:  # limit output
            break
