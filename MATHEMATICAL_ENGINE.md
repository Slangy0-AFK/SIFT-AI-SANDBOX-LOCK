# Mathematical engine

## Exact values

The engine represents a rational number as a reduced pair of JavaScript `BigInt` values: numerator and positive denominator. Arithmetic and conversion do not use IEEE-754 floating-point values, so integer and fraction conversions do not lose precision.

The parser accepts signed integers, radix-point notation, and explicit rational notation. Input length is bounded to 10,000 characters to limit resource use. Zero is normalized, and negative values retain their sign independently of the digit alphabet.

## Conversion

Integer conversion repeatedly divides the absolute integer by the destination radix and collects remainders. Fractional conversion uses long division. It tracks each remainder to identify repeating cycles; a non-terminating expansion is displayed with its repetend in parentheses. The exact reduced fraction remains authoritative even when a display expansion is capped.

Every conversion is parsed back into the original base and compared as an exact rational. A mismatch is an error, not a successful-looking result. The UI displays the normalized value, conversion result, and available steps.

## Limits and failure behavior

- Values are arbitrary precision within the input-length limit.
- Fraction expansions have a display cap; truncation does not change the exact rational result.
- Invalid characters and digits outside the selected base are rejected.
- Malformed rational syntax, zero denominators, and unsupported input are reported as errors.
- Conversion and input processing happen locally; no mathematical input is sent to the server.

## Tests

The engine tests cover the requested base pairs, round trips, large integers, rational values, repeating expansions, negative values, zero, and invalid digits. Tests are independent of the React interface and QRNG provider.
