import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { analyzePrompt } from '../../shared/promptGuard.ts';

// In-app playground. Guests get fast (heuristic, no credits) mode only;
// signed-in users may use deep (LLM judge) mode, capped per day.
const DEEP_DAILY_LIMIT = 50;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const text = body.text;
    if (typeof text !== 'string' || !text.trim()) return Response.json({ error: 'text is required' }, { status: 400 });
    if (text.length > 20000) return Response.json({ error: 'text too long (max 20000 chars)' }, { status: 400 });
    const direction = body.direction === 'output' ? 'output' : 'input';
    const canary = typeof body.canary === 'string' ? body.canary.slice(0, 200) : '';

    let deep = false;
    if (body.deep === true) {
      if (!user) return Response.json({ error: 'Sign in to use deep analysis' }, { status: 401 });
      const since = new Date(Date.now() - 86400000).toISOString();
      const used = await base44.asServiceRole.entities.PromptGuardEvent.filter({ user_id: user.id, mode: 'deep', created_date: { $gte: since } });
      if (used.length >= DEEP_DAILY_LIMIT) return Response.json({ error: 'Daily deep-analysis limit reached' }, { status: 429 });
      deep = true;
    }

    const result = await analyzePrompt(base44.asServiceRole.integrations, text, { direction, canary, deep });

    if (user) {
      await base44.asServiceRole.entities.PromptGuardEvent.create({
        user_id: user.id, source: 'playground', direction,
        verdict: result.verdict, risk_score: result.risk_score,
        categories: result.categories.join(','), snippet: text.slice(0, 200), mode: result.mode,
      });
    }
    return Response.json({ ok: true, direction, ...result });
  } catch (error) {
    console.error('[promptGuard]', error?.message || error);
    return Response.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
}