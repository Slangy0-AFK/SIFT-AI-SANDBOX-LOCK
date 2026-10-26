// Values a visitor types reach the owner's alert email. Two of them — the ticket
// title and the reply address — are handed to the email template as variables,
// and a template variable lands in the subject line as well as in the HTML body.
// So they are reduced to plain text here: nothing that could open a tag survives,
// and nothing that could start a new mail header line survives. Ampersands are
// left in place: they are harmless in both places, and turning them into "&amp;"
// would show up literally in the subject line.
export const emailPlainValue = (value, limit = 120) =>
  String(value ?? '')
    .replace(/[\r\n\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);