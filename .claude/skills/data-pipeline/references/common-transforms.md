# Common ETL Transformation Patterns

Reusable transformation patterns for data pipeline field mappings. Reference this when generating mapping tables and transformation code.

---

## 1. Date Parsing

Dates are the #1 source of ETL errors. Always detect format explicitly.

### Common Formats

| Format | Example | Python strptime | Notes |
|--------|---------|----------------|-------|
| ISO 8601 | 2024-01-15 | `%Y-%m-%d` | Universal standard, preferred target |
| US | 01/15/2024 | `%m/%d/%Y` | Month first |
| AU/UK | 15/01/2024 | `%d/%m/%Y` | Day first |
| EU | 15.01.2024 | `%d.%m.%Y` | Dot separator |
| Short year | 15/01/24 | `%d/%m/%y` | Ambiguous century |
| Timestamp | 2024-01-15T10:30:00Z | `%Y-%m-%dT%H:%M:%SZ` | ISO 8601 with time |
| Unix epoch | 1705305000 | `datetime.fromtimestamp()` | Seconds since 1970 |
| Excel serial | 45306 | `datetime(1899,12,30) + timedelta(days=N)` | Excel date number |
| Human | January 15, 2024 | `%B %d, %Y` | Long month name |
| Compact | 20240115 | `%Y%m%d` | No separators |

### Ambiguity Detection

When day <= 12, format is ambiguous (01/02/2024 = Jan 2 or Feb 1?):
- Check if any value in the column has day > 12 to disambiguate
- Check locale context (AU system = DD/MM, US system = MM/DD)
- If still ambiguous, flag as `[AMBIGUOUS DATE FORMAT]` and ask user

### Python Pattern

```python
from datetime import datetime

def parse_date(value: str, source_format: str, target_format: str = "%Y-%m-%d") -> str:
    """Parse date from source format to target format."""
    if not value or value.strip() == "":
        return None
    try:
        dt = datetime.strptime(value.strip(), source_format)
        return dt.strftime(target_format)
    except ValueError:
        return f"[INVALID_DATE: {value}]"
```

### Excel Serial Date

```python
from datetime import datetime, timedelta

def excel_date_to_iso(serial: int) -> str:
    """Convert Excel serial date number to ISO 8601."""
    base = datetime(1899, 12, 30)  # Excel epoch (with Lotus 1-2-3 bug)
    return (base + timedelta(days=int(serial))).strftime("%Y-%m-%d")
```

---

## 2. Currency Normalization

### Locale-Aware Parsing

| Locale | Format | Example | Thousands | Decimal |
|--------|--------|---------|-----------|---------|
| US/AU/UK | 1,234.56 | $1,234.56 | comma | period |
| EU (DE/FR) | 1.234,56 | 1.234,56 EUR | period | comma |
| Swiss | 1'234.56 | CHF 1'234.56 | apostrophe | period |
| Indian | 1,23,456.78 | Rs 1,23,456.78 | mixed comma | period |

### Detection Heuristic

```python
def detect_number_format(value: str) -> str:
    """Detect if number uses US or EU formatting."""
    cleaned = value.replace(" ", "").lstrip("$").rstrip("AUD").rstrip("EUR")
    # If last separator is comma and 2 digits follow -> EU decimal
    if "," in cleaned and cleaned.rindex(",") > cleaned.rindex(".") if "." in cleaned else True:
        if len(cleaned.split(",")[-1]) <= 2:
            return "EU"  # 1.234,56
    return "US"  # 1,234.56
```

### Python Pattern

```python
import re

def parse_currency(value: str, locale: str = "US") -> float:
    """Parse currency string to float."""
    if not value or value.strip() == "":
        return None
    # Remove currency symbols and whitespace
    cleaned = re.sub(r'[^0-9.,\-]', '', value.strip())
    if locale == "EU":
        cleaned = cleaned.replace(".", "").replace(",", ".")
    else:
        cleaned = cleaned.replace(",", "")
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None
```

---

## 3. Address Splitting

### Common Patterns

**Full address string to components:**
```
"123 Main St, Suite 4, Springfield, IL 62701, USA"
  -> street: "123 Main St"
  -> unit: "Suite 4"
  -> city: "Springfield"
  -> state: "IL"
  -> postal: "62701"
  -> country: "USA"
```

### Australian Address Format

```
"Unit 5/42 George Street, Sydney NSW 2000"
  -> unit: "Unit 5"
  -> street_number: "42"
  -> street_name: "George Street"
  -> suburb: "Sydney"
  -> state: "NSW"
  -> postcode: "2000"
```

### Python Pattern

