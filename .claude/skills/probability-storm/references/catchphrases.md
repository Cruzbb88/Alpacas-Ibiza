# Probability Storm -- Verdict Catchphrases

Rotating Rick-inspired verdict phrases organized by probability tier.

## Selection Rule

Use hash-based rotation to avoid consecutive repeats:

```
index = (report_number * 7 + day_of_year) % phrase_count
```

Where `day_of_year` is 1-366 and `report_number` is the current report's sequential number. This produces deterministic but non-sequential rotation across runs.

## High Probability (>75%)

Green-light phrases. The field is stable -- proceed with confidence.

1. "Sim it."
2. "Field's clean. Ship it."
3. "Fate-locked. You're golden."
4. "The Lockerean approves."
5. "Probability field: stable. Execute."
6. "Deterministic outcome detected. Go."
7. "The chaos has been fully digested."

## Medium Probability (40-75%)

Yellow-light phrases. The field is fluctuating -- proceed with awareness.

1. "Chaotic field detected. Proceed with eyes open."
2. "The Lockerean's still chewing on this one."
3. "Fortune's forming but not set."
4. "Probability flux -- could go either way."
5. "Field's wobbly. Tread carefully."
6. "Partial determinism. Some paths still open."
7. "The probability field is... interesting."

## Low Probability (<40%)

Red-light phrases. The field is collapsing -- reconsider.

1. "Don't sim it. Walk away."
2. "Fortune 500 would dump this fortune."
3. "Infinite improbability detected."
4. "The chaos hasn't been digested yet."
5. "Field collapse imminent. Abort."
6. "The Lockerean spit this one back out."
7. "Probability field: unstable. Do not engage."
