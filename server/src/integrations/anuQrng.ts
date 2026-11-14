export interface AnuQrngSample {
  entropyHex: string;
  bits: number;
  providerRequestId: string | null;
}

export class AnuQrngError extends Error {
  constructor(
    public readonly kind: 'configuration' | 'timeout' | 'rate_limited' | 'unavailable' | 'invalid_response',
    message: string
  ) {
    super(message);
    this.name = 'AnuQrngError';
  }
}

interface AnuResponse {
  success: unknown;
  type: unknown;
  length: unknown;
  data: unknown;
}

const MAX_RESPONSE_BYTES = 16 * 1024;

async function readProviderJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new AnuQrngError('invalid_response', 'Quantum entropy provider response is too large.');
  }
  if (!response.body) {
    throw new AnuQrngError('invalid_response', 'Quantum entropy provider returned an empty response.');
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
    throw new AnuQrngError('invalid_response', 'Quantum entropy provider response could not be read safely.');
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
    throw new AnuQrngError('invalid_response', 'Quantum entropy provider returned invalid JSON.');
  }
}

export async function fetchAnuQrng(
  bits: number,
  apiKey: string | null | undefined,
  fetchImpl: typeof fetch = fetch
): Promise<AnuQrngSample> {
  if (!Number.isInteger(bits) || bits < 8 || bits > 8192 || bits % 8 !== 0) {
    throw new RangeError('Bits must be a multiple of 8 between 8 and 8192.');
  }
  if (!apiKey?.trim()) {
    throw new AnuQrngError('configuration', 'Quantum entropy is not configured.');
  }

  const bytes = bits / 8;
  const url = new URL('https://api.quantumnumbers.anu.edu.au/');
  url.searchParams.set('length', String(bytes));
  url.searchParams.set('type', 'uint8');

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: { 'x-api-key': apiKey, accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new AnuQrngError('timeout', 'Quantum entropy provider timed out.');
    }
    throw new AnuQrngError('unavailable', 'Quantum entropy provider could not be reached.');
  }

  if (response.status === 429) {
    throw new AnuQrngError('rate_limited', 'Quantum entropy provider rate limit reached.');
  }
  if (!response.ok) {
    throw new AnuQrngError('unavailable', 'Quantum entropy provider returned an unavailable status.');
  }

  const json = await readProviderJson(response);
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new AnuQrngError('invalid_response', 'Quantum entropy provider response failed validation.');
  }
  const payload = json as AnuResponse;

  if (
    payload.success !== true ||
    payload.type !== 'uint8' ||
    payload.length !== bytes ||
    !Array.isArray(payload.data) ||
    payload.data.length !== bytes ||
    payload.data.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  ) {
    throw new AnuQrngError('invalid_response', 'Quantum entropy provider response failed validation.');
  }

  const entropyHex = (payload.data as number[])
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  return {
    entropyHex,
    bits,
    providerRequestId: response.headers.get('x-request-id') || response.headers.get('request-id')
  };
}