```python
import re

def split_au_address(address: str) -> dict:
    """Split Australian address into components."""
    result = {"unit": None, "street": None, "suburb": None, "state": None, "postcode": None}

    # Extract postcode (4 digits at end)
    pc_match = re.search(r'\b(\d{4})\s*$', address)
    if pc_match:
        result["postcode"] = pc_match.group(1)
        address = address[:pc_match.start()].strip().rstrip(",")

    # Extract state (2-3 letter abbreviation before postcode)
    state_match = re.search(r'\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b', address, re.IGNORECASE)
    if state_match:
        result["state"] = state_match.group(1).upper()
        address = address[:state_match.start()].strip().rstrip(",")

    # Extract unit (Unit X, Apt X, or X/ prefix)
    unit_match = re.match(r'((?:Unit|Apt|Suite|Level)\s*\d+\w?)[/,\s]', address, re.IGNORECASE)
    if not unit_match:
        unit_match = re.match(r'(\d+\w?)\s*/\s*', address)
    if unit_match:
        result["unit"] = unit_match.group(1).strip()
        address = address[unit_match.end():].strip()

    # Remaining: "street, suburb" or just "street"
    parts = [p.strip() for p in address.split(",")]
    if len(parts) >= 2:
        result["street"] = parts[0]
        result["suburb"] = parts[-1]
    else:
        result["street"] = parts[0]

    return result
```

### Handling Tips

- Always preserve the original address in a `raw_address` field
- Address parsing is inherently fuzzy; flag low-confidence splits
- Consider using a geocoding API for high-accuracy requirements
- International addresses have wildly different structures; don't assume US/AU format

---

## 4. Unit Conversion

### Common Conversions

| From | To | Formula | Notes |
|------|----|---------|-------|
| inches | mm | `value * 25.4` | Exact |
| feet | meters | `value * 0.3048` | Exact |
| miles | km | `value * 1.60934` | Approximate |
| pounds (lb) | kg | `value * 0.453592` | Approximate |
| oz | grams | `value * 28.3495` | Approximate |
| gallons (US) | liters | `value * 3.78541` | US gallon |
| gallons (UK) | liters | `value * 4.54609` | Imperial gallon |
| Fahrenheit | Celsius | `(value - 32) * 5/9` | Temperature |
| sq feet | sq meters | `value * 0.092903` | Area |
| acres | hectares | `value * 0.404686` | Area |

### Python Pattern

```python
CONVERSIONS = {
    ("inches", "mm"): lambda v: v * 25.4,
    ("feet", "meters"): lambda v: v * 0.3048,
    ("lb", "kg"): lambda v: v * 0.453592,
    ("oz", "grams"): lambda v: v * 28.3495,
    ("gallons_us", "liters"): lambda v: v * 3.78541,
    ("fahrenheit", "celsius"): lambda v: (v - 32) * 5 / 9,
    ("sq_feet", "sq_meters"): lambda v: v * 0.092903,
}

def convert_unit(value: float, from_unit: str, to_unit: str, precision: int = 4) -> float:
    """Convert between units using lookup table."""
    key = (from_unit.lower(), to_unit.lower())
    if key not in CONVERSIONS:
        raise ValueError(f"Unknown conversion: {from_unit} -> {to_unit}")
    return round(CONVERSIONS[key](value), precision)
```

### Handling Tips

- Always document which unit system the source uses (metric vs imperial)
- Be explicit about US vs UK gallons, short vs long tons
- Preserve original values in a `_raw` field when converting
- For currency conversion, use real-time rates (not static lookup)

---

## 5. Enum Mapping

### Lookup Table Pattern

Map source values to target-expected values using explicit lookup tables.

```python
STATUS_MAP = {
    # Source value -> Target value
    "active": "ACTIVE",
    "Active": "ACTIVE",
    "ACTIVE": "ACTIVE",
    "1": "ACTIVE",
    "Y": "ACTIVE",
    "yes": "ACTIVE",
    "inactive": "INACTIVE",
    "Inactive": "INACTIVE",
    "INACTIVE": "INACTIVE",
    "0": "INACTIVE",
    "N": "INACTIVE",
    "no": "INACTIVE",
    "deleted": "DELETED",
    "archived": "DELETED",
}

def map_enum(value: str, mapping: dict, default: str = None, strict: bool = False) -> str:
    """Map source value to target enum using lookup table."""
    if value is None or str(value).strip() == "":
        return default
    result = mapping.get(str(value).strip())
    if result is None:
        # Try case-insensitive
        lower_map = {k.lower(): v for k, v in mapping.items()}
        result = lower_map.get(str(value).strip().lower())
    if result is None:
        if strict:
            raise ValueError(f"Unknown enum value: '{value}'. Expected one of: {set(mapping.values())}")
        return default or f"[UNKNOWN: {value}]"
    return result
```

### Boolean Normalization

```python
TRUTHY = {"true", "yes", "y", "1", "on", "active", "enabled", "t"}
FALSY = {"false", "no", "n", "0", "off", "inactive", "disabled", "f"}

def parse_boolean(value: str) -> bool | None:
    """Parse various boolean representations."""
    if value is None:
        return None
    cleaned = str(value).strip().lower()
    if cleaned in TRUTHY:
        return True
    if cleaned in FALSY:
        return False
    return None  # Unknown
```

### Handling Tips

- Always do case-insensitive matching as a fallback
- Log unmatched values with their frequency (helps identify new enum values)
- Consider fuzzy matching for typo-prone source data
- Document the full mapping table in the pipeline output for auditability

