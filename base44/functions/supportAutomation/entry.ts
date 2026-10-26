import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  HELP_ARTICLES,
  missingDetailFor,
  searchHelp,
  TEMPLATES
} from '../../shared/supportHelp.ts';
import {
  admit,
  admitSpend,
  audit,
  automationState,
  countMessages,
  MESSAGE_CAP,
  setPaused,
  SWEEP_TICKET_CAP
} from '../../shared/supportHarness.ts';
import { openTicket } from '../../shared/supportIntake.ts';
import { ticketNumber, writeSupportMessage } from '../../shared/supportReply.ts';
import { emailPlainValue } from '../../shared/emailSafe.ts';

// The support automation. Every action here is admitted, gated, audited and
// reversible, and nothing is ever sent that the safety gate refused.
//
// Actions an app user may call: search (the help centre), my_tickets, open_ticket.
// Actions only the owner or a workflow may call: sweep, respond, status, pause,
// resume, reopen.

const DAY_HOURS = 24;
const CLOSE_AFTER_HOURS = 7 * DAY_HOURS;
const HOURS = 60 * 60 * 1000;

const hoursSince = (value) => {
  const time = new Date(value || 0).getTime();
  if (!Number.isFinite(time) || time <= 0) return Number.POSITIVE_INFINITY;
  return (Date.now() - time) / HOURS;
};

const rows = (page) => (Array.isArray(page) ? page : page?.items || []);

const OPEN_STATUSES = ['open', 'waiting_on_user', 'waiting_on_team'];

const FIXED_PATTERN = /(fixed|that worked|it worked|sorted|solved|resolved|all good|no longer|working now|thank you|thanks)/i;

// One decision per ticket per sweep. Deterministic: it reads the ticket and its
// thread and names the single next step, or nothing at all.
function decideNext(ticket, messages) {
  const kinds = new Set(messages.map((m) => m.kind));
  const firstReply = messages.find((m) => m.kind === 'first_reply');
  const lastSupport = [...messages].reverse().find((m) => m.author === 'support');
  const lastSupportAt = lastSupport?.created_date || ticket.created_date;
  const userSinceSupport = lastSupport
    ? messages.some((m) => m.author === 'user' && new Date(m.created_date) > new Date(lastSupport.created_date))
    : false;
  const userEver = messages.some((m) => m.author === 'user');
  const exchanges = Number(ticket.exchanges || 0);
  const priority = ticket.priority || 'other';
  const number = ticket.ticket_number || ticketNumber(ticket.id);
  const sinceSupport = hoursSince(lastSupportAt);
  const guest = !ticket.user_id;

  // A guest has no account, so in-app follow-ups cannot be read by them. Only the
  // first reply and the final tidy-up apply.
  if (guest) {
    if (!userSinceSupport && sinceSupport >= CLOSE_AFTER_HOURS && !kinds.has('closing')) {
      return { kind: 'closing', status: 'closed', reason: 'no_reply_7d', body: TEMPLATES.closingNoReply(number), note: 'guest ticket closed after seven days' };
    }
    return null;
  }

  if (exchanges >= 2 && !ticket.escalated && !kinds.has('escalation')) {
    return { kind: 'escalation', status: 'waiting_on_team', escalated: true, body: TEMPLATES.escalation(number, priority), note: 'two unresolved replies' };
  }

  if (!userSinceSupport && sinceSupport >= CLOSE_AFTER_HOURS && !kinds.has('closing')) {
    return { kind: 'closing', status: 'closed', reason: 'no_reply_7d', body: TEMPLATES.closingNoReply(number), note: 'seven days with no reply' };
  }

  const detail = missingDetailFor({ priority, ticketText: ticket.description || '' });
  if (detail && !kinds.has('ask_detail')) {
    return { kind: 'ask_detail', status: 'waiting_on_user', body: TEMPLATES.askDetail(number, detail), note: `asked for ${detail}` };
  }

  if (firstReply && !userEver && !kinds.has('fix_check') && hoursSince(firstReply.created_date) >= DAY_HOURS) {
    return { kind: 'fix_check', status: 'waiting_on_user', body: TEMPLATES.fixCheck(number), note: 'asked whether the fix worked' };
  }

  if (!kinds.has('status_update') && sinceSupport >= DAY_HOURS && hoursSince(ticket.created_date) >= 6) {
    return { kind: 'status_update', status: null, body: TEMPLATES.statusUpdate(number), note: 'quiet for a day' };
  }

  return null;
}

