import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { screenInput } from '../../shared/guardPolicy.ts';
import { EVAL_MODELS, findPuzzle, modelLabel } from '../../shared/evalPuzzles.ts';
import { spendCredit } from '../../shared/creditGuard.ts';

// Two things the marketplace can test, both inside the account:
//   kind 'harness' — one sample message screened by the rules the plug-in ships.
//                   No model is called, so this costs nothing.
//   kind 'puzzle'  — one authored puzzle run against the one model the caller
//                   picked. One model call, counted against a daily ceiling.
const SAMPLE_MAX = 600;
const REPLY_MAX = 4000;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    if (body.kind === 'harness') {
      const sample = String(body.sample || '').slice(0, SAMPLE_MAX);
      if (!sample.trim()) return Response.json({ error: 'A sample message is required.' }, { status: 400 });

      const screened = screenInput(sample);
      const refused = screened.decision === 'refuse';
      return Response.json({
        kind: 'harness',
        decision: screened.decision,
        category: screened.category,
        note: refused
          ? `Refused before the model was called. Category: ${screened.category}. The audit entry would carry the category and never the message.`
          : 'Nothing in the input rules fired, so this message would reach your model.'
      });
    }

    // A puzzle run: the id picks the scenario, the caller only picks the model.
    const puzzle = findPuzzle(body.puzzle_id);
    if (!puzzle) return Response.json({ error: 'Unknown puzzle.' }, { status: 400 });

    const modelId = String(body.model || 'automatic');
    if (!EVAL_MODELS.some((m) => m.id === modelId)) {
      return Response.json({ error: 'That model is not one this app can reach.' }, { status: 400 });
    }

    const allowed = await spendCredit(base44, 'puzzle_run', user.id);
    if (!allowed) {
      return Response.json({ error: 'You have run a lot of puzzles today. Try again tomorrow.' }, { status: 429 });
    }

    const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: puzzle.prompt,
      ...(modelId === 'automatic' ? {} : { model: modelId })
    });

    const reply = String(raw || '').slice(0, REPLY_MAX);
    if (!reply.trim()) {
      return Response.json({ error: 'The model returned nothing. Try the run again.' }, { status: 502 });
    }

    const graded = puzzle.grade(reply);
    console.log(`[marketTest] puzzle=${puzzle.id} model=${modelId} pass=${graded.pass}`);

    return Response.json({
      kind: 'puzzle',
      puzzle: { id: puzzle.id, number: puzzle.number, title: puzzle.title },
      model: { id: modelId, label: modelLabel(modelId) },
      verdict: graded.pass ? 'pass' : 'fail',
      gate: puzzle.gate,
      reason: graded.reason,
      reply,
      checked_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[marketTest] Error:', error?.message || error);
    return Response.json({ error: error?.message || 'The test could not run.' }, { status: 500 });
  }
}