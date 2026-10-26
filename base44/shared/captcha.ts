import { constantTimeEqual } from './constantTime.ts';

// The app's human check, in one place.
//
// Two callers share it: the public challenge itself (generateCaptcha) and every
// action a visitor with no account can take that spends an integration credit or
// sends an email (scannerHelper). One rule instead of two.
//
// The answer never leaves the server: the record behind the opaque challenge id
// holds only its hash. A challenge passes once, allows a few tries, then expires.

export const MAX_ATTEMPTS = 3;

export async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const rowsOf = (result: any) => (Array.isArray(result) ? result : result?.items || []);

export type ChallengeReason = 'ok' | 'missing' | 'spent' | 'expired' | 'locked' | 'wrong';

export type ChallengeResult = {
  ok: boolean;
  reason: ChallengeReason;
  locked?: boolean;
  remaining?: number;
};

export async function verifyChallenge(
  base44: any,
  { challengeId, answer }: { challengeId: string; answer: unknown }
): Promise<ChallengeResult> {
  const submitted = String(answer ?? '').trim();
  if (!challengeId || !submitted) return { ok: false, reason: 'missing' };

  // The stored pair behind this id is the only answer source, and it is never
  // sent anywhere: the caller is told right or wrong, nothing more.
  const challenge = rowsOf(await base44.asServiceRole.entities.WidgetChallenge.filter({ challenge_id: challengeId }))[0];
  if (!challenge) return { ok: false, reason: 'missing' };
  if (challenge.status !== 'pending') return { ok: false, reason: 'spent', locked: true };

  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    await base44.asServiceRole.entities.WidgetChallenge.update(challenge.id, { status: 'locked' });
    return { ok: false, reason: 'expired', locked: true };
  }

  const attempts = Number(challenge.attempts || 0);
  if (attempts >= MAX_ATTEMPTS) {
    await base44.asServiceRole.entities.WidgetChallenge.update(challenge.id, { status: 'locked' });
    return { ok: false, reason: 'locked', locked: true };
  }

  const computed = await sha256Hex(`${challenge.challenge_id}:${parseInt(submitted, 10)}`);
  // Constant-time: the answer must not be guessable by measuring the check.
  if (!constantTimeEqual(computed, challenge.answer_hash)) {
    const next = attempts + 1;
    await base44.asServiceRole.entities.WidgetChallenge.update(challenge.id, {
      attempts: next,
      status: next >= MAX_ATTEMPTS ? 'locked' : 'pending'
    });
    return { ok: false, reason: 'wrong', locked: next >= MAX_ATTEMPTS, remaining: Math.max(0, MAX_ATTEMPTS - next) };
  }

  // One challenge, one pass: a solved challenge cannot pay for a second action.
  await base44.asServiceRole.entities.WidgetChallenge.update(challenge.id, { status: 'used', attempts: attempts + 1 });
  return { ok: true, reason: 'ok' };
}