import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchLfdQrng } from '../dist/integrations/lfdQrng.js';

const runLiveTest = process.env.RUN_LFD_QRNG_INTEGRATION === '1';

test('LfD QRNG is reachable over HTTPS and returns validated entropy', {
  skip: runLiveTest ? false : 'Set RUN_LFD_QRNG_INTEGRATION=1 to contact the live provider'
}, async () => {
  const sample = await fetchLfdQrng(32);

  assert.equal(sample.bits, 32);
  assert.match(sample.entropyHex, /^[0-9a-f]{8}$/);
  assert.equal(sample.entropyHex.length, 8);
});
