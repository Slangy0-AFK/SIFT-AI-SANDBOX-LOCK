export interface LfdQrngSample {
  entropyHex: string;
  bits: number;
  providerRequestId: string | null;
}

export class LfdQrngError extends Error {
  constructor(
    public readonly kind: 'timeout' | 'rate_limited' | 'unavailable' | 'server_error' | 'invalid_response',
    message: string,
    public readonly retryable = false
  ) {
    super(message);
    this.name = 'LfdQrngError';
  }
}

interface LfdResponse {
  qrn: unknown;
  length: unknown;
}

const MAX_RESPONSE_BYTES = 16 * 1024;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 100;

async function readProviderJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new LfdQrngError('invalid_response', 'Quantum entropy provider response is too large.');
  }
  if (!response.body) {
    throw new LfdQrngError('invalid_response', 'Quantum entropy provider returned an empty response.');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error('Provider response exceeded size limit.');
      }
      chunks.push(value);
    }
  } catch {
    throw new LfdQrngError('invalid_response', 'Quantum entropy provider response could not be read safely.');
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)) as unknown;
  } catch {
    throw new LfdQrngError('invalid_response', 'Quantum entropy provider returned invalid JSON.');
  }
}

async function fetchLfdQrngOnce(bits: number, fetchImpl: typeof fetch): Promise<LfdQrngSample> {
  const bytes = bits / 8;
  const url = new URL('https://lfdr.de/qrng_api/qrng');
  url.searchParams.set('length', String(bytes));
  url.searchParams.set('format', 'HEX');

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(8000)
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new LfdQrngError('timeout', 'Quantum entropy provider timed out.', true);
    }
    throw new LfdQrngError('unavailable', 'Quantum entropy provider could not be reached.', true);
  }

  if (response.status === 429) {
    throw new LfdQrngError('rate_limited', 'Quantum entropy provider rate limit reached.');
  }
  if (response.status >= 500) {
    throw new LfdQrngError('server_error', 'Quantum entropy provider returned a server error.', true);
  }
  if (!response.ok) {
    throw new LfdQrngError('unavailable', 'Quantum entropy provider returned an unavailable status.');
  }

  const json = await readProviderJson(response);
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new LfdQrngError('invalid_response', 'Quantum entropy provider response failed validation.');
  }
  const payload = json as LfdResponse;

  if (
    payload.length !== bytes ||
    typeof payload.qrn !== 'string' ||
    payload.qrn.length !== bytes * 2 ||
    !/^[0-9a-f]+$/i.test(payload.qrn)
  ) {
    throw new LfdQrngError('invalid_response', 'Quantum entropy provider response failed validation.');
  }

  const entropyHex = payload.qrn.toLowerCase();
  return {
    entropyHex,
    bits,
    providerRequestId: response.headers.get('x-request-id') || response.headers.get('request-id')
  };
}

export async function fetchLfdQrng(
  bits: number,
  fetchImpl: typeof fetch = fetch
): Promise<LfdQrngSample> {
  if (!Number.isInteger(bits) || bits < 8 || bits > 8192 || bits % 8 !== 0) {
    throw new RangeError('Bits must be a multiple of 8 between 8 and 8192.');
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetchLfdQrngOnce(bits, fetchImpl);
    } catch (error) {
      if (!(error instanceof LfdQrngError) || !error.retryable || attempt === MAX_ATTEMPTS) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  throw new LfdQrngError('unavailable', 'Quantum entropy provider could not be reached.');
}
