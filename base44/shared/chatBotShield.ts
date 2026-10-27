// The filter layer that stands in front of the app's two chat bots: the in-app
// helper (scannerHelper) and the support assistant (appSupport).
//
// Nothing a person types, copies or pastes reaches a bot until this layer has
// passed it, and nothing a bot produces reaches the screen until this layer has
// passed that too. In order, for every message:
//
//   1. kill switch  — the owner's switch, read fresh every time. On, or
//                     unreadable, and the bots stop (fail-closed).
//   2. loop gate    — a caller who keeps sending messages the filter refuses is
//                     stopped, and exactly why is written down. Nothing restarts
//                     on its own.
//   3. input filter — the message and anything a tool or the scan hands the bot
//                     are scanned for text that tries to instruct the bot:
//                     delimiter confusion, instruction override, role-play
//                     jailbreak, a hidden instruction inside pasted content. The
//                     detector is the app's existing reference
//                     (base44/shared/chatGuard.ts over promptGuard.ts) — nothing
//                     is copied, and no pattern, script or prompt is ever
//                     returned to a person or shown outside the owner's log.
//   4. log, then the tool gate — the log entry is written BEFORE the action, and
//                     only a pattern category is ever written down. If it cannot
//                     be written, the action does not happen.
//   5. output shield — the reply is scanned for a leaked instruction, an internal
//                     name, an internal id, another person's address or a request
//                     for a secret, and what passes is signed SIFT AI team.
//
// The bots themselves are not rewritten: this layer only decides whether a message
// may go ahead, and what may be said back.

import { guardChatReply, scanChatMessage } from './chatGuard.ts';
import { audit, automationState } from './supportHarness.ts';

// Said instead of the answer when a message is refused. Deliberately plain: it
// says only that the message could not be processed safely, and always leaves a
// person reachable.
export const SHIELD_REFUSAL =
  'That message could not be processed safely, so I have not acted on it. Ask about your own check in your own words, or write to support@sift-ai.net and a person will go through it.';
export const SHIELD_PAUSED =
  'This chat is stopped for the rest of today after several messages that could not be processed safely. Write to support@sift-ai.net and a person will go through it.';
export const SHIELD_HELD =
  'I could not check that reply safely, so I set it aside instead of passing it on. Ask again in your own words, or write to support@sift-ai.net.';

// Every reply a bot sends is signed by the team, never by a person.
export const SIGNATURE = 'SIFT AI team';

// How many refused messages one caller may send in a day before their chat is
// stopped. Counted per account, and per visitor address for guests, so a rotating
// identity cannot buy a fresh allowance.
export const ATTEMPT_LIMIT = 3;

// The counter this layer keeps, and the gates it writes to the log.
export const BLOCK_KIND = 'chat_shield_block';
export const SHIELD_GATES = ['kill_switch', 'loop_gate', 'input_shield', 'tool_gate', 'output_shield'];

// A reply must never carry an internal name, an internal id, another person's
// address, or a request for a secret.
const INTERNAL_NAMES =
  /\b(scannerHelper|supportAutomation|chatBotShield|appSupport|supportHarness|supportIntake|supportReply|ticketNotices|chatGuard|promptGuard|planAccess|creditGuard|statCounter|spendCredit|openTicket|asServiceRole|createClientFromRequest|entry\.ts|GUARD_RULES|INJECTION_REFUSAL|base44\.(entities|functions|auth|integrations))\b/i;
const RECORD_ID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
// The app's own addresses are its own: anything else in a bot reply is not.
const OWN_ADDRESSES = /(support@sift-ai\.net|sift-ai\.net|siftai\.base44\.app)/gi;
const ANY_ADDRESS = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
const ASKS_FOR_SECRET =
  /\b(your|the)\b[^.\n]{0,25}\b(password|one[- ]?time code|\botp\b|api[- ]?key|secret|card number|\bcvv\b|\bimei\b|serial number|phone number)\b/i;

const dayKey = () => new Date().toISOString().slice(0, 10);
const rows = (page) => (Array.isArray(page) ? page : page?.items || []);
const ownerKeyFor = (userId, clientKey) => (userId ? `user:${userId}` : `visitor:${clientKey || 'unknown'}`);

// The team's signature, added once and never twice.
export function signBotReply(text) {
  const clean = String(text || '').trim();
  if (!clean) return clean;
  return /sift ai team/i.test(clean) ? clean : `${clean}\n\n${SIGNATURE}`;
}

// Refused messages today for this one caller. Read without a second argument: in
// this runtime an options object comes back as an empty result, so the rows are
// counted here. Only the day's rows for one caller are ever read.
async function blockedToday(base44, ownerKey) {
  const counted = rows(await base44.asServiceRole.entities.DailyCounter.filter({
    kind: BLOCK_KIND,
    owner_key: ownerKey,
    bucket: dayKey()
  }));
  return counted.length;
}

async function noteBlocked(base44, ownerKey) {
  await base44.asServiceRole.entities.DailyCounter.create({
    kind: BLOCK_KIND,
    owner_key: ownerKey,
    bucket: dayKey()
  });
}

