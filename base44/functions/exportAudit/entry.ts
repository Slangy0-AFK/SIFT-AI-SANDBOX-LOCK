import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const GENESIS = '0'.repeat(64);
const enc = new TextEncoder();

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

const sha256hex = async (text) => hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') {
      const paid = await base44.asServiceRole.entities.KitPurchase.count({ user_id: user.id, status: 'paid' });
      if (!paid) {
        return Response.json({ error: 'The Full Kit is needed to download the audit log.' }, { status: 403 });
      }
    }

    const page = await base44.asServiceRole.entities.GovernorRun.filter({ user_id: user.id }, { sort: 'created_date', limit: 500 });
    const runs = page.items || [];

    const entries = [];
    let chainOk = true;
    let prev = GENESIS;
    for (const run of runs) {
      const entry = {
        index: entries.length + 1,
        decided_at: run.decided_at,
        tool: run.tool,
        target: run.target,
        amount: run.amount || 0,
        source: run.source,
        based_on_doc: Boolean(run.based_on_doc),
        citation: run.citation || '',
        kill_switch: Boolean(run.kill_switch),
        verdict: run.verdict,
        gate: run.gate,
        reason: run.reason,
        action_hash: run.action_hash,
        signature: run.signature || '',
        prev_hash: run.prev_hash,
        entry_hash: run.entry_hash
      };
      const expected = await sha256hex(`${prev}|${entry.action_hash}|${entry.verdict}|${entry.gate}|${entry.decided_at}`);
      if (entry.prev_hash !== prev || entry.entry_hash !== expected) chainOk = false;
      prev = entry.entry_hash;
      entries.push(entry);
    }

    const payload = {
      kit: 'Agent Control Kit',
      kind: 'audit-log',
      generated_at: new Date().toISOString(),
      account: { email: user.email, user_id: user.id },
      entries,
      entries_included: entries.length,
      most_recent: 500,
      chain_verified: chainOk,
      note: chainOk
        ? 'Each entry carries the hash of the entry before it. The chain checks out.'
        : 'An entry does not match its own hash or its link to the previous one.'
    };

    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="agent-control-kit-audit-${stamp}.json"`
      }
    });
  } catch (error) {
    console.error('[exportAudit] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}