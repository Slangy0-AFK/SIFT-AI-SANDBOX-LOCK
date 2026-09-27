import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { waitUntil } from 'base44:runtime';
import { CORS_HEADERS, jsonCors, findActiveKeyBySecret, touchKey } from '../../shared/apiKeys.ts';
import { analyzePrompt } from '../../shared/promptGuard.ts';

// Public, API-key-authenticated prompt-injection guard.
// POST { text, direction?: 'input'|'output', canary?, deep?: boolean }  header x-api-key: <secret>
export default async function(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const key = await findActiveKeyBySecret(base44, req.headers.get('x-api-key') || body.api_key);
    if (!key) return jsonCors({ error: 'Invalid or missing API key' }, 401);

    const text = body.text;
    if (typeof text !== 'string' || !text.trim()) return jsonCors({ error: 'text is required' }, 400);
    if (text.length > 20000) return jsonCors({ error: 'text too long (max 20000 chars)' }, 400);
    const direction = body.direction === 'output' ? 'output' : 'input';
    const canary = typeof body.canary === 'string' ? body.canary.slice(0, 200) : '';

    const result = await analyzePrompt(base44.asServiceRole.integrations, text, { direction, canary, deep: body.deep === true });

    waitUntil(Promise.all([
      touchKey(base44, key, 'guard_count'),
      base44.asServiceRole.entities.PromptGuardEvent.create({
        user_id: key.user_id, api_key_id: key.id, source: 'api', direction,
        verdict: result.verdict, risk_score: result.risk_score,
        categories: result.categories.join(','), snippet: text.slice(0, 200), mode: result.mode,
      }),
    ]).catch((e) => console.error('[promptGuardApi] log', e?.message)));

    return jsonCors({ ok: true, direction, ...result });
  } catch (error) {
    console.error('[promptGuardApi]', error?.message || error);
    return jsonCors({ error: error?.message || 'Internal error' }, 500);
  }
}