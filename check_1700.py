
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('translations/en.json', 'r', encoding='utf-8') as f:
    lines = f.readlines()

line = lines[1699]  # 0-indexed
print(f"Line 1700: {repr(line[:200])}")
# Find all non-ASCII chars
for i, c in enumerate(line):
    if ord(c) > 127:
        print(f"  pos {i}: U+{ord(c):04X} {repr(c)}")
