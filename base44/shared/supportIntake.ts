// Ticket intake. One path, used by the public ticket form, the helper panel and
// the support agent, so every ticket is numbered, triaged, answered and sent to
// the owner the same way.

import { audit } from './supportHarness.ts';
import { priorityLabel, triagePriority } from './supportHelp.ts';
import { ticketNumber, writeAutoReply } from './supportReply.ts';
// The title and the reply address are typed by the person who opens the ticket,
// and they go into a template variable, which lands in the subject line and in
// the HTML body. Both are reduced to plain text before they get there.
import { emailPlainValue } from './emailSafe.ts';

const escapeHtml = (value: string) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function openTicket(base44, { user, topic, topicTitle, message, email, page, context }) {
  const priority = triagePriority({ topic, text: message });
  const replyTo = (user && user.email) || String(email || '').trim();
  const title = `${topicTitle}${user ? '' : ' (guest)'}`;
  const description = [
    `Topic: ${topicTitle}`,
    `Triage: ${priorityLabel(priority)}`,
    `Reply to: ${replyTo}`,
    `Page: ${page || 'not stated'}`,
    context ? `On screen at the time: ${context}` : '',
    '',
    message
  ]
    .filter(Boolean)
    .join('\n');

  // A signed-in person's ticket is created with their own token, so it is scoped
  // to them by the app's rules. A guest ticket is created server-side because a
  // guest has no account yet.
  const ticket = user
    ? await base44.entities.SupportTicket.create({ title, description })
    : await base44.asServiceRole.entities.SupportTicket.create({ title, description });

  const number = ticketNumber(ticket.id);
  const triaged = {
    ticket_number: number,
    priority,
    status: 'open',
    user_id: (user && user.id) || '',
    // Where the reply and the closing notice go: the account email for a
    // signed-in person, or the address a guest left on the form.
    requester_email: replyTo,
    last_activity_at: new Date().toISOString()
  };
  await base44.asServiceRole.entities.SupportTicket.update(ticket.id, triaged);

  await audit(base44, {
    action: 'open_ticket',
    gate: 'admission',
    decision: 'completed',
    reason: `ticket ${number} opened and triaged as ${priorityLabel(priority)}`,
    actor: user ? 'user' : 'automation',
    ticket_id: ticket.id,
    ticket_number: number,
    detail: `topic ${topic}, reported from ${page || 'an unstated page'}`
  });

  const firstReply = await writeAutoReply(base44, ticket.id, { title, description });

  // The owner address is read server-side from the project's own setting. It is
  // never returned to the caller and never shown on a page.
  const ownerEmail = Deno.env.get('ADMIN_EMAIL');
  let ownerNotified = false;
  if (ownerEmail) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: ownerEmail,
        from_name: 'SIFT AI Support',
        template_name: 'OwnerTicketAlert',
        category: 'transactional',
        variables: {
          ticket_number: number,
          topic: emailPlainValue(topicTitle, 80),
          submitted_at: `${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
          status: `Open — ${priorityLabel(priority)}`,
          requester_email: emailPlainValue(replyTo, 160),
          user_message: escapeHtml(message).replace(/\n/g, '<br />'),
          app_name: 'SIFT AI'
        }
      });
      ownerNotified = true;
    } catch (emailError) {
      // A failed email must never lose the ticket itself.
      console.error('[supportIntake] owner ticket email failed:', emailError && emailError.message);
    }
  } else {
    console.error('[supportIntake] ADMIN_EMAIL is not set: ticket email was not sent');
  }

  return { ticket, number, priority, title, replyTo, ownerNotified, firstReply };
}