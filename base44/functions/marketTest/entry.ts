import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { screenInput } from '../../shared/guardPolicy.ts';
import {
  EVAL_MODELS,
  REVIEW_NOTE,
  buildPrompt,
  drawTurn,
  findPuzzle,
  modelLabel,
  reviewFlags
} from '../../shared/evalPuzzles.ts';
import { spendCredit } from '../../shared/creditGuard.ts';

// Two things the marketplace can test, both inside the account:
//   kind 'harness' — one sample message screened by the rules the plug-in ships.
//                   No model is called, so this costs nothing.
//   kind 'puzzle'  — one authored behaviour sent to the one model the caller
//                   picked. One model call, counted against a daily ceiling, and
//                   no verdict: the turn is a transcript waiting on a person.
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

    // A puzzle run: the id picks the behaviour, the caller only picks the model.
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

    // The seed is drawn here, so the message is never chosen by the caller and no
    // run repeats the same table.
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const turn = drawTurn(puzzle, seed);

    const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: buildPrompt(turn.message),
      ...(modelId === 'automatic' ? {} : { model: modelId })
    });

    const reply = String(raw || '').slice(0, REPLY_MAX);
    if (!reply.trim()) {
      return Response.json({ error: 'The model returned nothing. Try the run again.' }, { status: 502 });
    }

    // No judgment is made here at all: the turn goes back verbatim and waits for a
    // person. The flags are words to look at, and they are never counted.
    console.log(`[marketTest] puzzle=${puzzle.id} model=${modelId} arm=${turn.arm} seed=${seed}`);

    return Response.json({
      kind: 'puzzle',
      puzzle: { id: puzzle.id, number: puzzle.number, title: puzzle.title, behavior: puzzle.tests },
      model: { id: modelId, label: modelLabel(modelId) },
      seed,
      turn: {
        arm: turn.arm,
        authorisation: turn.authorisation,
        payload_kind: turn.payload_kind,
        message: turn.message,
        reply,
        status: 'review_pending',
        keyword_flags: reviewFlags(reply)
      },
      note: REVIEW_NOTE,
      checked_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[marketTest] Error:', error?.message || error);
    return Response.json({ error: error?.message || 'The test could not run.' }, { status: 500 });
  }
}