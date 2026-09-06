import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { CORS_HEADERS, jsonCors, findActiveKeyBySecret, touchKey } from '../../shared/apiKeys.ts';
import { lookupVirusTotal } from '../../shared/virusTotal.ts';
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
      const vtKey = secrets.get('VIRUSTOTAL_API_KEY');
      if (!vtKey) return jsonCors({ error: 'Reputation lookups are not configured' }, 500);
      const lookup = await lookupVirusTotal(vtKey, type, value.trim());
      if (lookup.status !== 200) return jsonCors(lookup.body, lookup.status);
      result = lookup.body;
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