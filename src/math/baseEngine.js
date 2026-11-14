export const BASES = Object.freeze([2, 10, 12, 60]);

const DIGITS = '0123456789AB';
const MAX_INPUT_LENGTH = 10000;
const MAX_EXPANSION_DIGITS = 256;

export class BaseInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BaseInputError';
  }
}

function assertBase(base) {
  if (!BASES.includes(base)) throw new BaseInputError(`Unsupported base: ${base}`);
}

/** @param {bigint} left @param {bigint} right */
function gcd(left, right) {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

/** @param {bigint} numerator @param {bigint} denominator */
function reduce(numerator, denominator) {
  if (denominator === 0n) throw new BaseInputError('The denominator cannot be zero.');
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const divisor = gcd(numerator, denominator) || 1n;
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

export function compareRationalValues(left, right) {
  const first = reduce(left.numerator, left.denominator);
  const second = reduce(right.numerator, right.denominator);
  const difference = first.numerator * second.denominator - second.numerator * first.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

function tokensFromText(text, base) {
  if (!text) throw new BaseInputError('Enter a number.');
  if (base === 60) {
    const parts = text.trim().split(/\s+/);
    if (parts.some((part) => !/^\[\d{2}\]$/.test(part))) {
      throw new BaseInputError('Base 60 digits must use bracketed pairs from [00] through [59].');
    }
    return parts.map((part) => {
      const digit = Number(part.slice(1, -1));
      if (digit >= 60) throw new BaseInputError(`Invalid base 60 digit: ${part}`);
      return digit;
    });
  }

  const normalized = text.toUpperCase();
  if (!/^[0-9A-B]+$/.test(normalized)) {
    throw new BaseInputError(`Base ${base} uses ${base === 12 ? '0-9, A, and B' : `digits 0-${base - 1}`}.`);
  }
  return [...normalized].map((character) => {
    const digit = DIGITS.indexOf(character);
    if (digit < 0 || digit >= base) throw new BaseInputError(`Digit ${character} is not valid in base ${base}.`);
    return digit;
  });
}

function parseUnsignedInteger(text, base) {
  const digits = tokensFromText(text, base);
  let value = 0n;
  const steps = [];
  for (const digit of digits) {
    const previous = value;
    value = value * BigInt(base) + BigInt(digit);
    steps.push({ previous: previous.toString(), digit, value: value.toString() });
  }
  return { value, steps };
}

function splitSign(text) {
  if (text.startsWith('-')) return { sign: -1n, digits: text.slice(1) };
  if (text.startsWith('+')) return { sign: 1n, digits: text.slice(1) };
  return { sign: 1n, digits: text };
}

export function parseBaseNumber(input, base) {
  assertBase(base);
  if (typeof input !== 'string' || input.length > MAX_INPUT_LENGTH) {
    throw new BaseInputError(`Input must be text no longer than ${MAX_INPUT_LENGTH} characters.`);
  }

  const text = input.trim();
  if (!text) throw new BaseInputError('Enter a number.');
  const { sign, digits: unsignedText } = splitSign(text);

  if (unsignedText.includes('/')) {
    if (unsignedText.includes('.') || unsignedText.split('/').length !== 2) {
      throw new BaseInputError('Use one slash between integer numerator and denominator.');
    }
    const [numeratorText, denominatorText] = unsignedText.split('/');
    const numerator = parseUnsignedInteger(numeratorText, base);
    const denominator = parseUnsignedInteger(denominatorText, base);
    if (denominator.value === 0n) throw new BaseInputError('The denominator cannot be zero.');
    const value = reduce(sign * numerator.value, denominator.value);
    return {
      ...value,
      sourceSteps: [...numerator.steps, ...denominator.steps],
      enteredAsFraction: true
    };
  }

  const pointParts = unsignedText.split('.');
  if (pointParts.length > 2 || pointParts.some((part) => !part)) {
    throw new BaseInputError('Use digits with at most one radix point.');
  }
  const integer = parseUnsignedInteger(pointParts[0], base);
  const fraction = pointParts.length === 2 ? parseUnsignedInteger(pointParts[1], base) : { value: 0n, steps: [] };
  const fractionalPlaces = pointParts.length === 2
    ? (base === 60 ? tokensFromText(pointParts[1], base).length : pointParts[1].length)
    : 0;
  const scale = BigInt(base) ** BigInt(fractionalPlaces);
  const numerator = sign * (integer.value * scale + fraction.value);
  const value = reduce(numerator, scale);

  return {
    ...value,
    sourceSteps: [...integer.steps, ...fraction.steps],
    enteredAsFraction: false
  };
}

export function formatBaseInteger(value, base) {
  assertBase(base);
  if (typeof value !== 'bigint') throw new TypeError('Integer values must be BigInt.');
  const sign = value < 0n ? '-' : '';
  let remaining = value < 0n ? -value : value;
  if (remaining === 0n) return base === 60 ? '[00]' : '0';

  const output = [];
  const radix = BigInt(base);
  while (remaining > 0n) {
    const digit = Number(remaining % radix);
    output.push(base === 60 ? `[${String(digit).padStart(2, '0')}]` : DIGITS[digit]);
    remaining /= radix;
  }
  return `${sign}${output.reverse().join(base === 60 ? ' ' : '')}`;
}

function formatExpansionDigits(digits, base) {
  return base === 60
    ? digits.map((digit) => `[${String(digit).padStart(2, '0')}]`).join(' ')
    : digits.map((digit) => DIGITS[digit]).join('');
}

function integerDivisionSteps(value, base) {
  const radix = BigInt(base);
  let current = value;
  const steps = [];
  while (current > 0n) {
    const quotient = current / radix;
    const remainder = Number(current % radix);
    steps.push({
      dividend: current.toString(),
      quotient: quotient.toString(),
      remainder
    });
    current = quotient;
  }
  return steps;
}

/**
 * @param {{ numerator: bigint, denominator: bigint }} rational
 * @param {number} targetBase
 * @param {number} [maxExpansionDigits]
 */
export function convertRational(rational, targetBase, maxExpansionDigits = MAX_EXPANSION_DIGITS) {
  assertBase(targetBase);
  if (!Number.isInteger(maxExpansionDigits) || maxExpansionDigits < 1 || maxExpansionDigits > 4096) {
    throw new RangeError('Expansion limit must be an integer from 1 to 4096.');
  }
  const { numerator, denominator } = reduce(rational.numerator, rational.denominator);
  const negative = numerator < 0n;
  const absoluteNumerator = negative ? -numerator : numerator;
  const integerPart = absoluteNumerator / denominator;
  let remainder = absoluteNumerator % denominator;
  const sign = negative && numerator !== 0n ? '-' : '';
  const integerText = `${sign}${formatBaseInteger(integerPart, targetBase)}`;
  const exactFraction = denominator === 1n
    ? integerText
    : `${formatBaseInteger(numerator, targetBase)}/${formatBaseInteger(denominator, targetBase)}`;

  const seen = new Map();
  const fractionalDigits = [];
  const divisionSteps = [];
  let repeatAt = -1;
  while (remainder !== 0n && fractionalDigits.length < maxExpansionDigits) {
    if (seen.has(remainder)) {
      repeatAt = seen.get(remainder);
      break;
    }
    seen.set(remainder, fractionalDigits.length);
    const before = remainder;
    const scaled = remainder * BigInt(targetBase);
    const digit = Number(scaled / denominator);
    remainder = scaled % denominator;
    fractionalDigits.push(digit);
    divisionSteps.push({
      remainder: before.toString(),
      scaled: scaled.toString(),
      digit,
      nextRemainder: remainder.toString()
    });
  }

  const terminating = remainder === 0n;
  const truncated = !terminating && repeatAt < 0;
  let expansion = integerText;
  if (fractionalDigits.length > 0 || truncated) {
    const beforeRepeat = repeatAt < 0 ? fractionalDigits : fractionalDigits.slice(0, repeatAt);
    const repeating = repeatAt < 0 ? [] : fractionalDigits.slice(repeatAt);
    const beforeText = formatExpansionDigits(beforeRepeat, targetBase);
    const repeatingText = formatExpansionDigits(repeating, targetBase);
    const separator = targetBase === 60 ? ' . ' : '.';
    expansion += `${separator}${beforeText}`;
    if (repeating.length > 0) expansion += `(${repeatingText})`;
    if (truncated) expansion += '...';
  }

  const roundTrip = parseBaseNumber(exactFraction, targetBase);
  const roundTripVerified = roundTrip.numerator === numerator && roundTrip.denominator === denominator;
  if (!roundTripVerified) throw new Error('Internal conversion round-trip verification failed.');

  return {
    base: targetBase,
    exactFraction,
    expansion,
    terminating,
    repeating: repeatAt >= 0,
    truncated,
    roundTripVerified,
    steps: {
      integerDivision: integerDivisionSteps(integerPart, targetBase),
      fractionalDivision: divisionSteps
    }
  };
}

export function convertToAllBases(input, sourceBase) {
  const parsed = parseBaseNumber(input, sourceBase);
  return {
    input: input.trim(),
    sourceBase,
    rational: {
      numerator: parsed.numerator.toString(),
      denominator: parsed.denominator.toString()
    },
    sourceSteps: parsed.sourceSteps,
    conversions: BASES.map((base) => convertRational(parsed, base))
  };
}
