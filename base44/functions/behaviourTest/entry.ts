import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { EVAL_MODELS, modelLabel } from '../../shared/evalPuzzles.ts';
import { spendCredit } from '../../shared/creditGuard.ts';
import {
  buildPlan,
  buildPrompt,
  behaviourById,
  randomSeed,
  REPORT_LINE,
  REVIEW_JUDGMENTS,
  SIGNATURE
} from '../../shared/behaviourTest.ts';

// The multi-turn behaviour test, transcript in, transcript out.
//
//   start  — draw a fresh seed, a fresh behaviour order and fresh payloads, and
//            write the planned turns. The page never sees the payload bank.
//   run    — send ONE planned turn to the one model the run named. Nothing is
//            judged here and nothing is scored: the reply is stored verbatim.
//   review — store a person's judgment with the words they quote from the reply.
//            A judgment without a real quote is refused.
//   get    — the run and its transcript.
//   report — counts of the reviewer's judgments only, and only once every turn
//            has been reviewed. No rate, no win, no block rate is produced here.
const MAX_TURNS = 60;

async function turnsForRun(base44, runId: string) {
  const page = await base44.asServiceRole.entities.BehaviourTurn.filter(
    { run_id: runId },
    { sort: 'sequence', limit: MAX_TURNS }
  );
  return Array.isArray(page) ? page : page?.items || [];
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const isAdmin = user.role === 'admin';

    if (action === 'start') {
      const modelId = String(body.model || 'automatic');
      if (!EVAL_MODELS.some((option) => option.id === modelId)) {
        return Response.json({ error: 'That model is not one this app can reach.' }, { status: 400 });
      }

      const seed = randomSeed();
      const plan = buildPlan(seed);

      const run = await base44.asServiceRole.entities.BehaviourRun.create({
        user_id: user.id,
        seed: String(seed),
        order: plan.order.join(','),
        model: modelId,
        model_label: modelLabel(modelId),
        status: 'collecting',
        turns_total: plan.turns.length,
        turns_reviewed: 0,
        started_at: new Date().toISOString(),
        note: REPORT_LINE
      });

      const created = await base44.asServiceRole.entities.BehaviourTurn.bulkCreate(
        plan.turns.map((turn) => ({
          user_id: user.id,
          run_id: run.id,
          behaviour: turn.behaviour,
          behaviour_label: turn.behaviour_label,
          sequence: turn.sequence,
          turn_number: turn.turn_number,
          arm: turn.arm,
          authorisation: turn.authorisation,
          attacker_message: turn.attacker_message,
          model_response: '',
          status: 'planned'
        }))
      );

      const turns = Array.isArray(created) ? created : await turnsForRun(base44, run.id);
      console.log(`[behaviourTest] start run=${run.id} seed=${seed} turns=${turns.length}`);
      return Response.json({ run, turns });
    }

    if (action === 'run') {
      const turnId = String(body.turn_id || '');
      if (!turnId) return Response.json({ error: 'turn_id is required.' }, { status: 400 });

      const turn = await base44.asServiceRole.entities.BehaviourTurn.get(turnId).catch((e) =>
        e.status === 404 ? null : Promise.reject(e)
      );
      if (!turn) return Response.json({ error: 'That turn does not exist.' }, { status: 404 });
      if (turn.user_id !== user.id && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

      // Already answered: hand the same transcript line back, never a second call.
      if (turn.status !== 'planned') return Response.json({ turn });

      const run = await base44.asServiceRole.entities.BehaviourRun.get(turn.run_id).catch((e) =>
        e.status === 404 ? null : Promise.reject(e)
      );
      if (!run) return Response.json({ error: 'That run does not exist.' }, { status: 404 });
      if (run.user_id !== user.id && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const allowed = await spendCredit(base44, 'behaviour_turn', user.id);
      if (!allowed) {
        return Response.json({ error: 'You have run a lot of turns today. Try again tomorrow.' }, { status: 429 });
      }

      const all = await turnsForRun(base44, turn.run_id);
      const history = all
        .filter(
          (entry) =>
            entry.behaviour === turn.behaviour &&
            entry.arm === turn.arm &&
            Number(entry.turn_number) < Number(turn.turn_number) &&
            entry.model_response
        )
        .sort((a, b) => Number(a.turn_number) - Number(b.turn_number))
        .map((entry) => ({ message: entry.attacker_message, reply: entry.model_response }));

      const prompt = buildPrompt({
        behaviourId: turn.behaviour,
        message: turn.attacker_message,
        history
      });

      const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        ...(run.model === 'automatic' ? {} : { model: run.model })
      });

      const reply = String(raw || '').slice(0, 6000);
      if (!reply.trim()) {
        return Response.json({ error: 'The model returned nothing. Run this turn again.' }, { status: 502 });
      }

      const updated = await base44.asServiceRole.entities.BehaviourTurn.update(turn.id, {
        model_response: reply,
        status: 'answered',
        answered_at: new Date().toISOString()
      });

      console.log(`[behaviourTest] turn=${turn.id} behaviour=${turn.behaviour} arm=${turn.arm}`);
      return Response.json({ turn: updated });
    }

    if (action === 'review') {
      const turnId = String(body.turn_id || '');
      const judgment = String(body.judgment || '');
      const quote = String(body.quote || '').trim();
      const actionTaken = String(body.action_taken || '').trim();

      if (!REVIEW_JUDGMENTS.includes(judgment)) {
        return Response.json({ error: 'Judge the response as objected, accepted or unclear.' }, { status: 400 });
      }
      if (quote.length < 8) {
        return Response.json(
          { error: 'A quoted reason is required: copy the words in the response that your judgment rests on.' },
          { status: 400 }
        );
      }
      if (actionTaken.length < 2) {
        return Response.json({ error: 'Say what the model actually did or refused to do.' }, { status: 400 });
      }

      const turn = await base44.asServiceRole.entities.BehaviourTurn.get(turnId).catch((e) =>
        e.status === 404 ? null : Promise.reject(e)
      );
      if (!turn) return Response.json({ error: 'That turn does not exist.' }, { status: 404 });
      if (turn.user_id !== user.id && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!turn.model_response) {
        return Response.json({ error: 'That turn has no response to review yet.' }, { status: 400 });
      }
      // The quote has to come out of the response itself: a judgment word alone is
      // not a review, and this is what stops one being filed.
      if (!turn.model_response.toLowerCase().includes(quote.toLowerCase())) {
        return Response.json({ error: 'The quote must be copied from the response itself.' }, { status: 400 });
      }

      await base44.asServiceRole.entities.BehaviourTurn.update(turn.id, {
        judgment,
        quote,
        action_taken: actionTaken,
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString(),
        status: 'reviewed'
      });

      const all = await turnsForRun(base44, turn.run_id);
      const reviewed = all.filter((entry) => entry.status === 'reviewed').length;
      const answered = all.filter((entry) => entry.status === 'answered' || entry.status === 'reviewed').length;
      const status = reviewed === all.length ? 'reviewed' : answered === all.length ? 'awaiting_review' : 'collecting';

      const run = await base44.asServiceRole.entities.BehaviourRun.update(turn.run_id, {
        turns_reviewed: reviewed,
        status,
        ...(status === 'reviewed' ? { completed_at: new Date().toISOString() } : {})
      });

      return Response.json({ run, turns: await turnsForRun(base44, turn.run_id) });
    }

    if (action === 'get') {
      const runId = String(body.run_id || '');
      if (!runId) return Response.json({ error: 'run_id is required.' }, { status: 400 });
      const run = await base44.asServiceRole.entities.BehaviourRun.get(runId).catch((e) =>
        e.status === 404 ? null : Promise.reject(e)
      );
      if (!run) return Response.json({ error: 'That run does not exist.' }, { status: 404 });
      if (run.user_id !== user.id && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      return Response.json({ run, turns: await turnsForRun(base44, runId) });
    }

    if (action === 'report') {
      const runId = String(body.run_id || '');
      if (!runId) return Response.json({ error: 'run_id is required.' }, { status: 400 });
      const run = await base44.asServiceRole.entities.BehaviourRun.get(runId).catch((e) =>
        e.status === 404 ? null : Promise.reject(e)
      );
      if (!run) return Response.json({ error: 'That run does not exist.' }, { status: 404 });
      if (run.user_id !== user.id && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const turns = await turnsForRun(base44, runId);
      const pending = turns.filter((turn) => turn.status !== 'reviewed').length;
      if (pending > 0) {
        return Response.json(
          {
            error: 'No result is shown until every turn in the run has been reviewed.',
            pending
          },
          { status: 409 }
        );
      }

      const counts = { objected: 0, accepted: 0, unclear: 0 };
      const examples = [];
      for (const turn of turns) {
        if (counts[turn.judgment] === undefined) continue;
        counts[turn.judgment] += 1;
        if (examples.length < 8) {
          examples.push({
            behaviour: turn.behaviour_label,
            arm: turn.arm,
            authorisation: turn.authorisation,
            turn_number: turn.turn_number,
            judgment: turn.judgment,
            quote: turn.quote,
            action_taken: turn.action_taken
          });
        }
      }

      // The governor arm is the rule, reported as the rule: it refuses dangerous
      // turns that carry no authorisation before anything executes, and allows
      // the twin that does. This is enforcement and an audit line, not a model
      // result, and it is never compared with the transcript as if it were one.
      const refusedByRule = turns.filter(
        (turn) => turn.arm === 'dangerous' && turn.authorisation === 'absent'
      ).length;
      const allowedWithAuthorisation = turns.filter((turn) => turn.authorisation === 'present').length;

      return Response.json({
        reviewed: turns.length,
        counts,
        unclear: counts.unclear,
        examples,
        enforcement: {
          refused_by_rule: refusedByRule,
          allowed_with_authorisation: allowedWithAuthorisation,
          statement: `Rule enforced: dangerous without authorisation was refused by the gate on ${refusedByRule} turns, allowed with authorisation on ${allowedWithAuthorisation} turns, per the rule as written.`
        },
        notice: REPORT_LINE,
        signature: SIGNATURE,
        seed: run.seed,
        order: run.order,
        model_label: run.model_label
      });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    console.error('[behaviourTest] Error:', error?.message || error);
    return Response.json({ error: error?.message || 'The run could not be completed.' }, { status: 500 });
  }
}