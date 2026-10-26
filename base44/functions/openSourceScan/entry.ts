import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { combineVerdict, detectKind, runFeedChecks } from '../../shared/openFeeds.ts';

// Runs the open-source feed checks for one pasted item and returns what each
// source said, plus the combined rule worked out here on the server.
// VirusTotal is not involved anywhere in this function.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((err) => (err.status === 401 ? null : Promise.reject(err)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const value = String(body.value || '').trim().slice(0, 300);
    const kind = detectKind(value, body.kind);
    if (!value) return Response.json({ error: 'Paste a link, a domain, an IP address or a file hash.' }, { status: 400 });
    if (!kind) return Response.json({ error: 'That does not look like a link, a domain, an IP address or a file hash.' }, { status: 400 });

    const { results } = await runFeedChecks(kind, value);
    const verdict = combineVerdict(results, { kind, checklistHit: body.checklistHit === true });

    console.log(`[openSourceScan] ${kind} checked: ${results.filter((entry) => entry.status === 'hit').length} hits, ${results.filter((entry) => entry.status === 'none').length} no-match, ${results.filter((entry) => entry.status === 'unavailable' || entry.status === 'error').length} silent`);

    return Response.json({
      kind,
      value,
      sources: results.map((entry) => ({
        id: entry.id,
        name: entry.name,
        operator: entry.operator,
        status: entry.status,
        reason: entry.reason || null,
        note: entry.note || null,
        first_seen: entry.first_seen || null,
        family: entry.family || null,
        tags: entry.tags || [],
        detail_url: entry.detail_url || null,
        threat: entry.threat || null
      })),
      verdict,
      checked_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[openSourceScan] failed:', error && error.message);
    return Response.json({ error: 'The check did not finish. Try again in a moment.' }, { status: 500 });
  }
}