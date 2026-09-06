import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import {
  CORS_HEADERS, jsonCors, randomToken, signPayload, verifyPayload,
  findActiveKeyBySiteKey, findActiveKeyBySecret, originAllowed, touchKey,
} from '../../shared/apiKeys.ts';

// Public endpoint used by the embeddable verification widget.
// Actions:
//   challenge  { site_key }                              -> challenge_token + instruction
//   verify     { site_key, challenge_token, answer }     -> success + signed verification token
//   siteverify { secret, token }  (customer server)      -> success true/false (single-use)
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const TOKEN_TTL_MS = 10 * 60 * 1000;

export default async function(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  try {
    const base44 = createClientFromRequest(req);
    const signingSecret = secrets.get('INTERNAL_SECRET');
    if (!signingSecret) return jsonCors({ error: 'Server misconfiguration' }, 500);

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'challenge') {
      const key = await findActiveKeyBySiteKey(base44, body.site_key);
      if (!key) return jsonCors({ error: 'Invalid site key' }, 401);
      if (!originAllowed(key, req.headers.get('origin'))) return jsonCors({ error: 'This domain is not allowed for this site key' }, 403);

      const a = Math.floor(Math.random() * 20) + 1;
      const b = Math.floor(Math.random() * 20) + 1;
      const challengeToken = await signPayload(signingSecret, {
        kind: 'challenge', site_key: key.site_key, a, b, exp: Date.now() + CHALLENGE_TTL_MS,
      });
      return jsonCors({ challenge_token: challengeToken, instruction: `What is ${a} + ${b}?`, expires_in: CHALLENGE_TTL_MS / 1000 });
    }

    if (action === 'verify') {
      const payload = await verifyPayload(signingSecret, body.challenge_token);
      if (!payload || payload.kind !== 'challenge' || payload.site_key !== body.site_key) {
        return jsonCors({ success: false, error: 'Invalid challenge' }, 400);
      }
      if (payload.exp < Date.now()) return jsonCors({ success: false, error: 'Challenge expired' }, 400);

      const key = await findActiveKeyBySiteKey(base44, body.site_key);
      if (!key) return jsonCors({ success: false, error: 'Invalid site key' }, 401);
      if (!originAllowed(key, req.headers.get('origin'))) return jsonCors({ success: false, error: 'Domain not allowed' }, 403);

      if (parseInt(body.answer, 10) !== payload.a + payload.b) {
        return jsonCors({ success: false, error: 'Incorrect answer' });
      }

      const nonce = randomToken(16);
      const token = await signPayload(signingSecret, {
        kind: 'verification', site_key: key.site_key, nonce, exp: Date.now() + TOKEN_TTL_MS,
      });
      await touchKey(base44, key, 'verify_count');
      return jsonCors({ success: true, token, expires_in: TOKEN_TTL_MS / 1000 });
    }

    if (action === 'siteverify') {
      const apiSecret = body.secret || req.headers.get('x-api-key');
      const key = await findActiveKeyBySecret(base44, apiSecret);
      if (!key) return jsonCors({ success: false, 'error-codes': ['invalid-secret'] }, 401);

      const payload = await verifyPayload(signingSecret, body.token);
      if (!payload || payload.kind !== 'verification' || payload.site_key !== key.site_key) {
        return jsonCors({ success: false, 'error-codes': ['invalid-token'] });
      }
      if (payload.exp < Date.now()) return jsonCors({ success: false, 'error-codes': ['timeout'] });

      const marker = `widget_nonce:${payload.nonce}`;
      const used = await base44.asServiceRole.entities.SecurityEvent.filter({ event_type: 'access_granted', details: marker });
      if (used.length > 0) return jsonCors({ success: false, 'error-codes': ['token-already-used'] });

      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'access_granted', severity: 'info', details: marker, user_id: key.user_id, environment: 'production',
      });
      return jsonCors({ success: true, site_key: key.site_key, verified_at: new Date(payload.iat).toISOString() });
    }

    return jsonCors({ error: 'Invalid action. Use: challenge, verify, siteverify' }, 400);
  } catch (error) {
    console.error('[widgetApi]', error?.message || error);
    return jsonCors({ error: error?.message || 'Internal error' }, 500);
  }
}