// The harness every automated support action passes through, in this order:
//
//   1. tool gate     — the action must be on the list. Anything else is refused.
//   2. kill switch   — the owner's switch, read fresh on every action. While it
//                      is on, or if it cannot be read, nothing runs (fail-closed).
//   3. loop gate     — a per-ticket ceiling per message kind, counted from the
//                      messages already on the ticket, so nothing can repeat.
//   4. audit         — the reason is written down BEFORE the action runs. If the
//                      audit cannot be written, the action does not happen.
//
// Nothing here spends an integration credit: the credit ceilings stay where they
// are (creditGuard.ts) and are checked separately, before any AI or email call.

import { spendCredit } from './creditGuard.ts';

export const ALLOWED_ACTIONS = [
  'search',
  'my_tickets',
  'open_ticket',
  'sweep',
  'respond',
  'status',
  'pause',
  'resume',
  'reopen',
  // The two in-app chat agents, and the one automatic reply for a ticket.
  'answer',
  'support_chat',
  'auto_reply',
  // A reply typed by a person in the admin console, and closing one by hand
  // from there.
  'admin_reply',
  'admin_close',
  // One named step of a ticket's own lifecycle, asked for by its workflow.
  'lifecycle_step'
];

// How many of each message the automation may ever put on one ticket.
export const LOOP_CAP = {
  ask_detail: 1,
  status_update: 1,
  fix_check: 1,
  escalation: 1,
  closing: 1,
  reopen: 2,
  help_reply: 3,
  first_reply: 1
};

// Ceilings that stop a sweep from turning into a batch job.
export const MESSAGE_CAP = 6;
export const SWEEP_TICKET_CAP = 20;

const rows = (page) => (Array.isArray(page) ? page : page?.items || []);

// The switch. A missing row means "never set", which is not a failure: the
// default is running. A row that cannot be read is a failure, so it stops.
//
// `probeUnreadable` exists for one purpose: the team's own live test of the
// fail-closed path. It makes the read fail on purpose, so the catch below runs
// exactly as it would in a real outage. It can only ever make the gate stricter.
export async function automationState(base44, options: { probeUnreadable?: boolean } = {}) {
  try {
    if (options.probeUnreadable) throw new Error('the switch was made unreadable for the live fail-closed test');
    const page = await base44.asServiceRole.entities.SupportAutomation.list('-created_date', 1);
    const row = rows(page)[0] || null;
    if (!row) return { paused: false, reason: '', missing: true };
    return { paused: row.paused === true, reason: row.reason || '', id: row.id };
  } catch (error) {
    console.error('[supportHarness] the automation switch could not be read:', error && error.message);
    return { paused: true, reason: 'the automation switch could not be read', unreadable: true };
  }
}

export async function setPaused(base44, paused, reason) {
  const state = await automationState(base44);
  const payload = {
    paused,
    reason: String(reason || '').slice(0, 300),
    paused_at: paused ? new Date().toISOString() : null
  };
  if (state.id) await base44.asServiceRole.entities.SupportAutomation.update(state.id, payload);
  else await base44.asServiceRole.entities.SupportAutomation.create(payload);
  return payload;
}

// The audit log. Returns false when the entry could not be written, and callers
// treat that as "do not act".
export async function audit(base44, entry) {
  try {
    await base44.asServiceRole.entities.SupportAudit.create({
      ticket_id: entry.ticket_id || '',
      ticket_number: entry.ticket_number || '',
      action: String(entry.action || 'unknown'),
      gate: String(entry.gate || 'admission'),
      decision: entry.decision || 'allowed',
      reason: String(entry.reason || '').slice(0, 1000),
      actor: entry.actor || 'automation',
      detail: String(entry.detail || '').slice(0, 2000)
    });
    return true;
  } catch (error) {
    console.error('[supportHarness] audit entry could not be written:', error && error.message);
    return false;
  }
}

async function messagesLeft(base44, ticketId, kind) {
  const cap = LOOP_CAP[kind];
  if (!cap) return { left: 1, cap: 0 };
  const page = await base44.asServiceRole.entities.TicketMessage.filter({ ticket_id: ticketId, kind }, { limit: cap });
  return { left: cap - rows(page).length, cap };
}

// The admission decision. It writes its own audit entry, so being admitted and
// being logged are the same event.
export async function admit(base44, { action, actor = 'automation', ticket = null, kind = null, detail = '', probeUnreadable = false }) {
  if (!ALLOWED_ACTIONS.includes(action)) {
    await audit(base44, { action, gate: 'tool_gate', decision: 'blocked', reason: `"${action}" is not on the list of allowed actions`, actor, detail });
    return { ok: false, gate: 'tool_gate', reason: `"${action}" is not an allowed action` };
  }

  const state = await automationState(base44, { probeUnreadable });
  if (state.paused) {
    await audit(base44, {
      action,
      gate: 'kill_switch',
      decision: 'blocked',
      reason: state.reason || 'the automation switch is on',
      actor,
      ticket_id: ticket?.id,
      ticket_number: ticket?.ticket_number,
      detail
    });
    return { ok: false, gate: 'kill_switch', reason: state.reason || 'automation is paused' };
  }

  if (ticket && kind) {
    const { left } = await messagesLeft(base44, ticket.id, kind);
    if (left <= 0) {
      await audit(base44, {
        action,
        gate: 'loop_gate',
        decision: 'skipped',
        reason: `${kind} has already been sent the allowed number of times on this ticket`,
        actor,
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number
      });
      return { ok: false, gate: 'loop_gate', reason: `${kind} already sent` };
    }
  }

  const written = await audit(base44, {
    action,
    gate: 'admission',
    decision: 'allowed',
    reason: 'admitted by the tool gate, the switch and the loop gate',
    actor,
    ticket_id: ticket?.id,
    ticket_number: ticket?.ticket_number,
    detail
  });
  if (!written) return { ok: false, gate: 'admission', reason: 'the audit log could not be written, so the action was not taken' };

  return { ok: true, gate: 'admission', reason: 'admitted' };
}

// The credit ceiling, unchanged, checked before anything that costs a credit.
export async function admitSpend(base44, kind, userId, context = {}) {
  const allowed = await spendCredit(base44, kind, userId);
  if (allowed) return true;
  await audit(base44, {
    action: context.action || kind,
    gate: 'credit_ceiling',
    decision: 'skipped',
    reason: `the daily ceiling for ${kind} is reached, so nothing was spent`,
    actor: 'automation',
    ticket_id: context.ticket?.id,
    ticket_number: context.ticket?.ticket_number
  });
  return false;
}

export const countMessages = async (base44, ticketId, limit = 30) =>
  rows(await base44.asServiceRole.entities.TicketMessage.filter({ ticket_id: ticketId }, { sort: 'created_date', limit }));