async function escalateTicket(base44, ticket, body) {
  const number = ticket.ticket_number || ticketNumber(ticket.id);
  const summary = [
    `Ticket ${number} has had ${Number(ticket.exchanges || 0)} replies from the person and is not settled by the automatic steps.`,
    `Triage: ${ticket.priority || 'other'}.`,
    'Summary of the thread is on the ticket; nothing was deleted.'
  ].join(' ');

  const ownerEmail = Deno.env.get('ADMIN_EMAIL');
  let notified = false;
  if (ownerEmail) {
    const allowed = await admitSpend(base44, 'helper_ticket', ticket.user_id, { action: 'escalation_email', ticket });
    if (allowed) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: ownerEmail,
          from_name: 'SIFT AI Support',
          template_name: 'OwnerTicketAlert',
          category: 'transactional',
          variables: {
            ticket_number: number,
            topic: emailPlainValue(ticket.title || 'Support ticket', 80),
            submitted_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
            status: 'Waiting on the SIFT AI team',
            requester_email: 'reply address is on the ticket',
            user_message: summary,
            app_name: 'SIFT AI'
          }
        });
        notified = true;
      } catch (error) {
        console.error('[supportAutomation] escalation email failed:', error && error.message);
      }
    }
  }

  return { body, notified };
}

async function applyAction(base44, ticket, decision) {
  const number = ticket.ticket_number || ticketNumber(ticket.id);
  const body = decision.kind === 'escalation' ? (await escalateTicket(base44, ticket, decision.body)).body : decision.body;

  const written = await writeSupportMessage(base44, { ticket, kind: decision.kind, body });
  if (!written.sent) {
    await audit(base44, {
      action: decision.kind,
      gate: 'safety_check',
      decision: 'blocked',
      reason: written.reason || 'the message did not pass the safety gate',
      ticket_id: ticket.id,
      ticket_number: number,
      detail: decision.note || ''
    });
    return { acted: false, reason: written.reason };
  }

  const update = { last_activity_at: new Date().toISOString() };
  if (decision.status) update.status = decision.status;
  if (decision.escalated) update.escalated = true;
  if (decision.reason) {
    update.closed_reason = decision.reason;
    update.closed_at = new Date().toISOString();
  }
  await base44.asServiceRole.entities.SupportTicket.update(ticket.id, update);

  await audit(base44, {
    action: decision.kind,
    gate: 'outcome',
    decision: 'completed',
    reason: `${decision.kind} sent on ${number}${decision.status ? `, status now ${decision.status}` : ''}`,
    ticket_id: ticket.id,
    ticket_number: number,
    detail: decision.note || ''
  });

  return { acted: true, kind: decision.kind };
}

