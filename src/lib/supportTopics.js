// Shared by the ticket form on the Support page and the one inside the helper
// panel, so both ask the same thing and the same topics reach the owner.

export const TICKET_TOPICS = [
  { id: 'flagged_item', label: 'A flagged item worries me' },
  { id: 'tier_unlock', label: 'I paid but a tier is still locked' },
  { id: 'payment', label: 'A payment or receipt question' },
  { id: 'talk_to_support', label: 'Talk to SIFT AI support' },
  { id: 'other', label: 'Something else' }
];

// Never needed for any ticket, and never wanted in a ticket body.
export const SENSITIVE_TICKET_CONTENT = /(password|passcode|one[- ]?time code|\botp\b|api[ -]?key|secret key|serial number|\bimei\b|card number|\bcvv\b)/i;