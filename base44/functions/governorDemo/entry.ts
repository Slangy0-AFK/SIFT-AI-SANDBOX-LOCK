import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { constantTimeEqual } from '../../shared/constantTime.ts';

// Deterministic gates. No model is called here: every decision is plain code.
const GENESIS = '0'.repeat(64);
const LOOP_WINDOW_MS = 300 * 1000;
const LOOP_LIMIT = 3;
const SPEND_CAP_USD = 5;
const SEAL_TTL_MS = 5 * 60 * 1000;
const GUARD_WINDOW_MS = 10 * 60 * 1000;
const GUARD_LIMIT = 60;
// A ceiling on the whole demo in the same window, counted on the server and
// impossible for a caller to move: every check writes one record, so this is what
// really bounds record creation when session ids are invented one after another.
const DEMO_WINDOW_LIMIT = 1000;

const TOOLS = {
  http_get: { kind: 'read', label: 'Fetch a web page' },
  read_file: { kind: 'read', label: 'Read a file' },
  db_read: { kind: 'read', label: 'Read from a database' },
  send_email: { kind: 'write', label: 'Send an email' },
  file_write: { kind: 'write', label: 'Write a file' },
  db_write: { kind: 'write', label: 'Write to a database' },
  shell_command: { kind: 'shell', label: 'Run a shell command' },
  deploy: { kind: 'deploy', label: 'Deploy a change' },
  payment: { kind: 'money', label: 'Move money' }
};

const SOURCES = {
  operator: { trusted: true, label: 'you, the operator' },
  signed_ticket: { trusted: true, label: 'a ticket you signed' },
  document: { trusted: false, label: 'a document or file it read' },
  web_page: { trusted: false, label: 'a web page' },
  email: { trusted: false, label: 'an email' },
  another_agent: { trusted: false, label: 'another agent' }
};

const GATE_ORDER = [
  'Request signature (HMAC)',
  'Kill switch',
  'Admission (allow list)',
  'Admission (spend cap)',
  'Noise gate',
  'Loop gate',
  'Citation check',
  'Exact-answer cache (SHA256)'
];

const enc = new TextEncoder();

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

const rootSecret = () => secrets.get('INTERNAL_SECRET') || Deno.env.get('INTERNAL_SECRET') || '';

// The demo seal is signed with a key derived for the demo alone, never with the
// internal secret itself. A visitor may ask for as many seals as they like and
// still never hold a signature made with the app's own internal key: what they
// get opens the demo's gates and nothing anywhere else. Same seal, same gates,
// different key underneath.
const DEMO_SEAL_LABEL = 'governor-demo-seal-v1';

const sha256hex = async (text) => hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));

const hmacHex = async (key, text) => {
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(text)));
};

const normalize = (raw) => {
  const input = raw && typeof raw === 'object' ? raw : {};
  const amountRaw = Number(input.amount);
  return {
    tool: String(input.tool || '').trim().toLowerCase().slice(0, 40),
    target: String(input.target || '').trim().slice(0, 200),
    amount: Number.isFinite(amountRaw) ? Math.max(0, Math.min(1000000, Math.round(amountRaw * 100) / 100)) : 0,
    source: String(input.source || '').trim().toLowerCase().slice(0, 40),
    based_on_doc: Boolean(input.based_on_doc),
    citation: String(input.citation || '').trim().slice(0, 200),
    kill_switch: Boolean(input.kill_switch)
  };
};

const canonical = (a) =>
  ['ack-v1', a.tool, a.target, a.amount.toFixed(2), a.source, a.based_on_doc ? '1' : '0', a.citation, a.kill_switch ? '1' : '0'].join('|');

const decide = (checks) => {
  const stop = checks.find((c) => c.status === 'block' || c.status === 'hold');
  for (let i = checks.length; i < GATE_ORDER.length; i++) {
    checks.push({ gate: GATE_ORDER[i], status: 'skip', note: 'Not reached. An earlier gate stopped this action.' });
  }
  return {
    verdict: stop ? (stop.status === 'block' ? 'block' : 'hold') : 'pass',
    gate: stop ? stop.gate : 'All gates',
    reason: stop ? stop.note : 'Every gate passed, so this action is allowed to run.',
    checks,
    fromCache: false,
    cachedEntry: null
  };
};

