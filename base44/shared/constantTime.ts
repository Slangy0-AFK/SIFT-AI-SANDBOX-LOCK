// Constant-time comparison for signatures, digests and secrets.
//
// `a === b` returns as soon as it finds a differing character, so how long the
// check takes leaks how much of the expected value the caller guessed correctly.
// Every check that compares a value supplied by a caller against a computed digest
// or MAC signature compares in constant time instead, so the only thing a wrong
// guess can reveal is that it was wrong.
//
// Fails closed: a missing or empty side is never equal, because an absent
// signature must not be able to match an absent expectation.

export function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length === 0 || b.length === 0) return false;

  const length = a.length > b.length ? a.length : b.length;
  // Every character is visited: the loop never exits early, and the lengths are
  // folded in rather than compared separately.
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}