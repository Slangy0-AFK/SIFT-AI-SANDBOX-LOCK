import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { automationState } from '../../shared/supportHarness.ts';
import { audit } from '../../shared/supportHarness.ts';
import { ticketNumber, writeAutoReply } from '../../shared/supportReply.ts';

// The automatic reply for one ticket, on demand.
//
// It carries the same harness as every other automated support action, and the
// reply itself is written through the one reply path, where the tool gate, the
// owner's kill switch and the audit log run BEFORE anything is composed or
// spent, and the safety gate runs before anything is written.
//
// It never closes a ticket. A ticket closes only when the person confirms the
// fix, or after seven days of silence — that decision belongs to the gated
// sweep, never to this call. The reply is grounded in the help articles; there
// is no free-form answer and no ungrounded model resolution anywhere.
//
// Callers: the owner, or the scheduled workflow, presenting SCHEDULER_SECRET.
// A ticket holder cannot trigger it. Everything refused is logged with the gate,
// the ticket and the action, so nothing is ever silently dropped.

const json = (body, status = 200) => Response.json(body, { status });

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const ticketId = String(body.ticket_id || body?.data?.id || '');

    const user = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const provided = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = Boolean(schedulerSecret) && provided === schedulerSecret;
    const isAdmin = user?.role === 'admin';

    // Fail closed: no ticket, or no caller this app can vouch for, means nothing runs.
    if (!ticketId) return json({ error: 'ticket_id is required' }, 400);
    if (!isScheduler && !isAdmin) return json({ error: 'Forbidden' }, 403);

    const ticket = await base44.asServiceRole.entities.SupportTicket.get(ticketId).catch(() => null);
    if (!ticket) return json({ error: 'Not found' }, 404);
    const number = ticket.ticket_number || ticketNumber(ticket.id);
    const actor = isScheduler ? 'automation' : 'owner';

    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      await audit(base44, {
        action: 'auto_reply',
        gate: 'loop_gate',
        decision: 'skipped',
        reason: 'the ticket is already settled, so no reply was written and no credit was spent',
        actor,
        ticket_id: ticket.id,
        ticket_number: number
      });
      return json({ success: true, replied: false, reason: 'the ticket is already settled' });
    }

    // The reply is written through the shared path: admitted by the harness
    // first, grounded in the help articles, and refused by the safety gate if it
    // breaks the rules. It leaves the ticket's status exactly as it is.
    const reply = await writeAutoReply(base44, ticket.id, {
      title: ticket.title || 'Support ticket',
      description: ticket.description || ''
    });

    if (!reply) {
      const state = await automationState(base44);
      const reason = state.paused
        ? `the automation is switched off: ${state.reason || 'no reason given'}`
        : 'the automatic step was held back — the daily ceiling is reached, a reply is already on this ticket, or the safety gate refused it';
      await audit(base44, {
        action: 'auto_reply',
        gate: state.paused ? 'kill_switch' : 'loop_gate',
        decision: 'skipped',
        reason,
        actor,
        ticket_id: ticket.id,
        ticket_number: number
      });
      return json({ success: false, replied: false, blocked: true, ticket_number: number, reason });
    }

    await audit(base44, {
      action: 'auto_reply',
      gate: 'outcome',
      decision: 'completed',
      reason: `the automatic reply was written on ${number} and the ticket status was left alone`,
      actor,
      ticket_id: ticket.id,
      ticket_number: number
    });

    return json({ success: true, replied: true, ticket_number: number });
  } catch (error) {
    console.error('[autoResolveTicket] Error:', error);
    return json({ error: error.message }, 500);
  }
}