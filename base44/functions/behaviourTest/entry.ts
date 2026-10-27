import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { EVAL_MODELS, modelLabel } from '../../shared/evalPuzzles.ts';
import { spendCredit } from '../../shared/creditGuard.ts';
import {
  buildLadder,
  buildPlan,
  buildPrompt,
  randomSeed,
  REPORT_LINE,
  REVIEW_JUDGMENTS,
  SIGNATURE
} from '../../shared/behaviourTest.ts';

// The corrected test, transcript in, transcript out.
//
//   start  — draw a fresh seed and a fresh order and write the planned turns.
//            mode=behaviour writes 24 turns: for each of the six behaviours its
//            original payload, its two held-out payloads, and its authorised twin.
//            mode=escalation writes the 36-turn ladder: 3 cycles x 6 behaviours x
//            dangerous + twin, each with the rule's decision recorded, and sends
//            nothing to a model.
//   run    — send ONE planned behaviour turn to the one model the run named.
//            Nothing is judged and nothing is scored: the reply is stored verbatim.
//   review — store a person's judgment with the words they quote from the reply.
//            A judgment without a real quote is refused.
//   get    — the run and its transcript.
//   report — the reviewer's quoted judgments only, and only once every turn has
//            been reviewed. For the ladder it is the rule's decisions, listed as
//            rule enforcement. No total, no rate, no win is produced anywhere.
const MAX_TURNS = 60;
const WRITE_BATCH = 12;

async function turnsForRun(base44, runId: string) {
  const page = await base44.asServiceRole.entities.BehaviourTurn.filter(
    { run_id: runId },
    { sort: 'sequence', limit: MAX_TURNS }
  );
  return Array.isArray(page) ? page : page?.items || [];
}

// A run's turns are written in small batches: one write carrying the whole
// transcript is refused, and a batch keeps a failure from losing the rest.
async function createTurns(base44, rows) {
  const created = [];
  for (let index = 0; index < rows.length; index += WRITE_BATCH) {
    const batch = await base44.asServiceRole.entities.BehaviourTurn.bulkCreate(rows.slice(index, index + WRITE_BATCH));
    created.push(...(Array.isArray(batch) ? batch : batch?.items || []));
  }
  return created;
}

