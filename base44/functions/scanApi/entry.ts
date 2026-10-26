import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CORS_HEADERS, jsonCors, findActiveKeyBySecret, touchKey } from '../../shared/apiKeys.ts';
import { VT_UNAVAILABLE, VT_MANUAL_URL } from '../../shared/virusTotal.ts';
import { analyzeScamText } from '../../shared/scamText.ts';

// Public, API-key-authenticated scan endpoint for customers.
// POST { type: 'ip'|'domain'|'url'|'hash'|'text', value }  with header x-api-key: <secret>
const REPUTATION_TYPES = new Set(['ip', 'domain', 'url', 'hash']);

export default async function(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const apiSecret = req.headers.get('x-api-key') || body.api_key;
    const key = await findActiveKeyBySecret(base44, apiSecret);
    if (!key) return jsonCors({ error: 'Invalid or missing API key' }, 401);

    const { type, value } = body;
    if (typeof value !== 'string' || !value.trim()) return jsonCors({ error: 'value is required' }, 400);
    if (value.length > 5000) return jsonCors({ error: 'value too long (max 5000 chars)' }, 400);

    let result;
    if (type === 'text') {
      result = await analyzeScamText(base44.asServiceRole.integrations, value);
    } else if (REPUTATION_TYPES.has(type)) {
      // VirusTotal is gated: no key is read, no request is made to VirusTotal, and
      // no VirusTotal result is returned through this API. The endpoint stays in
      // place so an integrator gets a plain explanation instead of a raw error.
      return jsonCors(
        { ok: false, available: false, type, value: value.trim(), notice: VT_UNAVAILABLE, manual_url: VT_MANUAL_URL },
        200
      );
    } else {
      return jsonCors({ error: 'type must be one of: ip, domain, url, hash, text' }, 400);
    }

    await touchKey(base44, key, 'scan_count');
    return jsonCors({ ok: true, type, value, result });
  } catch (error) {
    console.error('[scanApi]', error?.message || error);
    return jsonCors({ error: error?.message || 'Internal error' }, 500);
  }
}