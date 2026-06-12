
def fix_mojibake(s):
    try:
        return s.encode('latin-1').decode('utf-8')
    except:
        return None

# Test the common sequences found in the translation files
test_cases = [
    ('â€“', 'em-dash'),
    ('â€”', 'en-dash (same bytes as above?)'),
    ('â€¦', 'ellipsis'),
    ('â€™', 'right single quote'),
    ('â€œ', 'left double quote'),
    ('â€', 'right double quote alone'),
    ('â†’', 'right arrow'),
    ('â¤ï¸', 'heart emoji'),
    ('ðŸ¦™', 'llama emoji'),
    ('â€˜', 'left single quote?'),
]

print("Mojibake analysis:")
print("-" * 80)
for s, desc in test_cases:
    fixed = fix_mojibake(s)
    if fixed:
        codepoints = [f'U+{ord(c):04X}' for c in fixed]
        print(f"Input: {repr(s)}")
        print(f"  Desc: {desc}")
        print(f"  Fixed: {repr(fixed)}")
        print(f"  Codepoints: {codepoints}")
        print()
    else:
        print(f"Input: {repr(s)} ({desc}) -> FAILED")
        print()
