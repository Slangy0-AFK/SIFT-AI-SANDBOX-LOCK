// The one place the support help content lives. The in-app helper, the automatic
// first reply, the searchable help centre and the support agent all read this same
// list, so no two of them can answer from a different set of facts.
//
// Nothing here is a scan result and nothing here is invented: no article says a
// device is clean, and no article promises an outcome.

import { VT_MANUAL_HINT, VT_MANUAL_URL, VT_UNAVAILABLE } from './virusTotal.ts';

export const HELP_ARTICLES = [
  {
    id: 'verdicts',
    title: 'What the three verdicts mean',
    text: 'Approved means nothing is known against the item. Unknown means there is not enough information either way, so we say so instead of guessing. Flagged means something is known against it and you get the evidence. None of the three is a promise that a device is clean or safe. SIFT AI is not an antivirus and is not a substitute for one: results are indicators only.',
    fix_steps: [
      'Open the result and read the evidence line, not just the word.',
      'Treat Unknown as "not enough information", never as a pass.',
      'Check the same item again in a few days if you are unsure.'
    ]
  },
  {
    id: 'flagged_item',
    title: 'What to do about a flagged item',
    text: 'Three choices. Allow it if you recognise it and want to keep it. Block or uninstall it if you do not recognise it or it does not need the permissions it asks for. Watch it if you are unsure: keep it for now and check again in a few days.',
    fix_steps: [
      'If you do not recognise it, uninstall it on the device, then block it here so it comes back flagged.',
      'If you do recognise it, allow it so the next check treats it as known.',
      'If you are unsure, watch it and re-check in a few days.'
    ]
  },
  {
    id: 'browser_limits',
    title: 'What a browser can and cannot check',
    text: 'SIFT AI runs in your browser. It checks the app name, permission screen, link, hash or message you upload or paste. It cannot look through a whole phone by itself, and it cannot see things you have not given it.',
    fix_steps: [
      'Bring the exact app name, permission screen, link, hash or message you want checked.',
      'If you need the whole device looked at, book a Device Check or a Full Device Audit on the plans page.'
    ]
  },
  {
    id: 'permissions',
    title: 'Permissions that do not fit',
    text: 'A simple torch app asking for contacts, or a game asking to read your messages, is the usual sign of something that wants more than it needs. Ask yourself whether the permission makes sense for what the app does.',
    fix_steps: [
      'Open the app on the device and look at the permissions it was granted.',
      'Take away any permission that makes no sense for what the app does.',
      'Paste that list into your checker here if you want a second opinion on it.'
    ]
  },
  {
    id: 'paying',
    title: 'Paying and unlocking',
    text: 'Card payments are handled by Stripe on the plans page, and you do not need an account to pay. A tier unlocks on your account as soon as the payment is confirmed. If a tier has not unlocked after paying, open a ticket and we will look it up by the payment.',
    fix_steps: [
      'Give the email address you used at checkout, and the tier you paid for.',
      'Reload the plans page: a confirmed payment unlocks the tier on that account.',
      'If it is still locked, the ticket is the fastest route, because we look the payment up by that email.'
    ]
  },
  {
    id: 'virustotal_unavailable',
    title: 'VirusTotal checks are not available here',
    text: VT_UNAVAILABLE,
    fix_steps: [
      `You can look the item up yourself at ${VT_MANUAL_URL} if you choose. SIFT AI does not upload anything for you.`,
      VT_MANUAL_HINT,
      'For anything else on your device, the SIFT AI checks, your own lists and a Device Check are what we can do today.'
    ]
  },
  {
    id: 'data',
    title: 'Your data and history',
    text: 'Your scans and tickets belong to your account only. Nobody else can see them. We do not need your passwords, card numbers, one-time codes, phone number, IMEI or serial numbers, and the helper will never ask for them.',
    fix_steps: [
      'Keep passwords, one-time codes and card details out of any message you send us.',
      'Your history and tickets are listed on your own account, and nowhere else.'
    ]
  }
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'has', 'had', 'was', 'were', 'are', 'not', 'but', 'you', 'your',
  'our', 'its', 'his', 'her', 'they', 'them', 'can', 'could', 'should', 'would', 'get', 'got', 'how', 'what', 'why', 'when',
  'which', 'who', 'about', 'into', 'over', 'still', 'just', 'any', 'all', 'out', 'one', 'two', 'now', 'did', 'does', 'doing'
]);