// Steps 1 to 4. Returns { ok: true, gate, categories } when the message may go
// ahead, or { ok: false, gate, reply } with the one plain refusal to show. A
// caller must not act on anything but ok: true.
export async function screenMessage(
  base44,
  { action = 'answer', bot = 'helper', text = '', toolOutput = '', userId = '', clientKey = '', ticketId = '', ticketNumber = '' }
) {
  const ownerKey = ownerKeyFor(userId, clientKey);
  const entry = {
    action,
    actor: 'automation',
    ticket_id: ticketId,
    ticket_number: ticketNumber,
    detail: `bot: ${bot}`
  };

  // 1. The kill switch. On, or unreadable, and nothing runs at all.
  const state = await automationState(base44);
  if (state.paused) {
    await audit(base44, {
      ...entry,
      gate: 'kill_switch',
      decision: 'blocked',
      reason: state.reason || 'the automation switch is on, so the bots are stopped'
    });
    return { ok: false, gate: 'kill_switch', reply: signBotReply(SHIELD_PAUSED) };
  }

  // 2. The loop gate. A caller who keeps sending refused messages is stopped for
  //    the day, and the reason is written down. Nothing restarts by itself.
  let blocked = null;
  try {
    blocked = await blockedToday(base44, ownerKey);
  } catch (error) {
    console.warn('[chatBotShield] blocked-attempt count not read:', error && error.message);
  }
  if (blocked === null) {
    await audit(base44, {
      ...entry,
      gate: 'loop_gate',
      decision: 'blocked',
      reason: 'the count of refused messages could not be read, so the message was not processed'
    });
    return { ok: false, gate: 'loop_gate', reply: signBotReply(SHIELD_PAUSED) };
  }
  if (blocked >= ATTEMPT_LIMIT) {
    await audit(base44, {
      ...entry,
      gate: 'loop_gate',
      decision: 'blocked',
      reason: `stopped after ${blocked} refused messages today; the chat does not restart on its own`
    });
    return { ok: false, gate: 'loop_gate', reply: signBotReply(SHIELD_PAUSED) };
  }

  // 3. The input filter, over the message and over anything a tool or the scan
  //    has handed the bot. Both are text, never orders.
  const parts = [{ what: 'the message', scan: scanChatMessage(text) }];
  if (String(toolOutput || '').trim()) parts.push({ what: 'the on-screen result', scan: scanChatMessage(toolOutput) });

  const refused = parts.filter((part) => part.scan.verdict === 'block');
  const categories = [...new Set(parts.flatMap((part) => part.scan.categories))];
  if (refused.length) {
    // The count is recorded first so repeated attempts trip the loop gate, then
    // the reason — a category, never the message.
    await noteBlocked(base44, ownerKey).catch((error) =>
      console.warn('[chatBotShield] refused message not counted:', error && error.message)
    );
    await audit(base44, {
      ...entry,
      gate: 'input_shield',
      decision: 'blocked',
      reason: `refused at the input filter (${refused.map((part) => part.what).join(' and ')}): ${categories.join(', ')}`
    });
    return { ok: false, gate: 'input_shield', reply: signBotReply(SHIELD_REFUSAL), categories };
  }

  // 4. The log is written before the action. If it cannot be written, the action
  //    does not happen.
  const written = await audit(base44, {
    ...entry,
    gate: 'tool_gate',
    decision: 'allowed',
    reason: `passed the input filter${categories.length ? ` (noted: ${categories.join(', ')})` : ''}; the action may run`
  });
  if (!written) return { ok: false, gate: 'tool_gate', reply: signBotReply(SHIELD_REFUSAL), categories };

  return { ok: true, gate: 'tool_gate', categories };
}

// Step 5. Returns the reply that may be shown: signed, or the safe text that
// replaces a reply which failed the shield. Only categories are logged.
export async function shieldReply(
  base44,
  { action = 'answer', bot = 'helper', reply = '', canary = '', userId = '', clientKey = '', ticketId = '', ticketNumber = '' }
) {
  const text = String(reply || '');
  const checked = guardChatReply(text, canary);
  const reasons = new Set(checked.reasons || []);

  const withoutOwn = text.replace(OWN_ADDRESSES, ' ');
  if (INTERNAL_NAMES.test(text)) reasons.add('internal_name');
  if (RECORD_ID.test(text)) reasons.add('internal_id');
  if (ANY_ADDRESS.test(withoutOwn)) reasons.add('other_address');
  if (ASKS_FOR_SECRET.test(text)) reasons.add('secret_request');

  const entry = {
    action,
    actor: 'automation',
    ticket_id: ticketId,
    ticket_number: ticketNumber,
    detail: `bot: ${bot}`
  };

  if (reasons.size) {
    await audit(base44, {
      ...entry,
      gate: 'output_shield',
      decision: 'blocked',
      reason: `the reply was held back (${[...reasons].join(', ')})`
    });
    return { text: signBotReply(SHIELD_HELD), held: true, reasons: [...reasons] };
  }

  await audit(base44, {
    ...entry,
    gate: 'output_shield',
    decision: 'completed',
    reason: `the reply passed the output shield and was signed ${SIGNATURE}`
  });
  return { text: signBotReply(checked.text), held: false, reasons: [] };
}