async function runFor(base44, runId: string) {
  return base44.asServiceRole.entities.BehaviourRun.get(runId).catch((e) =>
    e.status === 404 ? null : Promise.reject(e)
  );
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
      const mode = body.mode === 'escalation' ? 'escalation' : 'behaviour';
      const seed = randomSeed();

      if (mode === 'escalation') {
        // The ladder is the rule, applied to authored turns. Nothing is sent.
        const ladder = buildLadder(seed);
        const run = await base44.asServiceRole.entities.BehaviourRun.create({
          user_id: user.id,
          mode: 'escalation',
          seed: String(seed),
          order: ladder.order.join(','),
          model: '',
          model_label: 'No model: the rule decides',
          status: 'awaiting_review',
          turns_total: ladder.turns.length,
          turns_reviewed: 0,
          started_at: new Date().toISOString(),
          note: REPORT_LINE
        });

        const rows = ladder.turns.map((turn) => ({
          user_id: user.id,
          run_id: run.id,
          behaviour: turn.behaviour,
          behaviour_label: turn.behaviour_label,
          kind: 'ladder',
          cycle: turn.cycle,
          sequence: turn.sequence,
          turn_number: 1,
          arm: turn.arm,
          authorisation: turn.authorisation,
          attacker_message: turn.attacker_message,
          model: '',
          model_label: '',
          model_response: '',
          gate: turn.gate,
          gate_reason: turn.gate_reason,
          status: 'review_pending'
        }));

        const created = await createTurns(base44, rows);
        const turns = created.length === rows.length ? created : await turnsForRun(base44, run.id);
        console.log(`[behaviourTest] ladder run=${run.id} seed=${seed} turns=${turns.length}`);
        return Response.json({ run, turns });
      }

      const modelId = String(body.model || 'automatic');
      if (!EVAL_MODELS.some((option) => option.id === modelId)) {
        return Response.json({ error: 'That model is not one this app can reach.' }, { status: 400 });
      }

      const plan = buildPlan(seed);

      const run = await base44.asServiceRole.entities.BehaviourRun.create({
        user_id: user.id,
        mode: 'behaviour',
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

      const rows = plan.turns.map((turn) => ({
        user_id: user.id,
        run_id: run.id,
        behaviour: turn.behaviour,
        behaviour_label: turn.behaviour_label,
        kind: turn.kind,
        cycle: '',
        sequence: turn.sequence,
        turn_number: turn.turn_number,
        arm: turn.arm,
        authorisation: turn.authorisation,
        attacker_message: turn.attacker_message,
        model: modelId,
        model_label: modelLabel(modelId),
        model_response: '',
        gate: '',
        gate_reason: '',
        status: 'planned'
      }));

      const created = await createTurns(base44, rows);
      const turns = created.length === rows.length ? created : await turnsForRun(base44, run.id);
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

      // A ladder turn is the rule's decision, not a message. Nothing is sent for it.
      if (turn.kind === 'ladder') {
        return Response.json(
          { error: 'A ladder turn records the rule decision. Nothing is sent to a model for it.' },
          { status: 400 }
        );
      }

      // Already answered: hand the same transcript line back, never a second call.
      if (turn.status !== 'planned') return Response.json({ turn });

      const run = await runFor(base44, turn.run_id);
      if (!run) return Response.json({ error: 'That run does not exist.' }, { status: 404 });
      if (run.user_id !== user.id && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const allowed = await spendCredit(base44, 'behaviour_turn', user.id);
      if (!allowed) {
        return Response.json({ error: 'You have run a lot of turns today. Try again tomorrow.' }, { status: 429 });
      }

      const prompt = buildPrompt({ behaviourId: turn.behaviour, message: turn.attacker_message });

      const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        ...(run.model && run.model !== 'automatic' ? { model: run.model } : {})
      });

      const reply = String(raw || '').slice(0, 6000);
      if (!reply.trim()) {
        return Response.json({ error: 'The model returned nothing. Run this turn again.' }, { status: 502 });
      }

      const updated = await base44.asServiceRole.entities.BehaviourTurn.update(turn.id, {
        model_response: reply,
        status: 'review_pending',
        answered_at: new Date().toISOString()
      });

      const all = await turnsForRun(base44, turn.run_id);
      if (all.every((entry) => entry.status !== 'planned')) {
        await base44.asServiceRole.entities.BehaviourRun.update(turn.run_id, { status: 'awaiting_review' });
      }

      console.log(`[behaviourTest] turn=${turn.id} behaviour=${turn.behaviour} kind=${turn.kind} arm=${turn.arm}`);
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
      if (turn.kind === 'ladder' || !turn.model_response) {
        return Response.json({ error: 'That turn has no response to review.' }, { status: 400 });
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
      const answered = all.filter(
        (entry) => entry.status === 'reviewed' || (entry.model_response && entry.status !== 'planned')
      ).length;
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
      const run = await runFor(base44, runId);
      if (!run) return Response.json({ error: 'That run does not exist.' }, { status: 404 });
      if (run.user_id !== user.id && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      return Response.json({ run, turns: await turnsForRun(base44, runId) });
    }

    if (action === 'report') {
      const runId = String(body.run_id || '');
      if (!runId) return Response.json({ error: 'run_id is required.' }, { status: 400 });
      const run = await runFor(base44, runId);
      if (!run) return Response.json({ error: 'That run does not exist.' }, { status: 404 });
      if (run.user_id !== user.id && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const turns = await turnsForRun(base44, runId);

      // The ladder readout: the rule as written, one line per turn. It is rule
      // enforcement and an audit line, never a measured result and never a rate.
      if (run.mode === 'escalation') {
        return Response.json({
          mode: 'escalation',
          run: {
            seed: run.seed,
            order: run.order,
            started_at: run.started_at
          },
          decisions: turns.map((turn) => ({
            sequence: turn.sequence,
            cycle: turn.cycle,
            behaviour: turn.behaviour_label,
            arm: turn.arm,
            authorisation: turn.authorisation,
            gate: turn.gate,
            gate_reason: turn.gate_reason,
            message: turn.attacker_message
          })),
          statement:
            'Every line is the rule applied to that turn before anything executed. Refused turns never ran. Allowed turns are the same task carrying the written authorisation.',
          notice: REPORT_LINE,
          signature: SIGNATURE
        });
      }

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

      // Only the reviewer's own words: the judgment, the quote from the reply, and
      // what the model did. Nothing is added up, and no rate is worked out.
      return Response.json({
        mode: 'behaviour',
        run: {
          seed: run.seed,
          order: run.order,
          model_label: run.model_label,
          started_at: run.started_at,
          completed_at: run.completed_at
        },
        judgments: turns.map((turn) => ({
          sequence: turn.sequence,
          behaviour: turn.behaviour_label,
          kind: turn.kind,
          arm: turn.arm,
          authorisation: turn.authorisation,
          judgment: turn.judgment,
          quote: turn.quote,
          action_taken: turn.action_taken,
          answered_at: turn.answered_at
        })),
        statement:
          "Each line is a person's judgment with the words from the reply it rests on. Nothing is counted or rated.",
        notice: REPORT_LINE,
        signature: SIGNATURE
      });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    console.error('[behaviourTest] Error:', error?.message || error);
    return Response.json({ error: error?.message || 'The run could not be completed.' }, { status: 500 });
  }
}