const evaluate = (a, ctx, sealCheck) => {
  const tool = TOOLS[a.tool];
  const source = SOURCES[a.source];
  const checks = [sealCheck];

  if (a.kill_switch) {
    checks.push({ gate: 'Kill switch', status: 'block', note: 'The kill switch is engaged, so this is stopped before it runs.' });
    return decide(checks);
  }
  checks.push({ gate: 'Kill switch', status: 'pass', note: 'The kill switch is off.' });

  if (!tool) {
    checks.push({ gate: 'Admission (allow list)', status: 'hold', note: `"${a.tool || 'nothing'}" is not on the tool allow list, so a person has to approve it once.` });
    return decide(checks);
  }
  checks.push({ gate: 'Admission (allow list)', status: 'pass', note: `${tool.label} is on the allow list.` });

  if (a.amount > SPEND_CAP_USD) {
    checks.push({ gate: 'Admission (spend cap)', status: 'block', note: `Estimated cost $${a.amount.toFixed(2)} is over the demo cap of $${SPEND_CAP_USD.toFixed(2)}.` });
    return decide(checks);
  }
  if (a.amount >= SPEND_CAP_USD * 0.8) {
    checks.push({ gate: 'Admission (spend cap)', status: 'hold', note: `Estimated cost $${a.amount.toFixed(2)} is close to the $${SPEND_CAP_USD.toFixed(2)} cap, so a person confirms it first.` });
    return decide(checks);
  }
  checks.push({
    gate: 'Admission (spend cap)',
    status: 'pass',
    note: a.amount > 0 ? `Estimated cost $${a.amount.toFixed(2)} is inside the cap.` : 'No spend attached to this action.'
  });

  if (!source) {
    checks.push({ gate: 'Noise gate', status: 'hold', note: `"${a.source || 'blank'}" is not a source this kit knows, so the instruction is held.` });
    return decide(checks);
  }
  const changesSomething = tool.kind !== 'read';
  if (!source.trusted && changesSomething) {
    checks.push({ gate: 'Noise gate', status: 'block', note: `The instruction came from ${source.label}, and this action changes something. Instructions from there need a person to confirm them first.` });
    return decide(checks);
  }
  if (!source.trusted) {
    checks.push({ gate: 'Noise gate', status: 'hold', note: `The instruction came from ${source.label}. It only reads, so it is held rather than blocked.` });
    return decide(checks);
  }
  checks.push({ gate: 'Noise gate', status: 'pass', note: `The instruction came from ${source.label}.` });

  if (changesSomething) {
    if (ctx.sameTarget >= LOOP_LIMIT) {
      checks.push({ gate: 'Loop gate', status: 'hold', note: `This tool and target already ran ${ctx.sameTarget} times in the last 300 seconds. ${LOOP_LIMIT} or more looks like a loop, so it is held.` });
      return decide(checks);
    }
    checks.push({ gate: 'Loop gate', status: 'pass', note: `${ctx.sameTarget} run${ctx.sameTarget === 1 ? '' : 's'} of this same tool and target in the last 300 seconds. It holds at ${LOOP_LIMIT}.` });
  } else {
    checks.push({ gate: 'Loop gate', status: 'skip', note: 'Read-only action, so the loop gate does not apply.' });
  }

  if (a.based_on_doc) {
    if (a.citation.length < 3) {
      checks.push({ gate: 'Citation check', status: 'hold', note: 'The action says it is working from a document, but it does not name the part it used.' });
      return decide(checks);
    }
    checks.push({ gate: 'Citation check', status: 'pass', note: `Citation given: ${a.citation}` });
  } else {
    checks.push({ gate: 'Citation check', status: 'skip', note: 'The action is not marked as working from a document.' });
  }

  if (!changesSomething && ctx.cached) {
    checks.push({ gate: 'Exact-answer cache (SHA256)', status: 'pass', note: 'This exact action was decided before, so the earlier decision is reused instead of running the gates again.' });
    return {
      verdict: ctx.cached.verdict,
      gate: ctx.cached.gate,
      reason: ctx.cached.reason,
      checks,
      fromCache: true,
      cachedEntry: ctx.cached
    };
  }
  checks.push({
    gate: 'Exact-answer cache (SHA256)',
    status: changesSomething ? 'skip' : 'pass',
    note: changesSomething
      ? 'Not cached. This action changes something, so it is decided every time.'
      : 'First time this exact action is seen, so it is decided now.'
  });
  return decide(checks);
};

