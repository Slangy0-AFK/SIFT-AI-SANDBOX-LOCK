# Base representations

## Digit alphabets

| Base | Values | Representation |
|---|---:|---|
| 2 | 0–1 | `0`, `1` |
| 10 | 0–9 | `0` through `9` |
| 12 | 0–11 | `0` through `9`, then `A` = 10 and `B` = 11 |
| 60 | 0–59 | Bracketed two-digit decimal tokens `[00]` through `[59]` |

Base-12 letters are case-insensitive on input and uppercase on output.

## Positional syntax

Base-2, base-10, and base-12 digits are written consecutively. Base-60 digits must be written as bracketed tokens separated by spaces, for example:

```text
[01] [02] [03]
```

This sequence is a base-60 number with three positional digits, not the decimal integer 10203 and not a clock-time format. Each token is one digit from 0 to 59.

A fractional radix point is `.`. A negative value begins with `-`. An exact fraction may be entered with `/`, for example `1/3`; numerator and denominator use the selected base's digit representation. Denominators must be nonzero.

## Examples

- Decimal twelve is `1100` in base 2, `10` in base 12, and `[12]` in base 60.
- Decimal sixty is `[01] [00]` in base 60.
- `[01] [00]` in base 60 means `1 × 60 + 0 = 60`.

The bracketed base-60 tokens remove ambiguity between a digit value and a sequence of decimal characters. They are intentionally distinct from ordinary decimal notation.
