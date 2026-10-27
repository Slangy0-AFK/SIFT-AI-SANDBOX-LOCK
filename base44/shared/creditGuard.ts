// One counter for every call that spends a Base44 integration credit.
//
// Each action listed in CREDIT_CAPS is exactly one integration call: an
// InvokeLLM or a SendEmail. The count is a ceiling, not a bill — it is what
// stops a loop, a script, or an ordinary person who leans on the button from
// turning a page the public can reach into unbounded spend.
//
// A signed-in account is counted per account. Visitors with no account share a
// single ceiling for the whole app, because a guest has nothing stable to count
// against and a rotating identity must not buy a fresh allowance.
export const CREDIT_CAPS = {
  // In-app helper chat, per day.
  helper_ask: { user: 30, guest: 50 },
  // Support ticket plus its automatic first reply, per day.
  helper_ticket: { user: 5, guest: 20 },
  // Support hub chat (signed-in only), per day.
  support_chat: { user: 30, guest: 0 },
  // Feedback and account-deletion emails (signed-in only), per day, shared.
  support_email: { user: 5, guest: 0 },
  // Message and email threat analysis (signed-in only), per day.
  text_analysis: { user: 40, guest: 0 },
  // One eval puzzle run against one model (signed-in only), per day.
  puzzle_run: { user: 40, guest: 0 },
  // One turn of the behaviour test sent to one model (signed-in only), per day.
  behaviour_turn: { user: 40, guest: 0 },
};

// The ceiling is a calendar day, held as its own field: counting by plain
// equality keeps the query working on every SDK build the functions here pin.
const dayKey = () => new Date().toISOString().slice(0, 10);

// True when the call may go ahead. The spend is recorded before the caller
// makes it, so a running loop stops at the cap rather than after exceeding it.
export async function spendCredit(base44, kind, userId) {
  const caps = CREDIT_CAPS[kind];
  if (!caps) return true;

  const ownerKey = userId ? `user:${userId}` : 'guest';
  const cap = userId ? caps.user : caps.guest;
  if (cap <= 0) return false;

  // One page answers the question: ask for at most `cap` records and see
  // whether that many are already there. Every cap is kept within one page.
  const page = await base44.asServiceRole.entities.CreditGuardEvent.filter(
    { kind, owner_key: ownerKey, bucket: dayKey() },
    { limit: cap }
  );
  const seen = Array.isArray(page) ? page.length : (page?.items || []).length;
  if (seen >= cap || page?.has_more === true) return false;

  await base44.asServiceRole.entities.CreditGuardEvent.create({ kind, owner_key: ownerKey, bucket: dayKey() });
  return true;
}