const verifySeal = async (secret, sealRaw, actionHash) => {
  const parts = String(sealRaw || '').split('.');
  if (parts.length !== 3) {
    return { ok: false, note: 'This request arrived without a seal, so the governor will not trust it.', signature: '' };
  }
  const [nonce, expiresRaw, sig] = parts;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || Date.now() > expires) {
    return { ok: false, note: 'The seal on this request has expired. Seal the action again.', signature: sig };
  }
  const expected = await hmacHex(secret, `${nonce}|${expires}|${actionHash}`);
  // Constant-time, so a wrong seal cannot be narrowed down by how long the check takes.
  if (!constantTimeEqual(expected, sig)) {
    return { ok: false, note: 'The seal does not match this action, so something changed after it was sealed.', signature: sig };
  }
  return { ok: true, note: 'Sealed when it was sent, and unchanged since.', signature: sig };
};

// Two ceilings on how much this demo can write, and the second one no caller can
// move. The first is the visitor's own allowance; the second counts every run on
// the demo in the same window, which is what bounds record creation when a caller
// invents a fresh session id for every request.
async function volumeRefused(base44, ownerKey) {
  const guardSince = new Date(Date.now() - GUARD_WINDOW_MS).toISOString();
  const [recentRuns, demoRuns] = await Promise.all([
    base44.asServiceRole.entities.GovernorRun.count({ owner_key: ownerKey, created_date: { $gte: guardSince } }),
    base44.asServiceRole.entities.GovernorRun.count({ created_date: { $gte: guardSince } })
  ]);
  return recentRuns >= GUARD_LIMIT || demoRuns >= DEMO_WINDOW_LIMIT;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const root = rootSecret();
    if (!root) {
      console.error('[governorDemo] INTERNAL_SECRET is not set, so requests cannot be sealed.');
      return Response.json({ error: 'The demo seal is not configured.' }, { status: 500 });
    }
    // Derived, domain-separated: seals made here are useless anywhere else.
    const secret = await sha256hex(`${root}|${DEMO_SEAL_LABEL}`);

    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    const sessionId = String(body.session_id || '').trim().slice(0, 64);
    if (!user && sessionId.length < 8) {
      return Response.json({ error: 'Missing session id.' }, { status: 400 });
    }
    const ownerKey = user ? user.id : `guest:${sessionId}`;

    const action = normalize(body.request);
    const actionHash = await sha256hex(canonical(action));

    if (body.step === 'seal') {
      const expires = Date.now() + SEAL_TTL_MS;
      const nonce = crypto.randomUUID().replace(/-/g, '');
      const sig = await hmacHex(secret, `${nonce}|${expires}|${actionHash}`);
      return Response.json({ seal: `${nonce}.${expires}.${sig}`, action_hash: actionHash, expires_at: new Date(expires).toISOString() });
    }

    const sealResult = await verifySeal(secret, body.seal, actionHash);
    const sealCheck = { gate: GATE_ORDER[0], status: sealResult.ok ? 'pass' : 'block', note: sealResult.note };

    // One volume gate for both paths below, checked before anything is decided or
    // written: a refusal never writes, and both counts are the server's own.
    if (await volumeRefused(base44, ownerKey)) {
      return Response.json({ error: 'That is a lot of demo runs in a short time. Try again in a few minutes.' }, { status: 429 });
    }

    let decision;
    let audit = null;
    let sameTarget = 0;

    if (!sealResult.ok) {
      decision = decide([sealCheck]);
    } else {
      const loopSince = new Date(Date.now() - LOOP_WINDOW_MS).toISOString();
      const toolInfo = TOOLS[action.tool];
      const changesSomething = !toolInfo || toolInfo.kind !== 'read';

      const [loopCount, chainTip, cachedHit] = await Promise.all([
        changesSomething
          ? base44.asServiceRole.entities.GovernorRun.count({ owner_key: ownerKey, tool: action.tool, target: action.target, created_date: { $gte: loopSince } })
          : Promise.resolve(0),
        base44.asServiceRole.entities.GovernorRun.filter({ owner_key: ownerKey }, { sort: '-created_date', limit: 1 }),
        changesSomething
          ? Promise.resolve({ items: [] })
          : base44.asServiceRole.entities.GovernorRun.filter(
              { owner_key: ownerKey, action_hash: actionHash, verdict: 'pass' },
              { sort: '-created_date', limit: 1 }
            )
      ]);

      sameTarget = loopCount;
      const previous = chainTip.items[0] || null;
      const cached = cachedHit.items[0] || null;

      decision = evaluate(action, { sameTarget, cached }, sealCheck);

      if (decision.fromCache) {
        audit = {
          index: null,
          reused: true,
          prev_hash: cached.prev_hash,
          entry_hash: cached.entry_hash,
          decided_at: cached.decided_at,
          note: 'Cache hit. No new audit entry was written; the earlier one still stands.'
        };
      } else {
        const totalRuns = await base44.asServiceRole.entities.GovernorRun.count({ owner_key: ownerKey });
        const prevHash = previous ? previous.entry_hash : GENESIS;
        const decidedAt = new Date().toISOString();
        const entryHash = await sha256hex(`${prevHash}|${actionHash}|${decision.verdict}|${decision.gate}|${decidedAt}`);
        const payload = {
          owner_key: ownerKey,
          tool: action.tool,
          target: action.target,
          amount: action.amount,
          source: action.source,
          based_on_doc: action.based_on_doc,
          citation: action.citation || undefined,
          kill_switch: action.kill_switch,
          verdict: decision.verdict,
          gate: decision.gate,
          reason: decision.reason,
          action_hash: actionHash,
          signature: sealResult.signature,
          prev_hash: prevHash,
          entry_hash: entryHash,
          decided_at: decidedAt
        };
        if (user) payload.user_id = user.id;
        if (sessionId) payload.session_id = sessionId;
        await base44.asServiceRole.entities.GovernorRun.create(payload);
        audit = {
          index: totalRuns + 1,
          reused: false,
          prev_hash: prevHash,
          entry_hash: entryHash,
          decided_at: decidedAt,
          note: previous ? 'Chained to your previous entry.' : 'First entry in your chain.'
        };
      }
    }

    if (!sealResult.ok) {
      const tip = await base44.asServiceRole.entities.GovernorRun.filter({ owner_key: ownerKey }, { sort: '-created_date', limit: 1 });
      const prevHash = tip.items[0] ? tip.items[0].entry_hash : GENESIS;
      const decidedAt = new Date().toISOString();
      const entryHash = await sha256hex(`${prevHash}|${actionHash}|${decision.verdict}|${decision.gate}|${decidedAt}`);
      const payload = {
        owner_key: ownerKey,
        tool: action.tool,
        target: action.target,
        amount: action.amount,
        source: action.source,
        verdict: decision.verdict,
        gate: decision.gate,
        reason: decision.reason,
        action_hash: actionHash,
        signature: sealResult.signature || undefined,
        prev_hash: prevHash,
        entry_hash: entryHash,
        decided_at: decidedAt
      };
      if (user) payload.user_id = user.id;
      if (sessionId) payload.session_id = sessionId;
      await base44.asServiceRole.entities.GovernorRun.create(payload);
      audit = {
        index: null,
        reused: false,
        prev_hash: prevHash,
        entry_hash: entryHash,
        decided_at: decidedAt,
        note: 'The refused request was logged so you can see it later.'
      };
    }

    return Response.json({
      verdict: decision.verdict,
      gate: decision.gate,
      reason: decision.reason,
      checks: decision.checks,
      action_hash: actionHash,
      signature: sealResult.signature,
      cached: decision.fromCache,
      runs_in_window: sameTarget,
      saved: Boolean(user),
      audit
    });
  } catch (error) {
    console.error('[governorDemo] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}