// The notice that goes to the person when their ticket closes. One place sends
// it, so a ticket closed by the automation and one closed by hand in the admin
// console say the same thing, and neither can quietly skip the email.
//
// The notice never blocks a close: a failed send is logged and written to the
// audit log, and the ticket stays closed.

import { emailPlainValue } from './emailSafe.ts';

const escapeHtml = (value: string) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// How the ticket ended, in the person's own plain words.
const CLOSING_LINES = {
  confirmed: 'You told us it was fixed, so this ticket is closed.',
  resolved_by_team: 'A person on the SIFT AI team worked through this one and closed it.',
  no_reply_7d: 'We closed this one after seven days with no reply. Reply any time and it opens again on the same thread.'
};

export const closingLine = (reason) => CLOSING_LINES[reason] || 'This ticket is closed.';

const STATUS_LINES = {
  confirmed: 'Closed, after you confirmed the fix',
  resolved_by_team: 'Closed by the SIFT AI team',
  no_reply_7d: 'Closed after seven days with no reply'
};

// The reply address on the ticket. A ticket filed before the address was stored
// carries it in its own notes, so an older ticket is not left without a notice.
export function requesterAddress(ticket) {
  const stored = String(ticket?.requester_email || '').trim();
  if (stored) return stored;
  const found = String(ticket?.description || '').match(/^Reply to:\s*(\S+@\S+)$/m);
  return found ? found[1].trim() : '';
}

export async function notifyTicketClosed(base44, ticket, { reason, resolution }) {
  const to = requesterAddress(ticket);
  if (!to) {
    console.warn('[ticketNotices] no reply address on the ticket, so no closing notice was sent');
    return { notified: false, reason: 'no reply address on the ticket' };
  }

  const number = ticket.ticket_number || '';
  try {
    const sent = await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      from_name: 'SIFT AI Support',
      template_name: 'TicketClosed',
      category: 'transactional',
      variables: {
        ticket_number: emailPlainValue(number, 40),
        ticket_title: emailPlainValue(ticket.title || 'Support ticket', 80),
        status_line: STATUS_LINES[reason] || 'Closed',
        closing_note: closingLine(reason),
        resolution: escapeHtml(String(resolution || '').slice(0, 2000)).replace(/\n/g, '<br />'),
        app_name: 'SIFT AI'
      }
    });

    // A blocked address is answered, not thrown: the ticket stays closed either way.
    if (sent && sent.success === false) {
      console.warn(`[ticketNotices] the closing notice to the address on ${number} was refused: ${sent.reason}`);
      return { notified: false, reason: sent.reason || 'the address could not be reached' };
    }

    return { notified: true, to };
  } catch (error) {
    console.error('[ticketNotices] the closing notice could not be sent:', error && error.message);
    return { notified: false, reason: (error && error.message) || 'the send failed' };
  }
}