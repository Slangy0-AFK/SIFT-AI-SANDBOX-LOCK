import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { randomToken, sha256Hex } from '../../shared/apiKeys.ts';

// Creates a site key + secret key pair for the logged-in user.
// The secret is returned exactly once; only its hash is stored.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
    const allowedDomains = typeof body.allowed_domains === 'string' ? body.allowed_domains.trim().slice(0, 500) : '';
    if (!name) return Response.json({ error: 'A name is required' }, { status: 400 });

    const siteKey = 'site_' + randomToken(12);
    const secret = 'sk_live_' + randomToken(24);
    const secretHash = await sha256Hex(secret);

    const record = await base44.asServiceRole.entities.ApiKey.create({
      user_id: user.id,
      name,
      site_key: siteKey,
      secret_hash: secretHash,
      secret_prefix: secret.slice(0, 12),
      allowed_domains: allowedDomains,
      status: 'active',
      verify_count: 0,
      scan_count: 0,
    });

    return Response.json({ id: record.id, site_key: siteKey, secret });
  } catch (error) {
    console.error('[createApiKey]', error?.message || error);
    return Response.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
}