// One user reply, handled the moment it lands: a fix is confirmed and closed, a
// closed ticket reopens, two unresolved replies escalate, anything else gets a
// grounded reply with the help articles.
async function respond(base44, messageId) {
  const message = await base44.asServiceRole.entities.TicketMessage.get(messageId);
  if (!message || message.author !== 'user') {
    await audit(base44, {
      action: 'respond',
      gate: 'loop_gate',
      decision: 'skipped',
      reason: 'the message was not written by the person, so nothing was sent',
      ticket_id: message?.ticket_id
    });
    return { handled: false, reason: 'not a user message' };
  }

  const ticket = await base44.asServiceRole.entities.SupportTicket.get(message.ticket_id);
  if (!ticket) return { handled: false, reason: 'ticket not found' };

  const number = ticket.ticket_number || ticketNumber(ticket.id);
  const kind = ticket.status === 'closed' ? 'reopen' : FIXED_PATTERN.test(message.body || '') ? 'closing' : 'help_reply';
  const allowed = await admit(base44, { action: 'respond', actor: 'automation', ticket, kind, detail: `user message ${message.id}` });
  if (!allowed.ok) return { handled: false, reason: allowed.reason, gate: allowed.gate };

  const total = await countMessages(base44, ticket.id);
  if (total.length >= MESSAGE_CAP) {
    await audit(base44, {
      action: 'respond',
      gate: 'loop_gate',
      decision: 'skipped',
      reason: `this ticket already carries ${total.length} messages, the ceiling for one ticket`,
      ticket_id: ticket.id,
      ticket_number: number
    });
    return { handled: false, reason: 'ticket message ceiling reached' };
  }

  if (kind === 'reopen') {
    const result = await applyAction(base44, ticket, {
      kind: 'reopen',
      status: 'open',
      reason: '',
      body: TEMPLATES.reopenAck(number),
      note: 'person replied to a closed ticket'
    });
    await base44.asServiceRole.entities.SupportTicket.update(ticket.id, { closed_reason: '', closed_at: null });
    return { handled: result.acted, reopened: result.acted };
  }

  if (kind === 'closing') {
    const result = await applyAction(base44, ticket, {
      kind: 'closing',
      status: 'resolved',
      reason: 'confirmed',
      body: TEMPLATES.closingConfirmed(number),
      note: 'person said it is fixed'
    });
    return { handled: result.acted, resolved: result.acted };
  }

  const exchanges = Number(ticket.exchanges || 0) + 1;
  await base44.asServiceRole.entities.SupportTicket.update(ticket.id, { exchanges, last_activity_at: new Date().toISOString() });

  if (exchanges >= 2 && !ticket.escalated) {
    const result = await applyAction(base44, { ...ticket, exchanges }, {
      kind: 'escalation',
      status: 'waiting_on_team',
      escalated: true,
      body: TEMPLATES.escalation(number, ticket.priority || 'other'),
      note: 'second reply without a fix'
    });
    return { handled: result.acted, escalated: result.acted };
  }

  const articles = searchHelp(message.body, 2);
  const result = await applyAction(base44, ticket, {
    kind: 'help_reply',
    status: ['payment_unlock', 'safety_flagged'].includes(ticket.priority) ? 'waiting_on_team' : 'open',
    body: TEMPLATES.helpAck(number, articles.length ? articles : HELP_ARTICLES.slice(0, 2)),
    note: 'reply grounded in the help articles'
  });
  return { handled: result.acted, replied: result.acted };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'search');
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    const isAdmin = user?.role === 'admin';

    if (action === 'search') {
      const query = String(body.query || '').slice(0, 200);
      const matched = searchHelp(query, 5);
      const results = (matched.length ? matched : HELP_ARTICLES.slice(0, 3)).map((article) => ({
        title: article.title,
        text: article.text,
        fix_steps: article.fix_steps || []
      }));
      return Response.json({ query, matched_your_words: matched.length > 0, results });
    }

    if (action === 'my_tickets') {
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const page = await base44.entities.SupportTicket.filter({}, { sort: '-created_date', limit: 20 });
      const tickets = (rows(page) || []).map((ticket) => ({
        ticket_number: ticket.ticket_number || ticketNumber(ticket.id),
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority || 'other',
        last_activity_at: ticket.last_activity_at || ticket.updated_date
      }));
      return Response.json({ tickets });
    }

    if (action === 'open_ticket') {
      if (!user) return Response.json({ error: 'Sign in to open a ticket from here, or use the ticket form on the support page.' }, { status: 401 });
      const message = String(body.message || '').slice(0, 1500).trim();
      if (!message) return Response.json({ error: 'Tell us what happened first.' }, { status: 400 });

      if (!(await admitSpend(base44, 'helper_ticket', user.id, { action: 'open_ticket' }))) {
        return Response.json({ error: "Today's ticket limit is reached. Please try again tomorrow." }, { status: 429 });
      }

      const opened = await openTicket(base44, {
        user,
        topic: String(body.topic || 'other'),
        topicTitle: String(body.topic_title || 'Support question').slice(0, 60),
        message,
        email: '',
        page: String(body.page || '').slice(0, 60),
        context: String(body.context || '').slice(0, 900)
      });

      return Response.json({
        ticket_id: opened.ticket.id,
        ticket_number: opened.number,
        priority: opened.priority,
        first_reply: opened.firstReply,
        owner_notified: opened.ownerNotified,
        message: 'Ticket opened, and the first reply is already on it.'
      });
    }

    // Everything below is the owner's or a workflow's, never a visitor's.
    if (['sweep', 'respond', 'status', 'pause', 'resume', 'reopen'].includes(action)) {
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
    } else {
      return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    if (action === 'status') {
      const pl = (p) => (Array.isArray(p) ? `array(${p.length})` : `page(${(p?.items || []).length},has_more=${p?.has_more})`);
      const withOpts = await base44.asServiceRole.entities.SupportTicket.filter({}, { sort: '-created_date', limit: 5 });
      const noOpts = await base44.asServiceRole.entities.SupportTicket.filter({});
      const posList = await base44.asServiceRole.entities.SupportTicket.list('-created_date', 3);
      const cnt = await base44.asServiceRole.entities.SupportTicket.count({});
      console.log(`[diag54] withOpts=${pl(withOpts)} noOpts=${pl(noOpts)} posList=${pl(posList)} count=${cnt}`);

      const state = await automationState(base44);
      const page = await base44.asServiceRole.entities.SupportTicket.filter({}, { sort: '-created_date', limit: 50 });
      const tickets = rows(page);
      const waiting = tickets.filter((t) => t.status === 'waiting_on_team');
      return Response.json({
        paused: state.paused,
        reason: state.reason,
        open_tickets: tickets.filter((t) => OPEN_STATUSES.includes(t.status)).length,
        waiting_on_team: waiting.length,
        waiting_tickets: waiting.slice(0, 10).map((t) => ({
          id: t.id,
          ticket_number: t.ticket_number || ticketNumber(t.id),
          title: t.title,
          priority: t.priority || 'other',
          exchanges: Number(t.exchanges || 0)
        })),
        message_cap_per_ticket: MESSAGE_CAP,
        tickets_per_sweep: SWEEP_TICKET_CAP
      });
    }

    if (action === 'pause' || action === 'resume') {
      const paused = action === 'pause';
      const reason = String(body.reason || (paused ? 'paused by the owner' : 'resumed by the owner')).slice(0, 300);
      const saved = await setPaused(base44, paused, reason);
      await audit(base44, {
        action,
        gate: 'kill_switch',
        decision: 'completed',
        reason: `automation ${paused ? 'paused' : 'resumed'}: ${reason}`,
        actor: 'owner'
      });
      return Response.json({ paused: saved.paused, reason: saved.reason });
    }

    if (action === 'reopen') {
      const ticket = await base44.asServiceRole.entities.SupportTicket.get(String(body.ticket_id || ''));
      if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

      const allowed = await admit(base44, { action: 'reopen', actor: 'owner', ticket, kind: 'reopen' });
      if (!allowed.ok) return Response.json({ error: allowed.reason, gate: allowed.gate }, { status: 409 });

      const number = ticket.ticket_number || ticketNumber(ticket.id);
      const result = await applyAction(base44, ticket, {
        kind: 'reopen',
        status: 'open',
        reason: '',
        body: `${TEMPLATES.reopenAck(number)} A person on the SIFT AI team reopened this one by hand.`,
        note: 'reopened by the owner'
      });
      await base44.asServiceRole.entities.SupportTicket.update(ticket.id, { closed_reason: '', closed_at: null, escalated: false });
      return Response.json({ reopened: result.acted });
    }

    if (action === 'respond') {
      const messageId = String(body.message_id || '');
      if (!messageId) return Response.json({ error: 'message_id is required' }, { status: 400 });
      const result = await respond(base44, messageId);
      return Response.json(result);
    }

    // sweep — the scheduled pass. One action per ticket, in triage order, with a
    // ceiling on how many tickets it touches and on how many messages a ticket can
    // ever carry. A ticket whose step fails is recorded and left alone; the sweep
    // carries on with the rest instead of restarting anything blindly.
    const page = await base44.asServiceRole.entities.SupportTicket.filter(
      { status: { $in: OPEN_STATUSES } },
      { sort: 'created_date', limit: SWEEP_TICKET_CAP }
    );
    const open = rows(page);
    const rank = { payment_unlock: 0, safety_flagged: 1, scan_problem: 2, account_login: 3, other: 4 };
    const ordered = open
      .slice()
      .sort((a, b) => (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4) || new Date(a.created_date) - new Date(b.created_date));

    const summary = { looked_at: ordered.length, acted: 0, skipped: 0, failed: 0, actions: [] };

    for (const ticket of ordered) {
      try {
        // A ticket filed before the owner id was stored on it gets it filled in
        // here, once, so the person can follow the thread and their own daily
        // ceiling still counts it. A ticket sent with no account says "(guest)"
        // in its title and is left exactly as it is.
        if (!ticket.user_id && ticket.created_by_id && !/\(guest\)$/.test(String(ticket.title || '').trim())) {
          ticket.user_id = ticket.created_by_id;
          await base44.asServiceRole.entities.SupportTicket.update(ticket.id, { user_id: ticket.created_by_id });
        }

        const messages = await countMessages(base44, ticket.id);
        const decision = decideNext(ticket, messages);
        if (!decision) {
          summary.skipped += 1;
          continue;
        }
        if (messages.length >= MESSAGE_CAP) {
          summary.skipped += 1;
          await audit(base44, {
            action: decision.kind,
            gate: 'loop_gate',
            decision: 'skipped',
            reason: `this ticket already carries ${messages.length} messages, the ceiling for one ticket`,
            ticket_id: ticket.id,
            ticket_number: ticket.ticket_number
          });
          continue;
        }

        const allowed = await admit(base44, { action: 'sweep', actor: 'automation', ticket, kind: decision.kind, detail: decision.note });
        if (!allowed.ok) {
          summary.skipped += 1;
          continue;
        }

        const result = await applyAction(base44, ticket, decision);
        if (result.acted) {
          summary.acted += 1;
          summary.actions.push({ ticket: ticket.ticket_number || ticket.id, action: decision.kind });
        } else {
          summary.failed += 1;
          summary.actions.push({ ticket: ticket.ticket_number || ticket.id, action: decision.kind, held_back: result.reason });
        }
      } catch (error) {
        summary.failed += 1;
        await audit(base44, {
          action: 'sweep',
          gate: 'outcome',
          decision: 'failed',
          reason: String(error && error.message).slice(0, 400),
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number
        });
      }
    }

    return Response.json(summary);
  } catch (error) {
    console.error('[supportAutomation] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}