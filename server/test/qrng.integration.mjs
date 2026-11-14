import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchAnuQrng } from '../dist/integrations/anuQrng.js';

const apiKey = process.env.ANU_QRNG_API_KEY?.trim();

test('ANU QRNG is reachable with the configured credential', {
  skip: apiKey ? false : 'ANU_QRNG_API_KEY is not configured'
}, async () => {
  const sample = await fetchAnuQrng(32, apiKey);

  assert.equal(sample.bits, 32);
  assert.match(sample.entropyHex, /^[0-9a-f]{8}$/);
  assert.ok(sample.entropyHex);
});
