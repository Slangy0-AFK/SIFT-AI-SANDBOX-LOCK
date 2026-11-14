import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BASES,
  BaseInputError,
  compareRationalValues,
  convertRational,
  convertToAllBases,
  parseBaseNumber
} from '../src/math/baseEngine.js';
import { entropyHexToBitString } from '../src/math/entropy.js';
import { inspectBitSample } from '../src/math/entropyStats.js';

test('all ordered base pairs convert and round-trip exactly', () => {
  for (const source of BASES) {
    const input = source === 60 ? '[01] [00]' : source === 12 ? '50' : source === 2 ? '111100' : '60';
    const result = convertToAllBases(input, source);
    assert.equal(result.conversions.length, 4);
    for (const conversion of result.conversions) {
      assert.equal(conversion.roundTripVerified, true);
      const parsed = parseBaseNumber(conversion.exactFraction, conversion.base);
      assert.equal(parsed.numerator, 60n);
      assert.equal(parsed.denominator, 1n);
    }
  }
});

test('required conversions use exact values across binary, decimal, duodecimal, and sexagesimal', () => {
  assert.equal(convertToAllBases('1010', 2).conversions.find((item) => item.base === 10).exactFraction, '10');
  assert.equal(convertToAllBases('10', 10).conversions.find((item) => item.base === 12).exactFraction, 'A');
  assert.equal(convertToAllBases('50', 12).conversions.find((item) => item.base === 60).exactFraction, '[01] [00]');
  assert.equal(convertToAllBases('[01] [00]', 60).conversions.find((item) => item.base === 2).exactFraction, '111100');
});

test('base 12 uses A and B; base 60 uses bracketed 00-59 digits', () => {
  assert.equal(convertToAllBases('B', 12).conversions.find((item) => item.base === 10).exactFraction, '11');
  assert.equal(convertToAllBases('[59]', 60).conversions.find((item) => item.base === 10).exactFraction, '59');
});

test('arbitrary-precision integers and negative values round-trip without Number conversion', () => {
  const huge = '12345678901234567890123456789012345678901234567890';
  const result = convertToAllBases(huge, 10);
  for (const conversion of result.conversions) {
    const parsed = parseBaseNumber(conversion.exactFraction, conversion.base);
    assert.equal(parsed.numerator, BigInt(huge));
    assert.equal(parsed.denominator, 1n);
  }
  assert.equal(convertToAllBases('-101', 2).conversions.find((item) => item.base === 10).exactFraction, '-5');
});

test('rational inputs remain exact and repeating expansions are marked', () => {
  const third = convertToAllBases('1/3', 10);
  const binary = third.conversions.find((item) => item.base === 2);
  const decimal = third.conversions.find((item) => item.base === 10);
  const dozenal = third.conversions.find((item) => item.base === 12);
  const sexagesimal = third.conversions.find((item) => item.base === 60);
  assert.equal(binary.exactFraction, '1/11');
  assert.equal(binary.expansion, '0.(01)');
  assert.equal(decimal.expansion, '0.(3)');
  assert.equal(dozenal.exactFraction, '1/3');
  assert.equal(sexagesimal.exactFraction, '[01]/[03]');
  assert.equal(sexagesimal.expansion, '[00] . [20]');
  assert.equal(binary.repeating, true);
  assert.equal(sexagesimal.terminating, true);
});

test('rational comparisons use exact cross multiplication, including negatives', () => {
  assert.equal(compareRationalValues({ numerator: 1n, denominator: 3n }, { numerator: 2n, denominator: 6n }), 0);
  assert.equal(compareRationalValues({ numerator: -1n, denominator: 3n }, { numerator: 1n, denominator: 3n }), -1);
  assert.equal(compareRationalValues({ numerator: 5n, denominator: 2n }, { numerator: 2n, denominator: 1n }), 1);
  assert.throws(() => compareRationalValues({ numerator: 1n, denominator: 0n }, { numerator: 1n, denominator: 2n }), BaseInputError);
});

test('finite radix fractions and base-60 radix points are parsed exactly', () => {
  assert.deepEqual(parseBaseNumber('0.1', 10), {
    numerator: 1n,
    denominator: 10n,
    sourceSteps: [
      { previous: '0', digit: 0, value: '0' },
      { previous: '0', digit: 1, value: '1' }
    ],
    enteredAsFraction: false
  });
  assert.equal(parseBaseNumber('[01] . [30]', 60).numerator, 3n);
  assert.equal(parseBaseNumber('[01] . [30]', 60).denominator, 2n);
});

test('invalid digits, malformed fractions, zero denominators, and unsupported bases are rejected', () => {
  assert.throws(() => parseBaseNumber('2', 2), BaseInputError);
  assert.throws(() => parseBaseNumber('C', 12), BaseInputError);
  assert.throws(() => parseBaseNumber('[60]', 60), BaseInputError);
  assert.throws(() => parseBaseNumber('1//2', 10), BaseInputError);
  assert.throws(() => parseBaseNumber('1/0', 10), BaseInputError);
  assert.throws(() => parseBaseNumber('1', 8), BaseInputError);
});

test('long fractional cycles are represented as exact fractions and visibly truncated', () => {
  const conversion = convertRational({ numerator: 1n, denominator: 997n }, 2, 8);
  assert.equal(conversion.truncated, true);
  assert.equal(conversion.terminating, false);
  assert.equal(conversion.exactFraction, '1/1111100101');
  assert.match(conversion.expansion, /\.\.\.$/);
});

test('QRNG hex bytes preserve requested leading zero bits and convert exactly', () => {
  const bits = entropyHexToBitString('0003', 16);
  assert.equal(bits, '0000000000000011');
  const result = convertToAllBases(bits, 2);
  assert.equal(result.conversions.find((item) => item.base === 10).exactFraction, '3');
  assert.equal(result.conversions.find((item) => item.base === 12).exactFraction, '3');
  assert.equal(result.conversions.find((item) => item.base === 60).exactFraction, '[03]');
});

test('malformed or incorrectly sized QRNG values are rejected', () => {
  assert.throws(() => entropyHexToBitString('0g', 8), TypeError);
  assert.throws(() => entropyHexToBitString('01', 16), TypeError);
});

test('statistical diagnostics are descriptive, thresholded, and reject malformed samples', () => {
  assert.equal(inspectBitSample('0101').monobit.status, 'insufficient-sample');
  const biased = inspectBitSample('0'.repeat(128));
  assert.equal(biased.monobit.status, 'flagged');
  assert.equal(biased.runsTest.status, 'frequency-condition-failed');
  const alternating = inspectBitSample('01'.repeat(64));
  assert.equal(alternating.runsTest.status, 'flagged');
  assert.throws(() => inspectBitSample('10x1'), TypeError);
});
