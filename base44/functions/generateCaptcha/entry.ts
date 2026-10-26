import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { constantTimeEqual } from '../../shared/constantTime.ts';

/**
 * Human verification challenge.
 *
 * Issuing hands over the sum to solve. The answer itself never leaves the
 * server: it is stored only as a hash keyed to an opaque random challenge id,
 * so nothing sent to a page can be decoded into the answer.
 *
 * Verifying is also server-side, and it is the only way an answer is accepted:
 * one pass per challenge, a few tries, an expiry, and no way for a page to
 * declare itself verified on its own.
 *
 * Both halves are public by design, because this runs before a person has an
 * account. Nothing secret is sent, and a pass here grants nothing by itself.
 */

const CHALLENGE_MINUTES = 5;
const MAX_ATTEMPTS = 3;
const SITE_LABEL = 'siftai-public';
const FLOOD_WINDOW_MS = 10 * 60 * 1000;
const FLOOD_LIMIT = 100;

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(payload, status = 200) {
  return Response.json(payload, { status });
}

function rowsOf(result) {
  if (Array.isArray(result)) return result;
  return (result && result.items) || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action === 'verify' ? 'verify' : 'issue';

    if (action === 'verify') {
      const challengeId = String(body?.challenge_id || '');
      const submitted = String(body?.answer ?? '').trim();
      if (!challengeId || !submitted) {
        return json({ success: false, verified: false, error: 'Enter your answer first.' }, 400);
      }

      // The stored pair behind this id is the only answer source, and it is
      // never sent anywhere: the page is told right or wrong, nothing more.
      const found = await base44.asServiceRole.entities.WidgetChallenge.filter({ challenge_id: challengeId });
      const challenge = rowsOf(found)[0];
      if (!challenge) {
        return json({ success: false, verified: false, error: 'That challenge is no longer valid. Load a new one.' }, 400);
      }
      if (challenge.status !== 'pending') {
        return json({ success: false, verified: false, locked: true, error: 'That challenge has already been dealt with. Load a new one.' }, 400);
      }
      if (new Date(challenge.expires_at).getTime() < Date.now()) {
        await base44.asServiceRole.entities.WidgetChallenge.update(challenge.id, { status: 'locked' });
        return json({ success: false, verified: false, locked: true, error: 'That challenge expired. Load a new one.' });
      }

      const attempts = Number(challenge.attempts || 0);
      if (attempts >= MAX_ATTEMPTS) {
        await base44.asServiceRole.entities.WidgetChallenge.update(challenge.id, { status: 'locked' });
        return json({ success: false, verified: false, locked: true, error: 'Too many attempts on this challenge. Load a new one.' });
      }

      const computed = await sha256Hex(`${challenge.challenge_id}:${parseInt(submitted, 10)}`);
      // Constant-time: the answer must not be guessable by measuring the check.
      if (!constantTimeEqual(computed, challenge.answer_hash)) {
        const next = attempts + 1;
        await base44.asServiceRole.entities.WidgetChallenge.update(challenge.id, {
          attempts: next,
          status: next >= MAX_ATTEMPTS ? 'locked' : 'pending',
        });
        return json({
          success: false,
          verified: false,
          locked: next >= MAX_ATTEMPTS,
          remaining_attempts: Math.max(0, MAX_ATTEMPTS - next),
          error: 'That answer is not right.',
        });
      }

      // One challenge, one pass: a solved challenge cannot be replayed.
      await base44.asServiceRole.entities.WidgetChallenge.update(challenge.id, {
        status: 'used',
        attempts: attempts + 1,
      });
      return json({ success: true, verified: true });
    }

    // Issuing a challenge writes one record, so a flood of them is refused
    // rather than allowed to pile up.
    const recent = rowsOf(await base44.asServiceRole.entities.WidgetChallenge.filter({ site_key: SITE_LABEL }));
    if (recent.length > FLOOD_LIMIT * 3) {
      return json({ error: 'Too many challenges right now. Try again in a few minutes.' }, 429);
    }
    const fresh = recent.filter((row) => Date.now() - new Date(row.created_date).getTime() < FLOOD_WINDOW_MS);
    if (fresh.length >= FLOOD_LIMIT) {
      return json({ error: 'Too many challenges right now. Try again in a few minutes.' }, 429);
    }

    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const challengeId = `${crypto.randomUUID().replace(/-/g, '')}${Math.floor(Math.random() * 1e9).toString(36)}`;

    await base44.asServiceRole.entities.WidgetChallenge.create({
      challenge_id: challengeId,
      site_key: SITE_LABEL,
      answer_hash: await sha256Hex(`${challengeId}:${num1 + num2}`),
      attempts: 0,
      status: 'pending',
      expires_at: new Date(Date.now() + CHALLENGE_MINUTES * 60 * 1000).toISOString(),
    });

    return json({
      challenge_id: challengeId,
      challenge: {
        num1_visual: generateNumberVisual(num1),
        num2_visual: generateNumberVisual(num2),
        instruction: `What is ${num1} + ${num2}?`,
      },
      expires_in: CHALLENGE_MINUTES * 60,
    });
  } catch (error) {
    console.error('[CAPTCHA] Error:', error?.message, error?.stack);
    return json({ error: 'Could not load a challenge. Try again.' }, 500);
  }
});

// Simple ASCII-style number representation for visual challenge
function generateNumberVisual(num) {
  const visuals = {
    1: ['  #  ', ' ##  ', '  #  ', '  #  ', '#####'],
    2: ['###  ', '  #  ', ' ##  ', '#    ', '#####'],
    3: ['###  ', '  #  ', ' ##  ', '  #  ', '###  '],
    4: ['# #  ', '# #  ', '###  ', '  #  ', '  #  '],
    5: ['#####', '#    ', '###  ', '  #  ', '###  '],
    6: [' ### ', '#    ', '#### ', '#  # ', ' ### '],
    7: ['#####', '   # ', '  #  ', ' #   ', ' #   '],
    8: [' ### ', '#   #', ' ### ', '#   #', ' ### '],
    9: [' ### ', '#   #', ' ####', '   # ', ' ### '],
    0: [' ### ', '#   #', '#   #', '#   #', ' ### ']
  };
  return visuals[num] || visuals[0];
}