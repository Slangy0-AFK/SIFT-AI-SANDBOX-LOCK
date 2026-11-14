function erfc(value) {
  const x = Math.abs(value);
  const t = 1 / (1 + 0.5 * x);
  const approximation = t * Math.exp(
    -x * x - 1.26551223 +
    t * (1.00002368 +
      t * (0.37409196 +
        t * (0.09678418 +
          t * (-0.18628806 +
            t * (0.27886807 +
              t * (-1.13520398 +
                t * (1.48851587 +
                  t * (-0.82215223 + t * 0.17087277))))))))
  );
  return value >= 0 ? approximation : 2 - approximation;
}

function testStatus(pValue) {
  return pValue < 0.01 ? 'flagged' : 'no-anomaly-detected';
}

export function inspectBitSample(bits) {
  if (typeof bits !== 'string' || !/^[01]+$/.test(bits)) {
    throw new TypeError('Sample must be a non-empty binary string.');
  }

  const length = bits.length;
  let ones = 0;
  let runs = 1;
  for (let index = 0; index < length; index += 1) {
    if (bits[index] === '1') ones += 1;
    if (index > 0 && bits[index] !== bits[index - 1]) runs += 1;
  }
  const zeros = length - ones;
  const proportionOnes = ones / length;

  if (length < 100) {
    return {
      length,
      ones,
      zeros,
      runs,
      monobit: { status: 'insufficient-sample', pValue: null },
      runsTest: { status: 'insufficient-sample', pValue: null }
    };
  }

  const signedSum = ones - zeros;
  const monobitP = erfc(Math.abs(signedSum) / Math.sqrt(2 * length));
  const frequencyConditionPasses = Math.abs(proportionOnes - 0.5) < 2 / Math.sqrt(length);
  if (!frequencyConditionPasses) {
    return {
      length,
      ones,
      zeros,
      runs,
      monobit: { status: testStatus(monobitP), pValue: monobitP },
      runsTest: { status: 'frequency-condition-failed', pValue: null }
    };
  }

  const expectedRuns = 2 * length * proportionOnes * (1 - proportionOnes);
  const denominator = 2 * Math.sqrt(2 * length) * proportionOnes * (1 - proportionOnes);
  const runsP = erfc(Math.abs(runs - expectedRuns) / denominator);
  return {
    length,
    ones,
    zeros,
    runs,
    monobit: { status: testStatus(monobitP), pValue: monobitP },
    runsTest: { status: testStatus(runsP), pValue: runsP }
  };
}
