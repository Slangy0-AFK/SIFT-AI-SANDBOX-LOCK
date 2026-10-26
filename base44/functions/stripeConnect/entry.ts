import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { appBaseUrl, stripeSecretKey } from '../../shared/stripeEnv.ts';
import {
  connectClientId,
  connectRedirectUri,
  firstRow,
  randomState,
  sha256Hex,
  storeConnectedAccount
} from '../../shared/stripeConnect.ts';

/**
 * SIFT AI's own Stripe Connect endpoint. It is NOT the Base44 connector callback.
 *
 * Two jobs, both server-side:
 *  - the public redirect target Stripe sends the browser back to, receiving
 *    ?code= & ?state= (or ?error=), validating the one-time state, and exchanging
 *    the code for the connected account's tokens;
 *  - the app-facing actions an admin page calls to start a connection and to read
 *    whether one is connected.
 *
 * Nothing here approves an OAuth grant on anyone's behalf: starting a connection
 * only mints a one-time state and hands back the URL the admin opens themselves.
 * No token is ever returned to a caller.
 */

const STATE_MINUTES = 10;
const TOKEN_ENDPOINT = 'https://connect.stripe.com/oauth/token';
const PAGE_PATH = '/stripe-connect';

function json(payload, status = 200) {
  return Response.json(payload, { status });
}

function backToPage(req, query) {
  return Response.redirect(`${appBaseUrl(req)}${PAGE_PATH}?${query}`, 302);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));

    if (req.method === 'GET') {
      // Stripe sends the browser here. A refusal comes back as ?error=.
      const refused = url.searchParams.get('error');
      if (refused) {
        console.warn('[stripeConnect] Stripe refused the connection:', refused);
        return backToPage(req, `connect=error&reason=${encodeURIComponent(refused)}`);
      }

      const code = String(url.searchParams.get('code') || '').trim();
      const state = String(url.searchParams.get('state') || '').trim();
      if (!code || !state) return json({ error: 'Missing code or state' }, 400);
      if (!user) return backToPage(req, 'connect=signin');
      if (user.role !== 'admin') return backToPage(req, 'connect=not_admin');

      const result = await completeConnection(base44, { code, state, userId: user.id });
      if (!result.ok) {
        console.warn('[stripeConnect] connection not completed:', result.reason);
        return backToPage(req, `connect=error&reason=${encodeURIComponent(result.reason)}`);
      }
      return backToPage(req, 'connect=ok');
    }

    // The actions below run from the app, and only for an admin: connecting an
    // account decides where the app's money goes.
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'status';

    if (action === 'start') return startConnection(base44, req, user);
    if (action === 'status') return connectionStatus(base44);

    return json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[stripeConnect] Error:', error && error.message);
    return json({ error: error.message }, { status: 500 });
  }
}

async function startConnection(base44, req, user) {
  const clientId = connectClientId();
  if (!clientId) {
    return json(
      {
        error: 'stripe_connect_not_configured',
        message:
          'The Connect client id is not set. Add the STRIPE_CONNECT_CLIENT_ID secret (the ca_... value from Stripe) in the app Secrets, then try again.'
      },
      { status: 503 }
    );
  }
  if (!stripeSecretKey()) {
    return json(
      {
        error: 'stripe_not_configured',
        message: 'The Stripe secret key is not set in the app Secrets, so the token exchange cannot run.'
      },
      { status: 503 }
    );
  }

  const state = randomState();
  const expiresAt = new Date(Date.now() + STATE_MINUTES * 60 * 1000).toISOString();
  await base44.asServiceRole.entities.StripeConnectState.create({
    state_hash: await sha256Hex(state),
    status: 'pending',
    expires_at: expiresAt,
    started_by: user.id
  });

  const redirectUri = connectRedirectUri(req);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'read_write',
    state,
    redirect_uri: redirectUri
  });

  return json({
    authorizeUrl: `https://connect.stripe.com/oauth/authorize?${params.toString()}`,
    redirect_uri: redirectUri,
    expires_at: expiresAt,
    minutes: STATE_MINUTES
  });
}

async function connectionStatus(base44) {
  const rows = await base44.asServiceRole.entities.StripeConnectAccount.list();
  const list = Array.isArray(rows) ? rows : (rows && rows.items) || [];
  const active = list.find((row) => row.status === 'active') || null;

  return json({
    connected: Boolean(active),
    account: active
      ? {
          stripe_user_id: active.stripe_user_id || '',
          scope: active.scope || '',
          livemode: active.livemode === true,
          connected_at: active.connected_at || null
        }
      : null,
    stored_accounts: list.length
  });
}

async function completeConnection(base44, { code, state, userId }) {
  const stateRow = firstRow(
    await base44.asServiceRole.entities.StripeConnectState.filter({ state_hash: await sha256Hex(state) })
  );

  // One-time and short-lived: the state must exist, be unspent and unexpired, and
  // belong to the admin who started it. Anything else stops before the exchange.
  if (!stateRow) return { ok: false, reason: 'state_unknown' };
  if (stateRow.status !== 'pending') return { ok: false, reason: 'state_already_used' };
  if (!stateRow.expires_at || Date.parse(stateRow.expires_at) < Date.now()) {
    return { ok: false, reason: 'state_expired' };
  }
  if (String(stateRow.started_by || '') !== String(userId)) return { ok: false, reason: 'state_not_yours' };

  // Spent before the exchange, so this state can never be replayed.
  await base44.asServiceRole.entities.StripeConnectState.update(stateRow.id, {
    status: 'used',
    used_at: new Date().toISOString()
  });

  const clientId = connectClientId();
  const clientSecret = stripeSecretKey();
  if (!clientId || !clientSecret) return { ok: false, reason: 'not_configured' };

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret
    }),
    signal: AbortSignal.timeout(15000)
  }).catch((error) => {
    console.error('[stripeConnect] token exchange could not reach Stripe:', error && error.message);
    return null;
  });

  if (!response) return { ok: false, reason: 'stripe_unreachable' };

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    console.error('[stripeConnect] Stripe refused the exchange:', payload.error || response.status);
    return { ok: false, reason: String(payload.error || `stripe_${response.status}`) };
  }

  const stripeUserId = String(payload.stripe_user_id || '');
  const accessToken = String(payload.access_token || '');
  if (!stripeUserId || !accessToken) return { ok: false, reason: 'incomplete_token_response' };

  const stored = await storeConnectedAccount(base44, { userId, stripeUserId, payload, accessToken });
  if (!stored.ok) return stored;

  // Only non-sensitive facts are logged: never the code, never a token.
  console.log(`[stripeConnect] connected account stored: ${stripeUserId} (livemode=${payload.livemode === true})`);
  return { ok: true };
}