const words = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

// Deterministic search over the articles above. No model, no outside service.
export function searchHelp(query, limit = 4) {
  const asked = words(query);
  if (!asked.length) return [];
  return HELP_ARTICLES.map((article) => {
    const haystack = words(`${article.title} ${article.text} ${(article.fix_steps || []).join(' ')}`);
    const score = asked.reduce((total, word) => total + haystack.filter((h) => h === word || h.startsWith(word)).length, 0);
    return { article, score };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.article);
}

// The text block a model is allowed to answer from.
export function helpBlock(articles) {
  return articles
    .map((a) => `- ${a.title}: ${a.text}\n  Likely fix steps: ${(a.fix_steps || []).join(' ')}`)
    .join('\n');
}

export const PRIORITY_ORDER = ['payment_unlock', 'safety_flagged', 'scan_problem', 'account_login', 'other'];

const PRIORITY_LABELS = {
  payment_unlock: 'payment or unlock',
  safety_flagged: 'a flagged item',
  scan_problem: 'a check that did not work',
  account_login: 'account or login',
  other: 'general question'
};

export const priorityLabel = (priority) => PRIORITY_LABELS[priority] || PRIORITY_LABELS.other;

const PAYMENT = /(paid|payment|charge|charged|billing|refund|receipt|stripe|unlock|locked|subscription|invoice|checkout)/i;
const SAFETY = /(flagged|virus|malware|trojan|spy|stalker|hacked|hack|breach|scam|phishing|suspicious|threat|stolen|infected|ransom)/i;
const SCAN = /(scan|scanner|result|verdict|virustotal|otx|check|app|permission|device|link|hash|message)/i;
const ACCOUNT = /(log ?in|login|sign ?in|sign ?up|account|email link|verify|verification|reset|register|signed out)/i;

// Triage order asked for: payment or unlock first, then a flagged item, then a
// check that did not work, then account or login, then everything else.
export function triagePriority({ topic = '', text = '' } = {}) {
  const body = String(text || '');
  if (topic === 'payment' || topic === 'tier_unlock' || PAYMENT.test(body)) return 'payment_unlock';
  if (topic === 'flagged_item' || SAFETY.test(body)) return 'safety_flagged';
  if (SCAN.test(body)) return 'scan_problem';
  if (ACCOUNT.test(body)) return 'account_login';
  return 'other';
}

// Exactly one missing detail, the thing a person can actually supply.
export function missingDetailFor({ priority = 'other', ticketText = '' } = {}) {
  const text = String(ticketText || '');
  if (/\b[\w.+-]+@[\w-]+\.[\w.]+\b/.test(text)) {
    if (priority === 'payment_unlock') return 'the tier you paid for (Pro, Device Check or Full Device Audit)';
  }
  if (priority === 'payment_unlock') {
    return /\b[\w.+-]+@[\w-]+\.[\w.]+\b/.test(text)
      ? 'the date the payment went through'
      : 'the email address you used at checkout';
  }
  if (priority === 'safety_flagged') {
    return 'the name of the app or the exact link you are worried about';
  }
  if (priority === 'scan_problem') {
    return 'what you were checking (an app, a link, a message or a file) and what the screen said';
  }
  if (priority === 'account_login') {
    return 'the page you were on and what the screen said when it stopped';
  }
  return text.trim().length < 40 ? 'a sentence about what you were doing when it happened' : null;
}

const BRAND = 'SIFT AI';

export const TEMPLATES = {
  askDetail: (ticketNumber, detail) =>
    `Thanks, this is ${ticketNumber}. One thing is missing before I can take it further: ${detail}. Reply here with that and it goes back into the queue straight away. If you would rather not, just say so and a person on the ${BRAND} team will read the ticket as it stands.`,
  fixCheck: (ticketNumber) =>
    `Checking in on ${ticketNumber}: did the steps in the reply fix it? Reply "yes, fixed" and I will close it, or tell me what is still happening and I will pick it up again. If I hear nothing for seven days I will close it and you can reopen it any time by replying.`,
  statusUpdate: (ticketNumber) =>
    `${ticketNumber} is still open on our side and nothing has been lost. If you have anything to add, reply here. If it is sorted, say "yes, fixed" and I will close it.`,
  closingConfirmed: (ticketNumber) =>
    `Closing ${ticketNumber} as fixed, because you told us it is sorted. If it comes back, reply to this ticket and it reopens with the whole history. Thank you for the detail you sent, it is what made this quick.`,
  closingNoReply: (ticketNumber) =>
    `Closing ${ticketNumber} after seven days with no reply. Nothing you sent has been deleted. If it is still happening, reply here and the ticket reopens where it left off, or open a new one from the support page.`,
  reopenAck: (ticketNumber) =>
    `${ticketNumber} is open again and back with the automation. You do not need to repeat anything: the whole history is on this ticket.`,
  escalation: (ticketNumber, priority) =>
    `${ticketNumber} is now waiting on the ${BRAND} team. It came in as ${priorityLabel(priority)} and has not been settled by the automatic steps, so a person is picking it up rather than the automation guessing again. Everything you sent, and everything that was tried, is on this ticket for them.`,
  helpAck: (ticketNumber, articles) => {
    const steps = articles.flatMap((a) => a.fix_steps || []).slice(0, 4);
    return [
      `Thanks, this is ${ticketNumber}. What usually sorts this:`,
      ...steps.map((step, index) => `${index + 1}. ${step}`),
      '',
      'If that does not do it, reply here with what you see and it stays with a person.'
    ].join('\n');
  }
};

const ASKS_FOR_SECRET = /(your|the)\s+(password|passcode|one[- ]?time code|\botp\b|api[ -]?key|secret key|\bimei\b|serial number|card number|\bcvv\b|bank account)/i;
const REQUESTS_SECRET = /(send|share|give|provide|reply with|tell me).{0,30}(password|passcode|one[- ]?time code|\botp\b|api[ -]?key|\bimei\b|serial number|card number|\bcvv\b)/i;
const PROMISE = /(guarantee|guaranteed|100% safe|is (clean|safe)|nothing to worry about|we promise|definitely safe|you are safe)/i;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

// The safety gate every automated message passes before it is sent. If it fails,
// the message is not sent at all: the reason is logged and the ticket is left for
// a person rather than shipping something we must never say.
export function safetyCheck(value) {
  const text = String(value || '').trim();
  if (text.length < 20) return { ok: false, reason: 'message too short to be useful' };
  if (text.length > 4000) return { ok: false, reason: 'message over the length limit' };
  if (EMAIL.test(text)) return { ok: false, reason: 'message contains an email address' };
  if (ASKS_FOR_SECRET.test(text) || REQUESTS_SECRET.test(text)) return { ok: false, reason: 'message asks for something we must never ask for' };
  if (PROMISE.test(text)) return { ok: false, reason: 'message makes a promise we cannot make' };
  if (/\d{8,}/.test(text)) return { ok: false, reason: 'message contains a long number' };
  if (/https?:\/\//i.test(text) && !/https?:\/\/(siftai\.base44\.app|sift-ai\.net|(www\.)?virustotal\.com)/i.test(text)) {
    return { ok: false, reason: 'message links off the app' };
  }
  return { ok: true, reason: '' };
}