---

## 6. String Operations

### Common Transformations

| Operation | Python | Example |
|-----------|--------|---------|
| Uppercase | `value.upper()` | "smith" -> "SMITH" |
| Lowercase | `value.lower()` | "SMITH" -> "smith" |
| Title case | `value.title()` | "john smith" -> "John Smith" |
| Strip whitespace | `value.strip()` | " hello " -> "hello" |
| Remove special chars | `re.sub(r'[^a-zA-Z0-9\s]', '', value)` | "Hello! @World" -> "Hello World" |
| Pad left | `value.zfill(6)` | "123" -> "000123" |
| Truncate | `value[:50]` | Limit field length |
| Concatenate | `f"{first} {last}"` | "John" + "Smith" -> "John Smith" |
| Split | `value.split(",")[0]` | "Smith, John" -> "Smith" |
| Replace | `value.replace("-", "")` | "555-1234" -> "5551234" |
| Extract regex | `re.search(r'\d+', value).group()` | "Order #123" -> "123" |

### Phone Number Normalization

```python
import re

def normalize_phone(phone: str, country_code: str = "+61") -> str:
    """Normalize phone number to E.164 format."""
    if not phone:
        return None
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    # Handle leading country code
    if digits.startswith("61"):
        digits = digits[2:]
    elif digits.startswith("0"):
        digits = digits[1:]
    if len(digits) == 9:  # AU mobile/landline without leading 0
        return f"{country_code}{digits}"
    return f"[INVALID_PHONE: {phone}]"
```

### Email Normalization

```python
def normalize_email(email: str) -> str:
    """Normalize email: lowercase, strip whitespace."""
    if not email:
        return None
    cleaned = email.strip().lower()
    if "@" not in cleaned or "." not in cleaned.split("@")[1]:
        return f"[INVALID_EMAIL: {email}]"
    return cleaned
```

---

## 7. Null and Default Handling

### Strategy Matrix

| Scenario | Strategy | Example |
|----------|----------|---------|
| Required field, no source | Halt or flag | `[REQUIRED: OrderNumber]` |
| Optional field, no source | Use default | `default("")` or `default(0)` |
| Source value is empty string | Treat as null | `None if value.strip() == "" else value` |
| Source value is "N/A", "NULL" | Treat as null | Check against NULL_STRINGS set |
| Numeric field, non-numeric | Log error | `[INVALID: "abc" for Quantity]` |

### Python Pattern

```python
NULL_STRINGS = {"", "null", "none", "n/a", "na", "nil", "-", "--", "undefined"}

def clean_value(value: str, field_type: str = "str", default=None):
    """Clean a raw value: handle nulls, whitespace, and type coercion."""
    if value is None:
        return default
    cleaned = str(value).strip()
    if cleaned.lower() in NULL_STRINGS:
        return default
    if field_type == "int":
        try:
            return int(float(cleaned))
        except ValueError:
            return f"[INVALID_INT: {value}]"
    if field_type == "float":
        try:
            return float(cleaned)
        except ValueError:
            return f"[INVALID_FLOAT: {value}]"
    return cleaned
```

---

## 8. Composite Transforms

### Field Merging (Many -> One)

```python
def merge_fields(row: dict, source_fields: list, separator: str = " ", skip_empty: bool = True) -> str:
    """Merge multiple source fields into a single target field."""
    values = []
    for field in source_fields:
        val = str(row.get(field, "")).strip()
        if skip_empty and not val:
            continue
        values.append(val)
    return separator.join(values) if values else None
```

### Field Splitting (One -> Many)

```python
def split_field(value: str, separator: str = ",", expected_parts: int = 2) -> list:
    """Split a single field into multiple target fields."""
    if not value:
        return [None] * expected_parts
    parts = [p.strip() for p in value.split(separator)]
    # Pad with None if fewer parts than expected
    while len(parts) < expected_parts:
        parts.append(None)
    return parts[:expected_parts]
```

### Computed Fields

```python
def compute_field(row: dict, formula: str) -> any:
    """Compute a derived field from a formula string.

    Formulas use field names as variables:
    - "Quantity * UnitPrice" -> multiply two fields
    - "EndDate - StartDate" -> date difference
    """
    # Simple arithmetic only — no eval() for security
    # Implement specific formulas as needed
    pass
```

---

## Usage in Mapping Tables

When generating mapping tables, reference these patterns by name:

| Transform | Pattern Reference |
|-----------|------------------|
| `strptime(%d/%m/%Y)` | Date Parsing, AU/UK format |
| `currency(EU)` | Currency Normalization, EU locale |
| `enum(STATUS_MAP)` | Enum Mapping with lookup table |
| `concat(" ")` | String Operations, concatenate |
| `split(",", 2)` | Composite Transforms, field splitting |
| `normalize_phone(+61)` | String Operations, phone normalization |
| `convert(lb, kg)` | Unit Conversion |
| `clean(int, default=0)` | Null and Default Handling |
| `parse_bool()` | Enum Mapping, boolean normalization |
